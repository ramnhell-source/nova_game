const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { id, x, y, msg } = req.body;
        if (!id) return res.status(400).send('ID Required');

        const sql = neon(process.env.DATABASE_URL);

        // Self-Healing Migration for Chat
        try {
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_msg VARCHAR(100)`;
            await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_at TIMESTAMP WITH TIME ZONE`;
        } catch(e) {}

        // Update self
        if (msg) {
            await sql`
                UPDATE users 
                SET pos_x = ${x}, pos_y = ${y}, chat_msg = ${msg}, chat_at = NOW(), last_heartbeat = NOW() 
                WHERE id = ${id}
            `;
        } else {
            await sql`
                UPDATE users 
                SET pos_x = ${x}, pos_y = ${y}, last_heartbeat = NOW() 
                WHERE id = ${id}
            `;
        }

        // Fetch others (last 15 seconds)
        const others = await sql`
            SELECT id, name, gender, pos_x, pos_y, chat_msg, chat_at 
            FROM users 
            WHERE last_heartbeat > NOW() - INTERVAL '15 seconds'
            AND id != ${id}
        `;

        res.status(200).json({ players: others });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
