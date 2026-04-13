const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, pin } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        const result = await sql`
            SELECT id, name, gender, level, xp, gold 
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

        return {
            statusCode: 200,
            body: JSON.stringify(result[0])
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Database Error' }) 
        };
    }
};
