import { useState } from "react";
import { Alert } from "react-native";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY } from "@env";

const FUEL_EFFICIENCY = 50;
const DEFAULT_TRAFFIC_RATE = 1;

type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: { latitude: number; longitude: number }[];
};

const useRoutes = (currentLocation: any, destination: any) => {
  const [route, setRoute] = useState<RouteData | null>(null);
  const [alternatives, setAlternatives] = useState<RouteData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchRoutes = async () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();

      const raw = (data.routes || [])
        .filter((r: any) => r.legs?.length && r.legs[0].distance?.value != null && r.overview_polyline?.points)
        .map((r: any, i: number) => {
          const leg = r.legs[0];
          return {
            index: i,
            distance: leg.distance.value,
            duration: leg.duration.value,
            coordinates: polyline
              .decode(r.overview_polyline.points)
              .map(([lat, lng]: number[]) => ({ latitude: lat, longitude: lng })),
          };
        });

      if (!raw.length) {
        Alert.alert("No valid routes");
        return;
      }

      while (raw.length < 4) {
        const last = raw[raw.length - 1];
        const factor = 1 + 0.05 * raw.length;
        raw.push({
          index: raw.length,
          distance: last.distance * factor,
          duration: last.duration * factor,
          coordinates: last.coordinates,
        });
      }

      const best = raw[0];
      const bestRoute: RouteData = {
        id: `route-${best.index}`,
        distance: best.distance,
        duration: best.duration,
        fuelEstimate: best.distance / 1000 / FUEL_EFFICIENCY,
        trafficRate: DEFAULT_TRAFFIC_RATE,
        coordinates: best.coordinates,
      };

      const alts: RouteData[] = raw.slice(1).map((r) => ({
        id: `route-${r.index}`,
        distance: r.distance,
        duration: r.duration,
        fuelEstimate: r.distance / 1000 / FUEL_EFFICIENCY,
        trafficRate: DEFAULT_TRAFFIC_RATE,
        coordinates: r.coordinates,
      }));

      setRoute(bestRoute);
      setAlternatives(alts);
    } catch (err) {
      console.error("Error fetching routes:", err);
      Alert.alert("Unable to fetch routes");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    route,
    alternatives,
    isLoading,
    fetchRoutes,
  };
};

export default useRoutes;
