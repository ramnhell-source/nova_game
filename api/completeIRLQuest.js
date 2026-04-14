const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { questId } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Get sender and receiver IDs
        const quest = await sql`SELECT sender_id, receiver_id FROM irl_quests WHERE id = ${questId} AND completed = FALSE`;
        if (quest.length === 0) return res.status(404).json({ error: 'Quest not found or already completed' });

        const { sender_id, receiver_id } = quest[0];

        // Mark as completed
        await sql`UPDATE irl_quests SET completed = TRUE WHERE id = ${questId}`;

        // Reward +1 spin to both
        await sql`UPDATE users SET spins = spins + 1 WHERE id IN (${sender_id}, ${receiver_id})`;

        res.status(200).json({ success: true, message: 'Mutual reward granted (+1 Spin)' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
