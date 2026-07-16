"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const startIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

export default function MapView({ start, destination, transitOptions = [] }) {
  const [tracedRoutes, setTracedRoutes] = useState([]);

  useEffect(() => {
    if (!transitOptions || transitOptions.length === 0) return;

    const traceAllPaths = async () => {
      const pathsPromise = transitOptions.map(async (route) => {
        try {
          const coordinateString = route.path
            .map((coord) => `${coord[1]},${coord[0]}`)
            .join(";");

          // Note: OSRM uses roads, but this curves the track vectors perfectly across the map landscape fluidly 
          const res = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${coordinateString}?overview=full&geometries=geojson`
          );
          const data = await res.json();

          if (data.routes && data.routes[0]) {
            const geometry = data.routes[0].geometry.coordinates.map((c) => [c[1], c[0]]);
            return { ...route, path: geometry };
          }
          return route;
        } catch (err) {
          console.error("Failed to trace path geometry details:", err);
          return route;
        }
      });

      const updatedRoutes = await Promise.all(pathsPromise);
      setTracedRoutes(updatedRoutes);
    };

    traceAllPaths();
  }, [transitOptions]);

  if (!start?.lat || !destination?.lat) return null;
  const center = [destination.lat, destination.lon];

  const displayRoutes = tracedRoutes.length > 0 ? tracedRoutes : transitOptions;

  return (
    <MapContainer center={center} zoom={5} style={{ height: "450px", width: "100%" }}>
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {displayRoutes.map((route) => {
        // 🚂 IF IT IS THE RAIL ROUTE, WE STACK POLYLINES FOR THE DASHED TRACK EFFECT
        if (route.type === "Primary Rail Route" || route.id === "route_1") {
          return (
            <div key={route.id}>
              {/* 1. Base Solid Line (Black outline structure) */}
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: "#334155", 
                  weight: 6,
                  opacity: 0.9,
                  lineCap: "square"
                }}
              />
              {/* 2. Top Dashed Overlay Line (Creates the white track gaps) */}
              <Polyline
                positions={route.path}
                pathOptions={{
                  color: "#ffffff",
                  weight: 4,
                  dashArray: "8, 8", // Creates the 8px dash, 8px gap train track pattern
                  opacity: 1.0,
                  lineCap: "square"
                }}
              >
                <Popup>
                  <div className="font-sans text-xs p-1">
                    <span className="font-bold text-slate-800 block">🚂 {route.type}</span>
                    <span className="text-blue-600 font-bold">{route.duration}</span>
                    <p className="text-slate-500 mt-0.5">{route.summary}</p>
                  </div>
                </Popup>
              </Polyline>
            </div>
          );
        }

        // 🛣️ OTHERWISE, RENDER IT AS A STANDARD HIGHWAY ROAD LINE (Solid Green)
        return (
          <Polyline
            key={route.id}
            positions={route.path}
            pathOptions={{ 
              color: "#16a34a", 
              weight: 5, 
              opacity: 0.8 
            }}
          >
            <Popup>
              <div className="font-sans text-xs p-1">
                <span className="font-bold text-slate-800 block">🚗 {route.type}</span>
                <span className="text-emerald-600 font-bold">{route.duration}</span>
                <p className="text-slate-500 mt-0.5">{route.summary}</p>
              </div>
            </Popup>
          </Polyline>
        );
      })}

      <Marker position={[start.lat, start.lon]} icon={startIcon}>
        <Popup><span className="text-xs font-sans font-bold">Start: {start.name}</span></Popup>
      </Marker>

      <Marker position={[destination.lat, destination.lon]} icon={destIcon}>
        <Popup><span className="text-xs font-sans font-bold">Destination: {destination.name}</span></Popup>
      </Marker>
    </MapContainer>
  );
}