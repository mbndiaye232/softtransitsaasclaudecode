const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const archiver = require('archiver');
const cron = require('node-cron');
let mysqldump;
try {
    mysqldump = require('mysqldump').default || require('mysqldump');
} catch(e) {
    // Graceful degradation if simple mysqldump is missing
    console.error("mysqldump package is not installed. Backups will fail until 'npm install' is executed.");
}

const pool = require('../config/database');

class BackupService {
    constructor() {
        this.cronJob = null;
        this.init();
    }

    async init() {
        try {
            // Auto-create the configure table if it doesn't exist
            await pool.query(`
                CREATE TABLE IF NOT EXISTS backup_config (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    backup_directory VARCHAR(500) NOT NULL,
                    auto_backup_enabled BOOLEAN DEFAULT FALSE,
                    frequency_hours INT DEFAULT 6,
                    retain_count INT DEFAULT 10,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
                )
            `);

            // Check if default config exists
            const [rows] = await pool.query('SELECT * FROM backup_config WHERE id = 1');
            if (rows.length === 0) {
                // Determine a safe fallback directory
                const defaultDir = path.join(__dirname, '../../backups');
                if (!fs.existsSync(defaultDir)) {
                    fs.mkdirSync(defaultDir, { recursive: true });
                }
                await pool.query(
                    'INSERT INTO backup_config (id, backup_directory, auto_backup_enabled, frequency_hours, retain_count) VALUES (?, ?, ?, ?, ?)',
                    [1, defaultDir, false, 6, 10]
                );
            }

            // Schedule job based on config
            await this.reschedule();
        } catch (error) {
            console.error('Error initializing BackupService:', error);
        }
    }

    async getConfig() {
        const [rows] = await pool.query('SELECT * FROM backup_config WHERE id = 1');
        return rows[0];
    }

    async setConfig(data) {
        const { backup_directory, auto_backup_enabled, frequency_hours, retain_count } = data;
        
        // Validate directory exists or create if possible
        if (backup_directory && !fs.existsSync(backup_directory)) {
            try {
                fs.mkdirSync(backup_directory, { recursive: true });
            } catch(e) {
                throw new Error("Impossible de créer ou d'accéder au répertoire de sauvegarde spécifié.");
            }
        }

        await pool.query(
            'UPDATE backup_config SET backup_directory = ?, auto_backup_enabled = ?, frequency_hours = ?, retain_count = ? WHERE id = 1',
            [backup_directory, auto_backup_enabled ? 1 : 0, frequency_hours, retain_count]
        );

        await this.reschedule();
        return this.getConfig();
    }

    async reschedule() {
        if (this.cronJob) {
            this.cronJob.stop();
        }

        const config = await this.getConfig();
        if (config && config.auto_backup_enabled && config.frequency_hours > 0) {
            // Schedule every X hours
            const cronExpression = `0 */${config.frequency_hours} * * *`;
            console.log(`[BackupService] Scheduling automatic backup with pattern: ${cronExpression}`);
            
            // Wait, we need the node-cron dependency to exist
            if(cron) {
                this.cronJob = cron.schedule(cronExpression, () => {
                    console.log('[BackupService] Running scheduled backup...');
                    this.runBackup().catch(e => console.error('[BackupService] Scheduled backup failed:', e));
                });
            } else {
                console.error("[BackupService] node-cron package is not installed.");
            }
        } else {
            console.log('[BackupService] Automatic backups are disabled.');
        }
    }

    async runBackup() {
        if (!mysqldump) {
            throw new Error("La dépendance 'mysqldump' n'est pas installée. Veuillez lancer 'npm install' côté backend.");
        }

        const config = await this.getConfig();
        const targetDir = config.backup_directory;

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const tempSqlFile = path.join(targetDir, `temp_dump_${timestamp}.sql`);
        const finalZipFile = path.join(targetDir, `softtransit_backup_${timestamp}.zip`);

        try {
            // 1. Dump database
            console.log('[BackupService] Dumping database...');
            await mysqldump({
                connection: {
                    host: process.env.DB_HOST,
                    user: process.env.DB_USER,
                    password: process.env.DB_PASSWORD,
                    database: process.env.DB_NAME,
                },
                dumpToFile: tempSqlFile,
            });

            // 2. Create ZIP containing the SQL dump and the uploads folder
            console.log('[BackupService] Archiving files...');
            await new Promise((resolve, reject) => {
                const output = fs.createWriteStream(finalZipFile);
                const archive = archiver('zip', { zlib: { level: 9 } });

                output.on('close', () => resolve());
                archive.on('error', (err) => reject(err));

                archive.pipe(output);

                // Add SQL Dump
                archive.file(tempSqlFile, { name: 'database_dump.sql' });

                // Add Uploads directory
                const uploadsPath = path.join(__dirname, '../../uploads');
                if (fs.existsSync(uploadsPath)) {
                    archive.directory(uploadsPath, 'uploads');
                }

                archive.finalize();
            });

            console.log('[BackupService] Backup completed:', finalZipFile);

            // 3. Clean up the temp SQL file
            if (fs.existsSync(tempSqlFile)) {
                fs.unlinkSync(tempSqlFile);
            }

            // 4. Enforce retain count Policy
            this.cleanupOldBackups(targetDir, config.retain_count);

            return {
                success: true,
                file: finalZipFile,
                timestamp
            };

        } catch (error) {
            console.error('[BackupService] Backup failed:', error);
            // Cleanup temp file on failure just in case
            if (fs.existsSync(tempSqlFile)) fs.unlinkSync(tempSqlFile);
            throw error;
        }
    }

    cleanupOldBackups(directory, retainCount) {
        if (!retainCount || retainCount <= 0) return;

        try {
            const files = fs.readdirSync(directory);
            const backupFiles = files
                .filter(f => f.startsWith('softtransit_backup_') && f.endsWith('.zip'))
                .map(f => ({
                    name: f,
                    path: path.join(directory, f),
                    time: fs.statSync(path.join(directory, f)).mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time); // newest first

            if (backupFiles.length > retainCount) {
                const filesToDelete = backupFiles.slice(retainCount);
                filesToDelete.forEach(file => {
                    console.log(`[BackupService] Deleting old backup: ${file.name}`);
                    fs.unlinkSync(file.path);
                });
            }
        } catch(e) {
            console.error("[BackupService] Cleanup failed:", e);
        }
    }
    
    getBackupHistory() {
        return new Promise(async (resolve) => {
            try {
                const config = await this.getConfig();
                const directory = config.backup_directory;
                if (!fs.existsSync(directory)) {
                   return resolve([]);
                }
                const files = fs.readdirSync(directory);
                const backupFiles = files
                    .filter(f => f.startsWith('softtransit_backup_') && f.endsWith('.zip'))
                    .map(f => {
                        const stat = fs.statSync(path.join(directory, f));
                        return {
                            filename: f,
                            size: stat.size,
                            createdAt: stat.mtime
                        }
                    })
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(backupFiles);
            } catch (e) {
                console.error("Erreur read history", e);
                resolve([]);
            }
        });
    }
}

// Export a singleton instance
module.exports = new BackupService();
