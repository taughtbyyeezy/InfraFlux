const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rewari_infrastructure',
});

async function inspect() {
    try {
        console.log('Inspecting issues with votes >= 3 but NOT approved...');
        const result = await pool.query(`
            SELECT issues.id, issues.type, issues.votes_true, issues.approved 
            FROM issues 
            WHERE votes_true >= 3 AND approved = FALSE
        `);
        console.log('Found:', result.rows);
    } catch (err) {
        console.error('Inspection failed:', err);
    } finally {
        await pool.end();
    }
}

inspect();
