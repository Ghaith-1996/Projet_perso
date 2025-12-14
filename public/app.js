function getEl(id) {
  return document.getElementById(id);
}

function fmt(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toLocaleString("fr-CA") : "0";
}

function fmtScore(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
}

window.addEventListener("DOMContentLoaded", () => {
  const els = {
    // requis
    league: getEl("league"),
    season: getEl("season"),
    position: getEl("position"),
    minMinutes: getEl("minMinutes"),
    status: getEl("status"),
    body: getEl("rankingBody"),
    refreshBtn: getEl("refreshBtn"),

    // optionnels
    search: getEl("search"),
    statCount: getEl("statCount"),
    statCache: getEl("statCache"),
  };

  const requiredKeys = ["league", "season", "position", "minMinutes", "status", "body", "refreshBtn"];
  const missingRequired = requiredKeys.filter((k) => !els[k]);

  if (missingRequired.length) {
    const msg = `Erreur : éléments requis manquants (${missingRequired.join(", ")})`;
    console.error(msg);
    if (els.status) els.status.textContent = msg;
    return;
  }

  function render(rows) {
    els.body.innerHTML = "";

    rows.forEach((r, idx) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="rank">${idx + 1}</td>
        <td>
          <div class="player">
            <div class="avatar" aria-hidden="true">${(idx + 1).toString()}</div>
            <div>
              <div class="player-name">${r.name ?? "—"}</div>
              <div class="player-meta muted">${r.position ?? "—"} • ${r.age ?? "—"} ans</div>
            </div>
          </div>
        </td>
        <td class="muted">${r.team ?? "—"}</td>
        <td class="muted">${fmt(r.minutes)}</td>
        <td>
          <div class="score">
            <span class="pill">${fmtScore(r.score)}</span>
          </div>
        </td>
        <td>
          <div class="chips">
            <span class="chip">Buts: ${fmt(r.goals)}</span>
            <span class="chip">Assists: ${fmt(r.assists)}</span>
            <span class="chip">Tirs: ${fmt(r.shots)}</span>
            <span class="chip">Dribbles: ${fmt(r.dribblesSuccess)}</span>
            <span class="chip">Interceptions: ${fmt(r.interceptions)}</span>
            <span class="chip">Duels gagnés: ${fmt(r.duelsWon)}</span>
            <span class="chip">Jaunes: ${fmt(r.yellow)}</span>
            <span class="chip">Rouges: ${fmt(r.red)}</span>
          </div>
        </td>
      `;
      els.body.appendChild(tr);
    });
  }

  async function refresh() {
    const league = els.league.value;
    const season = els.season.value;
    const position = els.position.value;
    const minMinutes = els.minMinutes.value;
    const q = (els.search?.value ?? "").trim(); // <- IMPORTANT (optionnel)

    els.status.textContent = "Chargement…";

    const url = new URL("/api/rankings", window.location.origin);
    url.searchParams.set("league", league);
    url.searchParams.set("season", season);
    url.searchParams.set("position", position);
    url.searchParams.set("minMinutes", minMinutes);
    url.searchParams.set("limit", "50");
    if (q) url.searchParams.set("q", q);

    const res = await fetch(url.toString());
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      els.status.textContent = data?.error ? `Erreur: ${data.error}` : "Erreur API";
      els.body.innerHTML = "";
      return;
    }

    render(data.rows ?? []);

    els.status.textContent = `OK — ${data?.meta?.returned ?? 0} joueurs (scannés: ${data?.meta?.scannedPlayers ?? 0})`;

    if (els.statCount) els.statCount.textContent = String(data?.meta?.returned ?? "—");
    if (els.statCache) els.statCache.textContent = String(data?.meta?.cachedAt ?? "—");
  }

  els.refreshBtn.addEventListener("click", refresh);
  refresh().catch((e) => (els.status.textContent = `Erreur: ${String(e?.message ?? e)}`));
});

