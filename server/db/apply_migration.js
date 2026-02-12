const pg = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rewari_infrastructure',
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Reading migration script...');
        const sql = fs.readFileSync(path.join(__dirname, 'add_votes_table.sql'), 'utf8');

        console.log('Executing migration...');
        await client.query(sql);
        console.log('Migration successful: issue_votes table created.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
