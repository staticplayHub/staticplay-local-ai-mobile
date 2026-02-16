const http = require('node:http');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT || 8787);
const HOST = '0.0.0.0';
const APP_KEY = process.env.STATICPLAY_APP_KEY || 'VVXchat';

const rooms = [
  { id: 'general', name: 'General', description: 'Friendly public chat', isAdult: false },
  { id: 'builders', name: 'Memes', description: 'Gamers posting meme chaos', isAdult: false },
  { id: 'deals', name: 'Alliance', description: 'Squad coordination room', isAdult: false },
];

const messagesByRoom = {
  general: [],
  builders: [],
  deals: [],
};

const userFlags = new Map();
const themesByUser = new Map();
const dmThreadsById = new Map();
const dmMessagesByThread = new Map();

const DEFAULT_THEME = {
  messageBoxColor: '#101a2c',
  messageTextColor: '#e9f1ff',
};

function normalizeAlias(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

function makeThreadId(selfAlias, otherAlias) {
  const members = [normalizeAlias(selfAlias), normalizeAlias(otherAlias)].sort();
  return `dm_${members[0]}_${members[1]}`;
}

function getOtherAlias(thread, selfAlias) {
  const self = normalizeAlias(selfAlias);
  const first = normalizeAlias(thread.labels[0]);
  const second = normalizeAlias(thread.labels[1]);
  if (first === self) {
    return thread.labels[1];
  }
  if (second === self) {
    return thread.labels[0];
  }
  return thread.labels[1];
}

function json(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'access-control-allow-headers': 'content-type,x-staticplay-app-key,x-staticplay-user-id',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-origin': '*',
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024 * 8) {
        reject(new Error('Body too large'));
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function getUserId(req) {
  const header = req.headers['x-staticplay-user-id'];
  if (Array.isArray(header)) {
    return header[0];
  }
  return header || 'anonymous';
}

function requireAuth(req, res) {
  const key = req.headers['x-staticplay-app-key'];
  if (key !== APP_KEY) {
    json(res, 401, { error: 'Unauthorized app key' });
    return false;
  }
  return true;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return;
  }

  if (!pathname.startsWith('/v1')) {
    json(res, 404, { error: 'Not found' });
    return;
  }

  if (!requireAuth(req, res)) {
    return;
  }

  const userId = getUserId(req);
  const profile = userFlags.get(userId) || { is18Verified: false };
  userFlags.set(userId, profile);

  try {
    if (req.method === 'GET' && pathname === '/v1/health') {
      json(res, 200, { ok: true, service: 'staticplay-chat-server', timestamp: new Date().toISOString() });
      return;
    }

    if (req.method === 'GET' && pathname === '/v1/me') {
      json(res, 200, { userId, is18Verified: !!profile.is18Verified });
      return;
    }

    if (req.method === 'GET' && pathname === '/v1/rooms') {
      json(res, 200, { rooms });
      return;
    }

    if (req.method === 'GET' && pathname === '/v1/theme') {
      const theme = themesByUser.get(userId) || DEFAULT_THEME;
      json(res, 200, { theme });
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/theme') {
      const body = await readBody(req);
      const messageBoxColor = typeof body.messageBoxColor === 'string' ? body.messageBoxColor.trim() : '';
      const messageTextColor = typeof body.messageTextColor === 'string' ? body.messageTextColor.trim() : '';
      const hexPattern = /^#([0-9a-fA-F]{6})$/;
      if (!hexPattern.test(messageBoxColor) || !hexPattern.test(messageTextColor)) {
        json(res, 400, { error: 'Theme colors must be HEX like #101a2c' });
        return;
      }
      const theme = { messageBoxColor: messageBoxColor.toLowerCase(), messageTextColor: messageTextColor.toLowerCase() };
      themesByUser.set(userId, theme);
      json(res, 200, { theme });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/v1/rooms/') && pathname.endsWith('/messages')) {
      const parts = pathname.split('/');
      const roomId = parts[3];
      const messages = messagesByRoom[roomId] || [];
      json(res, 200, { messages });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/v1/rooms/') && pathname.endsWith('/messages')) {
      const parts = pathname.split('/');
      const roomId = parts[3];
      if (!messagesByRoom[roomId]) {
        json(res, 404, { error: 'Unknown room' });
        return;
      }
      const body = await readBody(req);
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
      const sender = typeof body.sender === 'string' ? body.sender.trim() : 'User';
      if (!text && !imageDataUrl) {
        json(res, 400, { error: 'text or imageDataUrl is required' });
        return;
      }
      const message = {
        id: `${roomId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        imageDataUrl,
        roomId,
        sender: sender || 'User',
        sentAt: new Date().toISOString(),
        text,
      };
      messagesByRoom[roomId].push(message);
      json(res, 201, { message });
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/verify18/mock-complete') {
      profile.is18Verified = true;
      userFlags.set(userId, profile);
      json(res, 200, { is18Verified: true, provider: 'sumsub-mock' });
      return;
    }

    if (req.method === 'POST' && pathname === '/v1/dms/threads/open') {
      const body = await readBody(req);
      const selfAlias = typeof body.selfAlias === 'string' ? body.selfAlias.trim() : '';
      const otherAlias = typeof body.otherAlias === 'string' ? body.otherAlias.trim() : '';
      if (!selfAlias || !otherAlias) {
        json(res, 400, { error: 'selfAlias and otherAlias are required' });
        return;
      }
      const threadId = makeThreadId(selfAlias, otherAlias);
      const existing = dmThreadsById.get(threadId);
      if (!existing) {
        const thread = {
          id: threadId,
          labels: [selfAlias, otherAlias],
          updatedAt: new Date().toISOString(),
        };
        dmThreadsById.set(threadId, thread);
        dmMessagesByThread.set(threadId, []);
      }
      const thread = dmThreadsById.get(threadId);
      json(res, 200, {
        thread: {
          id: thread.id,
          otherAlias,
          updatedAt: thread.updatedAt,
        },
      });
      return;
    }

    if (req.method === 'GET' && pathname === '/v1/dms/threads') {
      const selfAlias = url.searchParams.get('selfAlias') || '';
      const self = normalizeAlias(selfAlias);
      if (!self) {
        json(res, 400, { error: 'selfAlias query is required' });
        return;
      }
      const threads = Array.from(dmThreadsById.values())
        .filter((thread) => thread.labels.map((label) => normalizeAlias(label)).includes(self))
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .map((thread) => ({
          id: thread.id,
          otherAlias: getOtherAlias(thread, selfAlias),
          updatedAt: thread.updatedAt,
        }));
      json(res, 200, { threads });
      return;
    }

    if (req.method === 'GET' && pathname.startsWith('/v1/dms/threads/') && pathname.endsWith('/messages')) {
      const parts = pathname.split('/');
      const threadId = parts[4];
      if (!dmThreadsById.has(threadId)) {
        json(res, 404, { error: 'Unknown DM thread' });
        return;
      }
      const messages = dmMessagesByThread.get(threadId) || [];
      json(res, 200, { messages });
      return;
    }

    if (req.method === 'POST' && pathname.startsWith('/v1/dms/threads/') && pathname.endsWith('/messages')) {
      const parts = pathname.split('/');
      const threadId = parts[4];
      if (!dmThreadsById.has(threadId)) {
        json(res, 404, { error: 'Unknown DM thread' });
        return;
      }
      const body = await readBody(req);
      const text = typeof body.text === 'string' ? body.text.trim() : '';
      const imageDataUrl = typeof body.imageDataUrl === 'string' ? body.imageDataUrl : '';
      const sender = typeof body.sender === 'string' ? body.sender.trim() : 'User';
      if (!text && !imageDataUrl) {
        json(res, 400, { error: 'text or imageDataUrl is required' });
        return;
      }
      const message = {
        id: `${threadId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        imageDataUrl,
        roomId: threadId,
        sender: sender || 'User',
        sentAt: new Date().toISOString(),
        text,
      };
      const existing = dmMessagesByThread.get(threadId) || [];
      existing.push(message);
      dmMessagesByThread.set(threadId, existing);
      const thread = dmThreadsById.get(threadId);
      thread.updatedAt = message.sentAt;
      dmThreadsById.set(threadId, thread);
      json(res, 201, { message });
      return;
    }

    json(res, 404, { error: 'Route not found' });
  } catch (error) {
    json(res, 500, { error: error.message || 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`[staticplay-chat-server] listening on http://${HOST}:${PORT}`);
  console.log('[staticplay-chat-server] app lock key:', APP_KEY);
});
