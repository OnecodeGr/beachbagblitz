const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 20;
const MAX_ID_LEN = 64;
const MAX_SCORE = 5000; // generous ceiling above any realistic 60s run — blocks obviously spoofed values
const MAX_STREAK = 3650; // ~10 years — sanity cap, purely cosmetic so no strict anti-cheat needed
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 30; // keep past daily boards/stats ~30 days, well past the campaign
const LINK_PATTERN = /(https?:\/\/|www\.|\.[a-z]{2,6}(\/|\b))/i;
const EVENT_TYPES = new Set(['game_started', 'game_completed', 'share_used']);
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);

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
    const streak = Math.max(0, Math.min(MAX_STREAK, Math.floor(Number(body.streak) || 0)));

    if (!id) return json({ error: 'invalid_id' }, 400);
    if (!name) return json({ error: 'invalid_name' }, 400);
    if (!Number.isFinite(score) || score < 0 || score > MAX_SCORE) return json({ error: 'invalid_score' }, 400);

    const entry = { id, name, score, streak, ts: Date.now() };

    // Keep each player's best-ever score per board (not last-submitted) — required for
    // "best of 3" daily attempts, and just generally the right leaderboard semantics.
    const alltime = await upsertBoard(env, 'alltime', entry, undefined);
    let daily = null;
    if (mode === 'daily') {
      daily = await upsertBoard(env, `daily:${todayKey()}`, entry, DAILY_TTL_SECONDS);
    }
    return json({ ok: true, alltime, daily });
  }

  if (url.pathname === '/api/event' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

    const type = EVENT_TYPES.has(body.type) ? body.type : null;
    if (!type) return json({ error: 'invalid_type' }, 400);

    const lang = body.lang === 'en' ? 'en' : 'gr';
    const difficulty = DIFFICULTIES.has(body.difficulty) ? body.difficulty : null;
    const mode = body.mode === 'daily' ? 'daily' : 'free';
    const scoreNum = Number(body.score);
    const score = Number.isFinite(scoreNum) ? Math.max(0, Math.min(MAX_SCORE, Math.floor(scoreNum))) : null;

    await recordEvent(env, type, { lang, difficulty, mode, score });
    return json({ ok: true });
  }

  if (url.pathname === '/api/stats' && request.method === 'GET') {
    const date = url.searchParams.get('date') || todayKey();
    const stats = await readStats(env, date);
    return json({ date, stats });
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
  const idx = current.findIndex(e => e.id === entry.id);
  let changed = false;
  if (idx === -1) {
    current.push(entry);
    changed = true;
  } else if (entry.score > current[idx].score) {
    current[idx] = entry;
    changed = true;
  }
  current.sort((a, b) => b.score - a.score);
  const top = current.slice(0, MAX_ENTRIES);
  if (changed) {
    const opts = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
    await env.LEADERBOARD.put(key, JSON.stringify(top), opts);
  }
  return top;
}

function emptyStats() {
  return {
    gamesStarted: 0,
    gamesCompleted: 0,
    totalScore: 0,
    shareUsed: 0,
    dailyChallengePlays: 0,
    byLang: { gr: 0, en: 0 },
    byDifficulty: { easy: 0, normal: 0, hard: 0 }
  };
}

async function readStats(env, date) {
  const raw = await env.LEADERBOARD.get(`stats:${date}`);
  const base = emptyStats();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw);
    return {
      ...base,
      ...parsed,
      byLang: { ...base.byLang, ...(parsed.byLang || {}) },
      byDifficulty: { ...base.byDifficulty, ...(parsed.byDifficulty || {}) }
    };
  } catch (e) {
    return base;
  }
}

async function recordEvent(env, type, meta) {
  const date = todayKey();
  const stats = await readStats(env, date);

  if (type === 'game_started') {
    stats.gamesStarted += 1;
    stats.byLang[meta.lang] = (stats.byLang[meta.lang] || 0) + 1;
    if (meta.difficulty) stats.byDifficulty[meta.difficulty] = (stats.byDifficulty[meta.difficulty] || 0) + 1;
    if (meta.mode === 'daily') stats.dailyChallengePlays += 1;
  } else if (type === 'game_completed') {
    stats.gamesCompleted += 1;
    if (meta.score != null) stats.totalScore += meta.score;
  } else if (type === 'share_used') {
    stats.shareUsed += 1;
  }

  await env.LEADERBOARD.put(`stats:${date}`, JSON.stringify(stats), { expirationTtl: DAILY_TTL_SECONDS });
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
