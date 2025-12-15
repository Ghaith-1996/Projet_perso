function getEl(id) { return document.getElementById(id); }
function fmtScore(n) { const x = Number(n ?? 0); return Number.isFinite(x) ? x.toFixed(2) : "0.00"; }

function render(rows) {
  const body = getEl("rankingBody");
  body.innerHTML = "";

  if (!rows || rows.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune donnée (ou chargement en cours...)</td></tr>`;
    return;
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="rank">${idx + 1}</td>
      <td>
        <div class="player">
          <div class="avatar">${idx + 1}</div>
          <div>
            <div class="player-name">${r.name}</div>
            <div class="player-meta muted">${r.position} • ${r.age || "?"} ans</div>
          </div>
        </div>
      </td>
      <td>${r.team}<br><small style="color:#888">${r.league || ""}</small></td>
      <td>
        <div class="score"><span class="pill">${fmtScore(r.score)}</span></div>
      </td>
      <td>
        <div class="chips">
          <span class="chip">Buts: ${r.goals}</span>
          <span class="chip">Assists: ${r.assists}</span>
          <span class="chip">Tirs: ${r.shots}</span>
          <span class="chip" style="background:#e3f2fd; color:#0d47a1;">Key Passes: ${r.keyPasses}</span>
          <span class="chip">Dribbles: ${r.dribblesSuccess}</span>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

async function loadGlobal(season) {
  const status = getEl("status");
  const btn = getEl("refreshBtn");
  
  status.textContent = "Récupération des meilleurs joueurs mondiaux... (cela peut prendre quelques secondes)";
  btn.disabled = true;
  getEl("rankingBody").innerHTML = "";

  try {
    // Appel unique au serveur qui gère le cache et les 5 ligues
    const res = await fetch(`/api/global-rankings?season=${season}`);
    const data = await res.json();

    if (data.rows) {
      render(data.rows);
      status.textContent = `Top ${data.rows.length} chargé avec succès !`;
    } else {
      status.textContent = "Erreur de données.";
    }
  } catch (e) {
    console.error(e);
    status.textContent = "Erreur de connexion au serveur.";
  } finally {
    btn.disabled = false;
  }
}

// Démarrage automatique au chargement de la page
document.addEventListener("DOMContentLoaded", () => {
  const defaultSeason = getEl("season").value;
  loadGlobal(defaultSeason); // <-- Lancement AUTO ici

  // Bouton manuel si on change la saison
  getEl("refreshBtn").addEventListener("click", () => {
    const season = getEl("season").value;
    loadGlobal(season);
  });
});