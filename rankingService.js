// rankingService.js
import fs from "node:fs";
import path from "node:path";
import { apiFootballGet } from "./apiFootballClient.js";
import { computeScore } from "./scoring.js";

const n = (v) => Number(v ?? 0) || 0;

// Mapping optionnel API-Football playerId -> FotMob playerId
// Exemple contenu: { "276": 12345, "874": 998877 }
const FOTMOB_MAP_PATH = path.join(process.cwd(), "fotmobPlayerMap.json");
const fotmobMap = fs.existsSync(FOTMOB_MAP_PATH)
  ? JSON.parse(fs.readFileSync(FOTMOB_MAP_PATH, "utf-8"))
  : {};

async function fetchAllPlayersSeasonStats({ league, season }) {
  const all = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const data = await apiFootballGet(`/players?league=${league}&season=${season}&page=${page}`);
    const resp = data?.response ?? [];
    all.push(...resp);

    totalPages = n(data?.paging?.total) || page;
    page += 1;
  }

  return all;
}

function mapApiFootballSeasonRow(row) {
  const player = row?.player ?? {};
  const stat0 = row?.statistics?.[0] ?? {};

  // API-FOOTBALL fields (souvent null -> ?? 0)
  const goals = n(stat0?.goals?.total);
  const assists = n(stat0?.goals?.assists);
  const shots = n(stat0?.shots?.total);

  // chanceCreated = passes.key (comme tu veux)
  const chanceCreated = n(stat0?.passes?.key);

  const successfulDribble = n(stat0?.dribbles?.success);
  const interceptions = n(stat0?.tackles?.interceptions);
  const duelsWon = n(stat0?.duels?.won);

  const yellowCards = n(stat0?.cards?.yellow);
  const redCards = n(stat0?.cards?.red);

  const minutes = n(stat0?.games?.minutes);
  const team = stat0?.team ?? {};
  const league = stat0?.league ?? {};

  // Par défaut à 0 (tu l’as demandé) — enrichissement FotMob plus tard
  const bigChanceCreated = 0;
  const accurateCross = 0;
  const accurateLongBall = 0;
  const recoveries = 0;
  const dispossessed = 0;

  const stats = {
    goals,
    assists,
    shots,
    chanceCreated,

    successfulDribble,
    interceptions,
    duelsWon,

    yellowCards,
    redCards,

    // default 0
    bigChanceCreated,
    accurateCross,
    accurateLongBall,
    recoveries,
    dispossessed
  };

  return {
    apiFootballPlayerId: player?.id,
    name: player?.name ?? "Unknown",
    photo: player?.photo ?? null,
    age: player?.age ?? null,
    nationality: player?.nationality ?? null,
    minutes,

    team: { id: team?.id ?? null, name: team?.name ?? null, logo: team?.logo ?? null },
    league: { id: league?.id ?? null, name: league?.name ?? null, season: league?.season ?? null, logo: league?.logo ?? null },

    // si tu ajoutes une map, on l’a déjà
    fotmobPlayerId: fotmobMap[String(player?.id)] ?? null,

    stats,
    score: computeScore(stats)
  };
}

// --- Hook FotMob (optionnel, seulement si tu as fotmobPlayerId) ---
async function enrichTopWithFotmob(rows, { fotmobLeagueId, seasonRange, topN = 50 }) {
  if (process.env.FOTMOB_ENABLED !== "true") return rows;

  const baseUrl = process.env.FOTMOB_SERVICE_URL ?? "http://localhost:8001";

  // on n’enrichit que le topN pour éviter 1000 calls
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const target = sorted.slice(0, topN);

  await Promise.all(
    target.map(async (r) => {
      if (!r.fotmobPlayerId) return;

      const url =
        `${baseUrl}/player-extras` +
        `?playerId=${encodeURIComponent(r.fotmobPlayerId)}` +
        `&leagueId=${encodeURIComponent(fotmobLeagueId)}` +
        `&season=${encodeURIComponent(seasonRange)}`;

      const res = await fetch(url);
      if (!res.ok) return;

      const extras = await res.json();

      // protège-toi contre null
      r.stats.bigChanceCreated = n(extras?.bigChanceCreated);
      r.stats.recoveries = n(extras?.recoveries);
      r.stats.accurateLongBall = n(extras?.accurateLongBall);

      // recalcul score
      r.score = computeScore(r.stats);
    })
  );

  // resort après enrich
  return sorted.sort((a, b) => b.score - a.score);
}

export async function getSeasonRanking({ league, season, minMinutes = 0, limit = 50 }) {
  const raw = await fetchAllPlayersSeasonStats({ league, season });
  let rows = raw.map(mapApiFootballSeasonRow);

  if (minMinutes > 0) rows = rows.filter((r) => r.minutes >= minMinutes);

  // OPTION: FotMob enrichment (si tu as la map + service python)
  const fotmobLeagueId = process.env.FOTMOB_LEAGUE_ID;     // à set selon compétition
  const seasonRange = process.env.FOTMOB_SEASON_RANGE;     // ex: "2024/2025"
  if (fotmobLeagueId && seasonRange) {
    rows = await enrichTopWithFotmob(rows, { fotmobLeagueId, seasonRange, topN: Math.max(limit, 50) });
  }

  rows.sort((a, b) => b.score - a.score);
  return rows.slice(0, limit);
}
