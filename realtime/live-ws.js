const { WebSocketServer } = require('ws');
const jwt = require('jsonwebtoken');

function initLiveWebSocketServer(httpServer, redisService) {
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-key-not-for-production';

    const wss = new WebSocketServer({
        server: httpServer,
        path: '/ws/live'
    });

    const gameRooms = new Map();

    function joinGame(gameId, ws) {
        if (!gameRooms.has(gameId)) gameRooms.set(gameId, new Set());
        gameRooms.get(gameId).add(ws);
    }

    function leaveGame(gameId, ws) {
        const room = gameRooms.get(gameId);
        if (!room) return;
        room.delete(ws);
        if (room.size === 0) gameRooms.delete(gameId);
    }

    function broadcastToGame(gameId, payload, exceptSocket = null) {
        const room = gameRooms.get(gameId);
        if (!room) return;

        const message = JSON.stringify(payload);
        room.forEach((client) => {
            if (client.readyState === client.OPEN && client !== exceptSocket) {
                client.send(message);
            }
        });
    }

    wss.on('connection', (ws, req) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');

            if (!token) {
                ws.close(1008, 'Missing token');
                return;
            }

            const decoded = jwt.verify(token, JWT_SECRET);
            ws.userId = decoded.id;
            ws.gameId = null;

            ws.send(JSON.stringify({ type: 'connected', userId: ws.userId }));

            ws.on('message', async (raw) => {
                let msg;
                try {
                    msg = JSON.parse(raw.toString());
                } catch (e) {
                    ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
                    return;
                }

                if (msg.type === 'join-game') {
                    if (!msg.gameId) return;
                    if (ws.gameId) leaveGame(ws.gameId, ws);
                    ws.gameId = String(msg.gameId);
                    joinGame(ws.gameId, ws);
                    ws.send(JSON.stringify({ type: 'joined-game', gameId: ws.gameId }));
                    return;
                }

                if (msg.type === 'player-action') {
                    if (!ws.gameId) return;
                    const event = {
                        type: 'player-action',
                        gameId: ws.gameId,
                        userId: ws.userId,
                        action: msg.action,
                        payload: msg.payload || {},
                        ts: Date.now()
                    };

                    broadcastToGame(ws.gameId, event, ws);

                    const redis = redisService.getRedis();
                    if (redis) {
                        await redis.publish(`live:${ws.gameId}`, JSON.stringify(event));
                    }
                    return;
                }
            });

            ws.on('close', () => {
                if (ws.gameId) leaveGame(ws.gameId, ws);
            });
        } catch (err) {
            ws.close(1008, 'Authentication failed');
        }
    });

    console.log('Native WebSocket server ready on /ws/live');
    return wss;
}

module.exports = { initLiveWebSocketServer };
