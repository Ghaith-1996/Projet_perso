import fetch from "node-fetch";
import * as cheerio from "cheerio";
import { scoreFromStats } from "./scoring.js";

// Votre Clé API
const SCRAPINGBEE_API_KEY = "ZSXCL9BXGN5SRKYXYOP5HPSORNOSKK56NN2N6ME7GX7FA7NG3VW7BNRRRAQNK0VQWIV2DBEGTTVFO4NF";

// URLs FBref
const BASE_URL = "https://fbref.com/en/comps/Big5/stats/players/Big-5-European-Leagues-Stats";
const POSSESSION_URL = "https://fbref.com/en/comps/Big5/possession/players/Big-5-European-Leagues-Stats";
const DEFENSE_URL = "https://fbref.com/en/comps/Big5/defense/players/Big-5-European-Leagues-Stats";
const SHOOTING_URL = "https://fbref.com/en/comps/Big5/shooting/players/Big-5-European-Leagues-Stats";
const PASSING_URL = "https://fbref.com/en/comps/Big5/passing/players/Big-5-European-Leagues-Stats";

let cache = { data: null, timestamp: 0 };
const CACHE_DURATION = 60 * 60 * 1000; // 1 heure

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHtml(targetUrl, attempt = 1) {
  const pageName = targetUrl.split('/').pop().replace("Big-5-European-Leagues-Stats", "");
  console.log(`🐝 ScrapingBee call [${pageName || "STANDARD"}] (Essai ${attempt}/3)...`);
  
  const url = new URL("https://app.scrapingbee.com/api/v1/");
  url.searchParams.append("api_key", SCRAPINGBEE_API_KEY);
  url.searchParams.append("url", targetUrl); 
  url.searchParams.append("render_js", "false"); 
  url.searchParams.append("premium_proxy", "true"); 

  try {
    // CORRECTION MAJEURE ICI : compress: false et pas de headers complexes
    const res = await fetch(url.toString(), {
      method: 'GET',
      compress: false, // Empêche le bug "Premature close"
      timeout: 60000   // 60 secondes max (si supporté par votre version de node)
    });
    
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`API Error ${res.status}: ${errText.substring(0, 100)}`);
    }

    let html = await res.text();
    return html.replace//g, ""); // Nettoyage FBref
    
  } catch (e) {
    console.error(`⚠️ Erreur sur ${pageName}: ${e.message}`);
    
    // Logique de Retry
    if (attempt < 3) {
      console.log(`🔄 On réessaie dans 3 secondes...`);
      await delay(3000);
      return fetchHtml(targetUrl, attempt + 1);
    }
    throw e;
  }
}

function parseTable(html, type) {
  const $ = cheerio.load(html);
  const players = {};
  const rows = $("tbody tr");
  
  console.log(`   > ${type}: ${rows.length} lignes trouvées.`);

  rows.each((i, el) => {
    if ($(el).hasClass("thead")) return;
    const id = $(el).find("td[data-stat='player']").attr("data-append-csv");
    if (!id) return;

    if (type === "STANDARD") {
      players[id] = {
        name: $(el).find("td[data-stat='player'] a").text().trim(),
        team: $(el).find("td[data-stat='team'] a").text().trim(),
        league: $(el).find("td[data-stat='comp_level'] a").text().trim(),
        minutes: Number($(el).find("td[data-stat='minutes']").text().replace(/,/g, "") || 0),
        goals: Number($(el).find("td[data-stat='goals']").text() || 0),
        assists: Number($(el).find("td[data-stat='assists']").text() || 0),
        yellow: Number($(el).find("td[data-stat='cards_yellow']").text() || 0),
        red: Number($(el).find("td[data-stat='cards_red']").text() || 0),
      };
    } 
    else if (type === "DEFENSE") {
      players[id] = {
        interceptions: Number($(el).find("td[data-stat='interceptions']").text() || 0),
        tacklesWon: Number($(el).find("td[data-stat='tackles_won']").text() || 0),
      };
    } 
    else if (type === "POSSESSION") {
      players[id] = {
        dribblesWon: Number($(el).find("td[data-stat='dribbles_completed']").text() || 0),
      };
    }
    else if (type === "SHOOTING") {
      players[id] = {
        shots: Number($(el).find("td[data-stat='shots']").text() || 0),
      };
    }
    else if (type === "PASSING") {
      players[id] = {
        keyPasses: Number($(el).find("td[data-stat='passes_key']").text() || 0),
      };
    }
  });
  return players;
}

export async function scrapeTop5Leagues() {
  if (cache.data && (Date.now() - cache.timestamp < CACHE_DURATION)) {
    console.log("⚡ Cache utilisé.");
    return cache.data;
  }

  try {
    // Récupération des pages
    const htmlStd = await fetchHtml(BASE_URL);
    const stdMap = parseTable(htmlStd, "STANDARD");

    if (Object.keys(stdMap).length === 0) throw new Error("Tableau Standard vide");

    const htmlDef = await fetchHtml(DEFENSE_URL);
    const defMap = parseTable(htmlDef, "DEFENSE");

    const htmlPos = await fetchHtml(POSSESSION_URL);
    const posMap = parseTable(htmlPos, "POSSESSION");

    const htmlShoot = await fetchHtml(SHOOTING_URL);
    const shootMap = parseTable(htmlShoot, "SHOOTING");

    const htmlPass = await fetchHtml(PASSING_URL);
    const passMap = parseTable(htmlPass, "PASSING");

    const merged = [];
    
    for (const [id, base] of Object.entries(stdMap)) {
      if (base.minutes < 2000) continue; // Filtre minutes

      const def = defMap[id] || {};
      const pos = posMap[id] || {};
      const shoot = shootMap[id] || {};
      const pass = passMap[id] || {};

      const fullStats = {
        ...base,
        interceptions: def.interceptions || 0,
        tacklesWon: def.tacklesWon || 0,
        dribblesWon: pos.dribblesWon || 0,
        shots: shoot.shots || 0,
        keyPasses: pass.keyPasses || 0,
      };

      fullStats.score = scoreFromStats(fullStats);
      merged.push(fullStats);
    }

    merged.sort((a, b) => b.score - a.score);
    console.log(`✅ Terminé ! ${merged.length} joueurs qualifiés.`);
    
    cache.data = merged;
    cache.timestamp = Date.now();
    return merged;

  } catch (e) {
    console.error("❌ ECHEC TOTAL:", e.message);
    throw e;
  }
}