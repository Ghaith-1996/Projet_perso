import { apiGet } from "./apiFootballClient.js";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min
const cache = new Map();

// Pondérations (les 8 métriques que tu as listées)
const WEIGHTS = {
  goal: 3,
  assist: 2,
  shot: 0.2,
  dribbleSuccess: 0.5,
  interception: 0.15,
  duelWon: 0.1,
  yellow: -2,
  red: -5,
};

function toNum(v) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

function normalizePosition(pos) {
  const p = (pos || "").toLowerCase();
  if (p.includes("att")) return "ATT";
  if (p.includes("mid")) return "MID";
  if (p.includes("def")) return "DEF";
  if (p.includes("goal")) return "GK";
  return "UNK";
}

// Bloc cumulable (uniquement ce que tu veux scorer/afficher)
function extractStatBlock(stat) {
  return {
    minutes: toNum(stat?.games?.minutes),
    positionRaw: stat?.games?.position ?? null,

    goals: toNum(stat?.goals?.total),
    assists: toNum(stat?.goals?.assists),
    shots: toNum(stat?.shots?.total),

    dribblesSuccess: toNum(stat?.dribbles?.success),
    interceptions: toNum(stat?.tackles?.interceptions),
    duelsWon: toNum(stat?.duels?.won),

    yellow: toNum(stat?.cards?.yellow),
    red: toNum(stat?.cards?.red),
  };
}

function addAgg(target, add) {
  target.minutes += add.minutes;

  target.goals += add.goals;
  target.assists += add.assists;
  target.shots += add.shots;

  target.dribblesSuccess += add.dribblesSuccess;
  target.interceptions += add.interceptions;
  target.duelsWon += add.duelsWon;

  target.yellow += add.yellow;
  target.red += add.red;

  if (!target.positionRaw && add.positionRaw) target.positionRaw = add.positionRaw;
}

function computeScore(agg) {
  return (
    agg.goals * WEIGHTS.goal +
    agg.assists * WEIGHTS.assist +
    agg.shots * WEIGHTS.shot +
    agg.dribblesSuccess * WEIGHTS.dribbleSuccess +
    agg.interceptions * WEIGHTS.interception +
    agg.duelsWon * WEIGHTS.duelWon +
    agg.yellow * WEIGHTS.yellow +
    agg.red * WEIGHTS.red
  );
}

// Free plan: pages 1..3 max
async function fetchPlayersPage({ league, season, page, search }) {
  const safePage = Math.max(1, Math.min(3, page));
  return apiGet("/players", { league, season, page: safePage, search });
}

// Endpoints leaders (ajout stars)
async function fetchTopEndpoints({ league, season }) {
  const calls = await Promise.allSettled([
    apiGet("/players/topscorers", { league, season }),
    apiGet("/players/topassists", { league, season }),
    apiGet("/players/topyellowcards", { league, season }),
    apiGet("/players/topredcards", { league, season }),
  ]);

  const out = [];
  for (const r of calls) {
    if (r.status === "fulfilled") out.push(...(r.value?.response ?? []));
  }
  return out;
}

/**
 * IMPORTANT: dédoublonne les stats par joueur sur (leagueId, season, teamId)
 * Sinon tu recompte 2-3-4 fois le même bloc à cause du merge (players + top* + search).
 */
function aggregatePlayers(apiPlayers, { league, season }) {
  const byId = new Map();

  for (const row of apiPlayers) {
    const p = row?.player;
    const statsArr = row?.statistics ?? [];
    if (!p?.id) continue;

    if (!byId.has(p.id)) {
      byId.set(p.id, {
        id: p.id,
        name: p.name ?? "Inconnu",
        age: p.age ?? null,
        photo: p.photo ?? null,

        teamNames: new Set(),

        minutes: 0,
        goals: 0,
        assists: 0,
        shots: 0,
        dribblesSuccess: 0,
        interceptions: 0,
        duelsWon: 0,
        yellow: 0,
        red: 0,

        positionRaw: null,

        // clé anti double-compte
        seenStatBlocks: new Set(),
      });
    }

    const agg = byId.get(p.id);

    for (const stat of statsArr) {
      const leagueId = stat?.league?.id;
      const leagueSeason = stat?.league?.season;
      const teamId = stat?.team?.id;

      // On respecte tes filtres "league + season"
      if (Number(leagueId) !== Number(league)) continue;
      if (Number(leagueSeason) !== Number(season)) continue;

      // Déduplication: même (leagueId, season, teamId) => skip
      const statKey = `${leagueId}-${leagueSeason}-${teamId ?? "noTeam"}`;
      if (agg.seenStatBlocks.has(statKey)) continue;
      agg.seenStatBlocks.add(statKey);

      const teamName = stat?.team?.name;
      if (teamName) agg.teamNames.add(teamName);

      addAgg(agg, extractStatBlock(stat));
    }
  }

  const rows = [];
  for (const agg of byId.values()) {
    const team = agg.teamNames.size ? Array.from(agg.teamNames).join(" / ") : "Inconnu";
    const score = computeScore(agg);

    rows.push({
      id: agg.id,
      name: agg.name,
      age: agg.age,
      photo: agg.photo,
      team,
      minutes: agg.minutes,
      position: normalizePosition(agg.positionRaw),
      score,

      // métriques à plat (plus simple côté front)
      goals: agg.goals,
      assists: agg.assists,
      shots: agg.shots,
      dribblesSuccess: agg.dribblesSuccess,
      interceptions: agg.interceptions,
      duelsWon: agg.duelsWon,
      yellow: agg.yellow,
      red: agg.red,
    });
  }

  return rows;
}

export async function getRankings({ league, season, position = "ALL", minMinutes = 0, limit = 50, q = "" }) {
  const cacheKey = JSON.stringify({ league, season, position, minMinutes, limit, q });
  const now = Date.now();

  const cached = cache.get(cacheKey);
  if (cached && now - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  // 1) Base scan pages 1..3
  const basePlayers = [];
  for (let page = 1; page <= 3; page++) {
    try {
      const data = await fetchPlayersPage({ league, season, page });
      basePlayers.push(...(data?.response ?? []));
    } catch {
      break;
    }
  }

  // 2) Leaders
  let topPlayers = [];
  try {
    topPlayers = await fetchTopEndpoints({ league, season });
  } catch {
    // ignore
  }

  // 3) Search
  let searchPlayers = [];
  const search = (q || "").trim();
  if (search.length > 0) {
    try {
      const data = await fetchPlayersPage({ league, season, page: 1, search });
      searchPlayers = data?.response ?? [];
    } catch {
      // ignore
    }
  }

  const merged = [...basePlayers, ...topPlayers, ...searchPlayers];
  let rows = aggregatePlayers(merged, { league, season });

  // Filtres
  if (position && position !== "ALL") {
    rows = rows.filter((p) => p.position === position);
  }
  rows = rows.filter((p) => p.minutes >= Number(minMinutes || 0));

  // Tri + limit
  rows.sort((a, b) => b.score - a.score);
  rows = rows.slice(0, Math.max(1, Number(limit || 50)));

  const data = {
    ok: true,
    rows,
    meta: {
      returned: rows.length,
      scannedPlayers: merged.length,
      cachedAt: new Date().toISOString(),
      note: "Free plan: pages 1..3 + endpoints top* + search. Stats dédoublonnées par (league, season, team).",
    },
  };

  cache.set(cacheKey, { ts: now, data });
  return data;
}
