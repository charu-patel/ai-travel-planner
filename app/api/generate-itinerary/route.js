import axios from "axios";
import { NextResponse } from "next/server";
import { Groq } from "groq-sdk";
import { estimateTripCost } from "@/lib/costEstimator";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req) {
  try {
    const body = await req.json();
    // 1. 👇 FIX: Added 'purpose' to the destructured body parameters
    const { start, destination, days, budget, interests, people, purpose } = body;
    const validatedPurpose = purpose || interests || "leisure";
    
    const interest = interests?.toLowerCase() || "";

    let category = "tourism.sights";
    if (interest.includes("museum")) category = "entertainment.museum";
    else if (interest.includes("temple")) category = "building.place_of_worship";
    else if (interest.includes("nature")) category = "natural";
    else if (interest.includes("architecture") || interest.includes("fort")) category = "building.historic";
    else if (interest.includes("park")) category = "leisure.park";
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

    const { lat: destLat, lon: destLon } = geoDest.data.features[0].properties;

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

    if (!geoStart.data.features.length) {
      return NextResponse.json(
        { error: "Starting city not found" },
        { status: 404 }
      );
    }

    const { lat: startLat, lon: startLon } = geoStart.data.features[0].properties;

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

    const distance = Math.round(getDistanceKm(startLat, startLon, destLat, destLon));

    // -------- TRAVEL SUGGESTION --------
    const getTravelSuggestion = (dist, bgt) => {
      if (dist < 300) return "Car or local train recommended";
      if (dist < 800) {
        return bgt === "low" ? "Sleeper train recommended" : "Flight or AC train recommended";
      }
      return bgt === "low" ? "Express Train recommended" : "Direct Flight recommended";
    };

    const travelAdvice = getTravelSuggestion(distance, budget);

    // -------- STAY SUGGESTION --------
    const getStaySuggestion = (bgt) => {
      if (bgt === "low") return "Budget hostels or guesthouses recommended";
      if (bgt === "medium") return "3-star hotels or boutique stays recommended";
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
          limit: 15,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const getPlaceImage = async (placeName, cityLocation) => {
      try {
        const res = await axios.get("https://api.pexels.com/v1/search", {
          params: {
            query: `${placeName} ${cityLocation}`,
            per_page: 1,
          },
          headers: {
            Authorization: process.env.PEXELS_API_KEY,
          },
        });

        if (res.data.photos && res.data.photos.length > 0) {
          return res.data.photos[0].src.medium; 
        }
        return null;
      } catch (error) {
        console.error("Pexels fetch failed for:", placeName, error.message);
        return null;
      }
    };

    const places = await Promise.all(
      placesRes.data.features
        .filter((p) => p.properties.name)
        .map(async (p, idx) => {
          const name = p.properties.name;
          let image = await getPlaceImage(name, destination);
          
          if (!image) {
            const dynamicCategories = ["travel", "architecture", "scenery", "monument", "cityscape"];
            const fallbackTerm = dynamicCategories[idx % dynamicCategories.length];
            image = `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&h=400&q=60&sig=${idx + 500}&q=${encodeURIComponent(fallbackTerm)}`;
          }

          return {
            name,
            address: p.properties.address_line2 || `${destination}, India`,
            image,
          };
        })
    );
const hotelsRes = await axios.get("https://api.geoapify.com/v2/places", {
      params: {
        categories: "accommodation.hotel",
        filter: `circle:${destLon},${destLat},20000`,
        limit: 50,
        apiKey: process.env.GEOAPIFY_API_KEY,
      },
    });

    let allHotels = hotelsRes.data.features
      .filter((h) => h.properties.name)
      .map((h) => {
        const stars = Number(h.properties.datasource?.raw?.stars) || null;
        const nameLower = h.properties.name.toLowerCase();
        const isLuxuryKeyword = nameLower.includes("palace") || 
                                nameLower.includes("resort") || 
                                nameLower.includes("taj") || 
                                nameLower.includes("oberoi");

        return {
          name: h.properties.name,
          address: h.properties.address_line2 || `${destination}, India`,
          stars: stars,
          isLuxury: isLuxuryKeyword
        };
      });

    let filteredHotels = [];
    if (budget === "low") {
      filteredHotels = allHotels.filter((h) => (!h.stars || h.stars <= 2) && !h.isLuxury).slice(0, 5);
      if (filteredHotels.length === 0) filteredHotels = allHotels.slice(0, 5);
    } else if (budget === "medium") {
      filteredHotels = allHotels.filter((h) => h.stars === 3 || h.stars === 4 || (!h.stars && !h.isLuxury)).slice(0, 5);
      if (filteredHotels.length === 0) filteredHotels = allHotels.slice(5, 10);
    } else {
      filteredHotels = allHotels
        .sort((a, b) => {
          const scoreA = (a.stars === 5 ? 3 : a.stars === 4 ? 1 : 0) + (a.isLuxury ? 2 : 0);
          const scoreB = (b.stars === 5 ? 3 : b.stars === 4 ? 1 : 0) + (b.isLuxury ? 2 : 0);
          return scoreB - scoreA;
        })
        .slice(0, 5);
    }

    // FIX: Reverted to old static pricing configuration strategy (No more NaN)
    const generateRealisticPrice = (hotel, bgt, idx) => {
      const pricingSalt = (idx % 3) * 350; 

      if (bgt === "high" || hotel.stars === 5 || hotel.isLuxury) {
        const luxuryBase = hotel.name.toLowerCase().includes("palace") ? 12000 : 7500;
        return `₹${luxuryBase + pricingSalt} per night`;
      }
      
      if (bgt === "medium" || hotel.stars === 3 || hotel.stars === 4) {
        return `₹${3200 + pricingSalt} per night`;
      }
      
      return `₹${1200 + ((idx % 2) * 200)} per night`;
    };

    const updatedHotels = filteredHotels.map((h, index) => {
      const computedPriceString = generateRealisticPrice(h, budget, index);
      const searchQuery = encodeURIComponent(`${h.name} ${destination}`);
      
      return {
        name: h.name,
        address: h.address,
        approx_price: computedPriceString,
        // FIX: Fixed the string interpolation syntax from 0{...} to ${...}
        googleHotelsUrl: `https://www.google.com/travel/hotels?q=${searchQuery}`,
        makeMyTripUrl: `https://www.makemytrip.com/hotels/hotel-listing/?searchTerm=${encodeURIComponent(destination)}`,
      };
    });
    
    // Calculate final accurate totals with your original estimator signature hook
    const finalCostEstimate = estimateTripCost(days, budget, distance, travelAdvice, updatedHotels, people, destination);
    // -------- BUILD ITINERARY --------
    const itinerary = {};
    let placeIdx = 0;

    for (let i = 1; i <= days; i++) {
      itinerary[`Day ${i}`] = places.slice(placeIdx, placeIdx + 3);
      placeIdx += 3;
    }

    // -------- GROQ AI SUMMARIES --------
    const prompt = `
You are an expert travel planner designing a thoughtful itinerary.
Destination: ${destination}

Here is the itinerary payload data:
${JSON.stringify(itinerary)}

For EACH day present in the itinerary payload data:
Write a rich, natural explanation paragraph (4–6 sentences) explaining:
• why these places are grouped together  
• the best visiting order  
• crowd avoidance strategy  
• travel-time efficiency between locations  
• time-of-day recommendations (morning vs evening)  
• what kind of experience the traveler will have  

Return JSON ONLY in this format structure:
{
  "summaries": [
    {
      "day": "Day 1",
      "explanation": "...detailed reasoning paragraph...",
      "travel_order": "...logical visit order sequence...",
      "time_suggestion": "...timing strategy parameters..."
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
      const parsed = JSON.parse(completion.choices[0].message.content);
      if (parsed && Array.isArray(parsed.summaries)) {
        daySummaries = parsed.summaries;
      } else if (Array.isArray(parsed)) {
        daySummaries = parsed;
      } else {
        daySummaries = Object.values(parsed);
      }
    } catch (err) {
      console.error("Summary parsing failed:", err);
    }

    // -------- FINAL ROUTE CORRECTIONS OUTPUT --------
    // 2. 👇 FIX: Map to local variables 'updatedHotels' and 'finalCostEstimate'
    return NextResponse.json({
      itinerary,
      distance,
      travelAdvice,
      stayAdvice,
      hotels: updatedHotels, 
      daySummaries,
      costEstimate: finalCostEstimate,
      startCoords: { lat: startLat, lon: startLon },
      destCoords: { lat: destLat, lon: destLon }
    });

  } catch (error) {
    console.error("Itinerary processing error: ", error);
    return NextResponse.json(
      { error: "Failed to generate itinerary" },
      { status: 500 }
    );
  }
}