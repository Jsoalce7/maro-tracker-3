
import pg from 'pg';
const { Client } = pg;

const client = new Client({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'postgres',
    password: 'postgres',
    port: 54332, // The one with the weights table
});

async function checkWeights() {
    try {
        await client.connect();
        const res = await client.query('SELECT * FROM weight_logs ORDER BY date DESC LIMIT 20');
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkWeights();
