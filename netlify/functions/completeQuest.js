const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userId, questId, goldReward } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Check if already completed today
        const existing = await sql`
            SELECT id FROM daily_quests 
            WHERE user_id = ${userId} AND quest_id = ${questId} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;

        if (existing.length > 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Already completed today' }) };
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
        
        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, gold: userQ[0].gold })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
