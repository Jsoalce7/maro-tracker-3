
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new pg.Client({
    connectionString: "postgresql://postgres:postgres@127.0.0.1:54332/postgres",
});

async function runCheck() {
    try {
        await client.connect();
        console.log("Connected to database.");

        const resColumns = await client.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'workout_schedule'
        `);
        console.log("Columns in workout_schedule:", resColumns.rows.map(r => r.column_name));

        const resConstraints = await client.query(`
            SELECT conname, pg_get_constraintdef(oid) as def
            FROM pg_constraint
            WHERE conrelid = 'workout_schedule'::regclass
        `);
        console.log("Constraints in workout_schedule:", resConstraints.rows);

    } catch (err) {
        console.error("Check failed:", err);
    } finally {
        await client.end();
    }
}

runCheck();
