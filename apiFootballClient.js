// apiFootballClient.js (Nouvelle version)
import fetch from 'node-fetch';

export const getPlayersFromPython = async (leagueId) => {
  try {
    const response = await fetch(`http://localhost:8000/players/${leagueId}`);
    return await response.json();
  } catch (error) {
    console.error("Erreur lors de l'appel au service Python:", error);
  }
};