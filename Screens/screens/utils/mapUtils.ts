// 📦 Decode polyline coordinates from Google
import polyline from "@mapbox/polyline";

type LocationCoords = {
  latitude: number;
  longitude: number;
};

/**
 * Format ETA (Estimated Time of Arrival) into HH:MM AM/PM format.
 */
export const formatETA = (durationInSeconds: number): string => {
  const eta = new Date(Date.now() + durationInSeconds * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

/**
 * Calculate straight-line distance in meters between two coordinates.
 */
export const calcDistance = (
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
): number => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139; // meters
};

/**
 * Calculate estimated fuel range given distance and fuel efficiency.
 */
export const calculateFuelRange = (distanceKm: number, fuelEfficiency: number) => {
  const base = distanceKm / fuelEfficiency;
  return {
    min: base * 0.9,
    max: base * 1.1,
    avg: base,
  };
};

/**
 * Reverse geocode coordinates to get a readable address.
 */
export const reverseGeocodeLocation = async (
  lat: number,
  lng: number,
  apiKey: string
): Promise<string> => {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
    );
    const data = await res.json();
    return data.results[0]?.formatted_address || "Unknown";
  } catch (err) {
    console.error("Reverse geocoding failed", err);
    return "Unknown";
  }
};

/**
 * Decode Google polyline string to array of coordinates.
 */
export const decodePolyline = (polylineStr: string) => {
  return polyline.decode(polylineStr).map(([lat, lng]) => ({
    latitude: lat,
    longitude: lng,
  }));
};

/**
 * Check if user is off-route (not near any route coordinates).
 */
export const isUserOffRoute = (
  currentLoc: { latitude: number; longitude: number },
  routeCoords: { latitude: number; longitude: number }[],
  threshold = 50 // meters
): boolean => {
  return !routeCoords.some((coord) => {
    const dx = currentLoc.latitude - coord.latitude;
    const dy = currentLoc.longitude - coord.longitude;
    const dist = Math.sqrt(dx * dx + dy * dy) * 111139;
    return dist < threshold;
  });
};

/**
 * Calculate total distance of a coordinate path in kilometers.
 */
export const calculateTotalPathDistance = (coords: LocationCoords[]): number => {
  if (!coords || coords.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < coords.length; i++) {
    total += calcDistance(coords[i - 1], coords[i]);
  }
  return total / 1000; // convert to km
};
