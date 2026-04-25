CREATE TABLE IF NOT EXISTS backup_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    backup_directory VARCHAR(500) NOT NULL,
    auto_backup_enabled BOOLEAN DEFAULT FALSE,
    frequency_hours INT DEFAULT 6,
    retain_count INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert a default configuration if it doesn't exist
INSERT INTO backup_config (id, backup_directory, auto_backup_enabled, frequency_hours, retain_count)
SELECT 1, 'C:/Backups/SoftTransit', FALSE, 6, 10
WHERE NOT EXISTS (SELECT 1 FROM backup_config WHERE id = 1);
