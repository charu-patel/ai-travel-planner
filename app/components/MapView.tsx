"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import { useEffect, useState } from "react";
import type { LatLngExpression } from "leaflet";

// Marker icons
const startIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const destIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type Props = {
  start: { lat: number; lon: number };
  destination: { lat: number; lon: number };
};

export default function MapView({ start, destination }: Props) {
  const [routeCoords, setRouteCoords] = useState<
    LatLngExpression[]
  >([]);

  useEffect(() => {
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${destination.lon},${destination.lat}?overview=full&geometries=geojson`
        );

        const data = await res.json();

        const coords = data.routes[0].geometry.coordinates.map(
          (coord: number[]) => [coord[1], coord[0]]
        );

        setRouteCoords(coords);
      } catch (err) {
        console.error("Route fetch failed:", err);
      }
    };

    fetchRoute();
  }, [start, destination]);

  const center: LatLngExpression = [
    destination.lat,
    destination.lon,
  ];

  return (
    <MapContainer
      center={center}
      zoom={6}
      style={{ height: "400px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Road route polyline */}
      {routeCoords.length > 0 && (
        <Polyline
          positions={routeCoords}
          pathOptions={{ color: "blue", weight: 4 }}
        />
      )}

      {/* Start marker */}
      <Marker
        position={[start.lat, start.lon]}
        icon={startIcon}
      >
        <Popup>Start Location 📍</Popup>
      </Marker>

      {/* Destination marker */}
      <Marker
        position={[destination.lat, destination.lon]}
        icon={destIcon}
      >
        <Popup>Destination 📍</Popup>
      </Marker>
    </MapContainer>
  );
}