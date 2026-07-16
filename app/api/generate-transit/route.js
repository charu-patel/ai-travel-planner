import { NextResponse } from "next/server";
import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const { startLocation, destination } = await req.json();

    const prompt = `
You are a geospatial transit routing engine. 
Calculate exactly 2 distinct physical travel routes from "${startLocation}" to "${destination}".

CRITICAL REQUIREMENTS:
1. Route 1 MUST be a "Primary Rail Route" tracking actual major train line track junctions between the cities.
2. Route 2 MUST be a "National Highway Route" tracking the actual major driving expressways/highways between the cities.
3. The "path" array coordinates MUST be custom generated to realistically track the journey from "${startLocation}" to "${destination}". DO NOT use hardcoded numbers from the layout template below. Generate real coordinates matching the actual geography of these specific locations.
4. The path array must be strictly in [latitude, longitude] order (Latitude first, Longitude second).

Return JSON ONLY in this exact structure. Do not include markdown code block formatting or backticks:
{
  "transitOptions": [
    {
      "id": "route_1",
      "type": "Primary Rail Route",
      "duration": "Calculate realistic train duration",
      "summary": "Via major railway junction cities",
      "color": "#2563eb",
      "path": [[START_LAT, START_LON], [INTERMEDIATE_LAT_1, INTERMEDIATE_LON_1], [INTERMEDIATE_LAT_2, INTERMEDIATE_LON_2], [DEST_LAT, DEST_LON]]
    },
    {
      "id": "route_2",
      "type": "National Highway Route",
      "duration": "Calculate realistic driving duration",
      "summary": "Via major National Highways",
      "color": "#16a34a",
      "path": [[START_LAT, START_LON], [HWY_WAYPOINT_LAT_1, HWY_WAYPOINT_LON_1], [HWY_WAYPOINT_LAT_2, HWY_WAYPOINT_LON_2], [DEST_LAT, DEST_LON]]
    }
  ]
}
`;

    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      response_format: { type: "json_object" }
    });

    const cleanText = response.choices[0].message.content.trim();
    const data = JSON.parse(cleanText);

    return NextResponse.json(data);
  } catch (err) {
    console.error("Transit Route Error:", err);
    return NextResponse.json({ transitOptions: [] }, { status: 500 });
  }
}