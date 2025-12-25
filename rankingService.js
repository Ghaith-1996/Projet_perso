import { apiGet } from "./apiFootballClient.js";
import { scoreFromStats } from "./scoring.js";
// Dans rankingService.js
import { mapPythonStatsToScoring, calculateScore } from './scoring.js';

const processPlayers = (playersFromPython) => {
  return playersFromPython.map(player => {
    // On adapte les données Python
    const formattedStats = mapPythonStatsToScoring(player);

    // On calcule le score avec tes WEIGHTS existants
    const score = calculateScore(formattedStats);

    return { ...player, overallScore: score };
  });
};
const LEAGUE_IDS = [39, 140, 78, 135, 61]; // PL, La Liga, Bundesliga, Serie A, Ligue 1
let globalCache = { data: [], lastUpdated: 0 }; // Notre "Array" global
const GLOBAL_CACHE_TTL = 60 * 60 * 1000; // 1 heure de cache pour le global

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function toNum(v) {
  return (v && Number.isFinite(Number(v))) ? Number(v) : 0;
}

function normalizePosition(pos) {
  const p = (pos || "").toLowerCase();
  if (p.includes("att")) return "ATT";
  if (p.includes("mid")) return "MID";
  if (p.includes("def")) return "DEF";
  if (p.includes("goal")) return "GK";
  return "UNK";
}

// CORRECTION : Ajout de keyPasses ici
function extractStatBlock(stat) {
  return {
    minutes: toNum(stat?.games?.minutes),
    positionRaw: stat?.games?.position ?? null,
    goals: toNum(stat?.goals?.total),
    assists: toNum(stat?.goals?.assists),
    shots: toNum(stat?.shots?.total),

    // C'est ici qu'on récupère les passes clés de l'API
    keyPasses: toNum(stat?.passes?.key),

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
  target.keyPasses += add.keyPasses; // Cumul
  target.dribblesSuccess += add.dribblesSuccess;
  target.interceptions += add.interceptions;
  target.duelsWon += add.duelsWon;
  target.yellow += add.yellow;
  target.red += add.red;
  if (!target.positionRaw && add.positionRaw) target.positionRaw = add.positionRaw;
}

// Récupère uniquement les Tops (Buteurs/Passeurs) pour économiser les requêtes
async function fetchLeagueTops(league, season) {
  const results = [];
  const endpoints = ["/players/topscorers", "/players/topassists"];

  for (const ep of endpoints) {
    try {
      await delay(500); // Pause anti-ban API
      const data = await apiGet(ep, { league, season });
      if (data?.response) results.push(...data.response);
    } catch (e) {
      console.error(`Err ${ep} L:${league}:`, e.message);
    }
  }
  return results;
}

function aggregatePlayers(apiPlayers, { season }) {
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
        leagueNames: new Set(), // Pour afficher la ligue

        minutes: 0, goals: 0, assists: 0, shots: 0,
        keyPasses: 0, // Init
        dribblesSuccess: 0, interceptions: 0, duelsWon: 0, yellow: 0, red: 0,
        positionRaw: null,
        processedSignatures: new Set(),
      });
    }

    const agg = byId.get(p.id);

    for (const stat of statsArr) {
      // Filtrer par saison stricte
      if (Number(stat?.league?.season) !== Number(season)) continue;

      const signature = `${stat?.team?.id}-${stat?.games?.minutes}-${stat?.goals?.total}`;
      if (agg.processedSignatures.has(signature)) continue;
      agg.processedSignatures.add(signature);

      if (stat?.team?.name) agg.teamNames.add(stat.team.name);
      if (stat?.league?.name) agg.leagueNames.add(stat.league.name);

      addAgg(agg, extractStatBlock(stat));
    }
  }

  // Conversion en tableau et calcul du score
  const rows = [];
  for (const agg of byId.values()) {
    const score = scoreFromStats({
      goals: agg.goals,
      assists: agg.assists,
      shots: agg.shots,
      chanceCreated: agg.keyPasses, // Mappage pour scoring.js
      successfulDribble: agg.dribblesSuccess,
      interception: agg.interceptions,
      duelWon: agg.duelsWon,
      yellow: agg.yellow,
      red: agg.red
    });

    rows.push({
      ...agg,
      team: Array.from(agg.teamNames).join(" / "),
      league: Array.from(agg.leagueNames).join(" / "), // Ajout
      position: normalizePosition(agg.positionRaw),
      score,
      // Nettoyage technique
      teamNames: undefined, leagueNames: undefined, processedSignatures: undefined
    });
  }
  return rows;
}

// Nouvelle fonction pour le "Classement Global"
export async function getGlobalRankings(season) {
  const now = Date.now();

  // Si le cache est valide, on retourne l'array sauvegardé
  if (globalCache.data.length > 0 && (now - globalCache.lastUpdated < GLOBAL_CACHE_TTL)) {
    console.log("Serving Global from CACHE");
    return globalCache.data;
  }

  console.log("Building Global Ranking (Slow Process)...");
  let allRawPlayers = [];

  // On boucle sur toutes les ligues
  for (const leagueId of LEAGUE_IDS) {
    const players = await fetchLeagueTops(leagueId, season);
    allRawPlayers = allRawPlayers.concat(players);
  }

  // On agrège tout d'un coup
  let aggregated = aggregatePlayers(allRawPlayers, { season });

  // Tri global
  aggregated.sort((a, b) => b.score - a.score);

  // On garde le Top 200
  const finalRows = aggregated.slice(0, 200);

  // Mise à jour de "l'array" serveur
  globalCache = {
    data: finalRows,
    lastUpdated: now
  };

  return finalRows;
}

// Garde la compatibilité avec la recherche par ligue existante
export async function getRankings({ league, season, minMinutes, limit, q }) {
  // Réutilise fetchLeagueTops mais juste pour une ligue
  const raw = await fetchLeagueTops(league, season);
  let rows = aggregatePlayers(raw, { season });

  // Filtre minutes
  rows = rows.filter(p => p.minutes >= (minMinutes || 0));
  rows.sort((a, b) => b.score - a.score);

  return { rows: rows.slice(0, limit || 50) };
}