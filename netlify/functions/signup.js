const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { name, pin, gender } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Check if user exists
        const existing = await sql`SELECT * FROM users WHERE name = ${name}`;
        if (existing.length > 0) {
            return { 
                statusCode: 400, 
                body: JSON.stringify({ error: 'User already exists' }) 
            };
        }

        // Create user
        const result = await sql`
            INSERT INTO users (name, pin, gender) 
            VALUES (${name}, ${pin}, ${gender}) 
            RETURNING id, name, gender, level, xp, gold
        `;

        return {
            statusCode: 200,
            body: JSON.stringify(result[0])
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Database Error', details: err.message }) 
        };
    }
};
