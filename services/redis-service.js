const Redis = require('ioredis');

const isRedisEnabled = process.env.USE_REDIS === 'true' && !!process.env.REDIS_URL;

let redis = null;

function getRedis() {
    if (!isRedisEnabled) return null;
    if (!redis) {
        redis = new Redis(process.env.REDIS_URL, {
            maxRetriesPerRequest: 3,
            enableReadyCheck: true
        });

        redis.on('connect', () => console.log('Redis connected'));
        redis.on('error', (err) => console.error('Redis error:', err.message));
    }
    return redis;
}

async function setSession(token, userId, ttlSeconds) {
    const client = getRedis();
    if (!client) return false;
    await client.set(`session:${token}`, String(userId), 'EX', ttlSeconds);
    return true;
}

async function getSessionUserId(token) {
    const client = getRedis();
    if (!client) return null;
    const userId = await client.get(`session:${token}`);
    return userId ? parseInt(userId, 10) : null;
}

async function deleteSession(token) {
    const client = getRedis();
    if (!client) return false;
    await client.del(`session:${token}`);
    return true;
}

async function enqueueMatchmaking(queueName, userId, payload = {}) {
    const client = getRedis();
    if (!client) return null;

    const key = `mm:${queueName}`;
    const now = Date.now();
    await client.zadd(key, now, String(userId));
    await client.hset(`mm:user:${userId}`, {
        queue: queueName,
        payload: JSON.stringify(payload),
        enqueuedAt: String(now)
    });

    const users = await client.zrange(key, 0, 1);
    if (users.length < 2) {
        return { matched: false };
    }

    const playerA = parseInt(users[0], 10);
    const playerB = parseInt(users[1], 10);

    await client.zrem(key, String(playerA), String(playerB));

    const roomId = `game-${Date.now()}-${playerA}-${playerB}`;
    const match = {
        roomId,
        players: [playerA, playerB],
        createdAt: now
    };

    await client.set(`mm:match:${playerA}`, JSON.stringify(match), 'EX', 120);
    await client.set(`mm:match:${playerB}`, JSON.stringify(match), 'EX', 120);

    return { matched: true, match };
}

async function getMatchForUser(userId) {
    const client = getRedis();
    if (!client) return null;

    const data = await client.get(`mm:match:${userId}`);
    return data ? JSON.parse(data) : null;
}

module.exports = {
    isRedisEnabled,
    getRedis,
    setSession,
    getSessionUserId,
    deleteSession,
    enqueueMatchmaking,
    getMatchForUser
};
