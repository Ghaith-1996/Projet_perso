import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { getRankings } from "./rankingService.js";
import { apiGet } from "./apiFootballClient.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Static (public/index.html, public/app.js, public/styles.css, ...)
app.use(express.static("public"));

app.get("/api/rankings", async (req, res) => {
  try {
    const league = req.query.league;
    const season = req.query.season;

    if (!league || !season) {
      return res.status(400).json({ error: "Paramètres requis: league, season" });
    }

    const position = (req.query.position ?? "ALL").toString();
    const minMinutes = Number(req.query.minMinutes ?? 900);
    const limit = Number(req.query.limit ?? 50);
    const q = (req.query.q ?? "").toString().trim();

    const data = await getRankings({ league, season, position, minMinutes, limit, q });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

// Debug endpoint
app.get("/api/debug/players", async (req, res) => {
  try {
    const league = Number(req.query.league ?? 39);
    const season = Number(req.query.season ?? 2021);

    const data = await apiGet("/players", { league, season, page: 1 });
    res.json({
      league,
      season,
      page: 1,
      results: data?.results ?? null,
      responseCount: data?.response?.length ?? 0,
      sample: (data?.response ?? []).slice(0, 2),
    });
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
