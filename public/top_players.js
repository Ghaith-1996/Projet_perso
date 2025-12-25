function getEl(id) { return document.getElementById(id); }
function fmtScore(n) { const x = Number(n ?? 0); return Number.isFinite(x) ? x.toFixed(2) : "0.00"; }

function render(rows) {
  const body = getEl("rankingBody");
  body.innerHTML = "";

  if (!rows || rows.length === 0) {
    body.innerHTML = `<tr><td colspan="6" style="text-align:center;">Aucune donnée scrapée (ou chargement...)</td></tr>`;
    return;
  }

  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    // On peut ajouter des icônes selon la ligue si on veut
    tr.innerHTML = `
      <td class="rank">${idx + 1}</td>
      <td>
        <div class="player">
          <div class="avatar">${idx + 1}</div>
          <div>
            <div class="player-name"><b>${r.name}</b></div>
            <div class="player-meta muted">${r.league}</div>
          </div>
        </div>
      </td>
      <td>${r.team}</td>
      <td><div class="score"><span class="pill">${fmtScore(r.score)}</span></div></td>
      <td>
        <div class="chips">
          <span class="chip">Buts: ${r.goals}</span>
          <span class="chip">Assists: ${r.assists}</span>
          <span class="chip">Passes clés: ${r.keyPasses}</span>
          <span class="chip">Dribbles: ${r.dribblesWon}</span>
          <span class="chip">Interc: ${r.interceptions}</span>
        </div>
      </td>
    `;
    body.appendChild(tr);
  });
}

async function loadScrapedData() {
  const status = getEl("status");
  const btn = getEl("refreshBtn");
  
  status.textContent = "Scraping des données FBref en cours (peut prendre 5-10 secondes)...";
  btn.disabled = true;
  getEl("rankingBody").innerHTML = "";

  try {
    const res = await fetch("/api/scraped-rankings");
    const data = await res.json();

    if (data.ok && data.rows) {
      render(data.rows);
      status.textContent = `Scraping terminé ! ${data.rows.length} joueurs trouvés (>2000 min).`;
    } else {
      status.textContent = "Erreur lors du scraping.";
    }
  } catch (e) {
    console.error(e);
    status.textContent = "Erreur serveur.";
  } finally {
    btn.disabled = false;
  }

}
// ... (le début reste pareil)

async function loadScrapedData() {
  const status = getEl("status");
  const btn = getEl("refreshBtn");
  
  status.textContent = "Scraping via ScrapingBee en cours (5-10 secondes)...";
  status.style.color = "blue";
  if(btn) btn.disabled = true;
  getEl("rankingBody").innerHTML = "";

  try {
    const res = await fetch("/api/scraped-rankings");
    const data = await res.json();

    if (data.ok && data.rows) {
      render(data.rows);
      status.textContent = `Succès ! ${data.rows.length} joueurs chargés.`;
      status.style.color = "green";
    } else {
      // AFFICHER LA VRAIE ERREUR ICI
      console.error("Erreur serveur:", data);
      status.textContent = `Erreur: ${data.error || "Problème inconnu"}`;
      status.style.color = "red";
    }
  } catch (e) {
    console.error(e);
    status.textContent = `Erreur JS: ${e.message}`;
    status.style.color = "red";
  } finally {
    if(btn) btn.disabled = false;
  }
}

// ... (la fin reste pareille)

document.addEventListener("DOMContentLoaded", () => {
  // Lancer au chargement ou via le bouton
  const btn = getEl("refreshBtn");
  if(btn) btn.addEventListener("click", loadScrapedData);
  
  // Auto-start
  loadScrapedData();
});