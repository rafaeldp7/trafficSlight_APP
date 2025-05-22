import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Modal,
  Pressable,
  Dimensions,
  Alert,
  StyleSheet,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
import { useUser } from "../../AuthContext/UserContext";

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
  distance: number; // meters
  duration: number; // seconds
  fuelEstimate: number; // liters
  trafficRate: number;
  coordinates: LocationCoords[];
};

type TripSummary = {
  userId: string;
  distance: string;
  fuelUsed: string;
  timeArrived: string;
  eta: string;
  destination: string;
};

type MapRef = React.RefObject<MapView>;
type SearchRef = React.RefObject<typeof GooglePlacesAutocomplete>;

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const FUEL_EFFICIENCY = 50; // km per liter
const DEFAULT_TRAFFIC_RATE = 1;
const ARRIVAL_THRESHOLD = 50; // meters
const MAX_RECENT_LOCATIONS = 10;

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

const calcDistance = (
  loc1: LocationCoords,
  loc2: LocationCoords
): number => {
  const dx = loc1.latitude - loc2.latitude;
  const dy = loc1.longitude - loc2.longitude;
  return Math.sqrt(dx * dx + dy * dy) * 111139; // Convert to meters
};

// ----------------------------------------------------------------
// RouteDetailsBottomSheet Component
// ----------------------------------------------------------------
type RouteDetailsBottomSheetProps = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
};

