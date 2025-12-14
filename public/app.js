const els = {
  league: document.getElementById("league"),
  season: document.getElementById("season"),
  position: document.getElementById("position"),
  minMinutes: document.getElementById("minMinutes"),
  search: document.getElementById("search"),
  status: document.getElementById("status"),
  body: document.getElementById("rankingBody"),
  refreshBtn: document.getElementById("refreshBtn"),
};

function fmt(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toLocaleString("fr-CA") : "0";
}

function fmtScore(n) {
  const x = Number(n ?? 0);
  return Number.isFinite(x) ? x.toFixed(2) : "0.00";
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
          <span class="chip">Key passes: ${fmt(r.chanceCreated)}</span>
          <span class="chip">Tirs: ${fmt(r.shots)}</span>
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
  const q = els.search.value.trim();

  els.status.textContent = "Chargement…";

  const url = new URL("/api/rankings", window.location.origin);
  url.searchParams.set("league", league);
  url.searchParams.set("season", season);
  url.searchParams.set("position", position);
  url.searchParams.set("minMinutes", minMinutes);
  url.searchParams.set("limit", "50");
  if (q) url.searchParams.set("q", q);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (!res.ok) {
    els.status.textContent = data?.error ? `Erreur: ${data.error}` : "Erreur API";
    els.body.innerHTML = "";
    return;
  }

  render(data.rows ?? []);
  els.status.textContent =
    `OK — ${data?.meta?.returned ?? 0} joueurs (scan: ${data?.meta?.scannedPlayers ?? 0}) — cache: ${data?.meta?.cachedAt ?? "—"}`;
}

els.refreshBtn?.addEventListener("click", refresh);

// Auto-load au démarrage
refresh().catch((e) => {
  els.status.textContent = `Erreur: ${String(e?.message ?? e)}`;
});
