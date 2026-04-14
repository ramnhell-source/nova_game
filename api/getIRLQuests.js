const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const userId = req.query.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch pending IRL quests where the user is the receiver
        const quests = await sql`
            SELECT q.id, u.name as sender_name, q.task_name, q.created_at
            FROM irl_quests q
            JOIN users u ON q.sender_id = u.id
            WHERE q.receiver_id = ${userId} AND q.completed = FALSE
            ORDER BY q.created_at DESC
        `;

        res.status(200).json({ quests: quests });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
