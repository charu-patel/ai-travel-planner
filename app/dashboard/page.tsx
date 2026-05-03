"use client";

import { useEffect, useState } from "react";

export default function Dashboard() {
  const [savedTrips, setSavedTrips] = useState<any[]>([]);

  useEffect(() => {
    const trips =
      JSON.parse(localStorage.getItem("savedTrips") || "[]");

    setSavedTrips(trips);
  }, []);

  const deleteTrip = (id: number) => {
    const updatedTrips = savedTrips.filter(
      (trip) => trip.id !== id
    );

    setSavedTrips(updatedTrips);

    localStorage.setItem(
      "savedTrips",
      JSON.stringify(updatedTrips)
    );
  };

  return (
    <main className="min-h-screen bg-gray-200 px-6 py-10">
      <h1 className="text-3xl text-black font-bold mb-6">
        🧳 My Trips
      </h1>

      {savedTrips.length === 0 && (
        <p>No saved trips yet.</p>
      )}

      {savedTrips.map((trip) => (
        <div
  key={trip.id}
  className="border rounded-lg p-4 mb-4 shadow flex justify-between items-center"
>

  <button
    onClick={() => {
      localStorage.setItem(
        "activeTrip",
        JSON.stringify(trip.data)
      );

      window.location.href = "/";
    }}
    className="text-lg font-semibold text-blue-600 hover:underline"
  >
    {trip.name}
  </button>

  <button
    onClick={() => deleteTrip(trip.id)}
    className="text-red-600"
  >
    Delete
  </button>

</div>
      ))}
    </main>
  );
}