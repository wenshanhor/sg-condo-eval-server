/**
 * Static MRT/LRT station dataset with Haversine nearest-station lookup.
 * Coordinates sourced from LTA DataMall / OneMap.
 */

const STATIONS = [
  { name: "Jurong East", line: "NS1/EW24", lat: 1.33329, lng: 103.74225 },
  { name: "Bukit Batok", line: "NS2", lat: 1.34906, lng: 103.74958 },
  { name: "Bukit Gombak", line: "NS3", lat: 1.35880, lng: 103.75188 },
  { name: "Choa Chu Kang", line: "NS4", lat: 1.38534, lng: 103.74434 },
  { name: "Yew Tee", line: "NS5", lat: 1.39734, lng: 103.74718 },
  { name: "Kranji", line: "NS7", lat: 1.42510, lng: 103.76213 },
  { name: "Marsiling", line: "NS8", lat: 1.43260, lng: 103.77390 },
  { name: "Woodlands", line: "NS9", lat: 1.43700, lng: 103.78650 },
  { name: "Admiralty", line: "NS10", lat: 1.44060, lng: 103.80091 },
  { name: "Sembawang", line: "NS11", lat: 1.44890, lng: 103.82007 },
  { name: "Canberra", line: "NS12", lat: 1.44306, lng: 103.82984 },
  { name: "Yishun", line: "NS13", lat: 1.42940, lng: 103.83500 },
  { name: "Khatib", line: "NS14", lat: 1.41730, lng: 103.83280 },
  { name: "Yio Chu Kang", line: "NS15", lat: 1.38170, lng: 103.84490 },
  { name: "Ang Mo Kio", line: "NS16", lat: 1.36990, lng: 103.84960 },
  { name: "Bishan", line: "NS17/CC15", lat: 1.35100, lng: 103.84890 },
  { name: "Braddell", line: "NS18", lat: 1.34040, lng: 103.84670 },
  { name: "Toa Payoh", line: "NS19", lat: 1.33260, lng: 103.84720 },
  { name: "Novena", line: "NS20", lat: 1.32040, lng: 103.84370 },
  { name: "Newton", line: "NS21/DT11", lat: 1.31370, lng: 103.83800 },
  { name: "Orchard", line: "NS22", lat: 1.30440, lng: 103.83190 },
  { name: "Somerset", line: "NS23", lat: 1.30050, lng: 103.83870 },
  { name: "Dhoby Ghaut", line: "NS24/NE6/CC1", lat: 1.29920, lng: 103.84560 },
  { name: "City Hall", line: "NS25/EW13", lat: 1.29320, lng: 103.85210 },
  { name: "Raffles Place", line: "NS26/EW14", lat: 1.28370, lng: 103.85160 },
  { name: "Marina Bay", line: "NS27/CE2", lat: 1.27620, lng: 103.85440 },
  { name: "Marina South Pier", line: "NS28", lat: 1.27119, lng: 103.86340 },
  { name: "Pasir Ris", line: "EW1", lat: 1.37310, lng: 103.94940 },
  { name: "Tampines", line: "EW2/DT32", lat: 1.35260, lng: 103.94530 },
  { name: "Simei", line: "EW3", lat: 1.34310, lng: 103.95340 },
  { name: "Tanah Merah", line: "EW4", lat: 1.32720, lng: 103.94630 },
  { name: "Bedok", line: "EW5", lat: 1.32400, lng: 103.93000 },
  { name: "Kembangan", line: "EW6", lat: 1.32100, lng: 103.91280 },
  { name: "Eunos", line: "EW7", lat: 1.31980, lng: 103.90300 },
  { name: "Paya Lebar", line: "EW8/CC9", lat: 1.31790, lng: 103.89260 },
  { name: "Aljunied", line: "EW9", lat: 1.31640, lng: 103.88290 },
  { name: "Kallang", line: "EW10", lat: 1.31150, lng: 103.87130 },
  { name: "Lavender", line: "EW11", lat: 1.30720, lng: 103.86310 },
  { name: "Bugis", line: "EW12/DT14", lat: 1.30060, lng: 103.85580 },
  { name: "Outram Park", line: "EW16/NE3", lat: 1.28030, lng: 103.83930 },
  { name: "Tiong Bahru", line: "EW17", lat: 1.28600, lng: 103.82700 },
  { name: "Redhill", line: "EW18", lat: 1.28930, lng: 103.81680 },
  { name: "Queenstown", line: "EW19", lat: 1.29440, lng: 103.80590 },
  { name: "Commonwealth", line: "EW20", lat: 1.30230, lng: 103.79830 },
  { name: "Buona Vista", line: "EW21/CC22", lat: 1.30740, lng: 103.79000 },
  { name: "Dover", line: "EW22", lat: 1.31140, lng: 103.77850 },
  { name: "Clementi", line: "EW23", lat: 1.31510, lng: 103.76530 },
  { name: "Chinese Garden", line: "EW25", lat: 1.34250, lng: 103.73250 },
  { name: "Lakeside", line: "EW26", lat: 1.34430, lng: 103.72100 },
  { name: "Boon Lay", line: "EW27", lat: 1.33860, lng: 103.70610 },
  { name: "Pioneer", line: "EW28", lat: 1.33750, lng: 103.69730 },
  { name: "Joo Koon", line: "EW29", lat: 1.32790, lng: 103.67820 },
  { name: "Tuas Crescent", line: "EW31", lat: 1.32110, lng: 103.64910 },
  { name: "Tuas West Road", line: "EW32", lat: 1.33000, lng: 103.63970 },
  { name: "Tuas Link", line: "EW33", lat: 1.34060, lng: 103.63680 },
  { name: "Expo", line: "CG1/DT35", lat: 1.33500, lng: 103.96130 },
  { name: "Changi Airport", line: "CG2", lat: 1.35740, lng: 103.98830 },
  { name: "HarbourFront", line: "NE1/CC29", lat: 1.26530, lng: 103.82130 },
  { name: "Chinatown", line: "NE4/DT19", lat: 1.28450, lng: 103.84460 },
  { name: "Clarke Quay", line: "NE5", lat: 1.28860, lng: 103.84650 },
  { name: "Little India", line: "NE7/DT12", lat: 1.30640, lng: 103.84940 },
  { name: "Farrer Park", line: "NE8", lat: 1.31230, lng: 103.85440 },
  { name: "Boon Keng", line: "NE9", lat: 1.31960, lng: 103.86150 },
  { name: "Potong Pasir", line: "NE10", lat: 1.33140, lng: 103.86870 },
  { name: "Woodleigh", line: "NE11", lat: 1.33900, lng: 103.87080 },
  { name: "Serangoon", line: "NE12/CC13", lat: 1.34940, lng: 103.87360 },
  { name: "Kovan", line: "NE13", lat: 1.36010, lng: 103.88480 },
  { name: "Hougang", line: "NE14", lat: 1.37130, lng: 103.89230 },
  { name: "Buangkok", line: "NE15", lat: 1.38290, lng: 103.89280 },
  { name: "Sengkang", line: "NE16", lat: 1.39170, lng: 103.89540 },
  { name: "Punggol", line: "NE17", lat: 1.40530, lng: 103.90230 },
  { name: "Bayfront", line: "CE1/DT16", lat: 1.28170, lng: 103.85900 },
  { name: "Bras Basah", line: "CC2", lat: 1.29680, lng: 103.85060 },
  { name: "Esplanade", line: "CC3", lat: 1.29380, lng: 103.85540 },
  { name: "Promenade", line: "CC4/DT15", lat: 1.29300, lng: 103.86110 },
  { name: "Nicoll Highway", line: "CC5", lat: 1.29970, lng: 103.86350 },
  { name: "Stadium", line: "CC6", lat: 1.30270, lng: 103.87530 },
  { name: "Mountbatten", line: "CC7", lat: 1.30640, lng: 103.88250 },
  { name: "Dakota", line: "CC8", lat: 1.30840, lng: 103.88850 },
  { name: "MacPherson", line: "CC10/DT26", lat: 1.32650, lng: 103.89000 },
  { name: "Tai Seng", line: "CC11", lat: 1.33570, lng: 103.88830 },
  { name: "Bartley", line: "CC12", lat: 1.34260, lng: 103.87990 },
  { name: "Lorong Chuan", line: "CC14", lat: 1.35160, lng: 103.86180 },
  { name: "Marymount", line: "CC16", lat: 1.34900, lng: 103.83930 },
  { name: "Caldecott", line: "CC17", lat: 1.33760, lng: 103.83940 },
  { name: "Botanic Gardens", line: "CC19/DT9", lat: 1.32230, lng: 103.81520 },
  { name: "Farrer Road", line: "CC20", lat: 1.31730, lng: 103.80730 },
  { name: "Holland Village", line: "CC21", lat: 1.31200, lng: 103.79600 },
  { name: "one-north", line: "CC23", lat: 1.29940, lng: 103.78700 },
  { name: "Kent Ridge", line: "CC24", lat: 1.29350, lng: 103.78460 },
  { name: "Haw Par Villa", line: "CC25", lat: 1.28260, lng: 103.78200 },
  { name: "Pasir Panjang", line: "CC26", lat: 1.27620, lng: 103.79140 },
  { name: "Labrador Park", line: "CC27", lat: 1.27210, lng: 103.80260 },
  { name: "Telok Blangah", line: "CC28", lat: 1.27070, lng: 103.80980 },
  { name: "Bukit Panjang", line: "DT1", lat: 1.37840, lng: 103.76190 },
  { name: "Cashew", line: "DT2", lat: 1.36890, lng: 103.76450 },
  { name: "Hillview", line: "DT3", lat: 1.36240, lng: 103.76730 },
  { name: "Beauty World", line: "DT5", lat: 1.34160, lng: 103.77590 },
  { name: "King Albert Park", line: "DT6", lat: 1.33550, lng: 103.78340 },
  { name: "Sixth Avenue", line: "DT7", lat: 1.33080, lng: 103.79720 },
  { name: "Tan Kah Kee", line: "DT8", lat: 1.32590, lng: 103.80740 },
  { name: "Stevens", line: "DT10", lat: 1.32000, lng: 103.82610 },
  { name: "Rochor", line: "DT13", lat: 1.30370, lng: 103.85250 },
  { name: "Jalan Besar", line: "DT22", lat: 1.30540, lng: 103.85530 },
  { name: "Bendemeer", line: "DT23", lat: 1.31390, lng: 103.86300 },
  { name: "Geylang Bahru", line: "DT24", lat: 1.32140, lng: 103.87150 },
  { name: "Mattar", line: "DT25", lat: 1.32700, lng: 103.88310 },
  { name: "Ubi", line: "DT27", lat: 1.33000, lng: 103.89900 },
  { name: "Kaki Bukit", line: "DT28", lat: 1.33470, lng: 103.90830 },
  { name: "Bedok North", line: "DT29", lat: 1.33450, lng: 103.91830 },
  { name: "Bedok Reservoir", line: "DT30", lat: 1.33660, lng: 103.93210 },
  { name: "Tampines West", line: "DT31", lat: 1.34570, lng: 103.93830 },
  { name: "Tampines East", line: "DT33", lat: 1.35610, lng: 103.95440 },
  { name: "Upper Changi", line: "DT34", lat: 1.34140, lng: 103.96140 },
  { name: "Telok Ayer", line: "DT18", lat: 1.28210, lng: 103.84830 },
  { name: "Fort Canning", line: "DT20", lat: 1.29240, lng: 103.84440 },
  { name: "Bencoolen", line: "DT21", lat: 1.29850, lng: 103.84990 },
  { name: "Tanjong Pagar", line: "EW15", lat: 1.27640, lng: 103.84580 },
  { name: "Tengah", line: "JRL1", lat: 1.37310, lng: 103.72120 },
  { name: "Woodlands North", line: "TE1", lat: 1.44830, lng: 103.78510 },
  { name: "Woodlands South", line: "TE3", lat: 1.42700, lng: 103.79310 },
  { name: "Springleaf", line: "TE4", lat: 1.39780, lng: 103.81890 },
  { name: "Lentor", line: "TE5", lat: 1.38470, lng: 103.83630 },
  { name: "Mayflower", line: "TE6", lat: 1.37180, lng: 103.83720 },
  { name: "Bright Hill", line: "TE7", lat: 1.36330, lng: 103.83360 },
  { name: "Upper Thomson", line: "TE8", lat: 1.35420, lng: 103.83370 },
  { name: "Stevens (TEL)", line: "TE11", lat: 1.32000, lng: 103.82610 },
  { name: "Napier", line: "TE12", lat: 1.30680, lng: 103.82340 },
  { name: "Orchard Boulevard", line: "TE13", lat: 1.30170, lng: 103.82920 },
  { name: "Great World", line: "TE15", lat: 1.29290, lng: 103.83380 },
  { name: "Havelock", line: "TE16", lat: 1.28840, lng: 103.83610 },
  { name: "Maxwell", line: "TE18", lat: 1.27930, lng: 103.84450 },
  { name: "Shenton Way", line: "TE19", lat: 1.27640, lng: 103.84960 },
  { name: "Marina Bay (TEL)", line: "TE20", lat: 1.27620, lng: 103.85440 },
  { name: "Founders' Memorial", line: "TE22", lat: 1.28950, lng: 103.86980 },
  { name: "Tanjong Rhu", line: "TE23", lat: 1.29310, lng: 103.87460 },
  { name: "Katong Park", line: "TE24", lat: 1.29780, lng: 103.88490 },
  { name: "Tanjong Katong", line: "TE25", lat: 1.30570, lng: 103.89560 },
  { name: "Marine Parade", line: "TE26", lat: 1.30610, lng: 103.90570 },
  { name: "Marine Terrace", line: "TE27", lat: 1.30680, lng: 103.91340 },
  { name: "Siglap", line: "TE28", lat: 1.31200, lng: 103.92500 },
  { name: "Bayshore", line: "TE29", lat: 1.31320, lng: 103.93920 },
  { name: "Sungei Bedok", line: "TE31", lat: 1.32340, lng: 103.95330 },
];

