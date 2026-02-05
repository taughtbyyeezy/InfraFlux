const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function fixColumn() {
    console.log('--- Database Column Fix Tool ---');
    try {
        const client = await pool.connect();
        console.log('✅ Connected to database.');

        console.log('🚀 Checking for missing columns in "issues" table...');
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'issues' AND column_name = 'resolve_votes';
        `);

        if (res.rows.length === 0) {
            console.log('🚀 Adding missing column "resolve_votes"...');
            await client.query('ALTER TABLE issues ADD COLUMN resolve_votes INTEGER DEFAULT 0;');
            console.log('✅ Column "resolve_votes" added successfully!');
        } else {
            console.log('✅ Column "resolve_votes" already exists.');
        }

        client.release();
    } catch (err) {
        console.error('❌ Fix failed:');
        console.error(err.message);
    } finally {
        await pool.end();
    }
}

fixColumn();
