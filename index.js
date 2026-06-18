import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import multer from "multer";
import { UraClient } from "./lib/ura.js";
import { OneMapClient } from "./lib/onemap.js";
import { SchoolStore } from "./lib/schools.js";
import { evaluate } from "./lib/scoring.js";
import { findNearestMRT, findMRTsWithin } from "./lib/mrt.js";
import { analyzeFloorPlan } from "./lib/floorplan.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dwellingUnits = JSON.parse(readFileSync(join(__dirname, "lib", "dwelling-units.json"), "utf-8"));

dotenv.config({ path: join(__dirname, ".env") });

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const ura = new UraClient(process.env.URA_ACCESS_KEY);
const onemap = new OneMapClient(process.env.ONEMAP_EMAIL, process.env.ONEMAP_PASSWORD);
const schools = new SchoolStore();

app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q?.trim();
    if (!q || q.length < 2) return res.json([]);
    console.log(`[search] query="${q}"`);
    const results = await onemap.search(q);
    console.log(`[search] returned ${results.length} results`);
    res.json(results);
  } catch (err) {
    console.error("[search] error:", err.message);
    res.json([]);
  }
});

app.get("/api/health", async (req, res) => {
  try {
    const testResult = await onemap.search("Marina Bay");
    res.json({
      status: "ok",
      onemapWorking: testResult.length > 0,
      resultCount: testResult.length,
      sample: testResult.slice(0, 2),
    });
  } catch (err) {
    res.json({ status: "error", error: err.message });
  }
});

app.post("/api/analyze-floorplan", upload.single("floorplan"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No floor plan image uploaded" });
    }

    const result = await analyzeFloorPlan(req.file.buffer, req.file.mimetype);
    res.json(result);
  } catch (err) {
    console.error("Floor plan analysis error:", err);
    res.status(500).json({ error: err.message || "Floor plan analysis failed" });
  }
});

app.post("/api/evaluate", async (req, res) => {
  try {
    const { devName, bed, bath } = req.body;
    if (!devName || !bed || !bath) {
      return res.status(400).json({ error: "devName, bed, and bath are required" });
    }

    const geo = await onemap.geocode(devName);
    if (!geo) {
      return res.status(404).json({ error: `Could not geocode "${devName}"` });
    }

    const [pipeline, transactions, nearbySchools] = await Promise.all([
      ura.getPipelineByProject(devName),
      ura.getResaleTransactions(devName, bed),
      schools.countNearby(geo.lat, geo.lng),
    ]);

    const nearestMrt = findNearestMRT(geo.lat, geo.lng);
    const mrtsWithin1km = findMRTsWithin(geo.lat, geo.lng, 1000);

    const duLookupKey = Object.keys(dwellingUnits).find(
      (k) => k.toUpperCase() === devName.toUpperCase()
    );
    const totalUnits = pipeline?.totalUnits
      ?? (duLookupKey ? dwellingUnits[duLookupKey] : null);

    const pipelineTopYear = pipeline?.expectedTOPYear ?? null;
    const topYear = pipelineTopYear ?? transactions.estimatedTopYear ?? null;
    const ageEstimated = !pipelineTopYear;

    const comparables = await ura.getComparables(
      devName, geo.lat, geo.lng, bed, totalUnits, dwellingUnits,
      transactions.tenure
    );

    const result = evaluate({
      devName,
      bed,
      bath,
      lat: geo.lat,
      lng: geo.lng,
      totalUnits,
      topYear,
      ageEstimated,
      tenure: transactions.tenure ?? null,
      transactions12m: transactions.count12mSimilar,
      transactions12mAll: transactions.count12m,
      similarDevs: comparables.strictCount ?? null,
      nearestMrt,
      mrtsWithin1km,
      schoolsWithin1km: nearbySchools.within1km,
      schoolsWithin2km: nearbySchools.within2km,
      priceStats: transactions.priceStats,
      comparables,
    });

    res.json(result);
  } catch (err) {
    console.error("Evaluation error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
