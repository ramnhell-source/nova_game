const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { userId } = JSON.parse(event.body);
        const sql = neon(process.env.DATABASE_URL);

        // Delete check-in for the current day (GMT+8)
        await sql`
            DELETE FROM check_ins 
            WHERE user_id = ${userId} 
            AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
