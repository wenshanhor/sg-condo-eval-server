/**
 * MOE Primary School proximity calculator.
 *
 * Uses a pre-geocoded static dataset of Singapore primary schools
 * (generated via OneMap geocoding) for reliable, instant lookups.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHOOLS = JSON.parse(readFileSync(join(__dirname, "schools-data.json"), "utf-8"));

export class SchoolStore {
  constructor() {}

  async countNearby(lat, lng) {
    let within1km = 0;
    let within2km = 0;

    for (const school of SCHOOLS) {
      const d = haversine(lat, lng, school.lat, school.lng);
      if (d <= 1000) within1km++;
      if (d <= 2000) within2km++;
    }

    return { within1km, within2km };
  }
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
