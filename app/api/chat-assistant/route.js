import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const { message, itinerary, destination } =
      await req.json();

    const prompt = `
You are an AI travel planner assistant.

Destination: ${destination}

Current itinerary:
${JSON.stringify(itinerary)}

User request:
"${message}"

If the user asks to modify a specific day (example: "change day 2"),
update ONLY that day with new relevant attractions.

Return JSON ONLY like this:

{
  "response": "assistant explanation text",
  "updatedItinerary": { ...modified itinerary object OR null }
}
`;

    const completion =
      await groq.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
      });

    const parsed = JSON.parse(
      completion.choices[0].message.content
    );

    return NextResponse.json(parsed);

  } catch (err) {
    console.error(err);

    return NextResponse.json(
      {
        response:
          "Sorry, I couldn't update the itinerary.",
        updatedItinerary: null,
      },
      { status: 500 }
    );
  }
}