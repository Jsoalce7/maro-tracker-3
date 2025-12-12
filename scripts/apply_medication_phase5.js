
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

const migrationFile = path.resolve(__dirname, '../supabase/migrations/20251211_medication_phase5.sql');
const sql = fs.readFileSync(migrationFile, 'utf8');

const ports = [54332, 54322, 5432];

async function applyMigration() {
    for (const port of ports) {
        console.log(`Trying port ${port}...`);
        const client = new Client({
            user: 'postgres',
            host: '127.0.0.1',
            database: 'postgres',
            password: 'postgres',
            port: port,
        });

        try {
            await client.connect();
            console.log(`Connected on port ${port}! Applying Phase 5 (Advanced Scheduling) migration...`);
            await client.query(sql);
            console.log('Migration applied successfully!');
            await client.end();
            process.exit(0);
        } catch (err) {
            console.log(`Failed on port ${port}: ${err.message}`);
            try { await client.end(); } catch (e) { }
        }
    }
    console.error('Could not connect to database on any common port.');
    process.exit(1);
}

applyMigration();
