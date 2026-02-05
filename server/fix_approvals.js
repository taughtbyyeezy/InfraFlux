const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rewari_infrastructure',
});

async function fixApprovals() {
    try {
        console.log('Running retroactive approval fix...');
        const result = await pool.query(`
            UPDATE issues 
            SET approved = TRUE 
            WHERE votes_true >= 3 AND approved = FALSE
            RETURNING id
        `);
        console.log(`Fixed ${result.rowCount} issues.`);
    } catch (err) {
        console.error('Fix failed:', err);
    } finally {
        await pool.end();
    }
}

fixApprovals();
