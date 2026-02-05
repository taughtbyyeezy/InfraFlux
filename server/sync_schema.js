const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
});

async function finalize() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('1. Removing legacy Streetlight columns...');
        await client.query("ALTER TABLE issues DROP COLUMN IF EXISTS pole_number");
        await client.query("ALTER TABLE issues DROP COLUMN IF EXISTS streetlight_issue_type");
        await client.query("ALTER TABLE issues DROP COLUMN IF EXISTS is_operational");

        console.log('2. Syncing defaults...');
        await client.query("ALTER TABLE issues ALTER COLUMN votes_true SET DEFAULT 0");
        await client.query("ALTER TABLE issues ALTER COLUMN votes_false SET DEFAULT 0");
        await client.query("ALTER TABLE issues ALTER COLUMN magnitude SET DEFAULT 5");

        await client.query('COMMIT');
        console.log('Cleanup finalized!');

        console.log('\n--- Final Database Schema Summary ---');
        const schemaInfo = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('issues', 'issue_updates', 'media')
            ORDER BY table_name, ordinal_position;
        `);
        console.table(schemaInfo.rows);

        const typeInfo = await client.query(`
            SELECT enumlabel FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'issue_type';
        `);
        console.log('Current Issue Types:', typeInfo.rows.map(r => r.enumlabel).join(', '));

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Cleanup failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

finalize();
