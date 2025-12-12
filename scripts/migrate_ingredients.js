
import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';

const { Client } = pg;

// Connection logic (mirroring previous scripts)
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
            console.log(`Connected on port ${port}! Applying Ingredient Taxonomy migration...`);

            // 1. Move 'Vegetables' and 'Fruits' from Ingredient Type to Top-Level Category
            // Case 1: Custom Foods
            await client.query(`
                UPDATE user_custom_foods 
                SET category = 'Vegetable', ingredient_type = NULL, sub_category = 'Fresh'
                WHERE category = 'Ingredients' AND ingredient_type = 'Vegetables';
            `);
            await client.query(`
                UPDATE user_custom_foods 
                SET category = 'Fruit', ingredient_type = NULL, sub_category = 'Fresh'
                WHERE category = 'Ingredients' AND ingredient_type = 'Fruits';
            `);

            // Case 2: Global Foods (if any editable) - usually strictly managed but good to align
            await client.query(`
                UPDATE food_items
                SET category = 'Vegetable', ingredient_type = NULL, sub_category = 'Fresh'
                WHERE category = 'Ingredients' AND ingredient_type = 'Vegetables';
            `);
            await client.query(`
                UPDATE food_items
                SET category = 'Fruit', ingredient_type = NULL, sub_category = 'Fresh'
                WHERE category = 'Ingredients' AND ingredient_type = 'Fruits';
            `);


            // 2. Set Defaults for Ingredients without Sub-Categories
            // Taxonomy: Protein -> All Protein, Dairy -> All Dairy, etc.

            const typesToDefault = ['Protein', 'Dairy', 'Carbs', 'Fats'];

            for (const type of typesToDefault) {
                const defaultSub = `All ${type}`; // e.g. "All Protein"

                // Custom Foods
                await client.query(`
                    UPDATE user_custom_foods
                    SET sub_category = $1
                    WHERE category = 'Ingredients' 
                    AND ingredient_type = $2 
                    AND (sub_category IS NULL OR sub_category = '');
                `, [defaultSub, type]);

                // Global Foods
                await client.query(`
                    UPDATE food_items
                    SET sub_category = $1
                    WHERE category = 'Ingredients' 
                    AND ingredient_type = $2 
                    AND (sub_category IS NULL OR sub_category = '');
                `, [defaultSub, type]);
            }

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
