/**
 * URA Data Service API client.
 *
 * Docs: https://eservice.ura.gov.sg/maps/api/
 * Auth: AccessKey (permanent) → daily Token via /insertNewToken/v1
 */

const BASE = "https://eservice.ura.gov.sg/uraDataService";

export class UraClient {
  #accessKey;
  #token = null;
  #tokenDate = null;
  #batchCache = null;
  #batchCacheTime = 0;

  constructor(accessKey) {
    this.#accessKey = accessKey;
  }

  async #ensureToken(forceRefresh = false) {
    const today = new Date().toDateString();
    if (!forceRefresh && this.#token && this.#tokenDate === today) return;

    console.log("[ura] Requesting new daily token...");
    const res = await fetch(`${BASE}/insertNewToken/v1`, {
      headers: { AccessKey: this.#accessKey },
    });
    const data = await res.json();
    if (data.Status !== "Success") {
      console.error("[ura] Token request failed:", data.Message);
      throw new Error(`URA token error: ${data.Message}`);
    }
    console.log("[ura] Token obtained successfully");
    this.#token = data.Result;
    this.#tokenDate = today;
  }

  async #get(service, params = {}) {
    await this.#ensureToken();
    const qs = new URLSearchParams({ service, ...params });
    const res = await fetch(`${BASE}/invokeUraDS/v1?${qs}`, {
      headers: {
        AccessKey: this.#accessKey,
        Token: this.#token,
      },
    });
    const data = await res.json();

    if (data.Status !== "Success") {
      console.warn(`[ura] API returned non-success for ${service}: ${data.Message ?? "unknown"}, retrying with fresh token...`);
      await this.#ensureToken(true);
      const retryRes = await fetch(`${BASE}/invokeUraDS/v1?${qs}`, {
        headers: {
          AccessKey: this.#accessKey,
          Token: this.#token,
        },
      });
      return retryRes.json();
    }

    return data;
  }

  async #getTransactionBatches() {
    if (this.#batchCache && Date.now() - this.#batchCacheTime < 3_600_000) {
      return this.#batchCache;
    }
    console.log("[ura] Fetching transaction batches 1–4...");
    const batches = await Promise.all(
      [1, 2, 3, 4].map((batch) => this.#get("PMI_Resi_Transaction", { batch }))
    );

    const successCount = batches.filter((b) => b.Status === "Success" && b.Result?.length).length;
    console.log(`[ura] Batch results: ${successCount}/4 successful`);

    if (successCount === 0) {
      console.error("[ura] All batches failed — not caching empty results");
      return batches;
    }

    this.#batchCache = batches;
    this.#batchCacheTime = Date.now();
    return batches;
  }

  /**
   * Fetch all 4 batches of private residential transactions
   * and filter by project name + resale type.
   */
  async getResaleTransactions(projectName, bed) {
    const batches = await this.#getTransactionBatches();

    const upperName = projectName.toUpperCase();
    const now = new Date();
    const twelveMonthsAgo = new Date(now);
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    let count12m = 0;
    let count12mSimilar = 0;
    let allResale = [];
    let allTx = [];
    let earliestResaleYYMM = Infinity;
    let tenure = null;

    for (const batch of batches) {
      if (batch.Status !== "Success" || !batch.Result) continue;
      for (const project of batch.Result) {
        if (project.project.toUpperCase() !== upperName) continue;
        for (const tx of project.transaction || []) {
          allTx.push(tx);
          if (!tenure && tx.tenure) tenure = tx.tenure;

          if (tx.typeOfSale !== "3") continue;
          allResale.push(tx);

          const mm = parseInt(tx.contractDate.slice(0, 2), 10) - 1;
          const yy = parseInt(tx.contractDate.slice(2), 10);
          const year = yy < 50 ? 2000 + yy : 1900 + yy;
          const txDate = new Date(year, mm, 1);
          if (txDate >= twelveMonthsAgo) {
            count12m++;
            if (bed && estimateBedrooms(parseInt(tx.area, 10)) === String(bed)) {
              count12mSimilar++;
            }
          }

          const yymm = year * 100 + mm + 1;
          if (yymm < earliestResaleYYMM) earliestResaleYYMM = yymm;
        }
      }
    }

    const estimatedTopFromResale =
      earliestResaleYYMM < Infinity
        ? Math.floor(earliestResaleYYMM / 100)
        : null;

    let leaseCommence = null;
    if (tenure) {
      const m = tenure.match(/commencing\s+from\s+(\d{4})/i);
      if (m) leaseCommence = parseInt(m[1], 10);
    }

    const estimatedTopYear = leaseCommence ?? estimatedTopFromResale;

    const uniqueUnits = new Set(allTx.map((t) => `${t.area}-${t.floorRange}`)).size || null;

    const priceStats = computePriceStats(allResale);

    return {
      count12m,
      count12mSimilar: bed ? count12mSimilar : count12m,
      total: allResale.length,
      estimatedTopYear,
      tenure,
      uniqueUnits,
      priceStats,
    };
  }

