import React, { useState, useEffect } from "react";
import { View, Text, Alert, Modal, TouchableOpacity } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { checkReroute } from "../../utils/archived/reroute";
import { getNewRoute } from "../../utils/archived/directions";
import { useTailwind } from "tailwind-rn";

export default function TrackingScreen({ route }) {
  const tailwind = useTailwind();
  const [location, setLocation] = useState(null);
  const [routeHistory, setRouteHistory] = useState([]); // Real-time route
  const [updatedRoute, setUpdatedRoute] = useState(null);
  const [showRerouteModal, setShowRerouteModal] = useState(false); // NEW MODAL STATE
  const originalRoute = route?.params?.route || [];
  const destination = route?.params?.destination || null;

  useEffect(() => {
    let isMounted = true;

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.log("Permission denied");
        return;
      }

      const subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
        async (newLocation) => {
          if (isMounted) {
            const { latitude, longitude } = newLocation.coords;
            const newPoint = { latitude, longitude };

            setLocation(newPoint);
            setRouteHistory((prevRoute) => [...prevRoute, newPoint]);

            // Check for reroute
            if (checkReroute(newPoint, originalRoute)) {
              setShowRerouteModal(true);
            }
          }
        }
      );

      return () => {
        isMounted = false;
        subscription.remove();
      };
    })();
  }, []);

  const handleAcceptNewRoute = async () => {
    setShowRerouteModal(false);
    if (destination) {
      const newRoute = await getNewRoute(location, destination);
      if (newRoute) {
        setUpdatedRoute(newRoute);
        Alert.alert("Route Updated!", "You are now on the best route.");
      }
    }
  };

  return (
    <View style={tailwind("flex-1 bg-gray-100")}>
      {location ? (
        <MapView
          style={tailwind("flex-1")}
          initialRegion={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation
          followsUserLocation
        >
          <Marker coordinate={location} title="You are here" />
          <Polyline coordinates={routeHistory} strokeWidth={4} strokeColor="blue" />
          {updatedRoute && <Polyline coordinates={updatedRoute} strokeWidth={4} strokeColor="red" />}
        </MapView>
      ) : (
        <View style={tailwind("flex-1 justify-center items-center")}>
          <Text style={tailwind("text-lg text-gray-700")}>Loading location...</Text>
        </View>
      )}

      {/* Reroute Confirmation Modal */}
      <Modal transparent visible={showRerouteModal} animationType="slide">
        <View style={tailwind("flex-1 justify-center items-center bg-black bg-opacity-50")}>
          <View style={tailwind("bg-white p-6 rounded-lg w-4/5")}>
            <Text style={tailwind("text-lg font-bold text-gray-800 text-center mb-4")}>
              Reroute Detected!  
            </Text>
            <Text style={tailwind("text-gray-600 text-center mb-4")}>
              Would you like to take the new best route?
            </Text>
            <View style={tailwind("flex-row justify-between")}>
              <TouchableOpacity
                style={tailwind("bg-blue-500 px-4 py-2 rounded-lg")}
                onPress={handleAcceptNewRoute}
              >
                <Text style={tailwind("text-white font-bold text-center")}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={tailwind("bg-gray-400 px-4 py-2 rounded-lg")}
                onPress={() => setShowRerouteModal(false)}
              >
                <Text style={tailwind("text-white font-bold text-center")}>Stay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
