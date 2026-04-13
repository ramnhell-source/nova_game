const { neon } = require('@neondatabase/serverless');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const userId = event.queryStringParameters.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch user data
        const users = await sql`SELECT name, gender FROM users WHERE id = ${userId}`;
        if (users.length === 0) return { statusCode: 404, body: 'User not found' };
        const user = users[0];

        // Total Logins (Check-ins count)
        const totalLoginsQ = await sql`SELECT COUNT(*) as count FROM check_ins WHERE user_id = ${userId}`;
        const totalLogins = parseInt(totalLoginsQ[0].count, 10);

        // Streak calculation (consecutive days including today or yesterday)
        const checkins = await sql`
            SELECT day_date FROM check_ins 
            WHERE user_id = ${userId}
            ORDER BY day_date DESC
        `;
        
        let streak = 0;
        let phtNow = new Date();
        let utc = phtNow.getTime() + (phtNow.getTimezoneOffset() * 60000);
        let today = new Date(utc + (3600000 * 8));
        today.setHours(0,0,0,0);

        let checkDate = new Date(today);
        let foundTodayOrYesterday = false;

        for (let i = 0; i < checkins.length; i++) {
            let rowDate = new Date(checkins[i].day_date);
            rowDate.setHours(0,0,0,0);
            
            let diffDays = Math.round((checkDate - rowDate) / (1000 * 60 * 60 * 24));

            if (i === 0) {
                if (diffDays === 0 || diffDays === 1) {
                    streak++;
                    checkDate = rowDate;
                } else {
                    break; // Streak broken
                }
            } else {
                if (diffDays === 1) {
                    streak++;
                    checkDate = rowDate;
                } else {
                    break;
                }
            }
        }

        // Habits/Goals stats (Total lifetime & Today)
        const allQuestsQ = await sql`
            SELECT day_date FROM daily_quests 
            WHERE user_id = ${userId}
        `;
        
        let totalGoalsAchieved = allQuestsQ.length;
        let dailyGoalsDone = 0;

        allQuestsQ.forEach(q => {
            let qDate = new Date(q.day_date);
            let qUtc = qDate.getTime() + (qDate.getTimezoneOffset() * 60000);
            let qPh = new Date(qUtc + (3600000 * 8));
            if (qPh.getFullYear() === today.getFullYear() && 
                qPh.getMonth() === today.getMonth() && 
                qPh.getDate() === today.getDate()) {
                dailyGoalsDone++;
            }
        });

        // Current Month Checkins
        const monthCheckins = await sql`
            SELECT day_date 
            FROM check_ins 
            WHERE user_id = ${userId} 
            AND EXTRACT(MONTH FROM day_date) = EXTRACT(MONTH FROM (NOW() AT TIME ZONE 'Asia/Manila'))
            AND EXTRACT(YEAR FROM day_date) = EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Asia/Manila'))
        `;

        return {
            statusCode: 200,
            body: JSON.stringify({
                name: user.name,
                gender: user.gender,
                streak: streak,
                totalLogins: totalLogins,
                totalGoalsAchieved: totalGoalsAchieved,
                dailyGoalsDone: dailyGoalsDone,
                dailyGoalsTotal: 7, // Hardcoded to 7 Quests basis
                dates: monthCheckins.map(c => c.day_date)
            })
        };
    } catch (err) {
        console.error(err);
        return { statusCode: 500, body: JSON.stringify({ error: 'Database Error' }) };
    }
};
