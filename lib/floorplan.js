const SYSTEM_PROMPT = `You are an expert Singapore property floor plan analyst. Evaluate the provided floor plan image across three criteria, scoring each from 0 to 10.

### 1. Circulation Efficiency (0–10)
How well you move through the space.
- Hallway length & width (minimal but functional?)
- Dead-end corridors vs. logical flow loops
- Door swing conflicts (do doors block each other?)
- Entry-to-rooms pathing (can you reach bedroom/kitchen/bathroom without crossing living areas?)

### 2. Functional Zoning (0–10)
How well different activity areas are organized and separated.
- Wet zone clustering (kitchen + bathrooms grouped for plumbing efficiency)
- Public vs. private separation (bedrooms away from living/dining)
- Noise isolation (bedrooms not adjacent to kitchen or front door)
- Service areas (storeroom, laundry, A/C ledge) logically placed
- Living area orientation (does it face the best view/light?)

### 3. Space Utilization (0–10)
How much of the floor area is genuinely usable.
- Wasted circulation (hallways, awkward corners, dead zones)
- Room proportions (squarish = good; long/narrow = harder to furnish)
- Usable wall length (enough continuous wall for furniture placement?)
- Bay windows, balconies, voids (do they add value or just eat into usable area?)
- Storage provision (built-in wardrobes, storerooms count as "used well")

Also provide:
- **circulationDetail**: 2-3 sentences explaining the circulation efficiency score.
- **zoningDetail**: 2-3 sentences explaining the functional zoning score.
- **utilizationDetail**: 2-3 sentences explaining the space utilization score. Mention specific wasted areas (e.g. "large air-con ledge on the master bedroom side", "planter box along the balcony reduces usable outdoor space").
- **suggestions**: An array of 2-4 brief, actionable suggestions for buyers to consider (e.g. "The household shelter could be repurposed as a study", "Consider enclosing the balcony to gain usable floor area").

Return ONLY valid JSON matching this schema:
{
  "circulationScore": <number 0-10>,
  "zoningScore": <number 0-10>,
  "utilizationScore": <number 0-10>,
  "circulationDetail": "<string>",
  "zoningDetail": "<string>",
  "utilizationDetail": "<string>",
  "suggestions": ["<string>", ...]
}`;

export async function analyzeFloorPlan(imageBuffer, mimeType) {
  const CF_ACCOUNT_ID = process.env.CF_ACCOUNT_ID;
  const CF_GATEWAY_ID = process.env.CF_GATEWAY_ID;
  const CF_AIG_TOKEN = process.env.CF_AIG_TOKEN;
  const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL;

  if (!CF_ACCOUNT_ID || !CF_GATEWAY_ID || !CF_AIG_TOKEN || !ANTHROPIC_MODEL) {
    throw new Error(
      "Floor plan analysis is not configured. Set CF_ACCOUNT_ID, CF_GATEWAY_ID, CF_AIG_TOKEN, and ANTHROPIC_MODEL."
    );
  }

  const base64Image = imageBuffer.toString("base64");
  const mediaType = mimeType || "image/png";

  const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${CF_ACCOUNT_ID}/${CF_GATEWAY_ID}/anthropic/v1/messages`;

  const body = {
    model: ANTHROPIC_MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Image },
          },
          { type: "text", text: "Analyse this Singapore condo floor plan." },
        ],
      },
    ],
  };

  const response = await fetch(gatewayUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "cf-aig-authorization": `Bearer ${CF_AIG_TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error(`Cloudflare AI Gateway error ${response.status}:`, errText);
    throw new Error(`LLM request failed (${response.status})`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b) => b.type === "text");
  const content = textBlock?.text;

  if (!content) {
    throw new Error("No response from LLM");
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not parse LLM response as JSON");
  }

  const analysis = JSON.parse(jsonMatch[0]);

  return {
    circulationScore: clamp(Math.round(analysis.circulationScore), 0, 10),
    zoningScore: clamp(Math.round(analysis.zoningScore), 0, 10),
    utilizationScore: clamp(Math.round(analysis.utilizationScore), 0, 10),
    circulationDetail: analysis.circulationDetail || "",
    zoningDetail: analysis.zoningDetail || "",
    utilizationDetail: analysis.utilizationDetail || "",
    suggestions: Array.isArray(analysis.suggestions) ? analysis.suggestions : [],
  };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
