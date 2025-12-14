// scoring.js
export const WEIGHTS = {
  goals: 3,
  assists: 2,
  shots: 0.2,

  chanceCreated: 0.5,       // passes.key
  bigChanceCreated: 1,      // FotMob (sinon 0)

  successfulDribble: 0.5,

  accurateCross: 0.1,       // (0 pour l’instant)
  accurateLongBall: 0.05,   // FotMob (sinon 0)

  dispossessed: -0.2,       // (0 pour l’instant)
  recoveries: 0.1,          // FotMob (sinon 0)

  interceptions: 0.15,
  duelsWon: 0.1,

  redCards: -5,
  yellowCards: -2
};

const n = (v) => Number(v ?? 0) || 0;

export function computeScore(s) {
  const goals = s.goals ?? 0;
  const assists = s.assists ?? 0;
  const shots = s.shots ?? 0;
  const chanceCreated = s.chanceCreated ?? 0;        // passes.key
  const bigChanceCreated = s.bigChanceCreated ?? 0;  // fotmob
  const successfulDribble = s.successfulDribble ?? 0;
  const interception = s.interception ?? 0;
  const duelWon = s.duelWon ?? 0;
  const yellow = s.yellow ?? 0;
  const red = s.red ?? 0;

  // mis à 0 (comme tu as demandé)
  const accurateCross = 0;
  const dispossessed = 0;

  const recoveries = s.recoveries ?? 0;              // fotmob
  const accurateLongBall = s.accurateLongBall ?? 0;  // fotmob

  return (
    goals * 3 +
    assists * 2 +
    shots * 0.2 +
    chanceCreated * 0.5 +
    bigChanceCreated * 1 +
    successfulDribble * 0.5 +
    accurateCross * 0.1 +
    accurateLongBall * 0.05 +
    dispossessed * -0.2 +
    recoveries * 0.1 +
    interception * 0.15 +
    duelWon * 0.1 +
    red * -5 +
    yellow * -2
  );
}

export function scoreSeason(matchStatsArray) {
  return matchStatsArray.reduce((sum, m) => sum + scoreMatch(m), 0);
}
