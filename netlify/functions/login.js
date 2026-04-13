const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, pin } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Self-Healing Migration (v0.7.2 Hotfix)
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS spins INTEGER DEFAULT 0`;
            await sql`CREATE TABLE IF NOT EXISTS check_ins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                day_date DATE NOT NULL,
                UNIQUE(user_id, day_date)
            )`;
        } catch(e) { console.log("Migration skipped or failed:", e.message); }

        const result = await sql`
            SELECT id, name, gender, level, xp, gold, spins 
            FROM users 
            WHERE name = ${name} AND pin = ${pin}
            LIMIT 1
        `;

        if (result.length === 0) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Invalid name or PIN' }) 
            };
        }

        const user = result[0];

        // Check if checked in today (GMT+8)
        const checkins = await sql`
            SELECT 1 FROM check_ins 
            WHERE user_id = ${user.id} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;
        user.checkedInToday = checkins.length > 0;

        return {
            statusCode: 200,
            body: JSON.stringify(user)
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Database Error' }) 
        };
    }
};
