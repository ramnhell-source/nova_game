const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const userId = req.query.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch check-ins for the current month (GMT+8)
        const checkins = await sql`
            SELECT day_date 
            FROM check_ins 
            WHERE user_id = ${userId} 
            AND EXTRACT(MONTH FROM day_date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Manila'))
            AND EXTRACT(YEAR FROM day_date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Manila'))
        `;

        res.status(200).json({ dates: checkins.map(c => c.day_date) });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