function haversineMetres(lat1, lng1, lat2, lng2) {
  const R = 6_371_000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const LINE_NAMES = {
  NS: "North-South Line",
  EW: "East-West Line",
  NE: "North-East Line",
  CC: "Circle Line",
  DT: "Downtown Line",
  TE: "Thomson-East Coast Line",
  CG: "East-West Line (Changi)",
  CE: "Circle Line (Marina Bay)",
  JRL: "Jurong Region Line",
  BP: "Bukit Panjang LRT",
  SE: "Sengkang LRT",
  PE: "Punggol LRT",
  SW: "Sengkang LRT",
  PW: "Punggol LRT",
};

function lineLabel(code) {
  const prefix = code.replace(/[0-9]/g, "");
  return LINE_NAMES[prefix] ?? prefix;
}

function lineCodes(lineStr) {
  return lineStr.split("/").map((c) => {
    const prefix = c.replace(/[0-9]/g, "");
    return { code: c, lineName: LINE_NAMES[prefix] ?? prefix };
  });
}

export function findNearestMRT(lat, lng) {
  let best = null;
  let bestDist = Infinity;

  for (const stn of STATIONS) {
    const d = haversineMetres(lat, lng, stn.lat, stn.lng);
    if (d < bestDist) {
      bestDist = d;
      best = stn;
    }
  }

  if (!best) return null;
  return {
    name: best.name,
    line: best.line,
    lines: lineCodes(best.line),
    dist: Math.round(bestDist),
  };
}

export function findMRTsWithin(lat, lng, radiusMetres = 1000) {
  const results = [];

  for (const stn of STATIONS) {
    const d = haversineMetres(lat, lng, stn.lat, stn.lng);
    if (d <= radiusMetres) {
      results.push({
        name: stn.name,
        line: stn.line,
        lines: lineCodes(stn.line),
        dist: Math.round(d),
      });
    }
  }

  results.sort((a, b) => a.dist - b.dist);
  return results;
}
