import axios from "axios";
import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();

    const { start, destination, days, budget, interests } = body;

    const interest = interests?.toLowerCase() || "";

    let category = "tourism.sights";

    if (interest.includes("museum"))
      category = "entertainment.museum";

    else if (interest.includes("temple"))
      category = "building.place_of_worship";

    else if (interest.includes("nature"))
      category = "natural";

    else if (interest.includes("architecture") || interest.includes("fort"))
      category = "building.historic";

    else if (interest.includes("park"))
      category = "leisure.park";

    // -------- GEOAPIFY: destination coordinates --------

    const geoDest = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: destination,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    if (!geoDest.data.features.length) {
      return NextResponse.json(
        { error: "Destination not found" },
        { status: 404 }
      );
    }

    const { lat: destLat, lon: destLon } =
      geoDest.data.features[0].properties;

    // -------- GEOAPIFY: start coordinates --------

    const geoStart = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: start,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const { lat: startLat, lon: startLon } =
      geoStart.data.features[0].properties;

    // -------- DISTANCE CALCULATION --------

    const getDistanceKm = (lat1, lon1, lat2, lon2) => {
      const R = 6371;

      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLon = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLon / 2) ** 2;

      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    };

    const distance = getDistanceKm(
      startLat,
      startLon,
      destLat,
      destLon
    );

    // -------- TRAVEL SUGGESTION --------

    const getTravelSuggestion = (distance, budget) => {
      if (distance < 300)
        return "Car or train recommended";

      if (distance < 800)
        return budget === "low"
          ? "Sleeper train recommended"
          : "Flight or AC train recommended";

      return budget === "low"
        ? "Train recommended"
        : "Flight recommended";
    };

    const travelAdvice = getTravelSuggestion(
      distance,
      budget
    );

    // -------- STAY SUGGESTION --------

    const getStaySuggestion = (budget) => {
      if (budget === "low")
        return "Budget hostels or guesthouses recommended";

      if (budget === "medium")
        return "3-star hotels or boutique stays recommended";

      return "Luxury hotels or premium heritage stays recommended";
    };

    const stayAdvice = getStaySuggestion(budget);

    // -------- FETCH PLACES --------

    const placesRes = await axios.get(
      "https://api.geoapify.com/v2/places",
      {
        params: {
          categories: category,
          filter: `circle:${destLon},${destLat},20000`,
          limit: 12,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );
const getPlaceImage = async (placeName) => {
  try {
    const res = await axios.get(
      "https://en.wikipedia.org/w/api.php",
      {
        params: {
          action: "query",
          generator: "search",
          gsrsearch: placeName + " India",
          gsrlimit: 1,
          prop: "pageimages",
          pithumbsize: 400,
          format: "json",
          origin: "*",
        },
      }
    );

    const pages = res.data.query?.pages;

    if (!pages) return null;

    const page = Object.values(pages)[0];

    return page?.thumbnail?.source || null;

  } catch {
    return null;
  }
};

const places = await Promise.all(
  placesRes.data.features
    .filter((p) => p.properties.name)
    .map(async (p) => ({
      name: p.properties.name,
      address: p.properties.address_line2,
      image: await getPlaceImage(p.properties.name),
    }))
);


     const hotelsRes = await axios.get(
      "https://api.geoapify.com/v2/places",
      {
        params: {
          categories: "accommodation.hotel",
          filter: `circle:${destLon},${destLat},20000`,
          limit: 30,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const estimateHotelPrice = (stars, budget) => {
  if (!stars) {
    if (budget === "low") return "₹800–2000 per night";
    if (budget === "medium") return "₹2000–5000 per night";
    return "₹5000+ per night";
  }

  if (stars <= 2) return "₹800–2000 per night";
  if (stars <= 4) return "₹2000–5000 per night";
  return "₹5000+ per night";
};

let filteredHotels = hotelsRes.data.features.filter(
  (h) => h.properties.name
);

// Budget-based filtering
if (budget === "low") {
  filteredHotels = filteredHotels.slice(0, 5);
}

else if (budget === "medium") {
  filteredHotels = filteredHotels.slice(5, 10);
}

else {
  filteredHotels = filteredHotels.slice(10, 15);
}

const hotels = filteredHotels.map((h) => ({
  name: h.properties.name,
  address: h.properties.address_line2,
  approx_price: estimateHotelPrice(
    h.properties.datasource?.raw?.stars,
    budget
  ),
}));
    // -------- BUILD ITINERARY --------

    const itinerary = {};
    let index = 0;

    for (let i = 1; i <= days; i++) {
      itinerary[`Day ${i}`] = places.slice(index, index + 3);
      index += 3;
    }

    // -------- GROQ AI SUMMARIES --------

const prompt = `
You are an expert travel planner designing a thoughtful itinerary.

Destination: ${destination}

Here is the itinerary:

${JSON.stringify(itinerary)}

For EACH day:

Write a rich, natural paragraph (4–6 sentences) explaining:

• why these places are grouped together  
• the best visiting order  
• crowd avoidance strategy  
• travel-time efficiency between locations  
• time-of-day recommendations (morning vs evening)  
• what kind of experience the traveler will have  

Return JSON ONLY in this format:

{
  "summaries": [
    {
      "day": "Day 1",
      "explanation": "...long detailed reasoning paragraph...",
      "travel_order": "...logical visit order explanation...",
      "time_suggestion": "...timing strategy..."
    }
  ]
}
`;

const completion = await groq.chat.completions.create({
  messages: [{ role: "user", content: prompt }],
  model: "llama-3.1-8b-instant",
  response_format: { type: "json_object" },
});


let daySummaries = [];

try {
  const parsed = JSON.parse(
    completion.choices[0].message.content
  );

  if (Array.isArray(parsed.summaries)) {
    daySummaries = parsed.summaries;
  } else if (Array.isArray(parsed)) {
    daySummaries = parsed;
  } else {
    daySummaries = Object.values(parsed);
  }

} catch (err) {
  console.error("Summary parsing failed:", err);
}

    // -------- FINAL RESPONSE --------

    return NextResponse.json({
      itinerary,
      distance: Math.round(distance),
      travelAdvice,
      stayAdvice,
      hotels,
      daySummaries,
      startCoords: { lat: startLat, lon: startLon },
      destCoords: { lat: destLat, lon: destLon }
    });

  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}