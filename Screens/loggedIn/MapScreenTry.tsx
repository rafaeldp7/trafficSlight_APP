import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
import { useUser } from "../../AuthContext/UserContext";

import SearchBar from "../_notImportant/SearchBar";
import "react-native-get-random-values";
// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
type LocationCoords = {
  latitude: number;
  longitude: number;
  address?: string;
};

type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: LocationCoords[];
  instructions?: string[];
};

type TripSummary = {
  userId: string;
  distance: string;
  fuelUsed: string;
  timeArrived: string;
  eta: string;
  destination: string;
};

type TrafficIncident = {
  id: string;
  location: LocationCoords;
  type: string;
  severity: string;
  description: string;
};

type MapRef = React.RefObject<MapView>;
type SearchRef = React.RefObject<typeof GooglePlacesAutocomplete>;

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const DEFAULT_TRAFFIC_RATE = 1;
const ARRIVAL_THRESHOLD = 50; // meters before declaring arrival
const MAX_RECENT_LOCATIONS = 10;
const OFFLINE_TILES_PATH = `${FileSystem.cacheDirectory}map_tiles/`;
const VOICE_NAV_DELAY = 3000;

const calculateFuelRange = (distance: number, fuelEfficiency: number) => {
  const base = distance / fuelEfficiency;
  return {
    min: base * 0.9,
    max: base * 1.1,
    avg: base,
  };
};


// ----------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------
const formatETA = (duration: number): string => {
  const eta = new Date(Date.now() + duration * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const calcDistance = (loc1: LocationCoords, loc2: LocationCoords): number => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139;
};

const downloadOfflineMap = async (region: any) => {
  const zoomLevel = 12;
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  // Create directory if it doesn't exist
  await FileSystem.makeDirectoryAsync(OFFLINE_TILES_PATH, { intermediates: true });

  // Simple offline map implementation - in production you'd want a more robust solution
  console.log("Offline map data prepared for region:", region);
};

// fetch routes



// ----------------------------------------------------------------
// Components
// ----------------------------------------------------------------
type RouteDetailsBottomSheetProps = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
};

