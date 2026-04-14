const { neon } = require('@neondatabase/serverless');

const FEMALE_QUESTS = [
    { id: 1, title: 'Wake up on time', gold: 1 },
    { id: 2, title: 'Drink water', gold: 1 },
    { id: 3, title: 'Feed cats', gold: 1 },
    { id: 4, title: 'Cook food', gold: 3 },
    { id: 5, title: 'Work/School/Business', gold: 3 },
    { id: 6, title: 'Read Bible', gold: 2 },
    { id: 7, title: 'Sleep on time', gold: 1 }
];

const MALE_QUESTS = [
    { id: 1, title: 'Wake up on time', gold: 1 },
    { id: 2, title: 'Ice submerge', gold: 3 },
    { id: 3, title: 'Podcast', gold: 1 },
    { id: 4, title: 'Workout', gold: 3 },
    { id: 5, title: 'Cold bath', gold: 1 },
    { id: 6, title: 'Bullet journal', gold: 2 },
    { id: 7, title: 'Sleep on time', gold: 1 }
];

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        return res.status(405).send('Method Not Allowed');
    }

    try {
        const userId = req.query.userId;
        const sql = neon(process.env.DATABASE_URL);

        // Fetch user context
        const userQ = await sql`SELECT gender FROM users WHERE id = ${userId}`;
        if (userQ.length === 0) return res.status(404).send('Not found');
        
        const gender = userQ[0].gender;
        const baseQuests = gender === 'male' ? MALE_QUESTS : FEMALE_QUESTS;

        // Fetch completed quests for today (GMT+8)
        const completedQ = await sql`
            SELECT quest_id FROM daily_quests
            WHERE user_id = ${userId} AND day_date = (NOW() AT TIME ZONE 'Asia/Manila')::date
        `;
        
        const completedIds = completedQ.map(q => q.quest_id);

        const questsList = baseQuests.map(q => ({
            id: q.id,
            title: q.title,
            gold: q.gold,
            completed: completedIds.includes(q.id)
        }));

        res.status(200).json({ quests: questsList });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database Error' });
    }
};
