// components/HotelCard.tsx
"use client";

import React from "react";

interface Hotel {
  name: string;
  address: string;
  approx_price: string;
  googleHotelsUrl?: string;
  rating?: string | number;
  amenities?: string[];
}

interface HotelCardProps {
  hotel: Hotel;
  destination: string;
}

export default function HotelCard({ hotel, destination }: HotelCardProps) {
  // Build a fallback URL directly on the frontend using the hotel name + destination
  const fallbackSearchQuery = encodeURIComponent(`${hotel.name} ${destination || ""}`);
  
  // ✅ FIXED: Template literal syntax corrected using ${...}
  const googleHotelsUrl = hotel.googleHotelsUrl || `https://www.google.com/search?q=${fallbackSearchQuery}+hotel`;

  // Local dummy images to make cards visually pop instantly if your API doesn't pass one
  const fallbackImage = "https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=600";

  // Dummy tags for real-world contextual flair
  const defaultAmenities = ["Free Wi-Fi", "AC Rooms", "Top Rated"];
  const displaysTags = hotel.amenities || defaultAmenities;

  return (
    <div className="group bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col h-full justify-between">
      
      {/* CARD TOP: IMAGE PREVIEW PANEL */}
      <div className="relative w-full h-44 bg-slate-100 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity duration-300" />
        <img
          src={fallbackImage}
          alt={hotel.name}
          className="w-full h-full object-cover transform scale-100 group-hover:scale-[1.03] transition-transform duration-500 ease-out"
        />
        {/* RATING BADGE */}
        <div className="absolute top-3 right-3 z-20 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm border border-white/50 flex items-center gap-1 text-xs font-bold text-slate-800">
          ⭐ {hotel.rating || "4.2"}
        </div>
      </div>

      {/* CARD MIDDLE: TEXT CONTEXT METRICS */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-base text-slate-900 group-hover:text-indigo-600 transition-colors leading-snug">
            {hotel.name}
          </h4>
          <p className="text-slate-500 text-xs mt-1.5 flex items-start gap-1 line-clamp-2">
            <span className="shrink-0 mt-0.5">📍</span>
            <span>{hotel.address || "Address info premium validation pending."}</span>
          </p>

          {/* CHIP AMENITIES STRIP */}
          <div className="flex flex-wrap gap-1.5 mt-3.5">
            {displaysTags.map((tag, idx) => (
              <span
                key={idx}
                className="text-[10px] font-semibold bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-md tracking-wide"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* CARD BOTTOM: TARGET CALCULATION ENGINE BAR */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Target Rate
              </span>
              <span className="text-[10px] text-slate-400 font-medium italic leading-none mt-0.5">
                (Live rates fluctuate)
              </span>
            </div>
            <span className="text-sm font-bold font-mono text-emerald-600 bg-emerald-50/70 border border-emerald-100 px-2.5 py-1 rounded-xl shadow-2xs">
              {hotel.approx_price.includes("₹") ? hotel.approx_price : `₹${hotel.approx_price}`}
            </span>
          </div>

          {/* DEEP LINK BUTTON ACCORDION */}
          <a
            href={googleHotelsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm hover:shadow transition-all duration-200"
          >
            <span>Book / View Hotel</span>
            <span className="text-sm">🌐</span>
          </a>
        </div>

      </div>
    </div>
  );
}