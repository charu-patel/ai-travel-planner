import axios from "axios";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { placeName, destination } =
      await req.json();

    const geoRes = await axios.get(
      "https://api.geoapify.com/v1/geocode/search",
      {
        params: {
          text: destination,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const { lat, lon } =
      geoRes.data.features[0].properties;

    const placesRes = await axios.get(
      "https://api.geoapify.com/v2/places",
      {
        params: {
          categories: "tourism.sights",
          filter: `circle:${lon},${lat},5000`,
          limit: 10,
          apiKey: process.env.GEOAPIFY_API_KEY,
        },
      }
    );

    const replacement = placesRes.data.features
      .map((p) => p.properties.name)
      .find((name) => name !== placeName);

    return NextResponse.json({ replacement });

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Replacement failed" },
      { status: 500 }
    );
  }
}