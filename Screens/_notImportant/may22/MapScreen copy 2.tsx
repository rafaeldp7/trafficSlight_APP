import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  DrawerLayoutAndroid,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  ScrollView,
  Button,
  Animated,
  Modal,
  Alert,
} from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from " ";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import * as Location from "expo-location";
import * as Speech from "expo-speech";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Easing } from "react-native";
import "react-native-get-random-values";
import { GOOGLE_MAPS_API_KEY } from "@env";
import CustomMapViewComponent from "../MapScreen/customMapView";
import RouteDetailsDrawer from "../MapScreen/RouteDetailsView";
import TripSummaryModal from "../MapScreen/tripSummary";
import MenuButton from "../MapScreen/menuButton";


// Helper: Decode polyline from Google Directions API (basic implementation)
const decodePolyline = (str, precision = 5) => {
  let index = 0,
    lat = 0,
    lng = 0,
    coordinates = [],
    factor = Math.pow(10, precision);
  while (index < str.length) {
    let shift = 0, result = 0, byte = null;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : (result >> 1);
    lat += deltaLat;
    shift = 0;
    result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : (result >> 1);
    lng += deltaLng;
    coordinates.push({ latitude: lat / factor, longitude: lng / factor });
  }
  return coordinates;
};

// Helper: Compute total distance (in km) from an array of coordinates, using getDistance helper.
const computeDistanceFromCoordinates = (coords, getDistance) => {
  if (!coords || coords.length < 2) return 0;
  let totalDistance = 0;
  for (let i = 1; i < coords.length; i++) {
    totalDistance += getDistance(coords[i - 1], coords[i]);
  }
  return totalDistance / 1000;
};

const ToggleMapStyleButton = ({ mapStyle, toggle }) => (
  <TouchableOpacity style={styles.styleToggle} onPress={toggle} accessible accessibilityLabel="Toggle map style">
    <MaterialIcons name={mapStyle === "standard" ? "wb-sunny" : "nightlight-round"} size={30} color="yellow" />
  </TouchableOpacity>
);

const SaveToFavoritesButton = ({ onSave }) => (
  <TouchableOpacity onPress={onSave} style={styles.saveButton} accessible accessibilityLabel="Save destination to favorites">
    <Text style={styles.saveButtonText}>⭐ Save to Favorites</Text>
  </TouchableOpacity>
);

const GetRouteButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.getRouteButton} accessible accessibilityLabel="Get Route">
    <Text style={styles.getRouteButtonText}>Get Route</Text>
  </TouchableOpacity>
);

const FAB = ({ onPress, label }) => (
  <TouchableOpacity style={styles.fab} onPress={onPress} accessible accessibilityLabel={label}>
    <Text style={styles.fabText}>{label}</Text>
  </TouchableOpacity>
);

const MyLocationButton = ({ onPress }) => (
  <TouchableOpacity style={styles.myLocationButton} onPress={onPress} accessible accessibilityLabel="Go to my location">
    <MaterialIcons name="my-location" size={28} color="#fff" />
  </TouchableOpacity>
);



const goToMyLocation = (mapRef, currentLocation) => {
  if (mapRef && mapRef.current && currentLocation) {
    mapRef.current.animateToRegion(
      {
        ...currentLocation,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      },
      1000
    );
  }
};

