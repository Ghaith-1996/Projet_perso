from fastapi import FastAPI
import uvicorn
from pyfotmob import Fotmob

app = FastAPI()
fotmob = Fotmob()

@app.get("/players/{league_id}")
async def get_top_players(league_id: int):
    # Logique pour récupérer les stats avec la librairie Python
    stats = fotmob.get_league_stats(league_id)
    return stats

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)