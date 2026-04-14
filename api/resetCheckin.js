const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { userId } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Delete check-in for the current day (GMT+8)
        await sql`
            DELETE FROM check_ins 
            WHERE user_id = ${userId} 
            AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;

        res.status(200).json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