  /**
   * Get project info from the pipeline endpoint.
   * @deprecated Only contains uncompleted projects (~77 entries).
   * Returns { totalUnits, ... } or null if not found.
   */
  async getPipelineByProject(projectName) {
    const data = await this.#get("PMI_Resi_Pipeline");
    if (data.Status !== "Success" || !data.Result) return null;

    const upperName = projectName.toUpperCase();
    return data.Result.find((p) => p.project.toUpperCase() === upperName) ?? null;
  }

  /**
   * Find comparable resale transactions from nearby developments.
   * Filters: within 2km, ±200 total units, same bedroom estimate,
   * similar tenure (freehold matches freehold; leasehold ±5 yr).
   * Returns top 5 closest matches.
   */
  async getComparables(projectName, lat, lng, bed, totalUnits, dwellingUnits, targetTenure) {
    const batches = await this.#getTransactionBatches();
    const upperName = projectName.toUpperCase();
    const target = wgs84ToSvy21Approx(lat, lng);
    const bedStr = String(bed);
    const targetTenureInfo = parseTenure(targetTenure);

    const strict = new Map();
    const allWithTx = new Map();

    for (const batch of batches) {
      if (batch.Status !== "Success" || !batch.Result) continue;
      for (const project of batch.Result) {
        const projUpper = project.project.toUpperCase();
        if (projUpper === upperName) continue;
        if (projUpper.includes("LANDED") || projUpper.includes("HOUSING DEVELOPMENT")) continue;

        const px = parseFloat(project.x);
        const py = parseFloat(project.y);
        if (!px || !py) continue;

        const dist = Math.sqrt((px - target.x) ** 2 + (py - target.y) ** 2);
        const projName = project.project;
        const duKey = Object.keys(dwellingUnits).find(
          (k) => k.toUpperCase() === projName.toUpperCase()
        );
        const projUnits = duKey ? dwellingUnits[duKey] : null;

        let projTenureRaw = null;
        for (const tx of project.transaction || []) {
          if (tx.tenure) { projTenureRaw = tx.tenure; break; }
        }
        const projTenureInfo = parseTenure(projTenureRaw);

        const matchingTxs = [];
        for (const tx of project.transaction || []) {
          if (tx.typeOfSale !== "3") continue;
          if (estimateBedrooms(parseInt(tx.area, 10)) !== bedStr) continue;
          matchingTxs.push(tx);
        }
        if (!matchingTxs.length) continue;

        const entry = {
          name: projName,
          dist: Math.round(dist),
          units: projUnits,
          tenure: projTenureInfo.label,
          transactions: matchingTxs,
        };

        const key = projName.toUpperCase();
        const merge = (map) => {
          if (map.has(key)) {
            const ex = map.get(key);
            ex.transactions.push(...matchingTxs);
            if (dist < ex.dist) ex.dist = Math.round(dist);
          } else {
            map.set(key, { ...entry, transactions: [...matchingTxs] });
          }
        };

        // Always track for distance-only fallback
        merge(allWithTx);

        // Strict filter: within 2km, ±200 units, tenure match
        if (dist > 2000) continue;
        if (totalUnits && projUnits != null && Math.abs(projUnits - totalUnits) > 200) continue;
        if (!tenureMatch(targetTenureInfo, projTenureInfo)) continue;
        merge(strict);
      }
    }

    const formatDev = (d) => {
      const s = summarisePrices(d.transactions);
      return {
        name: d.name, dist: d.dist, units: d.units, tenure: d.tenure,
        txCount: d.transactions.length,
        avgPsf: s?.avgPsf ?? null, minPsf: s?.minPsf ?? null, maxPsf: s?.maxPsf ?? null,
        avgQuantum: s?.avg ?? null, minQuantum: s?.min ?? null, maxQuantum: s?.max ?? null,
      };
    };

    const pick5 = (map) => [...map.values()].sort((a, b) => a.dist - b.dist).slice(0, 5);

    const strictCount = strict.size;

    if (strictCount > 0) {
      const devs = pick5(strict);
      const stats = summarisePrices(devs.flatMap((d) => d.transactions));
      return { stats, fallback: false, strictCount, developments: devs.map(formatDev) };
    }

    const devs = pick5(allWithTx);
    if (devs.length > 0) {
      const stats = summarisePrices(devs.flatMap((d) => d.transactions));
      return { stats, fallback: true, strictCount: 0, developments: devs.map(formatDev) };
    }

    return { stats: null, fallback: true, strictCount: 0, developments: [] };
  }
}