const RouteSelectionScreen = ({ navigation }) => {
  const [region, setRegion] = useState({
    latitude: 14.7006,
    longitude: 120.9836,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [destination, setDestination] = useState(null);
  const [route, setRoute] = useState(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState([]);
  const [selectedAlternativeIndex, setSelectedAlternativeIndex] = useState(null);
  const [sortingCriteria, setSortingCriteria] = useState("shortest_distance");
  const [isDrawerOpen, setDrawerOpen] = useState(false);
  const [isRouteDetailsVisible, setRouteDetailsVisible] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedTab, setSelectedTab] = useState("details");
  const [mapStyle, setMapStyle] = useState("standard");
  const [searchText, setSearchText] = useState("");
  const [recentLocations, setRecentLocations] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fuelConsumptionRate, setFuelConsumptionRate] = useState(12);
  const [estimatedFuelUsage, setEstimatedFuelUsage] = useState(null);
  const [showTooltip, setShowTooltip] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [tripSummary, setTripSummary] = useState(null);
  const [watcher, setWatcher] = useState(null);
  const [session, setSession] = useState(false);
  const mapRef = useRef(null);
  const searchRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(10)).current;
  const drawer = useRef<DrawerLayoutAndroid>(null);
  const [drawerPosition, setDrawerPosition] = useState("left");

  // Set current location as origin on mount
  const getCurrentLocation = async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        setIsLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const userLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(userLocation);
      setRegion({
        ...userLocation,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      });
      mapRef.current?.animateToRegion(
        { ...userLocation, latitudeDelta: 0.0015, longitudeDelta: 0.0015 },
        1000
      );
      setIsLoading(false);
    } catch (error) {
      alert("Error getting current location.");
      setIsLoading(false);
    }
  };

  // Navigation Tracking: Check if user deviates from the route.
  const getDistance = useMemo(() => (coord1, coord2) => {
    const rad = Math.PI / 180;
    const lat1 = coord1.latitude * rad;
    const lat2 = coord2.latitude * rad;
    const deltaLat = (coord2.latitude - coord1.latitude) * rad;
    const deltaLng = (coord2.longitude - coord1.longitude) * rad;
    const a =
      Math.sin(deltaLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return 6371000 * c;
  }, []);

const startTracking = async () => {
  try {
    const locWatcher = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.High, distanceInterval: 10 },
      (loc) => {
        const newLocation = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        };
        setCurrentLocation(newLocation);

        // Check deviation from route
        if (destination && route && route.legs && route.legs[0]?.steps) {
          const steps = route.legs[0].steps;
          const closestStep = steps.reduce((prev, curr) => {
            const prevDistance = getDistance(newLocation, {
              latitude: prev.end_location.lat,
              longitude: prev.end_location.lng,
            });
            const currDistance = getDistance(newLocation, {
              latitude: curr.end_location.lat,
              longitude: curr.end_location.lng,
            });
            return currDistance < prevDistance ? curr : prev;
          });
          const closestPoint = {
            latitude: closestStep.end_location.lat,
            longitude: closestStep.end_location.lng,
          };
          const deviation = getDistance(newLocation, closestPoint);
          console.log("Deviation from route (meters):", deviation);

          if (deviation > 100) {
            Alert.alert("Off Route", "You have deviated from the route. Recalculating...");
            Speech.speak("You have deviated from the route. Recalculating your route.");

            const updatedRoute = {
              origin: newLocation,
              destination: destination
            };

            setRoute(updatedRoute);

            // Optional: update map region to center between new origin and destination
            setRegion({
              latitude: (newLocation.latitude + destination.latitude) / 2,
              longitude: (newLocation.longitude + destination.longitude) / 2,
              latitudeDelta: Math.abs(newLocation.latitude - destination.latitude) + 0.01,
              longitudeDelta: Math.abs(newLocation.longitude - destination.longitude) + 0.01,
            });
          }
        }
      }
    );
    setWatcher(locWatcher);
  } catch (error) {
    alert("Error starting tracking.");
  }
};


  const toggleMapStyle = () => setMapStyle((prev) => (prev === "standard" ? "dark" : "standard"));

  const animateSearchDrawer = (open) => {
    Animated.timing(searchBarAnim, {
      toValue: open ? 0 : 10,
      duration: 300,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();
    setDrawerOpen(open);
  };

  const getRoutes = () => {
    if (!currentLocation || !destination) return;
    setIsLoading(true);
    // For simplicity, we set the route from current location to destination.
    setRoute({ origin: currentLocation, destination });
    setRegion({
      latitude: (currentLocation.latitude + destination.latitude) / 2,
      longitude: (currentLocation.longitude + destination.longitude) / 2,
      latitudeDelta: Math.abs(currentLocation.latitude - destination.latitude) + 0.01,
      longitudeDelta: Math.abs(currentLocation.longitude - destination.longitude) + 0.01,
    });
    setIsLoading(false);
  };

  const handleRouteReady = (result) => {
    setRoute(result);
    if (result.distance && result.duration) {
      const fuelUsed = result.distance / fuelConsumptionRate;
      setEstimatedFuelUsage(fuelUsed);
      Speech.speak(
        `Your route is ${result.distance.toFixed(2)} kilometers. Estimated time: ${result.duration.toFixed(1)} minutes. Estimated fuel usage: ${fuelUsed.toFixed(2)} liters.`
      );
      result.eta = result.duration;
    }
    if (result.alternatives && result.alternatives.length) {
      setAlternativeRoutes(result.alternatives);
      setSelectedAlternativeIndex(0);
    }
  };

  const handleSortingChange = (criteria) => {
    setSortingCriteria(criteria);
    const sorted = [...alternativeRoutes].sort((a, b) => {
      switch (criteria) {
        case "shortest_distance":
          return a.distance - b.distance;
        case "lowest_gas_consumption":
          return a.distance / fuelConsumptionRate - b.distance / fuelConsumptionRate;
        default:
          return 0;
      }
    });
    setAlternativeRoutes(sorted);
  };





  const startNavigation = () => {
    Speech.speak("Navigation started. Follow the route.");
    setRouteDetailsVisible(false);
    setDrawerOpen(false);
    startTracking();
  };


  // Get current location on mount; origin is current location
  useEffect(() => {
    getCurrentLocation();
  }, []);

  const navigationView = () => (
    <View style={[styles.container, styles.navigationContainer]}>
      <Text style={styles.paragraph}>I'm in the Drawer!</Text>
      <MenuButton onPress={() => drawer.current?.closeDrawer()} />
      <ToggleMapStyleButton mapStyle={mapStyle} toggle={toggleMapStyle} />
    </View>
  );

  async function saveToSaved(destination: any) {
    try {
      // Load existing saved locations from AsyncStorage
      const saved = await AsyncStorage.getItem("savedLocations");
      let savedArr = saved ? JSON.parse(saved) : [];

      // Avoid duplicates (by lat/lng)
      const exists = savedArr.some(
        (loc: any) =>
          loc.latitude === destination.latitude &&
          loc.longitude === destination.longitude
      );
      if (exists) {
        Alert.alert("Already Saved", "This destination is already in your favorites.");
        return;
      }

      // Add new destination and save back to AsyncStorage
      savedArr.push(destination);
      await AsyncStorage.setItem("savedLocations", JSON.stringify(savedArr));
      setSavedLocations(savedArr);
      Alert.alert("Saved", "Destination added to favorites!");
    } catch (error) {
      Alert.alert("Error", "Failed to save destination.");
    }
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >

          <TripSummaryModal
            visible={showSummary}
            tripSummary={tripSummary}
            onClose={() => setShowSummary(false)}
          />
          <MenuButton onPress={() => drawer.current?.openDrawer()} />

          <CustomMapViewComponent
            mapRef={mapRef}
            region={region}
            mapStyle={mapStyle}
            currentLocation={currentLocation}
            destination={destination}
            route={route}
            selectedTab={selectedTab}
            selectedAlternativeIndex={selectedAlternativeIndex}
            alternativeRoutes={alternativeRoutes}
            onRouteReady={handleRouteReady}
          />
          {isLoading && <ActivityIndicator size="large" color="#3498db" style={styles.loadingContainer} />}
          

          {destination && (
            <SaveToFavoritesButton onSave={() => saveToSaved(destination)} />
          )}
          {destination && !isRouteDetailsVisible && (
            <GetRouteButton
              onPress={() => {
                getRoutes();
                setRouteDetailsVisible(true);
              }}
            />
          )}
          {isRouteDetailsVisible && (
            <RouteDetailsDrawer
              selectedTab={selectedTab}
              setSelectedTab={setSelectedTab}
              alternativeRoutes={alternativeRoutes}
              selectedAlternativeIndex={selectedAlternativeIndex}
              setSelectedAlternativeIndex={setSelectedAlternativeIndex}
              sortingCriteria={sortingCriteria}
              handleSortingChange={handleSortingChange}
              estimatedFuelUsage={estimatedFuelUsage}
              startNavigation={startNavigation}
              destination={destination}
              getDistance={getDistance}
              setRouteDetailsVisible={setRouteDetailsVisible}
              computeDistanceFromCoordinates={computeDistanceFromCoordinates}
              styles={styles}
            />
          )}

          <FAB onPress={() => { navigation.navigate("MapScreen"); }} label="Where to?" />
          <MyLocationButton onPress={() => goToMyLocation(mapRef, currentLocation)} />

      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default RouteSelectionScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  navigationContainer: {
    backgroundColor: "#ecf0f1",
    zIndex: 1000,
    padding: 20,
  },
  paragraph: {
    padding: 16,
    fontSize: 15,
    textAlign: "center",
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 10,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
    zIndex: 100,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#3498db",
    padding: 10,
    marginTop: 10,
    borderRadius: 5,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
  },
  tooltip: {
    position: "absolute",
    top: 150,
    left: 20,
    right: 20,
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    zIndex: 100,
  },
  tooltipText: {
    fontSize: 16,
  },
  tooltipDismiss: {
    color: "#3498db",
    marginTop: 10,
    textAlign: "right",
  },
  styleToggle: {
    position: "absolute",
    top: 40,
    right: 10,
    backgroundColor: "blue",
    padding: 4,
    borderRadius: 50,
    zIndex: 100,
  },
  styleToggleText: {
    fontSize: 14,
  },
  saveButton: {
    position: "absolute",
    bottom: 140,
    left: 20,
    backgroundColor: "#f1c40f",
    padding: 10,
    borderRadius: 5,
    zIndex: 100,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  getRouteButton: {
    position: "absolute",
    bottom: 140,
    right: 20,
    left: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
    zIndex: 100,
  },
  getRouteButtonText: {
    color: "#fff",
    fontSize: 14,
  },
  routeDetailsDrawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 15,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    zIndex: 100,
  },
  drawerTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 10,
  },
  drawerTabText: {
    fontSize: 16,
    color: "#888",
  },
  drawerActiveTab: {
    fontWeight: "bold",
    color: "#3498db",
  },
  sortingContainer: {
    flexDirection: "row",
    marginBottom: 10,
  },
  sortButton: {
    padding: 8,
    marginRight: 5,
    backgroundColor: "#eee",
    borderRadius: 5,
  },
  sortButtonActive: {
    backgroundColor: "#3498db",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#000",
  },
  drawerContent: {
    maxHeight: 150,
  },
  goButton: {
    backgroundColor: "#2ecc71",
    padding: 12,
    borderRadius: 5,
    marginTop: 10,
    alignItems: "center",
  },
  goButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  drawer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    padding: 15,
    zIndex: 200,
  },
  clearButton: {
    position: "absolute",
    top: 15,
    right: 15,
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginVertical: 10,
  },
  tabText: {
    fontSize: 16,
    color: "#888",
  },
  activeTab: {
    fontWeight: "bold",
    color: "#3498db",
  },
  tabContent: {
    maxHeight: 100,
  },
  closeButton: {
    alignSelf: "center",
    marginTop: 10,
  },
  closeButtonText: {
    fontSize: 16,
    color: "#3498db",
  },
  fab: {
    position: "absolute",
    top: 100,
    width: "95%",
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 10,
    zIndex: 30,
    alignSelf: "center",
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 5,
  },
  myLocationButton: {
    position: "absolute",
    top: 200,
    right: 10,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 30,
    zIndex: 300,
  },
});
