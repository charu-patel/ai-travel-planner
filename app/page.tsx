"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const MapView = dynamic(
  () => import("./components/MapView"),
  { ssr: false, loading: () => <p>Loading map...</p> }
);

export default function Home() {
  const [form, setForm] = useState({
    start: "",
    destination: "",
    days: "",
    interests: "",
    budget: "",
  });

  const [trip, setTrip] = useState<any>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const generateTrip = async () => {
    const res = await fetch("/api/generate-itinerary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setTrip(data);
  };
  const sendMessage = async () => {
  if (!chatInput || !trip) return;

  const res = await fetch("/api/chat-assistant", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: chatInput,
      itinerary: trip.itinerary,
      destination: form.destination,
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

  // ⭐ THIS UPDATES THE ITINERARY LIVE
  if (data.updatedItinerary) {
    setTrip({
      ...trip,
      itinerary: data.updatedItinerary,
    });
  }

  setChatInput("");
};
  const replacePlace = async (
  dayIndex: number,
  placeIndex: number,
  placeName: string
) => {
  const res = await fetch(
    "/api/replace-place",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify({
        placeName,
        destination: form.destination,
      }),
    }
  );

  const data = await res.json();

  if (!data.replacement) return;

  const updatedTrip = { ...trip };

  const dayKey =
    Object.keys(updatedTrip.itinerary)[
      dayIndex
    ];

  updatedTrip.itinerary[dayKey][
    placeIndex
  ] = data.replacement;

  setTrip(updatedTrip);
};


  return (
    <main className="min-h-screen bg-gray-200 px-6 py-10">

      {/* HEADER */}
      <div className="max-w-5xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-bold text-black">
          ✈️ AI Travel Planner
        </h1>

        <p className="text-gray-700 mt-2">
          Plan routes, hotels, and itineraries instantly
        </p>
      </div>


      {/* INPUT PANEL */}
      <div className="max-w-4xl mx-auto bg-white shadow-md rounded-2xl p-6 grid md:grid-cols-3 gap-4">

        <InputField
          name="start"
          placeholder="Starting City"
          handleChange={handleChange}
        />

        <InputField
          name="destination"
          placeholder="Destination"
          handleChange={handleChange}
        />

        <InputField
          name="days"
          placeholder="Days"
          handleChange={handleChange}
        />

        <InputField
          name="budget"
          placeholder="Budget (low / medium / high)"
          handleChange={handleChange}
        />

        <InputField
          name="interests"
          placeholder="Interests"
          handleChange={handleChange}
        />

        <button
          onClick={generateTrip}
          className="md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
        >
          Generate Trip 🚀
        </button>
      </div>


      {/* MAP */}
      {trip?.startCoords && trip?.destCoords && (
        <div className="max-w-5xl mx-auto mt-10 rounded-xl overflow-hidden shadow">
          <MapView
            start={trip.startCoords}
            destination={trip.destCoords}
          />
        </div>
      )}
      <div className="max-w-5xl mx-auto mt-12 bg-white rounded-xl shadow p-4">

  <h2 className="text-black text-xl font-semibold mb-3">
    🤖 Travel Assistant
  </h2>

  <div 
  className="flex-1 border rounded px-3 py-2 text-black">
    {chatHistory.map((msg: any, i) => (
      <p key={i}>
        <strong>
          {msg.role === "user" ? "You" : "AI"}:
        </strong>{" "}

  {typeof msg.text === "string"
    ? msg.text
    : msg.text.text ?? JSON.stringify(msg.text)}

      </p>
    ))}
  </div>

  <div className="flex gap-2">
    <input
      value={chatInput}
      onChange={(e) =>
        setChatInput(e.target.value)
      }
      placeholder="Ask something about your trip..."
      className="flex-1 border rounded px-3 py-2 text-black"
    />

    <button
      onClick={sendMessage}
      className="bg-blue-600 text-white px-4 rounded"
    >
      Send
    </button>
  </div>

</div>

      {/* TRAVEL INSIGHTS */}
      {(trip?.distance || trip?.travelAdvice || trip?.stayAdvice) && (
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-4 mt-10">

          <InfoCard
            title="Distance"
            value={`${trip.distance} km`}
            emoji="📍"
          />

          <InfoCard
            title="Travel Mode"
            value={trip.travelAdvice}
            emoji="🚆"
          />

          <InfoCard
            title="Stay Suggestion"
            value={trip.stayAdvice}
            emoji="🏨"
          />

        </div>
      )}


      {/* ITINERARY */}
      {trip?.itinerary && (
        <div className="max-w-5xl mx-auto mt-12 space-y-6">

          {Object.entries(trip.itinerary).map(
            ([day, places]: any, index) => (

              <div
                key={day}
                className="bg-white shadow-md rounded-xl p-5"
              >

                <h2 className="text-2xl font-semibold mb-2 text-black">
                  📅 {day}
                </h2>

                {trip.daySummaries?.[index] && (
  <div className="mb-4 text-gray-800 space-y-1">

    <p>
      ✨ {
        trip.daySummaries[index].explanation ??
        trip.daySummaries[index].summary ??
        trip.daySummaries[index].text ??
        ""
      }
    </p>

    {trip.daySummaries[index].travel_order && (
      <p className="text-sm text-gray-600">
        🚗 Route logic: {trip.daySummaries[index].travel_order}
      </p>
    )}

    {trip.daySummaries[index].time_suggestion && (
      <p className="text-sm text-gray-600">
        ⏰ Best timing: {trip.daySummaries[index].time_suggestion}
      </p>
    )}

  </div>
)}




                <div className="grid md:grid-cols-3 gap-4">

                  {places.map((place: any, i: number) => (

                    <div
                      key={i}
                      className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition"
                    >

                      {place.image && (
                        <img
                          src={place.image}
                          alt={place.name}
                          className="w-full h-36 object-cover"
                        />
                      )}

                      <div className="p-3">

                      
                          <div className="flex justify-between items-center">

  <p className="font-semibold text-black">
    📍 {place.name}
  </p>

  <button
    onClick={() =>
      replacePlace(index, i, place.name)
    }
    className="text-sm text-blue-600 hover:underline"
  >
    🔄 Replace
  </button>

</div>
        

                        <p className="text-gray-700 text-sm">
                          {place.address}
                        </p>

                      </div>

                    </div>

                  ))}

                </div>

              </div>

            )
          )}

        </div>
      )}


      {/* HOTEL RECOMMENDATIONS */}
      {trip?.hotels && (

        <div className="max-w-5xl mx-auto mt-12">

          <h2 className="text-2xl font-semibold mb-4 text-black">
            🏨 Recommended Hotels
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            {trip.hotels.map((hotel: any, i: number) => (

              <div
                key={i}
                className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition"
              >

                <p className="font-semibold text-lg text-black">
                  {hotel.name}
                </p>

                <p className="text-gray-700">
                  {hotel.address}
                </p>

                <p className="text-blue-600 text-sm mt-1">
                  💰 {hotel.approx_price}
                </p>

              </div>

            ))}

          </div>

        </div>

      )}

    </main>
  );
}


/* INPUT FIELD COMPONENT */

function InputField({ name, placeholder, handleChange }: any) {

  return (

    <input
      name={name}
      placeholder={placeholder}
      onChange={handleChange}
      className="
        border border-gray-300
        text-black
        placeholder-gray-600
        rounded-lg
        px-3 py-2
        bg-white
        focus:ring-2 focus:ring-blue-500
        outline-none
      "
    />

  );

}


/* INFO CARD COMPONENT */

function InfoCard({ title, value, emoji }: any) {

  return (

    <div className="bg-white shadow rounded-xl p-4 flex flex-col items-center text-center">

      <span className="text-2xl">{emoji}</span>

      <p className="text-black text-sm mt-1">
        {title}
      </p>

      <p className="font-semibold text-black">
        {value}
      </p>

    </div>

  );

}