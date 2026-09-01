const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 4000;
const API_URL = process.env.API_URL || 'http://localhost:3000';
const JWKS_URI = `${API_URL}/.well-known/jwks.json`;

app.use(express.json());

// --- JWKS cache + JWT verification (SDK middleware, JS port) ---
let jwksCache = { keys: null, fetchedAt: 0 };
const CACHE_TTL_MS = 60 * 60 * 1000;

async function getJwks() {
  const now = Date.now();
  if (jwksCache.keys && now - jwksCache.fetchedAt < CACHE_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(JWKS_URI);
  if (!res.ok) throw new Error(`JWKS fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  jwksCache = { keys: data.keys, fetchedAt: now };
  return data.keys;
}

function jwkToPem(key) {
  const pubKeyObject = crypto.createPublicKey({ key, format: 'jwk' });
  return pubKeyObject.export({ type: 'spki', format: 'pem' });
}

async function verifyToken(token) {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header.kid) throw new Error('JWT missing kid header');

  const keys = await getJwks();
  const key = keys.find((k) => k.kid === decoded.header.kid);
  if (!key) throw new Error(`JWKS: key not found for kid=${decoded.header.kid}`);

  const pem = jwkToPem(key);
  return new Promise((resolve, reject) => {
    jwt.verify(token, pem, { algorithms: ['RS256'] }, (err, payload) => {
      if (err) reject(err);
      else resolve(payload);
    });
  });
}

// --- Auth middleware (equivalent to SDK expressAuthMiddleware) ---
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 'MISSING_AUTH_HEADER', message: 'Missing or invalid authorization header' });
  }
  const token = authHeader.substring(7);
  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    // C36/C38 FIX: Do not expose internal JWT error messages.
    // err.message may leak stack traces, key IDs, or algorithm details.
    console.error('[authMiddleware] Token verification failed:', err.name || 'UnknownError');
    const msg = err.name === 'TokenExpiredError' ? 'Token has expired'
      : err.name === 'NotBeforeError'    ? 'Token not yet valid'
      : 'Invalid or expired token';
    return res.status(401).json({ code: 'TOKEN_INVALID', message: msg });
  }
}

// --- In-memory task store ---
let tasks = [];
let taskCounter = 1;

// --- Webhook receiver (from Fase 8) ---
let receivedWebhooks = [];

// --- Routes ---

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'nexusauth-test-app',
    apiUrl: API_URL,
    timestamp: new Date().toISOString(),
  });
});

app.post('/webhook', (req, res) => {
  const entry = {
    headers: {
      'x-webhook-signature': req.headers['x-webhook-signature'],
      'x-webhook-event': req.headers['x-webhook-event'],
    },
    body: req.body,
    receivedAt: new Date().toISOString(),
  };
  receivedWebhooks.push(entry);
  console.log('[Webhook Received]', JSON.stringify(entry));
  res.status(200).json({ ok: true });
});

app.get('/webhook-received', (_req, res) => {
  res.json({ count: receivedWebhooks.length, webhooks: receivedWebhooks });
});

app.delete('/webhook-received', (_req, res) => {
  receivedWebhooks = [];
  res.json({ message: 'Cleared' });
});

// --- Auth proxy: login against NexusAuth ---
app.post('/auth/login', async (req, res) => {
  try {
    const apiRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': req.headers['user-agent'] || 'test-app' },
      body: JSON.stringify({ email: req.body.email, password: req.body.password }),
    });
    const data = await apiRes.json();
    if (!apiRes.ok) return res.status(apiRes.status).json(data);
    res.json(data);
  } catch (err) {
    // SECURITY: Do not expose internal error messages in responses.
    console.error('[auth/login proxy error]', err.message);
    res.status(502).json({ message: 'Authentication service unavailable' });
  }
});

// --- Protected task routes ---

app.get('/tasks', authMiddleware, (_req, res) => {
  const userTasks = tasks.filter((t) => t.userId === _req.user.sub);
  res.json(userTasks);
});

app.post('/tasks', authMiddleware, (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ message: 'Title is required' });

  const task = {
    id: taskCounter++,
    title,
    description: description || '',
    userId: req.user.sub,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  res.status(201).json(task);
});

app.patch('/tasks/:id', authMiddleware, (req, res) => {
  const task = tasks.find((t) => t.id === parseInt(req.params.id) && t.userId === req.user.sub);
  if (!task) return res.status(404).json({ message: 'Task not found' });

  if (req.body.title !== undefined) task.title = req.body.title;
  if (req.body.description !== undefined) task.description = req.body.description;
  if (req.body.completed !== undefined) task.completed = req.body.completed;

  res.json(task);
});

app.delete('/tasks/:id', authMiddleware, (req, res) => {
  const idx = tasks.findIndex((t) => t.id === parseInt(req.params.id) && t.userId === req.user.sub);
  if (idx === -1) return res.status(404).json({ message: 'Task not found' });

  const [deleted] = tasks.splice(idx, 1);
  res.json(deleted);
});

app.get('/me', authMiddleware, (req, res) => {
  res.json({
    sub: req.user.sub,
    email: req.user.email,
    role: req.user.role,
    tenantId: req.user.tenantId,
    permissions: req.user.permissions,
  });
});

app.listen(PORT, () => {
  console.log(`Test app running on port ${PORT}`);
  console.log(`NexusAuth API: ${API_URL}`);
  console.log(`JWKS URI: ${JWKS_URI}`);
});
