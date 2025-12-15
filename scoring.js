//scoring.js
export const WEIGHTS = {
  goal: 5,
  assist: 4,
  shot: 0.2,
  chanceCreated: 0.5, // key passes

  // demandés à 0 (non utilisés)
  bigChanceCreated: 1,
  accurateCross: 0.1,
  accurateLongBall: 0.05,
  recoveries: 0.1,
  dispossessed: -0.2,

  successfulDribble: 0.5,
  interception: 0.15,
  duelWon: 0.1,
  red: -5,
  yellow: -2,
};

function n(v) {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
}

/**
 * Calcule le score à partir d’un objet "stats" (match ou saison).
 * IMPORTANT: protège contre null -> 0 (API renvoie souvent null).
 */
export function scoreFromStats(stats) {
  const goals = n(stats.goals);
  const assists = n(stats.assists);
  const shots = n(stats.shots);

  // chanceCreated = key passes
  const chanceCreated = n(stats.chanceCreated);

  // Forcés à 0 comme convenu
  const bigChanceCreated = 0;
  const accurateCross = 0;
  const accurateLongBall = 0;
  const recoveries = 0;
  const dispossessed = 0;

  const successfulDribble = n(stats.successfulDribble);
  const interception = n(stats.interception);
  const duelWon = n(stats.duelWon);

  const yellow = n(stats.yellow);
  const red = n(stats.red);

  return (
    goals * WEIGHTS.goal +
    assists * WEIGHTS.assist +
    shots * WEIGHTS.shot +
    chanceCreated * WEIGHTS.chanceCreated +
    bigChanceCreated * WEIGHTS.bigChanceCreated +
    successfulDribble * WEIGHTS.successfulDribble +
    accurateCross * WEIGHTS.accurateCross +
    accurateLongBall * WEIGHTS.accurateLongBall +
    dispossessed * WEIGHTS.dispossessed +
    recoveries * WEIGHTS.recoveries +
    interception * WEIGHTS.interception +
    duelWon * WEIGHTS.duelWon +
    red * WEIGHTS.red +
    yellow * WEIGHTS.yellow
  );
}
