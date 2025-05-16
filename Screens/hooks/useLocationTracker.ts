import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

const ARRIVAL_THRESHOLD_METERS = 30;

const calcDistance = (
  loc1: { latitude: number; longitude: number },
  loc2: { latitude: number; longitude: number }
) => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139;
};

const useLocationTracker = (
  onArrive: () => void,
  destination: any,
  tripSummary: any,
  user: any
) => {
  const [currentLocation, setCurrentLocation] = useState(null);

  useEffect(() => {
    let sub: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied");
        return;
      }

      const loc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = loc.coords;
      setCurrentLocation({ latitude, longitude });

      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        (update) =>
          setCurrentLocation({
            latitude: update.coords.latitude,
            longitude: update.coords.longitude,
          })
      );
    })();

    return () => sub?.remove();
  }, []);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (destination && tripSummary && user && currentLocation) {
      timer = setInterval(() => {
        const d = calcDistance(currentLocation, destination);
        if (d < ARRIVAL_THRESHOLD_METERS) {
          onArrive();
        }
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [destination, tripSummary, user, currentLocation]);

  return currentLocation;
};

export default useLocationTracker;
