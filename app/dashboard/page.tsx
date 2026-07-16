"use client";

import { useRouter } from "next/navigation"; // ✅ Correct import for Next.js App Router
import { useEffect, useState } from "react";

export default function Dashboard() {
  const router = useRouter(); // ✅ Initialize the router hook
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  useEffect(() => {
    const trips = JSON.parse(localStorage.getItem("savedTrips") || "[]");
    setSavedTrips(trips);
  }, []);

  const deleteTrip = (id: number) => {
    const updatedTrips = savedTrips.filter((trip) => trip.id !== id);
    setSavedTrips(updatedTrips);
    localStorage.setItem("savedTrips", JSON.stringify(updatedTrips));
  };

  const handleCardClick = (clickedTrip: any) => {
    // Save the entire root trip object (containing id, name, and data wrapper)
    localStorage.setItem("activeTrip", JSON.stringify(clickedTrip));
    
    // Smooth Next.js client-side navigation back home
    router.push("/"); 
  };

  return (
    <main className="min-h-screen bg-gray-200 px-6 py-10">
      <h1 className="text-3xl text-black font-bold mb-6">
        🧳 My Trips
      </h1>

      {savedTrips.length === 0 && (
        <p className="text-gray-600">No saved trips yet.</p>
      )}

      <div className="space-y-4">
        {savedTrips.map((trip) => (
          <div
            key={trip.id}
            className="border rounded-lg p-4 bg-white shadow flex justify-between items-center"
          >
            {/* Clickable Trip Name Link */}
            <button
              onClick={() => handleCardClick(trip)} // ✅ Now uses your synchronized handler!
              className="text-lg font-semibold text-blue-600 hover:underline text-left"
            >
              {trip.name}
            </button>

            {/* Delete Button */}
            <button
              onClick={() => deleteTrip(trip.id)}
              className="text-red-600 font-medium hover:text-red-800 transition-colors"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}