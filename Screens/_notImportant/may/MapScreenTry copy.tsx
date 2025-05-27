import React, { useState, useRef, useEffect, memo } from "react";
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
import MapViewDirections from " ";
import * as Location from "expo-location";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
import { useUser } from "../../../AuthContext/UserContext";

// ----------------------------------------------------------------
// Constants & Helpers
// ----------------------------------------------------------------
const FUEL_EFFICIENCY = 50; // km per liter
const DEFAULT_TRAFFIC_RATE = 1;

// state:




const formatETA = (duration: number): string => {
  const eta = new Date(Date.now() + duration * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------
type RouteData = {
  id: string;
  distance: number; // meters
  duration: number; // seconds
  fuelEstimate: number; // liters
  trafficRate: number;
  coordinates: { latitude: number; longitude: number }[];
};

type TripSummary = {
  userId: string;
  distance: string;
  fuelUsed: string;
  timeArrived: string;
  eta: string;
  destination: string;
};

// ----------------------------------------------------------------
// RouteDetailsBottomSheet Component
// ----------------------------------------------------------------
type RouteDetailsBottomSheetProps = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedAlternativeId: string | null;
  onSelectAlternative: (routeId: string) => void;
};


const RouteDetailsBottomSheet = ({
  visible,
  bestRoute,
  alternatives,
  onClose,
  selectedAlternativeId,
  onSelectAlternative,
}: RouteDetailsBottomSheetProps) => {
  const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">(
    "distance"
  );
  const [sortedAlternatives, setSortedAlternatives] = useState<RouteData[]>(alternatives);

  useEffect(() => {
    const sorted = [...alternatives].sort((a, b) => {
      if (sortCriteria === "fuel") {
        return a.fuelEstimate - b.fuelEstimate;
      } else if (sortCriteria === "traffic") {
        return a.trafficRate - b.trafficRate;
      } else {
        return a.distance - b.distance;
      }
    });
    setSortedAlternatives(sorted);
  }, [sortCriteria, alternatives]);

  if (!visible) return null;

  return (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Route Details</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>
      <ScrollView>
        {bestRoute && (
          <View style={styles.summaryContainer}
          >
            <TouchableOpacity
              onPress={() => onSelectAlternative(bestRoute.id)}
              style={[styles.routeItem, bestRoute.id === selectedAlternativeId && styles.activeRouteItem]}
            >


            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <Text style={{ fontSize: 25, fontWeight:"bold"}}>
              Fuel Estimate: {(bestRoute.fuelEstimate * 0.9).toFixed(2)} -{" "}
              {(bestRoute.fuelEstimate * 1.1).toFixed(2)} L
            </Text>

            <Text>Distance: {(bestRoute.distance / 1000).toFixed(2)} km</Text>
            <Text>ETA: {formatETA(bestRoute.duration)}</Text>

            <Text>Traffic Rate: {bestRoute.trafficRate}</Text>
            </TouchableOpacity>
          </View>
        )}
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
              <Text style={styles.sortButtonText}>{criteria.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.alternativesContainer}>
          <Text style={styles.sectionTitle}>Alternative Routes</Text>
          {sortedAlternatives.map((routeItem) => (
            <TouchableOpacity key={routeItem.id} 
            onPress={() => onSelectAlternative(routeItem.id)}
            style={[styles.routeItem, routeItem.id === selectedAlternativeId && styles.activeRouteItem]}
            
            >
              <Text style={{fontWeight:"bold", fontSize:18}}>
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
};

// ----------------------------------------------------------------
// SearchBar Component
// ----------------------------------------------------------------

type SearchBarProps = {
  searchRef: React.RefObject<typeof GooglePlacesAutocomplete>;
  searchText: string;
  setSearchText: (value: string) => void;
  isTyping: boolean;
  setIsTyping: (value: boolean) => void;
  setDestination: (
    destination: { latitude: number; longitude: number; address?: string } | null
  ) => void;
  animateToRegion: (region: any) => void;
  saveToRecent: (location: any) => void;
  recentLocations: any[];
  savedLocations: any[];
};

const SearchBar = ({
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
  const [activeTab, setActiveTab] = useState("Recent");
  const [suggestions, setSuggestions] = useState<
    { address: string; latitude: number; longitude: number }[]
  >([]);

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

  const handlePlaceSelect = (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setDestination(place);
    animateToRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    });
  };

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
            setDestination(newDestination);
            animateToRegion({
              latitude: newDestination.latitude,
              longitude: newDestination.longitude,
              latitudeDelta: 0.001,
              longitudeDelta: 0.001,
            });
            saveToRecent(newDestination);
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
            {["Recent", "Saved"].map((tab) => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTab]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.tabContent}>
            {(activeTab === "Recent" ? recentLocations : savedLocations).map(
              (place, index) =>
                place?.address && (
                  <TouchableOpacity key={index} onPress={() => handlePlaceSelect(place)}>
                    <Text>{place.address}</Text>
                  </TouchableOpacity>
                )
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

// ----------------------------------------------------------------
// CustomMapView Component (memoized)
// ----------------------------------------------------------------
type CustomMapViewProps = {
  mapRef: React.RefObject<MapView>;
  region: any;
  mapStyle: string;
  currentLocation: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number; address?: string } | null;
  route: RouteData | null;
  selectedTab: string;
  selectedAlternativeIndex: number | null;
  alternativeRoutes: RouteData[];
  onRouteReady: (result: any, routeData: RouteData, alternatives: RouteData[]) => void;
};

const CustomMapView = memo(
  ({
    mapRef,
    region,
    mapStyle,
    currentLocation,
    destination,
    route,
    selectedTab,
    selectedAlternativeIndex,
    alternativeRoutes,
    onRouteReady,
  }: CustomMapViewProps) => (
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
      {route && (
        <Polyline
          coordinates={route.coordinates}
          strokeColor="#3498db"
          strokeWidth={6}
        />
      )}

      {/* ONLY the best route: no more `result.alternatives` here */}
      {route && selectedTab === "details" && destination && (
        <MapViewDirections
          origin={currentLocation!}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={9}
          strokeColor="#3498db"
          optimizeWaypoints
          mode="DRIVING"
          onReady={(result) => {
            const bestRoute: RouteData = {
              id: "best",
              distance: result.distance * 1000,
              duration: result.duration * 60,
              fuelEstimate: result.distance / FUEL_EFFICIENCY,
              trafficRate: DEFAULT_TRAFFIC_RATE,
              coordinates: result.coordinates,
            };
            // ← FIXED: we no longer expect `result.alternatives`
            const alternatives: RouteData[] = [];
            onRouteReady(result, bestRoute, alternatives);
          }}
        />
      )}

      {/* Highlight a selected alternative from your own `alternativeRoutes` prop */}
      {selectedAlternativeIndex !== null && alternativeRoutes[selectedAlternativeIndex] && (
        <Polyline 
        coordinates={alternativeRoutes[selectedAlternativeIndex].coordinates}
        strokeColor="#e74c3c"
        strokeWidth={9}
        />
      )}

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
      {destination && (
        <Marker
          coordinate={destination}
          title="Destination"
          description={destination?.address}
        >
          <Image
            source={require("../assets/icons/checkered-flag.jpg")}
            style={styles.markerImage}
            resizeMode="contain"
          />
        </Marker>
      )}
    </MapView>
  )
);

// ----------------------------------------------------------------
// Main Screen Component (MapScreenTry)
// ----------------------------------------------------------------
export default function MapScreenTry({ navigation }: { navigation: any }) {
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<GooglePlacesAutocomplete>(null);
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recentLocations, setRecentLocations] = useState<any[]>([]);
  const [savedLocations] = useState<any[]>([]);
  const [destination, setDestination] = useState<{
    latitude: number;
    longitude: number;
    address?: string;
  } | null>(null);
  const [region, setRegionState] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState("light");
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
  const [selectedTab, setSelectedTab] = useState("alternatives");

  const [modalVisible, setModalVisible] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);
  const { user } = useUser();
  // const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState<number | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  const [selectedAlternativeId, setSelectedAlternativeId] = useState<string | null>(null);
  
// when you fetch new routes, reset the selection:
  const resetRoute = (bestRoute: RouteData, alts: RouteData[]) => {
    setRoute(bestRoute);
    setTripSummary(bestRoute);
    setAlternativeRoutes(alts);
    setSelectedAlternativeIndex(null);
    setShowBottomSheet(true);
  };


  if (!user) {
    return (
      <View style={plainStyles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={plainStyles.loadingText}>Loading user data...</Text>
      </View>
    );
  }
    // ----------------------------------------------------------------
  // Calculate distance (in meters) between two coordinates.
  const calcDistance = (
    loc1: { latitude: number; longitude: number },
    loc2: { latitude: number; longitude: number }
  ) => {
    const dx = loc1.latitude - loc2.latitude;
    const dy = loc1.longitude - loc2.longitude;
    return Math.sqrt(dx * dx + dy * dy) * 111139;
  };

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  const animateToRegion = (newRegion: any) => {
    mapRef.current?.animateToRegion(newRegion, 1000);
  };

  const saveToRecent = (loc: any) => {
    setRecentLocations((prev) => [loc, ...prev].slice(0, 10));
  };

  const saveTripSummaryToBackend = async (summary: TripSummary) => {
    try {
      const resp = await fetch(`${LOCALHOST_IP}/api/gas-sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(summary),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.message || "Failed");
      console.log("Saved:", json);
    } catch (err) {
      console.error("Error saving trip:", err);
    }
  };

  // ----------------------------------------------------------------
  // Effects (always in same order)
  // ----------------------------------------------------------------
  // 1. Location tracking
  useEffect(() => {
    let sub: any;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied");
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
      setRegionState(initReg);
      animateToRegion(initReg);
      setIsLoading(false);
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

  // 2. Close modal when destination set
  useEffect(() => {
    if (destination) {
      setModalVisible(false);
    }
  }, [destination]);

  // 3. Navigation watcher
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNavigating && currentLocation && destination && tripSummary && user) {
      timer = setInterval(() => {
        const d = calcDistance(currentLocation, destination);
        if (d < 30) {
          setIsNavigating(false);
          setTripSummaryModalVisible(true);
          saveTripSummaryToBackend({
            userId: user.id,
            distance: `${tripSummary.distance.toFixed(2)} m`,
            fuelUsed: `${tripSummary.fuelEstimate.toFixed(2)} L`,
            timeArrived: new Date().toISOString(),
            eta: `${tripSummary.duration.toFixed(2)} min`,
            destination: destination.address || "Unknown",
          });
        }
      }, 5000);
    }
    return () => clearInterval(timer);
  }, [isNavigating, currentLocation, destination, tripSummary, user]);

  // ----------------------------------------------------------------
  // Fetch routes & build at least 4 without OOB indexing
  // ----------------------------------------------------------------
  const fetchRoutes = async () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await res.json();
      const raw = (data.routes || [])
        .filter(
          (r: any) =>
            r.legs?.length &&
            r.legs[0].distance?.value != null &&
            r.overview_polyline?.points
        )
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

      // clone last until 4
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

      // build RouteData
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
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
      setRoute(bestRoute);
      setTripSummary(bestRoute);
      setAlternativeRoutes(alts);
      setShowBottomSheet(true);
    } catch (err) {
      console.error("Error fetching routes:", err);
      Alert.alert("Unable to fetch routes");
    } finally {
      setIsLoading(false);
    }
  };

  // reroute & navigation controls
  const handleReroute = () => {
    if (currentLocation) {
      animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      });
      setRoute(null);
    }
  };
  const startNavigation = () => {
    if (selectedRoute) {
      setIsNavigating(true);
      setTripSummary(selectedRoute);
    }
  };
  
  const stopNavigation = () => setIsNavigating(false);

  // ----------------------------------------------------------------
  // Early returns (after all hooks)
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
          <TouchableOpacity onPress={() => setModalVisible(false)} style={plainStyles.modalCloseButton}>
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
                route={selectedRoute}
                selectedTab={selectedTab}
                selectedAlternativeIndex={selectedAlternativeIndex}
                alternativeRoutes={alternativeRoutes}
                onRouteReady={(result, bestRoute, alternatives) => {
                  setRoute(bestRoute);
                  setTripSummary(bestRoute);
                  setAlternativeRoutes(alternatives);
                  setShowBottomSheet(true);
                }}
              />
            </View>
          </View>
          <TouchableOpacity onPress={fetchRoutes} style={styles.getrouteButton}>
            <Text style={styles.rerouteText}>Get Route</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReroute} style={styles.rerouteButton}>
            <Text style={styles.rerouteText}>Reroute</Text>
          </TouchableOpacity>
          {selectedRoute && !isNavigating && (
            <TouchableOpacity onPress={startNavigation} style={styles.getrouteButton}>
              <Text style={styles.rerouteText}>Start Navigation</Text>
            </TouchableOpacity>
          )}
          {isNavigating && (
            <TouchableOpacity onPress={stopNavigation} style={styles.getrouteButton}>
              <Text style={styles.rerouteText}>Stop Navigation</Text>
            </TouchableOpacity>
          )}
        </View>

        <RouteDetailsBottomSheet
          visible={showBottomSheet}
          bestRoute={tripSummary}
          alternatives={alternativeRoutes}
          onClose={() => setShowBottomSheet(false)}
          selectedAlternativeId={selectedRoute?.id ?? null}

          onSelectAlternative={(routeId) => {
            if (tripSummary?.id === routeId) {
              setSelectedRoute(tripSummary); // user picked the best route
            } else {
              const selected = alternatives.find((r) => r.id === routeId);
              if (selected) setSelectedRoute(selected);
            }
          }}
          
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
              {tripSummary && (
                <>
                  <Text>Distance: {(tripSummary.distance / 1000).toFixed(2)} km</Text>
                  <Text>ETA: {formatETA(tripSummary.duration)}</Text>
                  <Text>
                    Gas Consumed: {((tripSummary.distance / 1000) / FUEL_EFFICIENCY).toFixed(2)} L
                  </Text>
                  <Text>Time Arrived: {formatETA(tripSummary.duration)}</Text>
                </>
              )}
              <TouchableOpacity
                onPress={() => navigation.goBack()}
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
  modalCloseButton: { display: "none", alignSelf: "center", marginTop: 20, backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  modalCloseText: { color: "#fff", fontSize: 16 },
  mapContainer: { flex: 1, position: "relative" },
  mapInnerContainer: { height: "100%", backgroundColor: "#ccc", borderRadius: 10, overflow: "hidden" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
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
  suggestionsContainer: { maxHeight: 150, backgroundColor: "#fff", elevation: 5, marginTop: 5 },
  suggestionItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tabsContainer: { flexDirection: "row", justifyContent: "space-around", marginTop: 60 },
  tabText: { fontSize: 16, color: "#666" },
  activeTab: { color: "#000", fontWeight: "bold", textDecorationLine: "underline" },
  tabContent: { marginTop: 10 },
  rerouteButton: { position: "absolute", bottom: 100, right: 20, backgroundColor: "#3498db", padding: 12, borderRadius: 30, elevation: 5, display: "none" },
  rerouteText: { color: "#fff", fontSize: 16 },
  getrouteButton: { position: "absolute", top: 60, right: 20, left: 20, backgroundColor: "#3498db", padding: 12, borderRadius: 30, elevation: 5 },
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: Dimensions.get("window").height * 0.25,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
    padding: 16,
  },
  bottomSheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  bottomSheetTitle: { fontSize: 18, fontWeight: "bold" },
  summaryContainer: { marginBottom: 16 },
  summaryTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  sortOptionsContainer: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
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
  navigationOverlay: { position: "absolute", top: 125, left: 20, right: 20, backgroundColor: "rgba(0, 0, 0, 0.6)", padding: 12, borderRadius: 8, alignItems: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  tripSummaryContainer: { width: "80%", backgroundColor: "#fff", padding: 20, borderRadius: 10, alignItems: "center" },
  tripSummaryTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  closeSummaryButton: { marginTop: 20, backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  closeSummaryText: { color: "#fff", fontSize: 16 },
  markerContainer: { alignItems: "center" },
  markerImage: { width: 40, height: 40 },
  
});
