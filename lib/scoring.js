/**
 * Deterministic scoring engine — mirrors the PRD algorithms exactly.
 * Accepts raw data from API calls, returns structured scores.
 */

export function evaluate({
  devName, bed, bath, lat, lng,
  totalUnits, topYear, ageEstimated, tenure,
  transactions12m, transactions12mAll, similarDevs,
  nearestMrt, mrtsWithin1km, schoolsWithin1km, schoolsWithin2km,
  priceStats, comparables,
}) {
  const landSize = scoreLandSize(totalUnits);
  const supply = scoreSupply(similarDevs);
  const liquidity = scoreLiquidity(transactions12m, transactions12mAll);
  const mrt = scoreMRT(nearestMrt?.dist ?? null);
  const schools = scoreSchools(schoolsWithin1km, schoolsWithin2km);

  const criteria = [
    { key: "landSize", label: "Land Size (Unit Count)", ...landSize },
    { key: "supply", label: "Similar Developments", ...supply },
    { key: "liquidity", label: "Unit Transactions", ...liquidity },
    { key: "mrt", label: "MRT Proximity", ...mrt, mrtName: nearestMrt?.name },
    { key: "schools", label: "Primary School Proximity", ...schools },
  ];

  const totalScore = criteria.reduce((sum, c) => sum + c.score, 0);

  let tier, tierKey, tierDesc;
  if (totalScore >= 40) {
    tier = "Excellent"; tierKey = "excellent";
    tierDesc = "Strong fundamentals across all dimensions.";
  } else if (totalScore >= 30) {
    tier = "Good"; tierKey = "good";
    tierDesc = "Solid on most criteria with minor gaps.";
  } else if (totalScore >= 20) {
    tier = "Fair"; tierKey = "fair";
    tierDesc = "Mixed profile — some strengths offset by notable weaknesses.";
  } else {
    tier = "Not Recommended"; tierKey = "not-recommended";
    tierDesc = "Significant concerns across multiple criteria.";
  }

  const currentYear = new Date().getFullYear();
  const numericTop = typeof topYear === "number" ? topYear
    : typeof topYear === "string" && /^\d{4}$/.test(topYear) ? parseInt(topYear, 10)
    : null;
  const age = numericTop ? (currentYear - numericTop <= 0 ? "New" : `${currentYear - numericTop} years`) : "—";

  let tenureLabel = "—";
  if (tenure) {
    const t = tenure.toLowerCase();
    if (t.includes("freehold")) tenureLabel = "Freehold";
    else if (t.includes("999")) tenureLabel = "999-yr Leasehold";
    else if (t.includes("lease")) {
      const m = t.match(/(\d+)\s*yr/);
      tenureLabel = m ? `${m[1]}-yr Leasehold` : "Leasehold";
    }
  }

  return {
    name: devName,
    units: totalUnits ?? "—",
    age,
    ageEstimated: ageEstimated && numericTop != null,
    tenure: tenureLabel,
    bed,
    bath,
    area: "—",
    lat,
    lng,
    nearestMRT: nearestMrt,
    mrtsWithin1km: mrtsWithin1km ?? [],
    criteria,
    totalScore,
    tier,
    tierKey,
    tierDesc,
    priceStats: priceStats ?? null,
    comparables: comparables ?? null,
  };
}

function scoreLandSize(units) {
  if (units == null) return { score: 5, imputed: true, detail: "Data unavailable" };
  let score;
  if (units >= 1000) score = 10;
  else if (units >= 300) score = 7;
  else if (units >= 100) score = 5;
  else score = 2;
  return { score, imputed: false, detail: `${units} total units` };
}

function scoreSupply(similarDevs) {
  if (similarDevs == null) return { score: 5, imputed: true, similarDevs: null };
  let score;
  if (similarDevs === 0) score = 10;
  else if (similarDevs <= 2) score = 7;
  else if (similarDevs <= 5) score = 4;
  else score = 1;
  return { score, imputed: false, similarDevs };
}

function scoreLiquidity(transactions, transactionsAll) {
  if (transactions == null) return { score: 5, imputed: true, transactions: null, transactionsAll: null };
  let score;
  if (transactions > 20) score = 10;
  else if (transactions > 10) score = 7;
  else if (transactions >= 5) score = 4;
  else score = 1;
  return { score, imputed: false, transactions, transactionsAll: transactionsAll ?? transactions };
}

function scoreMRT(dist) {
  if (dist == null) return { score: 4, imputed: true, detail: "Distance unavailable" };
  let score;
  if (dist < 300) score = 10;
  else if (dist < 600) score = 7;
  else if (dist <= 1000) score = 4;
  else score = 1;
  return { score, imputed: false, dist };
}

function scoreSchools(n1, n2) {
  if (n1 == null && n2 == null) return { score: 4, imputed: true };
  const s1 = n1 ?? 0;
  const s2 = n2 ?? 0;
  let score;
  if (s1 >= 1 && s2 >= 1) score = 10;
  else if (s1 === 1) score = 7;
  else if (s1 === 0 && s2 >= 1) score = 5;
  else score = 1;
  return { score, imputed: false, n1: s1, n2: s2 };
}
