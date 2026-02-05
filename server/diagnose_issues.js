const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function diagnose() {
    console.log('--- Table Diagnosis ---');
    try {
        const client = await pool.connect();
        const res = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('issues', 'issue_updates', 'media')
            ORDER BY table_name, column_name;
        `);
        console.log('Database Structure:');
        console.table(res.rows);
        client.release();
    } catch (err) {
        console.error(err.message);
    } finally {
        await pool.end();
    }
}
diagnose();
