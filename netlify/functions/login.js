const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, pin } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        const result = await sql`
            SELECT id, name, gender, level, xp, gold, spins 
            FROM users 
            WHERE name = ${name} AND pin = ${pin}
            LIMIT 1
        `;

        if (result.length === 0) {
            return { 
                statusCode: 401, 
                body: JSON.stringify({ error: 'Invalid name or PIN' }) 
            };
        }

        const user = result[0];

        // Check if checked in today
        const checkins = await sql`
            SELECT 1 FROM check_ins 
            WHERE user_id = ${user.id} AND day_date = CURRENT_DATE
        `;
        user.checkedInToday = checkins.length > 0;

        return {
            statusCode: 200,
            body: JSON.stringify(user)
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Database Error' }) 
        };
    }
};
