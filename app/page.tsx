"use client";

import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import FinancialAllocation from "./components/FinancialAllocation";
import HotelCard from "./components/HotelCard";
import ErrorBoundary from "./components/ErrorBoundary";

// Utility helper to safely convert objects into strings
function renderSafeText(value: any): string {
  if (!value) return "";
  
  // If it's already a safe string or number, return it
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (typeof value === "object") {
    // Specifically targets {start, end, breaks} or {morning, evening} objects
    const parts: string[] = [];
    
    if (value.start) parts.push(`Start: ${value.start}`);
    if (value.end) parts.push(`End: ${value.end}`);
    if (value.breaks) parts.push(`Breaks: ${value.breaks}`);
    if (value.morning) parts.push(`Morning: ${value.morning}`);
    if (value.evening) parts.push(`Evening: ${value.evening}`);

    // If it has none of those known keys, fallback to combining whatever keys exist
    if (parts.length === 0) {
      return Object.entries(value)
        .map(([key, val]) => `${key}: ${val}`)
        .join(", ");
    }

    return parts.join(" | ");
  }

  return "";
}

const MapView = dynamic(
  () => import("./components/MapView"),
  { ssr: false, loading: () => <p className="text-slate-500 text-center p-4">Loading map data...</p> }
);

export default function Home() {
  const [form, setForm] = useState({
    start: "",
    destination: "",
    days: "",
    interests: "",
    budget: "",
    people: "",
  });
  const [hasStarted, setHasStarted] = useState(false);
  const [trip, setTrip] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [tripName, setTripName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tripSummary, setTripSummary] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  useEffect(() => {
    try {
      const storedTrip = localStorage.getItem("activeTrip");
      if (storedTrip && storedTrip !== "undefined") {
        const parsed = JSON.parse(storedTrip);
        
        // Unifying storage tracks
        if (parsed.data && parsed.data.trip) {
          setTrip({
            ...parsed.data.trip,
            formSnapshot: parsed.data.trip.formSnapshot || parsed.data.formSnapshot
          });
          setChatHistory(parsed.data.chatHistory || []);
        } else if (parsed.trip) {
          setTrip(parsed.trip);
          setChatHistory(parsed.chatHistory || []);
        } else {
          setTrip(parsed);
          if (parsed.chatHistory) setChatHistory(parsed.chatHistory);
        }
        setHasStarted(true);
        localStorage.removeItem("activeTrip");
      }
    } catch (err) {
      console.error("Trip load failed:", err);
    }
  }, []);

  const generateTrip = async () => {
    setIsLoading(true); 
    setTrip(null); 
    setTripSummary("");
    setChatHistory([]);

    try {
      // 1. Fetch the main itinerary structure
      const res = await fetch("/api/generate-itinerary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      
      setTrip({
        ...data,
        formSnapshot: form
      });

      if (data) {
        // 🚀 2. FIRE THE TRANSIT LINES AND SUMMARY API IN PARALLEL
        fetch("/api/generate-transit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startLocation: form.start,
            destination: form.destination,
          }),
        })
          .then((transitRes) => transitRes.json())
          .then((transitData) => {
            if (transitData.transitOptions) {
              setTrip((prev) => (prev ? { ...prev, transitOptions: transitData.transitOptions } : prev));
            }
          })
          .catch((err) => console.error("Background transit fetch failed:", err));

        // 3. Keep your existing summary API logic going at the same time
        const summaryRes = await fetch("/api/generate-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            start: form.start,
            destination: form.destination,
            distance: data.distance,
            travelAdvice: renderSafeText(data.travelAdvice),
            stayAdvice: renderSafeText(data.stayAdvice),
          }),
        });
        const summaryData = await summaryRes.json();
        setTripSummary(summaryData.summary);
      }

    } catch (error) {
      console.error("Failed to generate trip:", error);
    } finally {
      setIsLoading(false);
    }
  };


  const sendMessage = async () => {
    if (!chatInput || !trip) return;

    const res = await fetch("/api/chat-assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: chatInput,
        itinerary: trip.itinerary,
        destination: form.destination,
        costEstimate: trip.costEstimate,
      }),
    });

    if (!res.ok) {
      console.error("Assistant request failed");
      return;
    }

    const data = await res.json();
    setChatHistory((prev) => [
      ...prev,
      { role: "user", text: chatInput },
      { role: "assistant", text: data.response },
    ]);

    if (data.updatedItinerary) {
      setTrip({ ...trip, itinerary: data.updatedItinerary });
    }
    setChatInput("");
  };

  const replacePlace = async (dayIndex: number, placeIndex: number, placeName: string) => {
    const res = await fetch("/api/replace-place", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeName, destination: form.destination }),
    });

    const data = await res.json();
    if (!data.replacement) return;

    const updatedTrip = { ...trip };
    const dayKey = Object.keys(updatedTrip.itinerary)[dayIndex];
    updatedTrip.itinerary[dayKey][placeIndex] = data.replacement;
    setTrip(updatedTrip);
  };

  const saveTrip = () => {
    if (!trip || !tripName) return;

    const savedTrips = JSON.parse(localStorage.getItem("savedTrips") || "[]");
    const existingIndex = savedTrips.findIndex((t: any) => t.name === tripName);

    if (existingIndex !== -1) {
      savedTrips[existingIndex].data = trip;
    } else {
      savedTrips.push({
        id: Date.now(),
        name: tripName,
        data: { trip, chatHistory },
      });
    }

    localStorage.setItem("savedTrips", JSON.stringify(savedTrips));
    alert("Trip saved successfully! 🎉");
  };

  if (!hasStarted) {
    return (
      <main className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-all duration-1000"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=1600')" }}
        />
        <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md" />
        <div className="relative z-10 max-w-md mx-4 p-8 bg-white/10 border border-white/20 rounded-3xl shadow-2xl backdrop-blur-lg text-center text-white">
          <span className="text-4xl">🌍</span>
          <h1 className="text-3xl font-extrabold tracking-tight mt-3">Your Next Adventure Awaits</h1>
          <p className="text-slate-200 text-sm mt-2 leading-relaxed">
            Skip the endless tabs. Let our AI curate a production-ready itinerary, optimal routes, and local stays tailored precisely to your budget.
          </p>
          <button
            onClick={() => setHasStarted(true)}
            className="w-full mt-6 bg-white text-slate-900 hover:bg-slate-100 font-bold py-3 px-6 rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition duration-200"
          >
            Let's Get Started ✨
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-tr from-orange-100 via-pink-100 to-indigo-100 text-slate-900 px-4 py-12 md:px-8">
      
      {/* HEADER SECTION */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-200 pb-6 mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            ✈️ AI Travel Planner
          </h1>
          <p className="text-slate-500 mt-1">
            Build clean, production-ready routes, hotel choices, and itineraries instantly.
          </p>
        </div>
        <a
          href="/dashboard"
          className="inline-flex items-center justify-center bg-white border border-slate-200 shadow-sm text-slate-700 font-medium px-4 py-2 rounded-xl hover:bg-slate-50 transition"
        >
          My Saved Trips 📂
        </a>
      </div>

      {/* INPUT CONTROLS PANEL */}
      <div className="max-w-4xl mx-auto bg-white shadow-sm border border-slate-200 rounded-2xl p-6 md:p-8 space-y-6">
        <div className="grid md:grid-cols-3 gap-4">
          <InputField name="start" placeholder="Starting City" value={form.start} handleChange={handleChange} />
          <InputField name="destination" placeholder="Destination" value={form.destination} handleChange={handleChange} />
          <InputField name="days" placeholder="Duration (Days)" value={form.days} handleChange={handleChange} />
          <InputField name="budget" placeholder="Budget (low / medium / high)" value={form.budget} handleChange={handleChange} />
          <InputField name="interests" placeholder="Interests (e.g. Nature, Food)" value={form.interests} handleChange={handleChange} />
          <InputField name="people" placeholder="Number of Travelers" value={form.people} handleChange={handleChange} />
          <button
            onClick={generateTrip}
            className="md:col-span-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            Generate Custom Itinerary 🚀
          </button>
        </div>

        {/* SAVE UTILITIES */}
        <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-4 gap-3 items-center">
          <input
            placeholder="Name your journey (e.g., Weekend in Rishikesh)"
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            className="sm:col-span-3 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
          <button
            onClick={saveTrip}
            disabled={!trip || !tripName}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-medium px-4 py-2.5 rounded-xl text-sm transition"
          >
            Save Trip 💾
          </button>
        </div>
      </div>

      {/* INTELLIGENT INTERACTIVE MAP */}
      {trip && trip.startCoords && trip.destCoords && (
        <div className="max-w-5xl mx-auto mt-10">
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
            <MapView 
              start={{ ...trip.startCoords, name: form.start }} 
              destination={{ ...trip.destCoords, name: form.destination }} 
              transitOptions={trip.transitOptions || []} 
            />
          </div>

          {/* Alternative Route Option Display Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {trip.transitOptions?.map((route: any) => {
              const isRail = route.type === "Primary Rail Route" || route.id === "route_1";
              
              return (
                <div 
                  key={route.id} 
                  className="p-4 border border-slate-200 rounded-xl bg-white shadow-sm flex justify-between items-center"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      {isRail ? (
                        <span 
                          className="inline-block w-3 h-3 rounded border border-slate-400 bg-[#334155]" 
                          title="Rail Route"
                        />
                      ) : (
                        <span 
                          className="inline-block w-3 h-3 rounded-full" 
                          style={{ backgroundColor: route.color || "#16a34a" }} 
                        />
                      )}
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{route.type}</span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mt-1">{route.summary}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-slate-900 block">{route.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TRAVEL ANALYTICS / CARDS */}
      {trip && (trip.distance || trip.travelAdvice || trip.stayAdvice) && (
        <div className="max-w-5xl mx-auto mt-10 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <div className="grid md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            
            {/* COLUMN 1: INTEL & DYNAMIC LLM EDITORIAL SUMMARY */}
            <div className="p-6 md:p-8 md:col-span-3 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🗺️</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Journey Profile Summary</span>
              </div>
              
              <div className="space-y-3">
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {form.start || "Origin"} to {form.destination || "Destination"}
                </h2>
                
                {tripSummary ? (
                  <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {tripSummary}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic animate-pulse">
                    Generating executive trip synopsis...
                  </p>
                )}
              </div>

              {/* CHIP METRICS QUICK GLANCE GRID */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-slate-50 border border-slate-100/60 p-3 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Est. Distance</span>
                  <span className="text-base font-bold text-slate-800 font-mono mt-0.5 block">📍 {renderSafeText(trip.distance)} km</span>
                </div>
                <div className="bg-slate-50 border border-slate-100/60 p-3 rounded-xl">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Stay Strategy</span>
                  <span className="text-xs font-bold text-slate-700 mt-1 line-clamp-2 block">🏨 {renderSafeText(trip.stayAdvice)}</span>
                </div>
              </div>
            </div>

            {/* COLUMN 2: RECONSOLIDATED TRANSIT INTERFACE DEEP LINKS */}
            <div className="p-6 md:p-8 md:col-span-2 bg-slate-50/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center text-lg shrink-0">
                    🚆
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Recommended Transit</span>
                    <span className="text-xs font-extrabold text-slate-900 leading-tight block">{renderSafeText(trip.travelAdvice)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                  Check live connections, operating timetables, and reserve ticketing windows instantly below:
                </p>
              </div>

              {/* CLEAN ACTION BUTTON TRAIL */}
              <div className="space-y-2">
                {[
                  { name: "ConfirmTkt / IRCTC 🚂", search: "confirmtkt trains from" },
                  { name: "MakeMyTrip Routes 🚌", search: "makemytrip bus or cab from" },
                  { name: "Google Flights ✈️", search: "flights from" }
                ].map((link, idx) => {
                  const url = `https://www.google.com/search?q=${encodeURIComponent(`${link.search} ${form.start || ""} to ${form.destination || ""}`)}`;
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between bg-white hover:bg-indigo-600 border border-slate-200/70 hover:border-indigo-600 text-xs font-semibold text-slate-700 hover:text-white px-3.5 py-2.5 rounded-xl transition-all duration-150 shadow-xs hover:shadow-md"
                    >
                      <span>{link.name}</span>
                      <span className="text-[10px] opacity-40">↗</span>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
          
      {/* LOADING STATE CARD */}
      {isLoading && (
        <div className="max-w-5xl mx-auto mt-12 bg-white border border-slate-200 shadow-sm rounded-2xl p-8 text-center animate-pulse">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-slate-800">AI is crafting your perfect itinerary...</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            We are crunching destination parameters, calculating routes, and organizing activities. This takes about 15-20 seconds.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-75"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
            <div className="w-3 h-3 bg-indigo-600 rounded-full animate-bounce delay-300"></div>
          </div>
        </div>
      )}

      {/* ITINERARY PREVIEW SCHEDULER */}
      {trip?.itinerary && (
        <div className="max-w-5xl mx-auto mt-12 space-y-8">
          {Object.entries(trip.itinerary).map(([day, places]: any, index) => (
            <div key={day} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
              <div className="border-b border-slate-100 pb-3 mb-4">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  📅 {day}
                </h2>
                {trip.daySummaries?.[index] && (
                  <div className="mt-2 text-slate-600 space-y-1 text-sm bg-indigo-50/50 rounded-xl p-3 border border-indigo-100/50">
                    <p className="font-medium text-indigo-950">
                      ✨ {renderSafeText(trip.daySummaries[index].explanation || trip.daySummaries[index].summary || trip.daySummaries[index].text)}
                    </p>
                    {trip.daySummaries[index].travel_order && (
                      <p className="text-xs text-slate-500">🚗 <span className="font-medium">Route setup:</span> {renderSafeText(trip.daySummaries[index].travel_order)}</p>
                    )}
                    {trip.daySummaries[index].time_suggestion && (
                      <p className="text-xs text-slate-500">⏰ <span className="font-medium">Best Hours:</span> {renderSafeText(trip.daySummaries[index].time_suggestion)}</p>
                    )}
                  </div>
                )}
              </div>

              {/* CARD GRID LAYOUT */}
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
                {places.map((place: any, i: number) => (
                  <div 
                    key={i} 
                    className="relative group p-px rounded-2xl bg-gradient-to-b from-slate-200 via-slate-300 to-slate-400 shadow-sm transition-all duration-500 hover:shadow-md hover:from-indigo-400 hover:via-pink-400 hover:to-orange-400 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-tr from-slate-50 via-white to-slate-100 opacity-95 group-hover:opacity-90 transition-opacity rounded-2xl" />
                    
                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="relative w-full h-40 bg-slate-200 overflow-hidden rounded-t-2xl">
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 opacity-40 group-hover:opacity-10 transition-opacity duration-500" />
                          <img
                            src={place.image || "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=600"}
                            alt={renderSafeText(place.name)}
                            className="w-full h-full object-cover transform scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=600";
                            }}
                          />
                        </div>
                        
                        <div className="p-4">
                          <h4 className="font-extrabold text-slate-800 text-sm leading-tight tracking-tight group-hover:text-indigo-950 transition-colors">
                            📍 {renderSafeText(place.name)}
                          </h4>
                          <p className="text-slate-500 text-xs mt-1 font-medium line-clamp-2">
                            {renderSafeText(place.address || "Location description details available upon system fetch.")}
                          </p>
                        </div>
                      </div>
                      
                      <div className="p-4 pt-0">
                        <button
                          onClick={() => replacePlace(index, i, place.name)}
                          className="w-full text-center text-xs font-bold bg-white border border-slate-200 text-slate-700 py-2.5 rounded-xl shadow-sm hover:text-indigo-600 hover:border-indigo-300 hover:bg-white transition-all duration-200"
                        >
                          🔄 Alternate Activity
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* TRIP BUDGET METRICS SECTION */}
      <FinancialAllocation costEstimate={trip?.costEstimate} budgetTier={form.budget} />

      {/* AUTOMATED CONCIERGE CHAT ENGINE */}
      <div className="max-w-5xl mx-auto mt-10 bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              💬 Chat with your Travel Assistant
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Ask to swap hotels, add activities, or adjust your budget live.</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="h-64 overflow-y-auto border border-slate-100 bg-slate-50/50 rounded-xl p-4 text-sm space-y-3 scrollbar-thin">
            {chatHistory.length === 0 ? (
              <p className="text-slate-400 italic text-xs text-center pt-24">
                No questions yet. Generate an itinerary above, then ask me to modify anything!
              </p>
            ) : (
              chatHistory.map((msg: any, i) => (
                <div 
                  key={i} 
                  className={`flex flex-col max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white ml-auto rounded-tr-none' 
                      : 'bg-white border border-slate-200 text-slate-800 mr-auto rounded-tl-none shadow-sm'
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold tracking-wider mb-0.5 opacity-70">
                    {msg.role === "user" ? "You" : "AI Guide"}
                  </span>
                  <p className="leading-relaxed">
                    {typeof msg.text === "string" ? msg.text : renderSafeText(msg.text.text ?? msg.text)}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="e.g., Change day 2 to focus entirely on local street food..."
              className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition"
            />
            <button
              onClick={sendMessage}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 rounded-xl shadow-sm transition"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* HOTEL DATA RECOMMENDATIONS */}
      {trip?.hotels && (
        <div className="max-w-5xl mx-auto mt-12">
          <h3 className="text-xl font-bold mb-5 text-slate-900 flex items-center gap-2 tracking-tight">
            🏨 Strategic Lodging Options
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {trip.hotels.map((hotel: any, i: number) => (
              <HotelCard 
                key={i} 
                hotel={hotel} 
                destination={form.destination} 
              />
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

/* HELPER INPUT FIELD INJECTION */
function InputField({ name, placeholder, value, handleChange }: any) {
  return (
    <input
      name={name}
      value={value || ""}
      placeholder={placeholder}
      onChange={handleChange}
      className="border border-slate-200 text-slate-950 placeholder-slate-400 rounded-xl px-4 py-3 bg-white text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition w-full"
    />
  );
}

/* UPGRADED INFO CARD INTEGRATION WITH SAFETY SHIELDS */
function InfoCard({ title, value, emoji, startCity = "", destCity = "" }: any) {
  const isTransitCard = title.toLowerCase().includes("transit") || title.toLowerCase().includes("travel");
  
  const cleanStart = startCity.trim();
  const cleanDest = destCity.trim();

  const transitLinks = [
    { 
      name: "ConfirmTkt / IRCTC 🚂", 
      url: `https://www.google.com/search?q=confirmtkt+trains+from+${encodeURIComponent(cleanStart)}+to+${encodeURIComponent(cleanDest)}`
    },
    { 
      name: "MakeMyTrip Routes 🚌", 
      url: `https://www.google.com/search?q=makemytrip+bus+or+cab+from+${encodeURIComponent(cleanStart)}+to+${encodeURIComponent(cleanDest)}`
    },
    { 
      name: "Google Flights ✈️", 
      url: `https://www.google.com/search?q=flights+from+${encodeURIComponent(cleanStart)}+to+${encodeURIComponent(cleanDest)}` 
    }
  ];

  return (
    <div className="group bg-white border border-slate-200/70 shadow-xs hover:shadow-md rounded-2xl p-5 flex flex-col justify-between w-full transition-all duration-300 hover:border-slate-300">
      <div className="flex items-start gap-4">
        <div className="text-xl bg-slate-50 group-hover:bg-indigo-50 group-hover:text-indigo-600 w-11 h-11 rounded-xl flex items-center justify-center border border-slate-100 shrink-0 transition-colors">
          {emoji}
        </div>
        <div className="space-y-0.5">
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{title}</p>
          <p className="font-extrabold text-slate-900 text-sm leading-snug">{value}</p>
        </div>
      </div>

      {isTransitCard && cleanStart && cleanDest && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
            Check Live Schedules & Rates:
          </span>
          <div className="grid grid-cols-1 gap-2">
            {transitLinks.map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-between bg-slate-50/60 hover:bg-indigo-600 border border-slate-200/60 hover:border-indigo-600 text-[11px] font-semibold text-slate-700 hover:text-white px-3 py-2.5 rounded-xl transition-all duration-200"
              >
                <span>{link.name}</span>
                <span className="opacity-40 group-hover:opacity-100 text-xs">↗</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}