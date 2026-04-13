const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { id, x, y, msg } = JSON.parse(event.body);
        if (!id) return { statusCode: 400, body: 'ID Required' };

        const sql = neon(process.env.DATABASE_URL);

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

        return {
            statusCode: 200,
            body: JSON.stringify({ players: others })
        };
    } catch (err) {
        console.error(err);
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: 'Database Error' }) 
        };
    }
};
