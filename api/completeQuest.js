const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { userId, questId, goldReward } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Check if already completed today
        const existing = await sql`
            SELECT id FROM daily_quests 
            WHERE user_id = ${userId} AND quest_id = ${questId} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;

        if (existing.length > 0) {
            return res.status(400).json({ error: 'Already completed today' });
        }

        // Insert complete record
        await sql`
            INSERT INTO daily_quests (user_id, quest_id, day_date)
            VALUES (${userId}, ${questId}, (NOW() AT TIME ZONE 'Asia/Manila')::date)
        `;

        // Reward gold
        await sql`
            UPDATE users SET gold = gold + ${goldReward} WHERE id = ${userId}
        `;

        // Return updated gold
        const userQ = await sql`SELECT gold FROM users WHERE id = ${userId}`;
        
        res.status(200).json({ success: true, gold: userQ[0].gold });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
