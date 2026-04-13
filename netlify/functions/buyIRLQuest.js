const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { senderId, targetId, taskName, goldCost } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Check if sender has enough gold
        const sender = await sql`SELECT gold FROM users WHERE id = ${senderId}`;
        if (sender.length === 0 || sender[0].gold < goldCost) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Not enough gold' }) };
        }

        // Deduct gold
        await sql`UPDATE users SET gold = gold - ${goldCost} WHERE id = ${senderId}`;

        // Create IRL Quest
        await sql`
            INSERT INTO irl_quests (sender_id, receiver_id, task_name)
            VALUES (${senderId}, ${targetId}, ${taskName})
        `;

        // Get fresh gold
        const freshUser = await sql`SELECT gold FROM users WHERE id = ${senderId}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, gold: freshUser[0].gold })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
