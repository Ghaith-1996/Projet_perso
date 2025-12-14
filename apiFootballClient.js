import dotenv from "dotenv";
dotenv.config();

// Node 22+ a fetch global, mais tu as node-fetch en dépendance.
// On utilise le fetch natif (plus simple).
const BASE_URL = process.env.API_FOOTBALL_BASE_URL || "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  throw new Error("API_FOOTBALL_KEY manquant dans le fichier .env");
}

function buildUrl(path, params = {}) {
  const url = new URL(path, BASE_URL);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  });
  return url.toString();
}

/**
 * Client générique API-FOOTBALL
 * - protège contre erreurs réseau
 * - retourne toujours le JSON complet
 */
export async function apiFootballGet(path, params = {}) {
  const url = buildUrl(path, params);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      // Selon le plan, l’un ou l’autre est utilisé. On met les deux => robuste.
      "x-apisports-key": API_KEY,
      "x-rapidapi-key": API_KEY,
    },
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Réponse non-JSON de l’API: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`API-FOOTBALL HTTP ${res.status}: ${JSON.stringify(json).slice(0, 400)}`);
  }

  // API-FOOTBALL met parfois les erreurs dans json.errors
  if (json?.errors && Object.keys(json.errors).length > 0) {
    throw new Error(`API-FOOTBALL errors: ${JSON.stringify(json.errors)}`);
  }

  return json;
}

/**
 * Récupère les stats "player season" via /players
 * Attention: paging important
 */
export async function getPlayersByLeagueSeason({ league, season, page = 1, search = "" }) {
  return apiFootballGet("/players", { league, season, page, search });
}
