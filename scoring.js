// scoring.js

// Garde tes poids actuels
export const WEIGHTS = {
  goal: 5,
  assist: 4,
  shot: 0.2,
  chanceCreated: 0.5,
  bigChanceCreated: 1,
  // ... reste des WEIGHTS
};

// ÉTAPE 3 : L'ADAPTATEUR
// Cette fonction transforme un joueur venant de Python vers ton format interne
export const mapPythonStatsToScoring = (pythonPlayer) => {
  return {
    goal: pythonPlayer.goals || 0,
    assist: pythonPlayer.assists || 0,
    shot: pythonPlayer.total_shots || 0,
    chanceCreated: pythonPlayer.key_passes || 0,
    bigChanceCreated: pythonPlayer.big_chances_created || 0,
    // Ajoute ici tous les champs utilisés dans tes calculs
  };
};

export const calculateScore = (stats) => {
  let total = 0;
  for (const key in WEIGHTS) {
    if (stats[key]) {
      total += stats[key] * WEIGHTS[key];
    }
  }
  return total;
};