function parseTenure(raw) {
  if (!raw) return { type: "unknown", label: "—", leaseYrs: null, commence: null };
  const t = raw.toLowerCase();
  if (t.includes("freehold")) return { type: "freehold", label: "Freehold", leaseYrs: null, commence: null };
  const mYrs = t.match(/(\d+)\s*yr/);
  const mFrom = t.match(/commencing\s+from\s+(\d{4})/i);
  const leaseYrs = mYrs ? parseInt(mYrs[1], 10) : null;
  const commence = mFrom ? parseInt(mFrom[1], 10) : null;
  const label = leaseYrs ? `${leaseYrs}-yr Leasehold` : "Leasehold";
  return { type: "leasehold", label, leaseYrs, commence };
}

function tenureMatch(target, candidate, rangeYrs = 5) {
  if (target.type === "unknown" || candidate.type === "unknown") return true;
  if (target.type !== candidate.type) return false;
  if (target.type === "freehold") return true;
  if (target.commence && candidate.commence) {
    return Math.abs(target.commence - candidate.commence) <= rangeYrs;
  }
  return true;
}

function wgs84ToSvy21Approx(lat, lng) {
  const oLat = 1.366666;
  const oLng = 103.833333;
  const FN = 38744.572;
  const FE = 28001.642;
  const y = FN + (lat - oLat) * 111133;
  const x = FE + (lng - oLng) * 111133 * Math.cos(lat * Math.PI / 180);
  return { x, y };
}

const SQM_TO_SQFT = 10.7639;

function estimateBedrooms(areaSqm) {
  if (areaSqm <= 55) return "1";
  if (areaSqm <= 80) return "2";
  if (areaSqm <= 120) return "3";
  if (areaSqm <= 160) return "4";
  return "5";
}

function summarisePrices(txList) {
  if (!txList.length) return null;
  let minQ = Infinity, maxQ = -Infinity, sumQ = 0;
  let minPsf = Infinity, maxPsf = -Infinity, sumPsf = 0;

  for (const tx of txList) {
    const price = parseInt(tx.price, 10);
    const areaSqft = parseInt(tx.area, 10) * SQM_TO_SQFT;
    const psf = price / areaSqft;

    if (price < minQ) minQ = price;
    if (price > maxQ) maxQ = price;
    sumQ += price;

    if (psf < minPsf) minPsf = psf;
    if (psf > maxPsf) maxPsf = psf;
    sumPsf += psf;
  }

  const n = txList.length;
  return {
    count: n,
    min: minQ, avg: Math.round(sumQ / n), max: maxQ,
    minPsf: Math.round(minPsf), avgPsf: Math.round(sumPsf / n), maxPsf: Math.round(maxPsf),
  };
}

function computePriceStats(resaleTxs) {
  const all = summarisePrices(resaleTxs);

  const byBed = {};
  const buckets = { "1": [], "2": [], "3": [], "4": [], "5": [] };
  for (const tx of resaleTxs) {
    const bed = estimateBedrooms(parseInt(tx.area, 10));
    buckets[bed].push(tx);
  }
  for (const [bed, txs] of Object.entries(buckets)) {
    const s = summarisePrices(txs);
    if (s) byBed[bed] = s;
  }

  const trendAll = computeTrend(resaleTxs);
  const trendByBed = {};
  for (const [bed, txs] of Object.entries(buckets)) {
    const t = computeTrend(txs);
    if (t.length) trendByBed[bed] = t;
  }

  return { all, byBed, trendAll, trendByBed };
}

function parseContractDate(cd) {
  const mm = parseInt(cd.slice(0, 2), 10);
  const yy = parseInt(cd.slice(2), 10);
  const year = yy < 50 ? 2000 + yy : 1900 + yy;
  return { year, month: mm };
}

function computeTrend(txList) {
  if (!txList.length) return [];
  const monthly = {};
  for (const tx of txList) {
    const { year, month } = parseContractDate(tx.contractDate);
    const key = `${year}-${String(month).padStart(2, "0")}`;
    if (!monthly[key]) monthly[key] = { sumQ: 0, sumPsf: 0, n: 0 };
    const price = parseInt(tx.price, 10);
    const areaSqft = parseInt(tx.area, 10) * SQM_TO_SQFT;
    monthly[key].sumQ += price;
    monthly[key].sumPsf += price / areaSqft;
    monthly[key].n += 1;
  }
  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      avgPsf: Math.round(d.sumPsf / d.n),
      avgQuantum: Math.round(d.sumQ / d.n),
      count: d.n,
    }));
}
