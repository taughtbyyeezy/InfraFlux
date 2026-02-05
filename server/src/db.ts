import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/rewari_infrastructure',
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
