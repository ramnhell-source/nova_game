const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { name, pin } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Self-Healing Migration (v0.7.2 Hotfix) & v0.9.0 Admin removal
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS spins INTEGER DEFAULT 0`;
            await sql`CREATE TABLE IF NOT EXISTS check_ins (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                day_date DATE NOT NULL,
                UNIQUE(user_id, day_date)
            )`;
            await sql`CREATE TABLE IF NOT EXISTS daily_quests (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                quest_id INTEGER NOT NULL,
                day_date DATE NOT NULL,
                UNIQUE(user_id, quest_id, day_date)
            )`;
            await sql`CREATE TABLE IF NOT EXISTS irl_quests (
                id SERIAL PRIMARY KEY,
                sender_id INTEGER REFERENCES users(id),
                receiver_id INTEGER REFERENCES users(id),
                task_name VARCHAR(100) NOT NULL,
                completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )`;
            
            // v0.9.0: Remove Ramnhell check-in for 2026-04-13
            await sql`DELETE FROM check_ins WHERE user_id = (SELECT id FROM users WHERE name = 'Ramnhell' LIMIT 1) AND day_date = '2026-04-13'`;
        } catch(e) { console.log("Migration skipped or failed:", e.message); }

        const result = await sql`
            SELECT id, name, gender, level, xp, gold, spins 
            FROM users 
            WHERE name = ${name} AND pin = ${pin}
            LIMIT 1
        `;

        if (result.length === 0) {
            return res.status(401).json({ error: 'Invalid name or PIN' });
        }

        const user = result[0];

        // Check if checked in today (GMT+8)
        const checkins = await sql`
            SELECT 1 FROM check_ins 
            WHERE user_id = ${user.id} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;
        user.checkedInToday = checkins.length > 0;

        res.status(200).json(user);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
