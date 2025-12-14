function $(id) { return document.getElementById(id); }

function formatInt(n) {
  return new Intl.NumberFormat("fr-CA").format(Number(n || 0));
}

function chip(text) {
  const s = document.createElement("span");
  s.className = "chip";
  s.textContent = text;
  return s;
}

function rowEl(r) {
  const tr = document.createElement("tr");

  const tdRank = document.createElement("td");
  tdRank.className = "rank";
  tdRank.textContent = String(r.rank);
  tr.appendChild(tdRank);

  const tdPlayer = document.createElement("td");
  const playerWrap = document.createElement("div");
  playerWrap.className = "player";

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = String(r.rank);
  avatar.setAttribute("aria-hidden", "true");

  const info = document.createElement("div");
  const name = document.createElement("div");
  name.className = "player-name";
  name.textContent = r.playerName || "—";

  const meta = document.createElement("div");
  meta.className = "player-meta muted";
  meta.textContent = `${r.role || "UNK"}${r.age ? ` • ${r.age} ans` : ""}`;

  info.appendChild(name);
  info.appendChild(meta);

  playerWrap.appendChild(avatar);
  playerWrap.appendChild(info);
  tdPlayer.appendChild(playerWrap);
  tr.appendChild(tdPlayer);

  const tdTeam = document.createElement("td");
  tdTeam.className = "muted";
  tdTeam.textContent = r.teamName || "—";
  tr.appendChild(tdTeam);

  const tdMin = document.createElement("td");
  tdMin.className = "muted";
  tdMin.textContent = formatInt(r.minutes);
  tr.appendChild(tdMin);

  const tdScore = document.createElement("td");
  const scoreWrap = document.createElement("div");
  scoreWrap.className = "score";
  const pill = document.createElement("span");
  pill.className = "pill";
  pill.textContent = String(r.score ?? "—");
  const outOf = document.createElement("span");
  outOf.className = "muted";
  outOf.textContent = "/ 100";
  scoreWrap.appendChild(pill);
  scoreWrap.appendChild(outOf);
  tdScore.appendChild(scoreWrap);
  tr.appendChild(tdScore);

  const tdMetrics = document.createElement("td");
  const chips = document.createElement("div");
  chips.className = "chips";

  const m = r.metrics || {};
  chips.appendChild(chip(`Buts: ${m.goals ?? 0}`));
  chips.appendChild(chip(`Assists: ${m.assists ?? 0}`));
  chips.appendChild(chip(`Tirs cadrés: ${m.shotsOn ?? 0}`));
  chips.appendChild(chip(`Jaunes: ${m.yellow ?? 0}`));
  chips.appendChild(chip(`Rouges: ${m.red ?? 0}`));
  if (m.rating) chips.appendChild(chip(`Note: ${m.rating}`));

  tdMetrics.appendChild(chips);
  tr.appendChild(tdMetrics);

  return tr;
}

async function loadRankings() {
  const league = $("league")?.value || "39";
  const season = $("season")?.value || "2021";
  const position = $("position")?.value || "ALL";
  const minMinutes = $("minMinutes")?.value || "0";
  const q = $("search")?.value || "";

  const status = $("status");
  const body = $("rankingBody");

  status.textContent = "Chargement…";
  body.innerHTML = "";

  const url = new URL("/api/rankings", window.location.origin);
  url.searchParams.set("league", league);
  url.searchParams.set("season", season);
  url.searchParams.set("position", position);
  url.searchParams.set("minMinutes", minMinutes);
  if (q.trim()) url.searchParams.set("q", q.trim());
  url.searchParams.set("limit", "20");

  const res = await fetch(url);
  const data = await res.json();

  if (!data.ok) {
    status.textContent = `Erreur API: ${data.error || "inconnue"}`;
    return;
  }

  const rows = data.rows || [];
  if (!rows.length) {
    status.textContent = "Aucun résultat (change ligue/saison ou baisse minutes minimum).";
    return;
  }

  for (const r of rows) body.appendChild(rowEl(r));

  status.textContent = `OK — ${data.meta?.count ?? rows.length} joueurs — cache: ${data.meta?.cached ? "HIT" : "MISS"}`;
}

document.addEventListener("DOMContentLoaded", () => {
  $("refreshBtn")?.addEventListener("click", loadRankings);
  loadRankings().catch((e) => {
    const status = $("status");
    if (status) status.textContent = `Erreur: ${e.message}`;
  });
});
