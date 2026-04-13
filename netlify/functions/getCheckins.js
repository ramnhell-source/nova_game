const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const userId = event.queryStringParameters.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch check-ins for the current month (GMT+8)
        const checkins = await sql`
            SELECT day_date 
            FROM check_ins 
            WHERE user_id = ${userId} 
            AND EXTRACT(MONTH FROM day_date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Manila'))
            AND EXTRACT(YEAR FROM day_date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Manila'))
        `;

        return {
            statusCode: 200,
            body: JSON.stringify({ dates: checkins.map(c => c.day_date) })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
