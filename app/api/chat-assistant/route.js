import { Groq } from "groq-sdk";
import { NextResponse } from "next/server";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, itinerary, destination, costEstimate } = body;

    if (!message || !destination) {
      return NextResponse.json(
        { error: "Missing required fields: message or destination" },
        { status: 400 }
      );
    }

    // 🧼 SAFE PRICING CONTEXT CHECK
    let pricingContext = "No precise dynamic cost calculated yet.";
    if (costEstimate) {
      pricingContext = `The actual calculated dynamic pricing invoice breakdown for this trip is:
         - Total Estimated Cost: ₹${costEstimate.total || "N/A"} INR
         - Transport/Transit Cost: ₹${costEstimate.travelCost || 0} INR
         - Hotel Stays Cost: ₹${costEstimate.stayCost || 0} INR
         - Food & Meals Cost: ₹${costEstimate.foodCost || 0} INR
         - Local Commute/Sightseeing Transfers: ₹${costEstimate.localTransport || 0} INR`;
    }

    const systemPrompt = `You are an expert AI Travel Assistant managing a custom trip itinerary to ${destination}.
    
    CRITICAL PRICING RULES:
    ${pricingContext}
    
    When discussing budgets, modifications, or pricing queries, you MUST stay perfectly consistent with the figures provided above. Never manufacture alternative prices that contradict these calculated figures.`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ];

    // ✅ 1. UNCOMMENTED AND WIRED UP GROQ COMPLETION
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile", // Or your preferred Groq model like llama3-8b-8192
      messages: messages,
    });

    // ✅ 2. EXPLICITLY RETURN THE RESPONSE OBJECT TO FRONTEND
    return NextResponse.json({ 
      response: completion.choices[0].message.content 
    });

  } catch (error) {
    console.error("🔥 DETAILED BACKEND ASSISTANT CRASH:", error);
    return NextResponse.json(
      { error: "Internal server error details", details: error.message }, 
      { status: 500 }
    );
  }
}