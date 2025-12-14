import "dotenv/config";
import fetch from "node-fetch";

const BASE_URL = "https://v3.football.api-sports.io";
const API_KEY = process.env.API_FOOTBALL_KEY;

if (!API_KEY) {
  throw new Error("API_FOOTBALL_KEY manquant dans le fichier .env");
}

export async function apiGet(path, params = {}) {
  const url = new URL(BASE_URL + path);

  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, String(v));
    }
  }

  const res = await fetch(url, {
    headers: { "x-apisports-key": API_KEY },
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const details = data?.errors ? JSON.stringify(data.errors) : res.statusText;
    throw new Error(`API-FOOTBALL HTTP ${res.status}: ${details}`);
  }

  if (data?.errors && Object.keys(data.errors).length > 0) {
    throw new Error(`API-FOOTBALL errors: ${JSON.stringify(data.errors)}`);
  }

  return data;
}