const RouteDetailsBottomSheet = React.memo(({ visible, bestRoute, alternatives, onClose, selectedRouteId, onSelectRoute }: RouteDetailsBottomSheetProps) => {
  const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">("distance");

  const sortedAlternatives = useMemo(() => {
    return [...alternatives].sort((a, b) => {
      if (sortCriteria === "fuel") return a.fuelEstimate - b.fuelEstimate;
      if (sortCriteria === "traffic") return a.trafficRate - b.trafficRate;
      return a.distance - b.distance;
    });
  }, [sortCriteria, alternatives]);

  if (!visible || !bestRoute) return null;

  return (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Route Details</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        <View style={styles.summaryContainer}>
          <TouchableOpacity
            onPress={() => onSelectRoute(bestRoute.id)}
            style={[styles.routeItem, bestRoute.id === selectedRouteId && styles.activeRouteItem]}
          >
            <Text style={styles.summaryTitle}>Recommended Route</Text>
            <Text style={styles.routeStatBig}>
              Fuel: {(bestRoute.fuelEstimate * 0.9).toFixed(2)}-{(bestRoute.fuelEstimate * 1.1).toFixed(2)} L
              {calculateFuelRange(bestRoute.distance, bestRoute.fuelEstimate).min.toFixed(2)}-{calculateFuelRange(bestRoute.distance, bestRoute.fuelEstimate).max.toFixed(2)} L
            </Text>
            <Text style={styles.routeStat}>Distance: {(bestRoute.distance / 1000).toFixed(2)} km</Text>
            <Text style={styles.routeStat}>ETA: {formatETA(bestRoute.duration)}</Text>
            <Text style={styles.routeStat}>Traffic: {bestRoute.trafficRate}/5</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sortOptionsContainer}>
          <Text style={styles.sectionTitle}>Sort Alternatives By:</Text>
          {["fuel", "traffic", "distance"].map((criteria) => (
            <TouchableOpacity
              key={criteria}
              style={[styles.sortButton, sortCriteria === criteria && styles.activeSortButton]}
              onPress={() => setSortCriteria(criteria as any)}
            >
              <Text style={styles.sortButtonText}>{criteria.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.alternativesContainer}>
          <Text style={styles.sectionTitle}>Alternative Routes</Text>
          {sortedAlternatives.map((routeItem) => (
            <TouchableOpacity
              key={routeItem.id}
              onPress={() => onSelectRoute(routeItem.id)}
              style={[styles.routeItem, routeItem.id === selectedRouteId && styles.activeRouteItem]}
            >
              <Text style={styles.routeStatBig}>
                Fuel: {(routeItem.fuelEstimate * 0.9).toFixed(2)}-{(routeItem.fuelEstimate * 1.1).toFixed(2)} L
              </Text>
              <Text style={styles.routeStat}>Distance: {(routeItem.distance / 1000).toFixed(2)} km</Text>
              <Text style={styles.routeStat}>ETA: {(routeItem.duration / 60).toFixed(0)} min</Text>
              <Text style={styles.routeStat}>Traffic: {routeItem.trafficRate}/5</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
});

const TrafficIncidentMarker = ({ incident }: { incident: TrafficIncident }) => (
  <Marker coordinate={incident.location}>
    <View style={styles.incidentMarker}>
      <MaterialIcons
        name={
          incident.type === "Accident" ? "warning" :
            incident.type === "Hazard" ? "report-problem" :
              incident.type === "Road Closure" ? "block" :
                incident.type === "Traffic Jam" ? "traffic" :
                  incident.type === "Police" ? "local-police" :
                    "info"
        }
        size={24}
        color={incident.severity === "high" ? "#e74c3c" : "#f39c12"}
      />

    </View>
  </Marker>
);

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export default function NavigationApp({ navigation }: { navigation: any }) {
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<GooglePlacesAutocompleteRef>(null);
  const voiceNavTimeout = useRef<NodeJS.Timeout>();
  const { user } = useUser();

  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentLocations, setRecentLocations] = useState<LocationCoords[]>([]);
  const [savedLocations, setSavedLocations] = useState<LocationCoords[]>([]);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [region, setRegion] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<"light" | "dark">("light");
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [motorList, setMotorList] = useState<{ name: string; fuelEfficiency: number }[]>([]);
  const [selectedMotor, setSelectedMotor] = useState<{ name: string; fuelEfficiency: number } | null>(null);

  useEffect(() => {
    const fetchMotors = async () => {
      try {
        const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user-motors/${user._id}`);
        const data = await res.json();
        setMotorList(data);
      } catch (error) {
        console.error("Failed to fetch motors", error);
      }
    };
    if (user?._id) fetchMotors();
  }, [user]);



  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    if (tripSummary?.id === selectedRouteId) return tripSummary;
    return alternativeRoutes.find((r) => r.id === selectedRouteId) || null;
  }, [selectedRouteId, tripSummary, alternativeRoutes]);

  // Location tracking
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

  // Navigation effects
  useEffect(() => {
    if (!isNavigating || !selectedRoute || !currentLocation) return;


    // Arrival detection
    const lastCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
    const distance = calcDistance(currentLocation, lastCoord);

    if (distance < ARRIVAL_THRESHOLD) {
      endNavigation(true);
    }

    return () => {
      if (voiceNavTimeout.current) clearTimeout(voiceNavTimeout.current);
    };
  }, [isNavigating, currentLocation, selectedRoute, voiceEnabled]);

  // Helper functions
  const animateToRegion = useCallback((newRegion: any) => {
    mapRef.current?.animateToRegion(newRegion, 1000);
  }, []);

  // const saveToRecent = useCallback((loc: LocationCoords) => {
  //   setRecentLocations((prev) => [loc, ...prev].slice(0, MAX_RECENT_LOCATIONS));
  // }, []);

  // const saveLocation = useCallback((loc: LocationCoords) => {
  //   setSavedLocations((prev) => [...prev, loc]);
  // }, []);

  const fetchRoutes = useCallback(async () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);

    console.log("Fetching routes..." + currentLocation, destination);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      if (data.status !== "OK") throw new Error(data.error_message || "Failed to fetch routes");
      
      console.log("Route data:", data);
      if (data.routes.length === 0) throw new Error("No routes found");
      
      const processRoute = (r: any, i: number) => {
        const leg = r.legs[0];
        return {
          id: `route-${i}`,
          distance: leg.distance.value,
          duration: leg.duration.value,
          fuelEstimate: selectedMotor ? leg.distance.value / 1000 / selectedMotor.fuelEfficiency : 0,
          trafficRate: Math.min(5, Math.max(1, Math.floor(Math.random() * 5))),
          coordinates: polyline.decode(r.overview_polyline.points).map(([lat, lng]) => ({
            latitude: lat,
            longitude: lng,
          })),
          instructions: leg.steps.map((step: any) => step.html_instructions.replace(/<[^>]*>/g, "")),
        };
      };

      const allRoutes = data.routes.map(processRoute);
      if (allRoutes.length < 2) Alert.alert("No alternatives found");

      const alternatives = allRoutes.slice(1);
      while (alternatives.length < 3) {
        const last = alternatives[alternatives.length - 1];
        alternatives.push({
          ...last,
          id: `route-${alternatives.length + 1}`,
          distance: last.distance * 1.1,
          duration: last.duration * 1.1,
          fuelEstimate: last.fuelEstimate * 1.1,
        });
      }

      // const incidents: TrafficIncident[] = [
      //   {
      //     id: "1",
      //     location: {
      //       latitude: (currentLocation.latitude + destination.latitude) / 2,
      //       longitude: (currentLocation.longitude + destination.longitude) / 2,
      //     },
      //     type: "accident",
      //     severity: "high",
      //     description: "Accident reported ahead",
      //   },
      // ];

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
          console.error("Failed to load traffic reports", err);
        }
      };


      setTripSummary(allRoutes[0]);
      setAlternativeRoutes(alternatives);
      setSelectedRouteId(allRoutes[0].id);

      setShowBottomSheet(true);
      await fetchTrafficReports();

    } catch (error) {
      Alert.alert("Route Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, destination, selectedMotor]);



  const startNavigation = useCallback(() => {
    if (!selectedRoute) return;

    setIsNavigating(true);
    setIsFollowingUser(true);

    if (currentLocation) {
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      });
    }
  }, [selectedRoute, currentLocation, destination]);

  const endNavigation = useCallback((arrived: boolean = false) => {
    setIsNavigating(false);
    setIsFollowingUser(false);


    if (arrived && user && destination && selectedRoute) {
      setTripSummaryModalVisible(true);
      saveTripSummaryToBackend({
        userId: user.id,
        distance: `${selectedRoute.distance.toFixed(2)} m`,
        fuelUsed: `${selectedRoute.fuelEstimate.toFixed(2)} L`,
        timeArrived: new Date().toISOString(),
        eta: `${(selectedRoute.duration / 60).toFixed(2)} min`,
        destination: destination.address || "Unknown",
      });

    }
  }, [user, destination, selectedRoute]);

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

  // Render
  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Loading location...</Text>
      </View>
    );
  }

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
              recentLocations={recentLocations}
              savedLocations={savedLocations}
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
          <TouchableOpacity onPress={fetchRoutes} style={styles.getRouteButton}>
            <Text style={styles.buttonText}>Get Routes</Text>
          </TouchableOpacity>

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

              {selectedRoute && destination && (
                <>
                  <View style={styles.summaryRow}>
                    <MaterialIcons name="place" size={20} color="#e74c3c" />
                    <Text style={styles.summaryText} numberOfLines={2}>{destination.address}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <MaterialIcons name="directions-car" size={20} color="#3498db" />
                    <Text style={styles.summaryText}>{(selectedRoute.distance / 1000).toFixed(2)} km</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
                    <Text style={styles.summaryText}>{selectedRoute.fuelEstimate.toFixed(2)} L</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <MaterialIcons name="schedule" size={20} color="#9b59b6" />
                    <Text style={styles.summaryText}>{formatETA(selectedRoute.duration)}</Text>
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
    bottom: 20,
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
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