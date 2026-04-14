const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { senderId, targetId, taskName, goldCost } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Check if sender has enough gold
        const sender = await sql`SELECT gold FROM users WHERE id = ${senderId}`;
        if (sender.length === 0 || sender[0].gold < goldCost) {
            return res.status(400).json({ error: 'Not enough gold' });
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

        res.status(200).json({ success: true, gold: freshUser[0].gold });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
