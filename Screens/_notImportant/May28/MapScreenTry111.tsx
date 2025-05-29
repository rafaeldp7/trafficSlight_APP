import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import * as Speech from "expo-speech";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
import { useUser } from "../../../AuthContext/UserContext";
import RouteDetailsBottomSheet from "../../../components/RouteDetailsDrawer";
import TrafficIncidentMarker from "./MapScreen/TrafficIncidentMarker";
import SearchDestinationModal from "./MapScreen/SearchDestinationModal";
import TripSummaryModal from "./MapScreen/TripSummaryModal";
import SearchBar from "../../loggedIn/SearchBar";
import "react-native-get-random-values";
import { LocationObject } from "expo-location";
// ----------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------
const reverseGeocodeLocation = async (lat: number, lng: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    return data.results[0]?.formatted_address || "Unknown";
  } catch (err) {
    console.error("Reverse geocoding failed", err);
    return "Unknown";
  }
};

export const formatETA = (duration: number): string => {
  const eta = new Date(Date.now() + duration * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export const getDistance = (loc1, loc2) => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139;
};

export const isUserOffRoute = (current, routeCoords, threshold = 50) => {
  for (const point of routeCoords) {
    if (getDistance(current, point) < threshold) return false;
  }
  return true;
};

export const calcDistance = (loc1: LocationCoords, loc2: LocationCoords): number => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139;
};

export const calculateFuelRange = (distance: number, fuelEfficiency: number) => {
  const base = distance / fuelEfficiency;
  return {
    min: base * 0.9,
    max: base * 1.1,
    avg: base,
  };
};

export const downloadOfflineMap = async (region: any) => {
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;
  await FileSystem.makeDirectoryAsync(`${FileSystem.cacheDirectory}map_tiles/`, { intermediates: true });
  console.log("Offline map data prepared for region:", region);
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
export type LocationCoords = {
  latitude: number;
  longitude: number;
  address?: string;
};

export type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: LocationCoords[];
  instructions?: string[];
};

export type TripSummary = {
  userId: string;
  distance: string;
  fuelUsed: string;
  timeArrived: string;
  eta: string;
  destination: string;
  motorUsed: string;
  fuelEfficiency: number;
};

export type TrafficIncident = {
  id: string;
  location: LocationCoords;
  type: string;
  severity: string;
  description: string;
};

export type MapRef = React.RefObject<MapView>;
export type SearchRef = React.RefObject<typeof GooglePlacesAutocomplete>;

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
export const DEFAULT_TRAFFIC_RATE = 1;
export const ARRIVAL_THRESHOLD = 50; // meters before declaring arrival
export const MAX_RECENT_LOCATIONS = 10;
export const OFFLINE_TILES_PATH = `${FileSystem.cacheDirectory}map_tiles/`;
export const VOICE_NAV_DELAY = 3000;

// Note: `currentInstructionIndex` and `setCurrentInstructionIndex` must be declared inside the component using useState.
// Same with `selectedRoute` and `voiceEnabled`.


// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export default function NavigationApp({ navigation }: { navigation: any }) {
  // Refs
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<GooglePlacesAutocompleteRef>(null);
  const voiceNavTimeout = useRef<NodeJS.Timeout>();

  // Authenticated user
  const { user } = useUser();

  // UI state
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);

  // Location & navigation state
  const [region, setRegion] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapStyle, setMapStyle] = useState<"light" | "dark">("light");
  const [isOffline, setIsOffline] = useState(false);

  // Routing state
  const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);

  // Motor selection
  const [motorList, setMotorList] = useState<{ name: string; fuelEfficiency: number }[]>([]);
  const [selectedMotor, setSelectedMotor] = useState<{ name: string; fuelEfficiency: number } | null>(null);

  // Voice navigation
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);

  // Selected route (memoized)
  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return tripSummary?.id === selectedRouteId
      ? tripSummary
      : alternativeRoutes.find((r) => r.id === selectedRouteId) || null;
  }, [selectedRouteId, tripSummary, alternativeRoutes]);


  console.log(user._id);


  //fetch motors on Mount
  useEffect(() => {
    const fetchMotors = async () => {
      try {
        const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${user._id}`);
        const data = await res.json();
        setMotorList(data);
      } catch (error) {
        console.error("Failed to fetch motors", error);
      }
    };
    if (user?._id) fetchMotors();
  }, [user]);

  //get location and watch updates
  useEffect(() => {
    let sub: Location.LocationSubscription;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") throw new Error("Permission denied");

        const loc = await Location.getCurrentPositionAsync({});
        const initReg = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setCurrentLocation(initReg);
        setRegion(initReg);
        animateToRegion(initReg);
        downloadOfflineMap(initReg);
        setIsLoading(false);

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (update) => {
            const newLocation = {
              latitude: update.coords.latitude,
              longitude: update.coords.longitude,
            };
            setCurrentLocation(newLocation);

            if (isFollowingUser || isNavigating) {
              animateToRegion({
                ...newLocation,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              });
            }
          }
        );
      } catch (error) {
        setIsLoading(false);
        Alert.alert("Location Error", "Failed to get location");
      }
    };

    getLocation();
    return () => sub?.remove();
  }, [isFollowingUser, isNavigating]);


  //detect arrival
  useEffect(() => {
    if (!isNavigating || !selectedRoute || !currentLocation) return;

    const lastCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
    const distance = calcDistance(currentLocation, lastCoord);
    if (distance < ARRIVAL_THRESHOLD) endNavigation(true);

    return () => {
      if (voiceNavTimeout.current) clearTimeout(voiceNavTimeout.current);
    };
  }, [isNavigating, currentLocation, selectedRoute]);


  // off-route detection and autorerouting
  useEffect(() => {
    if (!isNavigating || !selectedRoute || !currentLocation) return;

    const userIsOffRoute = isUserOffRoute(currentLocation, selectedRoute.coordinates, 50);
    if (userIsOffRoute) {
      console.warn("🚨 Off-route detected. Rerouting...");
      setCurrentInstructionIndex(0);
      fetchRoutes();
    }
  }, [currentLocation, isNavigating, selectedRoute]);

  // voice instuctions
  useEffect(() => {
    if (
      voiceEnabled &&
      isNavigating &&
      selectedRoute?.instructions &&
      currentInstructionIndex < selectedRoute.instructions.length
    ) {
      const instruction = selectedRoute.instructions[currentInstructionIndex];
      Speech.speak(instruction);

      voiceNavTimeout.current = setTimeout(() => {
        setCurrentInstructionIndex((prev) => prev + 1);
      }, VOICE_NAV_DELAY);
    }

    return () => {
      if (voiceNavTimeout.current) clearTimeout(voiceNavTimeout.current);
    };
  }, [currentInstructionIndex, voiceEnabled, selectedRoute, isNavigating]);





  // 🚀 Animate camera to region
  const animateToRegion = useCallback((newRegion: any) => {
    mapRef.current?.animateToRegion(newRegion, 1000);
  }, []);

  // 🛣️ Fetch route and alternatives from Google Directions API
  const fetchRoutes = useCallback(async () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);
    console.log("🛰️ Fetching routes from Google Directions API...");

    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status !== "OK") throw new Error(data.error_message || "Failed to fetch routes");

      const processRoute = (r: any, i: number): RouteData => {
        const leg = r.legs[0];
        const fuel = selectedMotor ? leg.distance.value / 1000 / selectedMotor.fuelEfficiency : 0;

        return {
          id: `route-${i}`,
          distance: leg.distance.value,
          duration: leg.duration.value,
          fuelEstimate: fuel,
          trafficRate: Math.min(5, Math.max(1, Math.floor(Math.random() * 5))),
          coordinates: polyline.decode(r.overview_polyline.points).map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          })),
          instructions: leg.steps.map((step: any) => step.html_instructions.replace(/<[^>]*>/g, "")),
        };
      };

      const allRoutes = data.routes.map(processRoute);
      const alternatives = allRoutes.slice(1);

      // Add dummy alternatives if fewer than 3
      while (alternatives.length < 3 && alternatives.length > 0) {
        const last = alternatives[alternatives.length - 1];
        alternatives.push({
          ...last,
          id: `route-${alternatives.length + 1}`,
          distance: last.distance * 1.1,
          duration: last.duration * 1.1,
          fuelEstimate: last.fuelEstimate * 1.1,
        });
      }

      // Fetch real-time traffic reports from backend
      const fetchTrafficReports = async () => {
        try {
          const res = await fetch("https://ts-backend-1-jyit.onrender.com/api/reports");
          const data = await res.json();
          const formatted: TrafficIncident[] = data.map((r: any) => ({
            id: r._id,
            location: r.location,
            type: r.reportType,
            severity: r.reportType.toLowerCase().includes("accident") ? "high" : "medium",
            description: r.description,
          }));
          setTrafficIncidents(formatted);
        } catch (err) {
          console.error("⚠️ Failed to load traffic reports", err);
        }
      };

      setTripSummary(allRoutes[0]);
      setAlternativeRoutes(alternatives);
      setSelectedRouteId(allRoutes[0].id);
      setShowBottomSheet(true);
      await fetchTrafficReports();
    } catch (error) {
      console.error("❌ Route Fetch Error:", error.message);
      Alert.alert("Route Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, destination, selectedMotor]);

  // 🚦 Start navigation and follow user's position
  const startNavigation = useCallback(() => {
    if (!selectedRoute) return;
    setIsNavigating(true);
    setIsFollowingUser(true);

    setCurrentInstructionIndex(0); // reset instructions

    if (currentLocation) {
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [selectedRoute, currentLocation]);

  // 🛑 End navigation, save trip summary if arrived
  const endNavigation = useCallback((arrived: boolean = false) => {
    setIsNavigating(false);
    setIsFollowingUser(false);
    setIsNavigating(false);
    setIsFollowingUser(false);
    setCurrentInstructionIndex(0); // reset instructions

    if (arrived && user && destination && selectedRoute) {
      setTripSummaryModalVisible(true);
      saveTripSummaryToBackend({
        userId: user.id,

        destination: destination.address || "Unknown",
        motorUsed: selectedMotor?.name || "Unknown",
        fuelEfficiency: selectedMotor?.fuelEfficiency || 0,
        distance: `${(selectedRoute.distance / 1000).toFixed(2)} km`,
        fuelUsed: `${selectedRoute.fuelEstimate.toFixed(2)} L`,
        eta: formatETA(selectedRoute.duration),
        timeArrived: new Date().toISOString(),
      });

    }
  }, [user, destination, selectedRoute]);

  // 💾 Save trip summary to backend
  const saveTripSummaryToBackend = async (summary: TripSummary) => {
    try {
      await fetch(`${LOCALHOST_IP}/api/trips`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
    } catch (err) {
      console.error("Error saving trip:", err);
    }
  };





  // ✅ Continue with render (map, modals, UI controls, etc.)
  // The rest of the render JSX you've written (header, map view, modals, route sheets, etc.)
  // remains unchanged and is already well-structured.

const simulateRoute = [
  { latitude: 14.700, longitude: 120.980 },
  { latitude: 14.701, longitude: 120.981 },
  { latitude: 14.702, longitude: 120.982 },
  // Add more points for smoother simulation
];

let simulationIndex = 0;
let simulationInterval: NodeJS.Timeout;

useEffect(() => {
  if (!isNavigating) return;

  simulationInterval = setInterval(() => {
    if (simulationIndex >= simulateRoute.length) {
      clearInterval(simulationInterval);
      return;
    }

    const simulatedLocation = simulateRoute[simulationIndex];
    setCurrentLocation(simulatedLocation);
    simulationIndex++;
  }, 2000); // move every 2 seconds

  return () => clearInterval(simulationInterval);
}, [isNavigating]);




  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Traffic Slight</Text>
          <TouchableOpacity onPress={() => setMapStyle(mapStyle === "light" ? "dark" : "light")}>
            <MaterialIcons name={mapStyle === "light" ? "dark-mode" : "light-mode"} size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Destination Display */}
        {destination && (
          <Pressable onPress={() => setModalVisible(true)} style={styles.destinationHeader}>
            <Text style={styles.destinationText} numberOfLines={1}>
              {destination.address}
            </Text>
          </Pressable>
        )}

        {/* Search Modal */}
        <Modal animationType="slide" visible={modalVisible}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackButton}>
                <MaterialIcons name="arrow-back" size={24} color="black" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Search Destination</Text>
            </View>

            <SearchBar
              // onPress={() => setModalVisible(false)}
              searchRef={searchRef}
              searchText={searchText}
              setSearchText={setSearchText}
              isTyping={isTyping}
              setIsTyping={setIsTyping}
              setDestination={setDestination}
              animateToRegion={animateToRegion}
              // saveToRecent={saveToRecent}
              //recentLocations={recentLocations}
              // savedLocations={savedLocations}
              selectedMotor={selectedMotor}
              setSelectedMotor={setSelectedMotor} 
              motorList={motorList}
              onPlaceSelectedCloseModal={() => setModalVisible(false)}
              
            />
          </View>
        </Modal>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            customMapStyle={mapStyle === "dark" ? darkMapStyle : []}
            showsUserLocation
            showsTraffic={!isOffline}
            showsMyLocationButton={false}
          >
            {isOffline && (
              <UrlTile
                urlTemplate="http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
              />
            )}

            {/* Routes */}
            {alternativeRoutes.map((route) => (
              <Polyline
                key={route.id}
                coordinates={route.coordinates}
                strokeColor="#95a5a6"
                strokeWidth={4}
              />
            ))}

            {selectedRoute && (
              <Polyline
                coordinates={selectedRoute.coordinates}
                strokeColor="#3498db"
                strokeWidth={6}
              />
            )}

            {/* Markers */}
            {currentLocation && (
              <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.userMarker}>
                  <MaterialIcons name="person-pin-circle" size={32} color="#3498db" />
                </View>
              </Marker>
            )}

            {destination && (
              <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.destinationMarker}>
                  <MaterialIcons name="place" size={32} color="#e74c3c" />
                </View>
              </Marker>
            )}

            {/* Traffic Incidents */}
            {trafficIncidents.map((incident) => (
              <TrafficIncidentMarker key={incident.id} incident={incident} />
            ))}
          </MapView>

          {/* Controls */}
          {!selectedRoute && (

            <TouchableOpacity onPress={fetchRoutes} style={styles.getRouteButton}>
              <Text style={styles.buttonText}>Get Routes</Text>
            </TouchableOpacity>
          )}

          {selectedRoute && !isNavigating && (
            <TouchableOpacity onPress={startNavigation} style={styles.navigationButton}>
              <Text style={styles.buttonText}>Start Navigation</Text>
            </TouchableOpacity>

          )}


          {/* Navigation Overlay */}
          {isNavigating && (
            <View style={styles.navigationOverlay}>
              <View style={styles.navigationHeader}>
                <Text style={styles.navigationTitle}>Active Navigation</Text>
                <View style={styles.navigationControls}>
                  <TouchableOpacity onPress={() => setVoiceEnabled(!voiceEnabled)} style={styles.controlButton}>
                    <MaterialIcons name={voiceEnabled ? "volume-up" : "volume-off"} size={24} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsFollowingUser(!isFollowingUser)} style={styles.controlButton}>
                    <MaterialIcons name={isFollowingUser ? "my-location" : "location-disabled"} size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.navigationInfo}>
                <Text style={styles.navigationText}>
                  Fuel to Consume: {selectedRoute ? `${(selectedRoute.fuelEstimate).toFixed(3)} L` : 'Calculating...'}
                </Text>
                <Text style={styles.navigationText}>
                  Distance: {selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : 'Calculating...'}
                </Text>
                <Text style={styles.navigationText}>
                  ETA: {selectedRoute ? formatETA(selectedRoute.duration) : 'Calculating...'}
                </Text>
              </View>

              <TouchableOpacity onPress={() => endNavigation(false)} style={styles.stopButton}>
                <Text style={styles.stopButtonText}>End Navigation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Route Details */}
        <RouteDetailsBottomSheet
          visible={showBottomSheet}
          bestRoute={tripSummary}
          alternatives={alternativeRoutes}
          onClose={() => setShowBottomSheet(false)}
          selectedRouteId={selectedRouteId}
          selectedMotor={selectedMotor} // ✅ Add this
          onSelectRoute={(id) => {
            setSelectedRouteId(id);
            const route = id === tripSummary?.id ? tripSummary : alternativeRoutes.find(r => r.id === id);
            if (route) {
              mapRef.current?.fitToCoordinates(route.coordinates, {
                edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
                animated: true,
              });
            }
          }}
        />

        {/* Trip Summary Modal */}
        <Modal transparent visible={tripSummaryModalVisible} animationType="fade">
          <View style={styles.summaryModalContainer}>
            <View style={styles.summaryModal}>
              <Text style={styles.summaryTitle}>Trip Completed</Text>

              {selectedRoute && destination && currentLocation && selectedMotor && (
                <>
                  {/* From */}
                  {/* <View style={styles.summaryRow}>
            <MaterialIcons name="my-location" size={20} color="#34495e" />
            <Text style={styles.summaryText} numberOfLines={2}>
              From: {`${reverseGeocodeLocation(currentLocation.latitude, currentLocation.longitude)}`}
            </Text>
          </View> */}

                  {/* To */}
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="place" size={20} color="#e74c3c" />
                    <Text style={styles.summaryText} numberOfLines={2}>
                      To: {destination.address}
                    </Text>
                  </View>

                  {/* Distance */}
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="directions-car" size={20} color="#3498db" />
                    <Text style={styles.summaryText}>
                      Distance: {(selectedRoute.distance / 1000).toFixed(2)} km
                    </Text>
                  </View>

                  {/* Fuel Estimate */}
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
                    <Text style={styles.summaryText}>
                      Fuel Used: {selectedRoute.fuelEstimate.toFixed(2)} L
                    </Text>
                  </View>

                  {/* Fuel Range */}
                  {/* <View style={styles.summaryRow}>
            <MaterialIcons name="speed" size={20} color="#f39c12" />
            <Text style={styles.summaryText}>
              Motor Range: ~{(selectedMotor.fuelEfficiency * selectedRoute.fuelEstimate).toFixed(1)} km
            </Text>
          </View> */}

                  {/* ETA */}
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="schedule" size={20} color="#9b59b6" />
                    <Text style={styles.summaryText}>
                      ETA: {formatETA(selectedRoute.duration)}
                    </Text>
                  </View>

                  {/* Motor Used */}
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="two-wheeler" size={20} color="#1abc9c" />
                    <Text style={styles.summaryText}>
                      Motor Used: {selectedMotor.name} ({selectedMotor.fuelEfficiency} km/L)
                    </Text>
                  </View>
                </>
              )}

              <TouchableOpacity
                onPress={() => {
                  setTripSummaryModalVisible(false);
                  navigation.goBack();
                }}
                style={styles.closeSummaryButton}
              >
                <Text style={styles.closeSummaryText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
];

const styles = StyleSheet.create({
  safeArea: {
    paddingTop: Platform.OS === "android" ? 25 : 0,
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  destinationHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  destinationText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  modalBackButton: {
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  getRouteButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navigationButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: '#2ecc71',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  destinationMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  incidentMarker: {
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navigationOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(44, 62, 80, 0.9)',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  navigationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  navigationControls: {
    flexDirection: 'row',
  },
  controlButton: {
    marginLeft: 16,
  },
  navigationInfo: {
    marginBottom: 16,
  },
  navigationText: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 4,
  },
  stopButton: {
    backgroundColor: '#e74c3c',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
    maxHeight: '40%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  summaryContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  routeItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#f8f9fa',
  },
  activeRouteItem: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  routeStatBig: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  routeStat: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 2,
  },
  sortOptionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#7f8c8d',
    marginRight: 12,
  },
  sortButton: {
    backgroundColor: '#ecf0f1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
  },
  activeSortButton: {
    backgroundColor: '#3498db',
  },
  sortButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  activeSortButtonText: {
    color: '#fff',
  },
  alternativesContainer: {
    marginTop: 8,
  },
  summaryModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  summaryModal: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '85%',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },
  closeSummaryButton: {
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  closeSummaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});