const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 20;
const MAX_ID_LEN = 64;
const MAX_SCORE = 5000; // generous ceiling above any realistic 60s run — blocks obviously spoofed values
const MAX_STREAK = 3650; // ~10 years — sanity cap, purely cosmetic so no strict anti-cheat needed
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 30; // keep past daily boards/events ~30 days, well past the campaign
const LINK_PATTERN = /(https?:\/\/|www\.|\.[a-z]{2,6}(\/|\b))/i;
const EVENT_TYPES = new Set(['game_started', 'game_completed', 'share_used']);
const DIFFICULTIES = new Set(['easy', 'normal', 'hard']);
const LIST_PAGE_LIMIT = 1000; // KV max per list() call
const LIST_MAX_PAGES = 20; // safety bound against a runaway pagination loop

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
    const prefix = scope === 'daily' ? `score:daily:${date}:` : 'score:alltime:';
    const entries = await listTopScores(env, prefix);
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

    // Each player owns a distinct KV key (score:<board>:<playerId>) so concurrent submissions from
    // DIFFERENT players never race on the same key — only a single player's own double-submit could
    // race, which is low-stakes. The board itself is reconstructed at read time via list()+metadata,
    // so no shared read-modify-write blob exists to be clobbered by concurrent writers.
    const alltime = await upsertPlayerScore(env, 'score:alltime:', entry, undefined);
    let daily = null;
    if (mode === 'daily') {
      daily = await upsertPlayerScore(env, `score:daily:${todayKey()}:`, entry, DAILY_TTL_SECONDS);
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

    // Each event gets its own unique key — a blind, uncontested write, no read-modify-write at all.
    const date = todayKey();
    const id = crypto.randomUUID();
    await env.LEADERBOARD.put(`event:${date}:${id}`, '', {
      metadata: { type, lang, difficulty, mode, score },
      expirationTtl: DAILY_TTL_SECONDS
    });
    return json({ ok: true });
  }

  if (url.pathname === '/api/stats' && request.method === 'GET') {
    const date = url.searchParams.get('date') || todayKey();
    const stats = await computeStats(env, date);
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

async function listAllKeys(env, prefix) {
  const keys = [];
  let cursor;
  for (let page = 0; page < LIST_MAX_PAGES; page++) {
    const res = await env.LEADERBOARD.list({ prefix, cursor, limit: LIST_PAGE_LIMIT });
    keys.push(...res.keys);
    if (res.list_complete || !res.cursor) break;
    cursor = res.cursor;
  }
  return keys;
}

async function listTopScores(env, prefix) {
  const keys = await listAllKeys(env, prefix);
  const entries = keys
    .filter(k => k.metadata && typeof k.metadata.score === 'number')
    .map(k => ({
      id: k.name.slice(prefix.length),
      name: k.metadata.name,
      score: k.metadata.score,
      streak: k.metadata.streak || 0,
      ts: k.metadata.ts || 0
    }));
  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, MAX_ENTRIES);
}

async function upsertPlayerScore(env, prefix, entry, ttlSeconds) {
  const key = prefix + entry.id;
  const existing = await env.LEADERBOARD.getWithMetadata(key);
  const prevScore = existing && existing.metadata ? existing.metadata.score : -1;
  if (entry.score > prevScore) {
    const opts = { metadata: { name: entry.name, score: entry.score, streak: entry.streak, ts: entry.ts } };
    if (ttlSeconds) opts.expirationTtl = ttlSeconds;
    await env.LEADERBOARD.put(key, '', opts);
  }
  return listTopScores(env, prefix);
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

async function computeStats(env, date) {
  const stats = emptyStats();
  const keys = await listAllKeys(env, `event:${date}:`);
  for (const key of keys) {
    const m = key.metadata;
    if (!m) continue;
    if (m.type === 'game_started') {
      stats.gamesStarted += 1;
      if (m.lang) stats.byLang[m.lang] = (stats.byLang[m.lang] || 0) + 1;
      if (m.difficulty) stats.byDifficulty[m.difficulty] = (stats.byDifficulty[m.difficulty] || 0) + 1;
      if (m.mode === 'daily') stats.dailyChallengePlays += 1;
    } else if (m.type === 'game_completed') {
      stats.gamesCompleted += 1;
      if (typeof m.score === 'number') stats.totalScore += m.score;
    } else if (m.type === 'share_used') {
      stats.shareUsed += 1;
    }
  }
  return stats;
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
