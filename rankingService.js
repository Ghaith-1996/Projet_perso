function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toRoleCode(apiPosition) {
  const p = String(apiPosition || "").toLowerCase();
  if (p.includes("attacker") || p.includes("forward") || p.includes("striker")) return "ATT";
  if (p.includes("midfielder")) return "MID";
  if (p.includes("defender")) return "DEF";
  if (p.includes("goalkeeper")) return "GK";
  return "UNK";
}

export class RankingService {
  constructor({ apiClient, cacheTtlMs = 30 * 60 * 1000 }) {
    this.apiClient = apiClient;
    this.cacheTtlMs = cacheTtlMs;
    this.cache = new Map(); // key -> { expiresAt, data }
  }

  _cacheGet(key) {
    const hit = this.cache.get(key);
    if (!hit) return null;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return hit.data;
  }

  _cacheSet(key, data) {
    this.cache.set(key, { expiresAt: Date.now() + this.cacheTtlMs, data });
  }

  async getRankings({ league, season, position = "ALL", minMinutes = 0, q = "", limit = 20 }) {
    const cacheKey = `topscorers:${league}:${season}`;
    let apiData = this._cacheGet(cacheKey);
    let cached = true;

    if (!apiData) {
      cached = false;
      apiData = await this.apiClient.get("/players/topscorers", { league, season });
      this._cacheSet(cacheKey, apiData);
    }

    const rawRows = (apiData?.response || []).map((item, idx) => {
      const player = item?.player || {};
      const stats0 = item?.statistics?.[0] || {};

      const minutes = num(stats0?.games?.minutes);
      const apiPos = stats0?.games?.position || "";
      const role = toRoleCode(apiPos);

      const goals = num(stats0?.goals?.total);
      const assists = num(stats0?.goals?.assists);
      const shotsTotal = num(stats0?.shots?.total);
      const shotsOn = num(stats0?.shots?.on);
      const yellow = num(stats0?.cards?.yellow);
      const red = num(stats0?.cards?.red);
      const rating = stats0?.games?.rating ?? "";

      // Score simple (tu pourras l’améliorer ensuite)
      const rawScore =
        goals * 10 +
        assists * 6 +
        shotsOn * 0.8 +
        shotsTotal * 0.2 -
        yellow * 1.0 -
        red * 5.0;

      return {
        _idx: idx,
        playerId: player?.id ?? null,
        playerName: player?.name ?? "",
        age: player?.age ?? null,
        teamName: stats0?.team?.name ?? "",
        minutes,
        role,
        metrics: { goals, assists, shotsTotal, shotsOn, yellow, red, rating },
        rawScore,
      };
    });

    // Filtres
    let rows = rawRows;

    const pos = String(position || "ALL").toUpperCase();
    if (pos !== "ALL") rows = rows.filter(r => r.role === pos);

    const mm = num(minMinutes);
    if (mm > 0) rows = rows.filter(r => r.minutes >= mm);

    const query = String(q || "").trim().toLowerCase();
    if (query) rows = rows.filter(r => (r.playerName || "").toLowerCase().includes(query));

    // Normaliser sur 100
    const maxRaw = Math.max(...rows.map(r => r.rawScore), 1);
    rows = rows
      .map(r => ({ ...r, score: Number(((r.rawScore / maxRaw) * 100).toFixed(1)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.min(num(limit) || 20, 50))
      .map((r, i) => ({
        rank: i + 1,
        playerId: r.playerId,
        playerName: r.playerName,
        age: r.age,
        teamName: r.teamName,
        minutes: r.minutes,
        role: r.role,
        score: r.score,
        metrics: r.metrics,
      }));

    return {
      ok: true,
      meta: {
        league: num(league),
        season: num(season),
        cached,
        count: rows.length,
        fetchedAt: new Date().toISOString(),
      },
      rows,
    };
  }
}