const RouteDetailsBottomSheet = React.memo(
  ({
    visible,
    bestRoute,
    alternatives,
    onClose,
    selectedRouteId,
    onSelectRoute,
  }: RouteDetailsBottomSheetProps) => {
    const [sortCriteria, setSortCriteria] = useState<
      "fuel" | "traffic" | "distance"
    >("distance");

    const sortedAlternatives = useMemo(() => {
      return [...alternatives].sort((a, b) => {
        if (sortCriteria === "fuel") {
          return a.fuelEstimate - b.fuelEstimate;
        } else if (sortCriteria === "traffic") {
          return a.trafficRate - b.trafficRate;
        } else {
          return a.distance - b.distance;
        }
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
              style={[
                styles.routeItem,
                bestRoute.id === selectedRouteId && styles.activeRouteItem,
              ]}
            >
              <Text style={styles.summaryTitle}>Recommended Route</Text>
              <Text style={{ fontSize: 25, fontWeight: "bold" }}>
                Fuel Estimate: {(bestRoute.fuelEstimate * 0.9).toFixed(2)} -{" "}
                {(bestRoute.fuelEstimate * 1.1).toFixed(2)} L
              </Text>
              <Text>Distance: {(bestRoute.distance / 1000).toFixed(2)} km</Text>
              <Text>ETA: {formatETA(bestRoute.duration)}</Text>
              <Text>Traffic Rate: {bestRoute.trafficRate}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.sortOptionsContainer}>
            <Text style={styles.sectionTitle}>Sort Alternatives By:</Text>
            {["fuel", "traffic", "distance"].map((criteria) => (
              <TouchableOpacity
                key={criteria}
                style={[
                  styles.sortButton,
                  sortCriteria === criteria && styles.activeSortButton,
                ]}
                onPress={() =>
                  setSortCriteria(criteria as "fuel" | "traffic" | "distance")
                }
              >
                <Text style={styles.sortButtonText}>
                  {criteria.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.alternativesContainer}>
            <Text style={styles.sectionTitle}>Alternative Routes</Text>
            {sortedAlternatives.map((routeItem) => (
              <TouchableOpacity
                key={routeItem.id}
                onPress={() => onSelectRoute(routeItem.id)}
                style={[
                  styles.routeItem,
                  routeItem.id === selectedRouteId && styles.activeRouteItem,
                ]}
              >
                <Text style={{ fontWeight: "bold", fontSize: 18 }}>
                  Fuel Estimate: {(routeItem.fuelEstimate * 0.9).toFixed(2)} -{" "}
                  {(routeItem.fuelEstimate * 1.1).toFixed(2)} L
                </Text>
                <Text>Distance: {(routeItem.distance / 1000).toFixed(2)} km</Text>
                <Text>ETA: {(routeItem.duration / 60).toFixed(0)} min</Text>
                <Text>Traffic Rate: {routeItem.trafficRate}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }
);

// ----------------------------------------------------------------
// SearchBar Component
// ----------------------------------------------------------------
type SearchBarProps = {
  searchRef: SearchRef;
  searchText: string;
  setSearchText: (value: string) => void;
  isTyping: boolean;
  setIsTyping: (value: boolean) => void;
  setDestination: (destination: LocationCoords | null) => void;
  animateToRegion: (region: any) => void;
  saveToRecent: (location: LocationCoords) => void;
  recentLocations: LocationCoords[];
  savedLocations: LocationCoords[];
};

const SearchBar = React.memo(
  ({
    searchRef,
    searchText,
    setSearchText,
    isTyping,
    setIsTyping,
    setDestination,
    animateToRegion,
    saveToRecent,
    recentLocations,
    savedLocations,
  }: SearchBarProps) => {
    const [activeTab, setActiveTab] = useState<"Recent" | "Saved">("Recent");
    const [suggestions, setSuggestions] = useState<LocationCoords[]>([]);

    useEffect(() => {
      if (searchText.length > 0) {
        setSuggestions([
          {
            address: `${searchText} Suggestion 1`,
            latitude: 14.5995,
            longitude: 120.9842,
          },
          {
            address: `${searchText} Suggestion 2`,
            latitude: 14.6095,
            longitude: 120.9942,
          },
        ]);
      } else {
        setSuggestions([]);
      }
    }, [searchText]);

    const handlePlaceSelect = useCallback(
      (place: LocationCoords) => {
        setDestination(place);
        animateToRegion({
          latitude: place.latitude,
          longitude: place.longitude,
          latitudeDelta: 0.001,
          longitudeDelta: 0.001,
        });
        saveToRecent(place);
      },
      [setDestination, animateToRegion, saveToRecent]
    );

    return (
      <View style={styles.searchContainer}>
        <GooglePlacesAutocomplete
          ref={searchRef}
          placeholder="Where to?"
          fetchDetails
          onPress={(data, details = null) => {
            if (details) {
              const newDestination = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                address: data.description,
              };
              handlePlaceSelect(newDestination);
              searchRef.current?.setAddressText("");
              setIsTyping(false);
            }
          }}
          onFocus={() => setIsTyping(true)}
          onBlur={() => setIsTyping(false)}
          textInputProps={{
            value: searchText,
            onChangeText: setSearchText,
            placeholderTextColor: "#888",
          }}
          query={{ key: GOOGLE_MAPS_API_KEY, language: "en" }}
          styles={{
            textInput: {
              backgroundColor: "#fff",
              borderRadius: 10,
              paddingRight: 50,
              paddingVertical: 10,
              fontSize: 16,
            },
            container: { flex: 1, marginBottom: 10 },
            listView: {
              position: "absolute",
              top: 50,
              backgroundColor: "#fff",
              width: "100%",
              zIndex: 100,
              elevation: 5,
            },
          }}
        />
        {searchText.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSearchText("");
              searchRef.current?.setAddressText("");
              setIsTyping(false);
            }}
          >
            <Text style={{ fontSize: 18, color: "#888" }}>✖</Text>
          </TouchableOpacity>
        )}
        {isTyping && suggestions.length > 0 && (
          <ScrollView style={styles.suggestionsContainer}>
            {suggestions.map((item, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => handlePlaceSelect(item)}
                style={styles.suggestionItem}
              >
                <Text>{item.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {!isTyping && (
          <>
            <View style={styles.tabsContainer}>
              {(["Recent", "Saved"] as const).map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text
                    style={[
                      styles.tabText,
                      activeTab === tab && styles.activeTab,
                    ]}
                  >
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <ScrollView style={styles.tabContent}>
              {(activeTab === "Recent" ? recentLocations : savedLocations).map(
                (place, index) =>
                  place?.address && (
                    <TouchableOpacity
                      key={index}
                      onPress={() => handlePlaceSelect(place)}
                    >
                      <Text>{place.address}</Text>
                    </TouchableOpacity>
                  )
              )}
            </ScrollView>
          </>
        )}
      </View>
    );
  }
);

// ----------------------------------------------------------------
// CustomMapView Component
// ----------------------------------------------------------------
type CustomMapViewProps = {
  mapRef: MapRef;
  region: any;
  mapStyle: string;
  currentLocation: LocationCoords | null;
  destination: LocationCoords | null;
  selectedRoute: RouteData | null;
  alternativeRoutes: RouteData[];
  onRouteReady: (
    result: any,
    bestRoute: RouteData,
    alternatives: RouteData[]
  ) => void;
};

const CustomMapView = React.memo(
  ({
    mapRef,
    region,
    mapStyle,
    currentLocation,
    destination,
    selectedRoute,
    alternativeRoutes,
    onRouteReady,
  }: CustomMapViewProps) => {
    if (!currentLocation) return null;

    return (
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        region={region}
        customMapStyle={
          mapStyle === "dark"
            ? [
                { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
              ]
            : []
        }
        showsUserLocation
        showsTraffic
        showsMyLocationButton={false}
      >
        {/* Render all alternative routes in light gray */}
        {alternativeRoutes.map((route) => (
          <Polyline
            key={route.id}
            coordinates={route.coordinates}
            strokeColor="#cccccc"
            strokeWidth={3}
          />
        ))}

        {/* Highlight the selected route in blue */}
        {selectedRoute && (
          <Polyline
            coordinates={selectedRoute.coordinates}
            strokeColor="#3498db"
            strokeWidth={6}
          />
        )}

        {/* Current location marker */}
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            title="Your Location"
            description="This is where you are."
          >
            <View style={styles.markerContainer}>
              <Image
                source={require("../assets/icons/image.png")}
                style={styles.markerImage}
                resizeMode="contain"
              />
            </View>
          </Marker>
        )}

        {/* Destination marker */}
        {destination && (
          <Marker
            coordinate={destination}
            title="Destination"
            description={destination.address}
          >
            <Image
              source={require("../assets/icons/checkered-flag.jpg")}
              style={styles.markerImage}
              resizeMode="contain"
            />
          </Marker>
        )}

        {/* Directions for the selected route */}
        {selectedRoute && destination && (
          <MapViewDirections
            origin={currentLocation}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={0} // We'll use our own Polyline for styling
            optimizeWaypoints
            mode="DRIVING"
            onReady={(result) => {
              // Update the selected route with fresh data
              const updatedRoute: RouteData = {
                ...selectedRoute,
                distance: result.distance * 1000,
                duration: result.duration * 60,
                coordinates: result.coordinates,
              };
              onRouteReady(result, updatedRoute, alternativeRoutes);
            }}
          />
        )}
      </MapView>
    );
  }
);

// ----------------------------------------------------------------
// Main Screen Component
// ----------------------------------------------------------------
export default function MapScreenTry({ navigation }: { navigation: any }) {
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<GooglePlacesAutocomplete>(null);
  const { user } = useUser();

  // State
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [recentLocations, setRecentLocations] = useState<LocationCoords[]>([]);
  const [savedLocations] = useState<LocationCoords[]>([]);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [region, setRegion] = useState<any>(null);
  const [mapStyle] = useState("light");
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(
    null
  );
  const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);

  // Driving state
  const [isFollowingUser, setIsFollowingUser] = useState(false);

  // Derived state
  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    if (tripSummary?.id === selectedRouteId) return tripSummary;
    return alternativeRoutes.find((r) => r.id === selectedRouteId) || null;
  }, [selectedRouteId, tripSummary, alternativeRoutes]);

  // ----------------------------------------------------------------
  // Helper Functions
  // ----------------------------------------------------------------
  const animateToRegion = useCallback((newRegion: any) => {
    mapRef.current?.animateToRegion(newRegion, 1000);
  }, []);

  const saveToRecent = useCallback((loc: LocationCoords) => {
    setRecentLocations((prev) => [loc, ...prev].slice(0, MAX_RECENT_LOCATIONS));
  }, []);

  const saveTripSummaryToBackend = useCallback(
    async (summary: TripSummary) => {
      try {
        const resp = await fetch(`${LOCALHOST_IP}/api/gas-sessions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(summary),
        });
        const json = await resp.json();
        if (!resp.ok) throw new Error(json.message || "Failed to save trip");
        console.log("Trip saved:", json);
      } catch (err) {
        console.error("Error saving trip:", err);
        Alert.alert("Error", "Failed to save trip summary");
      }
    },
    []
  );

  // ----------------------------------------------------------------
  // Effects
  // ----------------------------------------------------------------
  // 1. Location tracking
  useEffect(() => {
    let sub: Location.LocationSubscription;
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission denied", "Location access is required");
          setIsLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = loc.coords;
        const initReg = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setCurrentLocation({ latitude, longitude });
        setRegion(initReg);
        animateToRegion(initReg);
        setIsLoading(false);

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (update) => {
            setCurrentLocation({
              latitude: update.coords.latitude,
              longitude: update.coords.longitude,
            });
          }
        );
      } catch (error) {
        console.error("Location error:", error);
        setIsLoading(false);
        Alert.alert("Error", "Failed to get location");
      }
    };

    getLocation();
    return () => sub?.remove();
  }, [animateToRegion]);

  // 2. Close modal when destination set
  useEffect(() => {
    if (destination) {
      setModalVisible(false);
    }
  }, [destination]);

  // 3. Navigation watcher
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNavigating && currentLocation && selectedRoute && user) {
      timer = setInterval(() => {
        if (!selectedRoute.coordinates.length) return;

        const lastCoord = selectedRoute.coordinates[
          selectedRoute.coordinates.length - 1
        ];
        const distance = calcDistance(currentLocation, lastCoord);

        if (distance < ARRIVAL_THRESHOLD) {
          setIsNavigating(false);
          setTripSummaryModalVisible(true);
          saveTripSummaryToBackend({
            userId: user.id,
            distance: `${selectedRoute.distance.toFixed(2)} m`,
            fuelUsed: `${selectedRoute.fuelEstimate.toFixed(2)} L`,
            timeArrived: new Date().toISOString(),
            eta: `${(selectedRoute.duration / 60).toFixed(2)} min`,
            destination: destination?.address || "Unknown",
          });
        }
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [
    isNavigating,
    currentLocation,
    selectedRoute,
    user,
    destination,
    saveTripSummaryToBackend,
  ]);

  // ----------------------------------------------------------------
  // Route Handling
  // ----------------------------------------------------------------
  const fetchRoutes = useCallback(async () => {
    if (!currentLocation || !destination) return;
  
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
  
      if (data.status !== "OK") {
        throw new Error(data.error_message || "Failed to fetch routes");
      }
  
      // Process all routes (main + alternatives)
      const allRoutes = data.routes.map((r: any, i: number) => {
        const leg = r.legs[0];
        return {
          id: `route-${i}`,
          distance: leg.distance.value,
          duration: leg.duration.value,
          fuelEstimate: leg.distance.value / 1000 / FUEL_EFFICIENCY,
          trafficRate: DEFAULT_TRAFFIC_RATE,
          coordinates: polyline
            .decode(r.overview_polyline.points)
            .map(([lat, lng]: number[]) => ({ latitude: lat, longitude: lng })),
        };
      });
  
      if (allRoutes.length < 2) {
        Alert.alert("No alternatives found", "Only one route available");
      }
  
      // The first route is considered the "best" route
      const bestRoute = allRoutes[0];
      const alternatives = allRoutes.slice(1); // All others are alternatives
  
      // Ensure we have at least 3 alternatives by duplicating if needed
      while (alternatives.length < 3) {
        const lastAlt = alternatives[alternatives.length - 1];
        const newAlt = {
          ...lastAlt,
          id: `route-${alternatives.length + 1}`,
          distance: lastAlt.distance * (1 + 0.1 * alternatives.length),
          duration: lastAlt.duration * (1 + 0.1 * alternatives.length),
          fuelEstimate: lastAlt.fuelEstimate * (1 + 0.1 * alternatives.length),
        };
        alternatives.push(newAlt);
      }
  
      setTripSummary(bestRoute);
      setAlternativeRoutes(alternatives);
      setSelectedRouteId(bestRoute.id); // Default to best route
      setShowBottomSheet(true);
  
    } catch (error) {
      console.error("Route fetch error:", error);
      Alert.alert(
        "Route Error",
        error.message || "Failed to fetch routes. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }, [currentLocation, destination]);

  const handleReroute = useCallback(() => {
    if (currentLocation) {
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setTripSummary(null);
      setAlternativeRoutes([]);
      setSelectedRouteId(null);
    }
  }, [currentLocation, animateToRegion]);

  const startNavigation = useCallback(() => {
    if (selectedRoute) {
      setIsNavigating(true);
      setIsFollowingUser(true);
      // Immediately zoom to user location when starting navigation
      if (currentLocation) {
        mapRef.current?.animateToRegion({
          ...currentLocation,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }
    }
  }, [selectedRoute, currentLocation]);

  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setIsFollowingUser(false);
  }, []);

  // ----------------------------------------------------------------
  // Early returns
  // ----------------------------------------------------------------
  if (!user) {
    return (
      <View style={plainStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={plainStyles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={plainStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={plainStyles.loadingText}>Loading location...</Text>
      </View>
    );
  }

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  return (
    <SafeAreaProvider>
      <SafeAreaView style={plainStyles.safeArea}>
        <View style={plainStyles.header}>
          <TouchableOpacity
            onPress={() => {
              navigation.goBack();
              setModalVisible(false);
              setSearchText("");
            }}
            style={plainStyles.backButton}
          >
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={plainStyles.headerText}>Traffic Slight</Text>
        </View>

        {destination && (
          <Pressable onPress={() => setModalVisible(true)}>
            <Text style={plainStyles.addressText}>
              {destination.address ?? "Select Destination"}
            </Text>
          </Pressable>
        )}

        {/* Destination Modal */}
        <Modal animationType="slide" transparent={false} visible={modalVisible}>
          <View style={plainStyles.modal_Header}>
            <TouchableOpacity
              onPress={() => {
                navigation.goBack();
                setModalVisible(false);
                setSearchText("");
              }}
              style={plainStyles.modal_backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
            <Text style={plainStyles.modal_headerText}>Traffic Slight</Text>
          </View>
          <Text style={plainStyles.destinationLabel}>Destination</Text>
          <SearchBar
            searchRef={searchRef}
            searchText={searchText}
            setSearchText={setSearchText}
            isTyping={isTyping}
            setIsTyping={setIsTyping}
            setDestination={setDestination}
            animateToRegion={animateToRegion}
            saveToRecent={saveToRecent}
            recentLocations={recentLocations}
            savedLocations={savedLocations}
          />
          <TouchableOpacity
            onPress={() => setModalVisible(false)}
            style={plainStyles.modalCloseButton}
          >
            <Text style={plainStyles.modalCloseText}>Close</Text>
          </TouchableOpacity>
        </Modal>

        {/* Map Container */}
        <View style={plainStyles.screenContainer}>
          <View style={plainStyles.mapContainer}>
            <View style={plainStyles.mapInnerContainer}>
              <CustomMapView
                mapRef={mapRef}
                region={region}
                mapStyle={mapStyle}
                currentLocation={currentLocation}
                destination={destination}
                selectedRoute={selectedRoute}
                alternativeRoutes={alternativeRoutes}
                onRouteReady={(result, bestRoute, alternatives) => {
                  setTripSummary(bestRoute);
                  setAlternativeRoutes(alternatives);
                  setSelectedRouteId(bestRoute.id);
                  setShowBottomSheet(true);
                }}
              />
            </View>
          </View>

          <TouchableOpacity onPress={fetchRoutes} style={styles.getrouteButton}>
            <Text style={styles.rerouteText}>Get Route</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleReroute}
            style={styles.rerouteButton}
          >
            <Text style={styles.rerouteText}>Reroute</Text>
          </TouchableOpacity>

          {selectedRoute && !isNavigating && (
            <TouchableOpacity
              onPress={startNavigation}
              style={styles.getrouteButton}
            >
              <Text style={styles.rerouteText}>Start Navigation</Text>
            </TouchableOpacity>
          )}

          {isNavigating && (
            <View style={styles.navigationOverlay}>
              <View style={styles.navigationHeader}>
                <Text style={styles.navigationTitle}>Navigation Active</Text>
                <TouchableOpacity 
                  onPress={() => setIsFollowingUser(!isFollowingUser)}
                  style={styles.followButton}
                >
                  <MaterialIcons 
                    name={isFollowingUser ? "my-location" : "location-disabled"} 
                    size={24} 
                    color="#fff" 
                  />
                </TouchableOpacity>
              </View>
              
              <View style={styles.navigationInfo}>
                <Text style={styles.navigationText}>
                  Distance: {calcDistance(currentLocation!, destination!).toFixed(0)} m
                </Text>
                <Text style={styles.navigationText}>
                  ETA: {selectedRoute ? formatETA(selectedRoute.duration) : 'Calculating...'}
                </Text>
              </View>

              <TouchableOpacity 
                onPress={stopNavigation}
                style={styles.stopNavigationButton}
              >
                <Text style={styles.stopNavigationText}>End Navigation</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <RouteDetailsBottomSheet
          visible={showBottomSheet}
          bestRoute={tripSummary}
          alternatives={alternativeRoutes}
          onClose={() => setShowBottomSheet(false)}
          selectedRouteId={selectedRouteId}
          onSelectRoute={setSelectedRouteId}
        />

        {isNavigating && currentLocation && destination && (
          <View style={styles.navigationOverlay}>
            <Text style={{ color: "#fff", fontSize: 16 }}>
              Distance: {calcDistance(currentLocation, destination).toFixed(0)} m
            </Text>
          </View>
        )}

        <Modal
          animationType="slide"
          transparent
          visible={tripSummaryModalVisible}
          onRequestClose={() => setTripSummaryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.tripSummaryContainer}>
              <Text style={styles.tripSummaryTitle}>Trip Completed</Text>
              {selectedRoute && (
                <>
                  <Text>
                    Distance: {(selectedRoute.distance / 1000).toFixed(2)} km
                  </Text>
                  <Text>ETA: {formatETA(selectedRoute.duration)}</Text>
                  <Text>
                    Gas Consumed:{" "}
                    {((selectedRoute.distance / 1000) / FUEL_EFFICIENCY).toFixed(2)} L
                  </Text>
                  <Text>Time Arrived: {new Date().toLocaleTimeString()}</Text>
                </>
              )}
              <TouchableOpacity
                onPress={() => {
                  setTripSummaryModalVisible(false);
                  navigation.goBack();
                }}
                style={styles.closeSummaryButton}
              >
                <Text style={styles.closeSummaryText}>Close Summary</Text>
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
const plainStyles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fff" },
  screenContainer: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  backButton: { padding: 10, top: 10 },
  addressText: { fontSize: 18, fontWeight: "bold", marginLeft: 12 },
  headerText: { fontSize: 20, fontWeight: "bold", marginLeft: 12, top: 10 },
  modal_Header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  modal_backButton: { padding: 10 },
  modal_headerText: { fontSize: 20, fontWeight: "bold", marginLeft: 12 },
  destinationLabel: { fontSize: 18, fontWeight: "600", margin: 16, marginBottom: 0 },
  modalCloseButton: {
    alignSelf: "center",
    marginTop: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
  },
  modalCloseText: { color: "#fff", fontSize: 16 },
  mapContainer: { flex: 1, position: "relative" },
  mapInnerContainer: {
    height: "100%",
    backgroundColor: "#ccc",
    borderRadius: 10,
    overflow: "hidden",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: { marginTop: 16, fontSize: 16 },
});

const styles = StyleSheet.create({
  map: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: "100%",
    height: Dimensions.get("window").height,
  },
  searchContainer: { padding: 16, backgroundColor: "#fff" },
  clearButton: { position: "absolute", top: 15, right: 15, zIndex: 101 },
  suggestionsContainer: {
    maxHeight: 150,
    backgroundColor: "#fff",
    elevation: 5,
    marginTop: 5,
  },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 60,
  },
  tabText: { fontSize: 16, color: "#666" },
  activeTab: {
    color: "#000",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  tabContent: { marginTop: 10 },
  rerouteButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  rerouteText: { color: "#fff", fontSize: 16 },
  getrouteButton: {
    position: "absolute",
    top: 60,
    right: 20,
    left: 20,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: Dimensions.get("window").height * 0.5,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    padding: 16,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bottomSheetTitle: { fontSize: 18, fontWeight: "bold" },
  summaryContainer: { marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  sortOptionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 14, fontWeight: "bold", marginRight: 10 },
  sortButton: { backgroundColor: "#eee", padding: 6, marginRight: 8, borderRadius: 4 },
  activeSortButton: { backgroundColor: "#3498db" },
  sortButtonText: { fontSize: 12, color: "#000" },
  alternativesContainer: { marginTop: 10 },
  routeItem: { padding: 8, borderBottomWidth: 1, borderBottomColor: "#ccc" },
  activeRouteItem: {
    backgroundColor: "#e0f7fa",
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  navigationOverlay: {
    position: "absolute",
    top: 125,
    left: 20,
    right: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  tripSummaryContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  tripSummaryTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  closeSummaryButton: {
    marginTop: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
  },
  closeSummaryText: { color: "#fff", fontSize: 16 },
  markerContainer: { alignItems: "center" },
  markerImage: { width: 40, height: 40 },
  alternativeRoute: {
    strokeColor: "#cccccc",
    strokeWidth: 3,
  },
  selectedRoute: {
    strokeColor: "#3498db",
    strokeWidth: 6,
  },
  navigationOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(40, 40, 40, 0.9)',
    borderRadius: 15,
    padding: 15,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  navigationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  navigationTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  followButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 8,
    borderRadius: 20,
  },
  navigationInfo: {
    marginBottom: 15,
  },
  navigationText: {
    color: '#fff',
    fontSize: 16,
    marginVertical: 3,
  },
  stopNavigationButton: {
    backgroundColor: '#e74c3c',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopNavigationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});