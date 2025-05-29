import { useState, useEffect, useRef, useCallback } from "react";
import * as Location from "expo-location";
import { Alert } from "react-native";

export function useUserLocation() {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [region, setRegion] = useState({
    latitude: 14.7006,
    longitude: 120.9836,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(true);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  // 🚀 Request location permission and get initial position
  const requestPermissionAndGetLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionGranted(false);
        Alert.alert("Location Denied", "Enable location in device settings.");
        return;
      }

      setPermissionGranted(true);
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);
      const newRegion = { ...coords, latitudeDelta: 0.0015, longitudeDelta: 0.0015 };
      setRegion(newRegion);
    } catch (err) {
      console.error("Error getting location:", err);
      Alert.alert("Error", "Failed to get location.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🛰️ Start live location tracking
  const startWatching = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setPermissionGranted(false);
      return;
    }

    setPermissionGranted(true);

    subscriptionRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, timeInterval: 2000, distanceInterval: 2 },
      (loc) => {
        const coords = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(coords);
        setRegion((prev) => ({ ...prev, ...coords }));
      }
    );
  }, []);

  // 🛑 Stop location tracking
  const stopWatching = () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;
  };

  useEffect(() => {
    requestPermissionAndGetLocation();

    return () => {
      stopWatching();
    };
  }, [requestPermissionAndGetLocation]);

  return {
    currentLocation,
    region,
    isLoading,
    permissionGranted,
    startWatching,
    stopWatching,
    refreshLocation: requestPermissionAndGetLocation,
  };
}
