-- H A V E N - Database Schema (Neon / Postgres)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    pin CHAR(4) NOT NULL,
    gender VARCHAR(10),
    level INTEGER DEFAULT 1,
    xp INTEGER DEFAULT 0,
    gold INTEGER DEFAULT 0,
    pos_x INTEGER DEFAULT 0,
    pos_y INTEGER DEFAULT 0,
    spins INTEGER DEFAULT 0,
    chat_msg VARCHAR(100),
    chat_at TIMESTAMP WITH TIME ZONE,
    last_heartbeat TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS check_ins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    day_date DATE NOT NULL,
    UNIQUE(user_id, day_date)
);

CREATE TABLE IF NOT EXISTS habits (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    title VARCHAR(100) NOT NULL,
    streak INTEGER DEFAULT 0,
    last_completed TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS daily_quests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    quest_id INTEGER NOT NULL,
    day_date DATE NOT NULL,
    UNIQUE(user_id, quest_id, day_date)
);

CREATE TABLE IF NOT EXISTS irl_quests (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER REFERENCES users(id),
    receiver_id INTEGER REFERENCES users(id),
    task_name VARCHAR(100) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
