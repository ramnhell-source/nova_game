const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userId } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // check if already checked in today
        const existing = await sql`
            SELECT id FROM check_ins 
            WHERE user_id = ${userId} AND day_date = CURRENT_DATE
        `;

        if (existing.length > 0) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Already checked in today' }) };
        }

        // Add check-in
        await sql`
            INSERT INTO check_ins (user_id, day_date)
            VALUES (${userId}, CURRENT_DATE)
        `;

        // Add spin reward
        await sql`
            UPDATE users SET spins = spins + 1 WHERE id = ${userId}
        `;

        // Fetch updated spins
        const user = await sql`SELECT spins FROM users WHERE id = ${userId}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, spins: user[0].spins })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
