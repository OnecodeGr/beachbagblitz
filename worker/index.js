const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 20;
const MAX_ID_LEN = 64;
const MAX_SCORE = 5000; // generous ceiling above any realistic 60s run — blocks obviously spoofed values
const MAX_ENDLESS_SCORE = 200000; // endless has no round time cap, so a much higher ceiling is needed
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
    const scopeParam = url.searchParams.get('scope');
    const scope = scopeParam === 'daily' ? 'daily' : scopeParam === 'freeplay' ? 'freeplay' : scopeParam === 'endless' ? 'endless' : 'alltime';
    const date = todayKey();
    const prefix = scope === 'daily' ? `score:daily:${date}:` : scope === 'freeplay' ? 'score:freeplay:' : scope === 'endless' ? 'score:endless:' : 'score:alltime:';
    const entries = await listTopScores(env, prefix);
    return json({ scope, date: scope === 'daily' ? date : undefined, entries });
  }

  if (url.pathname === '/api/score' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

    const id = typeof body.id === 'string' ? body.id.trim().slice(0, MAX_ID_LEN) : '';
    const name = sanitizeName(body.name);
    const score = Math.floor(Number(body.score));
    const mode = body.mode === 'daily' ? 'daily' : body.mode === 'endless' ? 'endless' : 'free';
    const streak = Math.max(0, Math.min(MAX_STREAK, Math.floor(Number(body.streak) || 0)));
    const scoreCeiling = mode === 'endless' ? MAX_ENDLESS_SCORE : MAX_SCORE;
    // "Reached top speed" badge — only meaningful for endless mode, so ignore the flag entirely
    // for any other mode even if a client sent it.
    const sped = mode === 'endless' && body.sped === true;

    if (!id) return json({ error: 'invalid_id' }, 400);
    if (!name) return json({ error: 'invalid_name' }, 400);
    if (!Number.isFinite(score) || score < 0 || score > scoreCeiling) return json({ error: 'invalid_score' }, 400);

    const entry = { id, name, score, streak, sped, ts: Date.now() };

    // Each player owns a distinct KV key (score:<board>:<playerId>) so concurrent submissions from
    // DIFFERENT players never race on the same key — only a single player's own double-submit could
    // race, which is low-stakes. The board itself is reconstructed at read time via list()+metadata,
    // so no shared read-modify-write blob exists to be clobbered by concurrent writers.
    //
    // score:alltime: and score:daily:{date}: are untouched below — every daily/free submission still
    // writes to alltime and only daily submissions write to the daily board, exactly as before.
    // score:freeplay: and score:endless: are separate, previously-nonexistent prefixes — they cannot
    // collide with or overwrite anything that already exists in KV. Endless is deliberately excluded
    // from score:alltime: since its uncapped run length makes its scores incomparable to the 60s modes.
    let alltime = null;
    let daily = null;
    let freeplay = null;
    let endless = null;
    if (mode === 'daily') {
      alltime = await upsertPlayerScore(env, 'score:alltime:', entry, undefined);
      daily = await upsertPlayerScore(env, `score:daily:${todayKey()}:`, entry, DAILY_TTL_SECONDS);
    } else if (mode === 'endless') {
      endless = await upsertPlayerScore(env, 'score:endless:', entry, undefined);
    } else {
      alltime = await upsertPlayerScore(env, 'score:alltime:', entry, undefined);
      freeplay = await upsertPlayerScore(env, 'score:freeplay:', entry, undefined);
    }
    return json({ ok: true, alltime, daily, freeplay, endless });
  }

  if (url.pathname === '/api/event' && request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) { return json({ error: 'bad_json' }, 400); }

    const type = EVENT_TYPES.has(body.type) ? body.type : null;
    if (!type) return json({ error: 'invalid_type' }, 400);

    const lang = body.lang === 'en' ? 'en' : 'gr';
    const difficulty = DIFFICULTIES.has(body.difficulty) ? body.difficulty : null;
    const mode = body.mode === 'daily' ? 'daily' : body.mode === 'endless' ? 'endless' : 'free';
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
    const range = url.searchParams.get('range');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    if (range === 'all' || from || to) {
      const { total, byDay } = await computeAggregateStats(env, from || null, to || null);
      return json({ range: range === 'all' ? 'all' : { from: from || null, to: to || null }, stats: total, byDay });
    }

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
      sped: k.metadata.sped || false,
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
    const opts = { metadata: { name: entry.name, score: entry.score, streak: entry.streak, sped: entry.sped || false, ts: entry.ts } };
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
    endlessPlays: 0,
    byLang: { gr: 0, en: 0 },
    byDifficulty: { easy: 0, normal: 0, hard: 0 }
  };
}

function accumulateStat(stats, m) {
  if (!m) return;
  if (m.type === 'game_started') {
    stats.gamesStarted += 1;
    if (m.lang) stats.byLang[m.lang] = (stats.byLang[m.lang] || 0) + 1;
    if (m.difficulty) stats.byDifficulty[m.difficulty] = (stats.byDifficulty[m.difficulty] || 0) + 1;
    if (m.mode === 'daily') stats.dailyChallengePlays += 1;
    if (m.mode === 'endless') stats.endlessPlays += 1;
  } else if (m.type === 'game_completed') {
    stats.gamesCompleted += 1;
    if (typeof m.score === 'number') stats.totalScore += m.score;
  } else if (m.type === 'share_used') {
    stats.shareUsed += 1;
  }
}

function finalizeStats(stats) {
  stats.averageScore = stats.gamesCompleted > 0 ? Math.round(stats.totalScore / stats.gamesCompleted) : 0;
  return stats;
}

async function computeStats(env, date) {
  const stats = emptyStats();
  const keys = await listAllKeys(env, `event:${date}:`);
  for (const key of keys) accumulateStat(stats, key.metadata);
  return finalizeStats(stats);
}

// Aggregates every recorded event (optionally bounded to [fromDate, toDate], inclusive, either end
// optional) into one grand total plus a per-day breakdown — for a "how's the whole campaign doing"
// view rather than a single day. Events auto-expire from KV after ~30 days (see DAILY_TTL_SECONDS),
// well past a 2-week campaign, so listing the whole `event:` prefix stays cheap.
async function computeAggregateStats(env, fromDate, toDate) {
  const keys = await listAllKeys(env, 'event:');
  const total = emptyStats();
  const byDateMap = new Map();

  for (const key of keys) {
    const date = key.name.split(':')[1]; // "event:{date}:{uuid}"
    if (fromDate && date < fromDate) continue;
    if (toDate && date > toDate) continue;

    accumulateStat(total, key.metadata);
    if (!byDateMap.has(date)) byDateMap.set(date, emptyStats());
    accumulateStat(byDateMap.get(date), key.metadata);
  }

  finalizeStats(total);
  const byDay = Array.from(byDateMap.entries())
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, stats]) => ({ date, stats: finalizeStats(stats) }));

  return { total, byDay };
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
