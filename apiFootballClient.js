import fetch from "node-fetch";

export class ApiFootballClient {
  constructor({ baseUrl, apiKey }) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  async get(path, params = {}) {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }

    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-apisports-key": this.apiKey,
        "Accept": "application/json",
      },
    });

    const text = await res.text().catch(() => "");

    if (!res.ok) {
      throw new Error(`API error ${res.status}: ${text}`);
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error(`Invalid JSON from API: ${text}`);
    }
  }
}
