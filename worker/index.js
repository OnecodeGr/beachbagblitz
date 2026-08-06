const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 20;
const MAX_ID_LEN = 64;
const MAX_SCORE = 5000; // generous ceiling above any realistic 60s run — blocks obviously spoofed values
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 30; // keep past daily boards ~30 days, well past the campaign
const LINK_PATTERN = /(https?:\/\/|www\.|\.[a-z]{2,6}(\/|\b))/i;

// Campaign runs in Europe/Athens during August (EEST, UTC+3, no DST change expected mid-campaign).
// Hardcoding the offset keeps "today" aligned with the players' local midnight without pulling in a
// timezone library for a single fixed-date summer microsite.
const ATHENS_OFFSET_MS = 3 * 60 * 60 * 1000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (err) {
        return json({ error: 'server_error' }, 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
    const scope = url.searchParams.get('scope') === 'daily' ? 'daily' : 'alltime';
    const date = todayKey();
    const key = scope === 'daily' ? `daily:${date}` : 'alltime';
    const entries = await readBoard(env, key);
    return json({ scope, date: scope === 'daily' ? date : undefined, entries });
  }

  if (url.pathname === '/api/score' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

    const id = typeof body.id === 'string' ? body.id.trim().slice(0, MAX_ID_LEN) : '';
    const name = sanitizeName(body.name);
    const score = Math.floor(Number(body.score));
    const mode = body.mode === 'daily' ? 'daily' : 'free';

    if (!id) return json({ error: 'invalid_id' }, 400);
    if (!name) return json({ error: 'invalid_name' }, 400);
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return json({ error: 'invalid_score' }, 400);

    const entry = { id, name, score, ts: Date.now() };

    const alltime = await upsertBoard(env, 'alltime', entry, undefined);
    let daily = null;
    if (mode === 'daily') {
      daily = await upsertBoard(env, `daily:${todayKey()}`, entry, DAILY_TTL_SECONDS);
    }
    return json({ ok: true, alltime, daily });
  }

  return json({ error: 'not_found' }, 404);
}

function todayKey() {
  return new Date(Date.now() + ATHENS_OFFSET_MS).toISOString().slice(0, 10);
}

function sanitizeName(raw) {
  if (typeof raw !== 'string') return '';
  let name = raw.trim().slice(0, MAX_NAME_LEN);
  name = name.replace(/[<>]/g, '');
  if (!name) return '';
  if (LINK_PATTERN.test(name)) return '';
  return name;
}

async function readBoard(env, key) {
  const raw = await env.LEADERBOARD.get(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    return [];
  }
}

async function upsertBoard(env, key, entry, ttlSeconds) {
  const current = await readBoard(env, key);
  const filtered = current.filter(e => e.id !== entry.id);
  filtered.push(entry);
  filtered.sort((a, b) => b.score - a.score);
  const top = filtered.slice(0, MAX_ENTRIES);
  const opts = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
  await env.LEADERBOARD.put(key, JSON.stringify(top), opts);
  return top;
}

function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', ...corsHeaders() }
  });
}
