const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { userId } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Check for today's checkin first (GMT+8)
        const existing = await sql`
            SELECT 1 FROM check_ins 
            WHERE user_id = ${userId} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;

        if (existing.length === 0) {
            await sql`
                INSERT INTO check_ins (user_id, day_date) 
                VALUES (${userId}, (NOW() AT TIME ZONE 'Asia/Manila')::date)
            `;
            
            // Award +1 Spin for checking in (v0.8.0)
            await sql`UPDATE users SET spins = spins + 1 WHERE id = ${userId}`;
        }

        const user = await sql`SELECT spins FROM users WHERE id = ${userId}`;
        res.status(200).json({ spins: user[0].spins });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
