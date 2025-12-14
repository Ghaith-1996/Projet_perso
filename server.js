import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { getRankings } from "./rankingService.js";

const app = express();
const PORT = process.env.PORT || 3000;

// statics
app.use(express.static("public"));

app.get("/api/rankings", async (req, res) => {
  try {
    const league = req.query.league;
    const season = req.query.season;

    if (!league || !season) {
      return res.status(400).json({ error: "Paramètres requis: league, season" });
    }

    const position = req.query.position || "ATT";
    const minMinutes = Number(req.query.minMinutes ?? 900);
    const limit = Number(req.query.limit ?? 50);
    const q = (req.query.q ?? "").toString().trim();

    const data = await getRankings({ league, season, position, minMinutes, limit, q });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: String(e?.message ?? e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
