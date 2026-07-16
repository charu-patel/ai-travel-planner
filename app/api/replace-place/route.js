import axios from "axios";
import { NextResponse } from "next/server";

// 📷 Fetch a high-quality landscape photo from Pexels
const getPexelsImage = async (placeName) => {
  try {
    const res = await axios.get("https://api.pexels.com/v1/search", {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
      },
      params: {
        query: placeName,
        per_page: 1,
        orientation: "landscape",
      },
    });

    // Grab the medium or large size image URL from the first photo object array
    return res.data.photos?.[0]?.src?.medium || null;
  } catch (err) {
    console.error("Pexels fetch failed for:", placeName, err.message);
    return null;
  }
};

export async function POST(req) {
  try {
    const { placeName, destination, category } = await req.json();

    const geoRes = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: destination,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    if (!geoRes.data.features || geoRes.data.features.length === 0) {
      return NextResponse.json({ replacement: null });
    }

    const { lat, lon } = geoRes.data.features[0].properties;

    const placesRes = await axios.get(
      "https://api.geoapify.com/v2/places",
      {
        params: {
          categories: category || "tourism.sights",
          filter: `circle:${lon},${lat},5000`,
          limit: 15,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const features = placesRes.data.features || [];

    // 1. Look for a clean distinct name mismatch
    let candidate = features.find(
      (p) =>
        p.properties.name &&
        p.properties.name.toLowerCase().trim() !== placeName?.toLowerCase().trim()
    );

    // 2. Fallback: grab the first available option with a name
    if (!candidate && features.length > 0) {
      candidate = features.find((p) => p.properties.name);
    }

    if (!candidate) {
      return NextResponse.json({ replacement: null });
    }

    // 🚀 Query Pexels with the new location name!
    const image = await getPexelsImage(candidate.properties.name);

    return NextResponse.json({
      replacement: {
        name: candidate.properties.name,
        address: candidate.properties.address_line2 || candidate.properties.address_line1 || "",
        image, 
      },
    });

  } catch (err) {
    console.error("API Replacement Route Failure:", err);
    return NextResponse.json(
      { error: "Replacement failed" },
      { status: 500 }
    );
  }
}