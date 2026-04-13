const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { questId } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Get sender and receiver IDs
        const quest = await sql`SELECT sender_id, receiver_id FROM irl_quests WHERE id = ${questId} AND completed = FALSE`;
        if (quest.length === 0) return { statusCode: 404, body: 'Quest not found or already completed' };

        const { sender_id, receiver_id } = quest[0];

        // Mark as completed
        await sql`UPDATE irl_quests SET completed = TRUE WHERE id = ${questId}`;

        // Reward +1 spin to both
        await sql`UPDATE users SET spins = spins + 1 WHERE id IN (${sender_id}, ${receiver_id})`;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Mutual reward granted (+1 Spin)' })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
