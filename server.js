import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

import { ApiFootballClient } from "./apiFootballClient.js";
import { RankingService } from "./rankingService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const API_KEY = process.env.APIFOOTBALL_KEY;
const BASE_URL = process.env.APIFOOTBALL_BASE_URL || "https://v3.football.api-sports.io";

if (!API_KEY) {
  console.error("ERREUR: APIFOOTBALL_KEY manquant dans .env");
  process.exit(1);
}

// --- Chemins absolus (important sous Windows) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, "public");

// --- API client + service ---
const apiClient = new ApiFootballClient({ baseUrl: BASE_URL, apiKey: API_KEY });
const rankingService = new RankingService({ apiClient });

// --- Static : sert /public ---
app.use(express.static(publicDir));

// --- Route / : renvoie index.html ---
app.get("/", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// --- API ---
app.get("/api/rankings", async (req, res) => {
  try {
    const league = Number(req.query.league || 39);
    const season = Number(req.query.season || 2021);
    const position = String(req.query.position || "ALL");
    const minMinutes = Number(req.query.minMinutes || 0);
    const q = String(req.query.q || "");
    const limit = Number(req.query.limit || 20);

    const result = await rankingService.getRankings({
      league,
      season,
      position,
      minMinutes,
      q,
      limit,
    });

    return res.json(result);
  } catch (e) {
    return res.status(500).json({ ok: false, error: e?.message || "Server error" });
  }
});

app.listen(PORT, () => {
  console.log(`OK: http://localhost:${PORT}`);
  console.log(`Serving UI from: ${publicDir}`);
});
