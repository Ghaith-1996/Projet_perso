import express from "express";
import dotenv from "dotenv";
import { scrapeTop5Leagues } from "./scrapingService.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Nouvelle route qui utilise le scraping
app.get("/api/scraped-rankings", async (req, res) => {
  try {
    // Le scraping se lance (ou récupère le cache)
    const players = await scrapeTop5Leagues();
    
    res.json({
      ok: true,
      count: players.length,
      rows: players
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Garder l'ancienne route ou la rediriger si besoin
// app.get("/api/rankings", ...); 

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});