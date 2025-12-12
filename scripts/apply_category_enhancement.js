import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// Define the migration SQL directly here to avoid path issues or create a file
const sql = `
-- Add sub_category column to user_custom_foods
ALTER TABLE user_custom_foods ADD COLUMN IF NOT EXISTS sub_category text;

-- Add sub_category column to food_items (Global)
ALTER TABLE food_items ADD COLUMN IF NOT EXISTS sub_category text;

-- Add sub_category column to recipes (My Meals)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS sub_category text;
`;

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
            console.log(`Connected on port ${port}! Applying Category Enhancement migration...`);
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
