import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    
    // Safely extract inputs and fallback to empty strings if anything is missing
    const start = typeof body.start === "string" ? body.start : "";
    const destination = typeof body.destination === "string" ? body.destination : "";
    const distance = body.distance ? String(body.distance) : "";
    const travelAdvice = typeof body.travelAdvice === "string" ? body.travelAdvice : "";
    const stayAdvice = typeof body.stayAdvice === "string" ? body.stayAdvice : "";

    // Safely structure the prompt string
    const prompt = `You are an expert travel coordinator. Combine these itinerary metrics into a single, highly engaging, professional editorial introductory paragraph for a traveler's itinerary dashboard.\n\n` +
      `Metrics to integrate fluidly:\n` +
      `- Origin: ${start}\n` +
      `- Destination: ${destination}\n` +
      `- Distance: ${distance} km\n` +
      `- Transit Strategy: ${travelAdvice}\n` +
      `- Lodging Setup: ${stayAdvice}\n\n` +
      `Requirements:\n` +
      `- Keep it concise (2-3 sentences max).\n` +
      `- Make it sound natural, editorial, and sophisticated.\n` +
      `- Output ONLY the plain text paragraph. Do not wrap in markdown or blockquotes.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Groq API Error Details (Status ${response.status}):`, errorText);
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const summaryText = data.choices?.[0]?.message?.content?.trim() || "";

    return NextResponse.json({ summary: summaryText });
  } catch (error) {
    console.error("Summary endpoint error:", error);
    return NextResponse.json({ summary: "Enjoy your upcoming journey layout!" }, { status: 500 });
  }
}