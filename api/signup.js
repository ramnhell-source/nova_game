const { neon } = require('@neondatabase/serverless');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const { name, pin, gender } = req.body;
        const sql = neon(process.env.DATABASE_URL);

        // Check if user exists
        const existing = await sql`SELECT * FROM users WHERE name = ${name}`;
        if (existing.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // Create user
        const result = await sql`
            INSERT INTO users (name, pin, gender) 
            VALUES (${name}, ${pin}, ${gender}) 
            RETURNING id, name, gender, level, xp, gold
        `;

        res.status(200).json(result[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error', details: err.message });
    }
};
