require('dotenv').config();
const mysql = require('mysql2/promise');

async function grantPermissions() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('--- Granting STATUTS permission to all agents ---');
        
        // Get the permission ID for STATUTS
        const [perms] = await pool.query("SELECT id FROM permissions WHERE code = 'STATUTS'");
        if (perms.length === 0) {
            console.error('Permission STATUTS not found in permissions table.');
            return;
        }
        const permId = perms[0].id;

        // Get all agents
        const [agents] = await pool.query("SELECT IDAgents FROM Agents");
        
        for (const agent of agents) {
            await pool.query(
                "INSERT IGNORE INTO agent_permissions (agent_id, permission_id, can_view, can_create, can_edit, can_delete) VALUES (?, ?, 1, 1, 1, 1)",
                [agent.IDAgents, permId]
            );
            console.log(`+ Granted to Agent ${agent.IDAgents}`);
        }

        console.log('--- SUCCESS ---');

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        pool.end();
    }
}
grantPermissions();
