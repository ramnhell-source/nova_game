const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const userId = event.queryStringParameters.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch pending IRL quests where the user is the receiver
        const quests = await sql`
            SELECT q.id, u.name as sender_name, q.task_name, q.created_at
            FROM irl_quests q
            JOIN users u ON q.sender_id = u.id
            WHERE q.receiver_id = ${userId} AND q.completed = FALSE
            ORDER BY q.created_at DESC
        `;

        return {
            statusCode: 200,
            body: JSON.stringify({ quests: quests })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
