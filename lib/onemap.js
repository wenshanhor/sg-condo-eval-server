/**
 * OneMap API client — Singapore's authoritative national map.
 *
 * Docs: https://www.onemap.gov.sg/apidocs/
 * Auth: email/password → token valid 3 days
 */

const BASE = "https://www.onemap.gov.sg/api";

export class OneMapClient {
  #email;
  #password;
  #token = null;
  #tokenExpiry = 0;

  constructor(email, password) {
    this.#email = email;
    this.#password = password;
  }

  async #ensureToken() {
    if (this.#token && Date.now() < this.#tokenExpiry) return;

    console.log("[onemap] Requesting new token...");
    const res = await fetch(`${BASE}/auth/post/getToken`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: this.#email, password: this.#password }),
    });
    const data = await res.json();
    if (!data.access_token) {
      console.error("[onemap] Auth failed:", JSON.stringify(data));
      throw new Error(`OneMap auth error: ${JSON.stringify(data)}`);
    }
    console.log("[onemap] Token obtained successfully");
    this.#token = data.access_token;
    this.#tokenExpiry = Date.now() + 2 * 24 * 60 * 60 * 1000;
  }

  async #get(path, params = {}) {
    await this.#ensureToken();
    const qs = new URLSearchParams(params);
    const url = `${BASE}/${path}?${qs}`;
    console.log(`[onemap] GET ${url.slice(0, 120)}...`);
    const res = await fetch(url, {
      headers: { Authorization: this.#token },
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`[onemap] HTTP ${res.status}: ${text.slice(0, 200)}`);
      return {};
    }
    return res.json();
  }

  /**
   * Search for buildings/addresses. Returns up to 10 results
   * with name and address for autocomplete.
   */
  async search(query) {
    const data = await this.#get("common/elastic/search", {
      searchVal: query,
      returnGeom: "Y",
      getAddrDetails: "Y",
    });

    if (!data.results?.length) return [];

    const seen = new Set();
    return data.results
      .filter((r) => {
        const name = r.BUILDING || r.ADDRESS;
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 10)
      .map((r) => ({
        name: r.BUILDING || "",
        address: r.ADDRESS,
        postal: r.POSTAL,
      }));
  }

  /**
   * Geocode a development/address name → { lat, lng, address }
   * Returns the top result or null.
   */
  async geocode(query) {
    const data = await this.#get("common/elastic/search", {
      searchVal: query,
      returnGeom: "Y",
      getAddrDetails: "Y",
    });

    if (!data.results?.length) return null;
    const top = data.results[0];
    return {
      lat: parseFloat(top.LATITUDE),
      lng: parseFloat(top.LONGITUDE),
      address: top.ADDRESS,
      postalCode: top.POSTAL,
    };
  }

  /**
   * Find the nearest MRT station to a lat/lng.
   * Returns { name, dist } or null.
   */
  async nearestMRT(lat, lng) {
    const data = await this.#get("publicapi/revgeocode", {
      location: `${lat},${lng}`,
      buffer: 2000,
      addressType: "All",
      otherFeatures: "Y",
    });

    // The reverse geocode returns nearby POIs; look for MRT stations.
    // Alternative: use the theme query for "mrt_station" if available.
    // Fallback: use the dedicated nearby endpoint.
    const mrt = await this.#get("publicapi/nearestMrt", {
      latitude: lat,
      longitude: lng,
    });

    if (mrt?.results?.length) {
      const nearest = mrt.results[0];
      return {
        name: nearest.STN_NAME || nearest.DESCRIPTION || "Unknown",
        dist: Math.round(parseFloat(nearest.DISTANCE ?? nearest.dist ?? 9999)),
      };
    }

    return null;
  }
}
