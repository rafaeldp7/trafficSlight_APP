// import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
// import {
//   View,
//   Text,
//   TouchableOpacity,
//   ScrollView,
//   ActivityIndicator,
//   SafeAreaView,
//   Modal,
//   Pressable,
//   StyleSheet,
//   Platform,
//   Alert,
// } from "react-native";
// import MaterialIcons from "react-native-vector-icons/MaterialIcons";
// import { SafeAreaProvider } from "react-native-safe-area-context";
// import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
// import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";

// import * as Location from "expo-location";
// import * as FileSystem from "expo-file-system";
// import polyline from "@mapbox/polyline";
// import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
// import { useUser } from "../../AuthContext/UserContext";

// import SearchBar from "./SearchBar";
// import "react-native-get-random-values";



// const reverseGeocodeLocation = async (lat, lng) => {
//   try {
//     const res = await fetch(
//       `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
//     );
//     const data = await res.json();
//     return data.results[0]?.formatted_address || "Unknown";
//   } catch (err) {
//     console.error("Reverse geocoding failed", err);
//     return "Unknown";
//   }
// };

// // ----------------------------------------------------------------
// // Types
// // ----------------------------------------------------------------
// type LocationCoords = {
//   latitude: number;
//   longitude: number;
//   address?: string;
// };

// type RouteData = {
//   id: string;
//   distance: number;
//   duration: number;
//   fuelEstimate: number;
//   trafficRate: number;
//   coordinates: LocationCoords[];
//   instructions?: string[];
// };

// type TripSummary = {
//   userId: string;
//   motorId: string;
//   distance: number;         // in kilometers
//   fuelUsed: number;         // in liters
//   timeArrived: string;      // in minutes since trip start (or epoch)
//   eta: string;              // estimated time in minutes
//   destination: string;
//   startAddress?: string;
// };



// type TrafficIncident = {
//   id: string;
//   location: LocationCoords;
//   type: string;
//   severity: string;
//   description: string;
// };

// type MapRef = React.RefObject<MapView>;
// type SearchRef = React.RefObject<typeof GooglePlacesAutocomplete>;

// // ----------------------------------------------------------------
// // Constants
// // ----------------------------------------------------------------
// const DEFAULT_TRAFFIC_RATE = 1;
// const ARRIVAL_THRESHOLD = 50; // meters before declaring arrival
// const MAX_RECENT_LOCATIONS = 10;
// const OFFLINE_TILES_PATH = `${FileSystem.cacheDirectory}map_tiles/`;
// const VOICE_NAV_DELAY = 3000;


// const calculateFuelRange = (distance: number, fuelEfficiency: number) => {
//   const base = distance / fuelEfficiency;
//   return {
//     min: base * 0.9,
//     max: base * 1.1,
//     avg: base,
//   };
// };




// //calculateFuelRange(100, 20); // Example usage: 100 km distance, 20 km/L fuel efficiency

// // ----------------------------------------------------------------
// // Helper Functions
// // ----------------------------------------------------------------
// const formatETA = (duration: number): string => {
//   const eta = new Date(Date.now() + duration * 1000);
//   return eta.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// };

// const calcDistance = (loc1: LocationCoords, loc2: LocationCoords): number => {
//   const dx = loc1.latitude - loc2.latitude;
//   const dy = loc1.longitude - loc2.longitude;
//   return Math.sqrt(dx * dx + dy * dy) * 111139;
// };

// const downloadOfflineMap = async (region: any) => {
//   const zoomLevel = 12;
//   const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

//   // Create directory if it doesn't exist
//   await FileSystem.makeDirectoryAsync(OFFLINE_TILES_PATH, { intermediates: true });

//   // Simple offline map implementation - in production you'd want a more robust solution
//   console.log("Offline map data prepared for region:", region);
// };

// const isUserOffRoute = (
//   currentLoc: LocationCoords,
//   routeCoords: LocationCoords[],
//   threshold = 50
// ): boolean => {
//   return !routeCoords.some((coord) => {
//     const dx = currentLoc.latitude - coord.latitude;
//     const dy = currentLoc.longitude - coord.longitude;
//     const dist = Math.sqrt(dx * dx + dy * dy) * 111139;
//     return dist < threshold;
//   });
// };

// // fetch routes



// // ----------------------------------------------------------------
// // Components
// // ----------------------------------------------------------------
// type RouteDetailsBottomSheetProps = {
//   visible: boolean;
//   bestRoute: RouteData | null;
//   alternatives: RouteData[];
//   onClose: () => void;
//   selectedRouteId: string | null;
//   onSelectRoute: (id: string) => void;
//   selectedMotor: { name: string; fuelEfficiency: number } | null; // ✅ NEW
// };

// const getTrafficLabel = (rate: number): string => {
//   switch (rate) {
//     case 1:
//       return "Very Light";
//     case 2:
//       return "Light";
//     case 3:
//       return "Moderate";
//     case 4:
//       return "Heavy";
//     case 5:
//       return "Very Heavy";
//     default:
//       return "Unknown";
//   }
// };


// const RouteDetailsBottomSheet = React.memo(
//   ({
//     visible,
//     bestRoute,
//     alternatives,
//     onClose,
//     selectedRouteId,
//     onSelectRoute,
//     selectedMotor, // ✅ include motor prop
//   }: RouteDetailsBottomSheetProps) => {
//     const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">("distance");

//     const sortedAlternatives = useMemo(() => {
//       return [...alternatives].sort((a, b) => {
//         if (sortCriteria === "fuel") return a.fuelEstimate - b.fuelEstimate;
//         if (sortCriteria === "traffic") return a.trafficRate - b.trafficRate;
//         return a.distance - b.distance;
//       });
//     }, [sortCriteria, alternatives]);

//     const renderFuelRange = (fuelEstimate: number) => {
//       const min = fuelEstimate * 0.9;
//       const max = fuelEstimate * 1.1;
//       return `${min.toFixed(2)}–${max.toFixed(2)} L`;
//     };

//     if (!visible || !bestRoute || !selectedMotor) return null;


//     return (
//       <View style={styles.bottomSheetContainer}>
//         <View style={styles.bottomSheetHeader}>
//           <Text style={styles.bottomSheetTitle}>Route Details</Text>
//           <TouchableOpacity onPress={onClose}>
//             <MaterialIcons name="close" size={24} color="black" />
//           </TouchableOpacity>
//         </View>

//         <ScrollView>
//           <View style={styles.summaryContainer}>
//             <TouchableOpacity
//               onPress={() => onSelectRoute(bestRoute.id)}
//               style={[
//                 styles.routeItem,
//                 bestRoute.id === selectedRouteId && styles.activeRouteItem,
//               ]}
//             >
//               <Text style={styles.summaryTitle}>Recommended Route</Text>
//               <Text style={styles.routeStatBig}>
//                 ⛽ Fuel: {renderFuelRange(bestRoute.fuelEstimate)}
//               </Text>
//               <Text style={styles.routeStat}>
//                 🛵 Motor Used: <Text style={{ fontWeight: 'bold' }}>{selectedMotor.name}</Text>
//               </Text>
//               <Text style={styles.routeStat}>
//                 🔧 Fuel Efficiency: <Text style={{ fontWeight: 'bold' }}>{selectedMotor.fuelEfficiency} km/L</Text>
//               </Text>


//               <Text style={styles.routeStat}>
//                 📏 Distance: {(bestRoute.distance / 1000).toFixed(2)} km
//               </Text>
//               <Text style={styles.routeStat}>
//                 ⏱️ ETA: {formatETA(bestRoute.duration)}
//               </Text>
//               <Text style={styles.routeStat}>
//                 🚦 Traffic: {getTrafficLabel(bestRoute.trafficRate)}
//               </Text>
//             </TouchableOpacity>
//           </View>

//           <View style={styles.sortOptionsContainer}>
//             <Text style={styles.sectionTitle}>Sort Alternatives By:</Text>
//             {["fuel", "traffic", "distance"].map((criteria) => (
//               <TouchableOpacity
//                 key={criteria}
//                 style={[
//                   styles.sortButton,
//                   sortCriteria === criteria && styles.activeSortButton,
//                 ]}
//                 onPress={() => setSortCriteria(criteria as any)}
//               >
//                 <Text style={styles.sortButtonText}>{criteria.toUpperCase()}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>

//           <View style={styles.alternativesContainer}>
//             <Text style={styles.sectionTitle}>Alternative Routes</Text>
//             {sortedAlternatives.map((routeItem) => (
//               <TouchableOpacity
//                 key={routeItem.id}
//                 onPress={() => onSelectRoute(routeItem.id)}
//                 style={[
//                   styles.routeItem,
//                   routeItem.id === selectedRouteId && styles.activeRouteItem,
//                 ]}
//               >
//                 <Text style={styles.routeStatBig}>
//                   ⛽ Fuel: {renderFuelRange(routeItem.fuelEstimate)}
//                 </Text>
//                 <Text style={styles.routeStat}>
//                   📏 Distance: {(routeItem.distance / 1000).toFixed(2)} km
//                 </Text>
//                 <Text style={styles.routeStat}>
//                   ⏱️ ETA: {(routeItem.duration / 60).toFixed(0)} min
//                 </Text>
//                 <Text style={styles.routeStat}>
//                   🚦 Traffic: {getTrafficLabel(bestRoute.trafficRate)}
//                 </Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </ScrollView>
//       </View>
//     );
//   }
// );

// const calculateTotalPathDistance = (coords: LocationCoords[]) => {
//   let total = 0;
//   for (let i = 1; i < coords.length; i++) {
//     total += calcDistance(coords[i - 1], coords[i]);
//   }
//   return total / 1000; // convert to km
// };





// const TrafficIncidentMarker = ({ incident }: { incident: TrafficIncident }) => (
//   <Marker coordinate={incident.location}>
//     <View style={styles.incidentMarker}>
//       <MaterialIcons
//         name={
//           incident.type === "Accident" ? "warning" :
//             incident.type === "Hazard" ? "report-problem" :
//               incident.type === "Road Closure" ? "block" :
//                 incident.type === "Traffic Jam" ? "traffic" :
//                   incident.type === "Police" ? "local-police" :
//                     "info"
//         }
//         size={24}
//         color={incident.severity === "high" ? "#e74c3c" : "#f39c12"}
//       />

//     </View>
//   </Marker>
// );

// // ----------------------------------------------------------------
// // Main Component
// // ----------------------------------------------------------------
// export default function NavigationApp({ navigation }: { navigation: any }) {
//   // Refs
//   const mapRef = useRef<MapView>(null);
//   const searchRef = useRef<GooglePlacesAutocompleteRef>(null);
//   const voiceNavTimeout = useRef<NodeJS.Timeout>();

//   // Authenticated user context
//   const { user } = useUser();

//   // UI and State
//   const [searchText, setSearchText] = useState("");
//   const [isTyping, setIsTyping] = useState(false);
//   const [isLoading, setIsLoading] = useState(true);
//   const [modalVisible, setModalVisible] = useState(true);
//   const [showBottomSheet, setShowBottomSheet] = useState(false);
//   const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);

//   // Location, region, and navigation state
//   const [region, setRegion] = useState<any>(null);
//   const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
//   const [destination, setDestination] = useState<LocationCoords | null>(null);
//   const [isFollowingUser, setIsFollowingUser] = useState(false);
//   const [isNavigating, setIsNavigating] = useState(false);
//   const [mapStyle, setMapStyle] = useState<"light" | "dark">("light");
//   const [isOffline, setIsOffline] = useState(false);
//   const [tripStartTime, setTripStartTime] = useState<number | null>(null);

//   // const userIsOffRoute = isUserOffRoute(currentLocation, selectedRoute.coordinates, 50);


//   // Routing and trip state
//   const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
//   const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
//   const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
//   const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
//   const [wasRerouted, setWasRerouted] = useState(false);

//   // Motor selection state
//   const [motorList, setMotorList] = useState<{ _id: string; name: string; fuelEfficiency: number }[]>([]);
//   const [selectedMotor, setSelectedMotor] = useState<{ _id: string; name: string; fuelEfficiency: number } | null>(null);

//   const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
//   const [pathCoords, setPathCoords] = useState<LocationCoords[]>([]);
//   const durationInMinutes = tripStartTime ? Math.round((Date.now() - tripStartTime) / 60000) : 0;



//   // Selected route (memoized from state)
//   const selectedRoute = useMemo(() => {
//     if (!selectedRouteId) return null;
//     return tripSummary?.id === selectedRouteId
//       ? tripSummary
//       : alternativeRoutes.find((r) => r.id === selectedRouteId) || null;
//   }, [selectedRouteId, tripSummary, alternativeRoutes]);

//   // 📍 Track user's path while navigating
//   useEffect(() => {
//     if (!isNavigating) return;

//     let subscription: Location.LocationSubscription;

//     (async () => {
//       subscription = await Location.watchPositionAsync(
//         { accuracy: Location.Accuracy.High, distanceInterval: 5 },
//         (location) => {
//           const newPoint = {
//             latitude: location.coords.latitude,
//             longitude: location.coords.longitude,
//           };
//           setPathCoords((prev) => [...prev, newPoint]); // 📍 Accumulate path
//         }
//       );
//     })();

//     return () => {
//       subscription?.remove();
//     };
//   }, [isNavigating]);



//   // Voice navigation state
//   const [voiceEnabled, setVoiceEnabled] = useState(false);
//   console.log(user._id);
//   // 📍 Load user-linked motors on mount
//   useEffect(() => {
//     const fetchMotors = async () => {
//       try {
//         const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${user._id}`);
//         const data = await res.json();
//         // Ensure each motor has _id, name, and fuelEfficiency
//         setMotorList(
//           data.map((motor: any) => ({
//             _id: motor._id,
//             name: motor.name,
//             fuelEfficiency: motor.fuelEfficiency,
//           }))
//         );
//       } catch (error) {
//         console.error("Failed to fetch motors", error);
//       }
//     };
//     if (user?._id) fetchMotors();
//   }, [user]);

//   // 📡 Get current location and subscribe to updates
//   useEffect(() => {
//     let sub: Location.LocationSubscription;

//     const getLocation = async () => {
//       try {
//         const { status } = await Location.requestForegroundPermissionsAsync();
//         if (status !== "granted") {
//           Alert.alert("Permission Denied", "Location access is required for navigation.");
//           throw new Error("Permission denied");
//         }


//         const loc = await Location.getCurrentPositionAsync({});
//         const initReg = {
//           latitude: loc.coords.latitude,
//           longitude: loc.coords.longitude,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         };

//         setCurrentLocation(initReg);
//         setRegion(initReg);
//         animateToRegion(initReg);
//         downloadOfflineMap(initReg);
//         setIsLoading(false);

//         sub = await Location.watchPositionAsync(
//           { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
//           (update) => {
//             const newLocation = {
//               latitude: update.coords.latitude,
//               longitude: update.coords.longitude,
//             };
//             setCurrentLocation(newLocation);

//             if (isFollowingUser || isNavigating) {
//               animateToRegion({
//                 ...newLocation,
//                 latitudeDelta: 0.005,
//                 longitudeDelta: 0.005,
//               });
//             }
//           }
//         );
//       } catch (error) {
//         setIsLoading(false);
//         Alert.alert("Location Error", "Failed to get location");
//       }
//     };

//     getLocation();
//     return () => sub?.remove();
//   }, [isFollowingUser, isNavigating]);


//   // off-route detection and autorerouting
//   useEffect(() => {
//     if (!isNavigating || !selectedRoute || !currentLocation) return;

//     const userIsOffRoute = isUserOffRoute(currentLocation, selectedRoute.coordinates, 20);
//     if (userIsOffRoute) {
//       //Alert.alert("Rerouting", "You have deviated from the route. Fetching a new route...");
//       setWasRerouted(true);
//       console.warn("🚨 Off-route detected. Rerouting...");
//       setCurrentInstructionIndex(0);
//       fetchRoutes();
      
//       setShowBottomSheet(false);
//     }
//   }, [currentLocation, isNavigating, selectedRoute]);


//   // 🧭 Detect arrival and handle navigation cleanup
//   useEffect(() => {
//     if (!isNavigating || !selectedRoute || !currentLocation) return;

//     const lastCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
//     const distance = calcDistance(currentLocation, lastCoord);
//     if (distance < ARRIVAL_THRESHOLD) endNavigation(true);

//     return () => {
//       if (voiceNavTimeout.current) clearTimeout(voiceNavTimeout.current);
//     };
//   }, [isNavigating, currentLocation, selectedRoute]);

//   // 🚀 Animate camera to region
//   const animateToRegion = useCallback((newRegion: any) => {
//     mapRef.current?.animateToRegion(newRegion, 1000);
//   }, []);

//   const fetchTrafficReports = useCallback(async () => {
//     try {
//       const res = await fetch(`${LOCALHOST_IP}/api/reports`);
//       const data = await res.json();
//       const formatted: TrafficIncident[] = data.map((r: any) => ({
//         id: r._id,
//         location: r.location,
//         type: r.reportType,
//         severity: r.reportType.toLowerCase().includes("accident") ? "high" : "medium",
//         description: r.description,
//       }));
//       setTrafficIncidents(formatted);
//     } catch (err) {
//       console.error("⚠️ Failed to load traffic reports", err);
//     }
//   }, []);


//   // 🛣️ Fetch route and alternatives from Google Directions API
//   const fetchRoutes = useCallback(async () => {
//     if (!currentLocation || !destination) return;
//     setIsLoading(true);
//     console.log("🛰️ Fetching routes from Google Directions API...");

//     try {
//       console.log(`https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`);
//       const res = await fetch(
//         `https://maps.googleapis.com/maps/api/directions/json?origin=${currentLocation.latitude},${currentLocation.longitude}&destination=${destination.latitude},${destination.longitude}&alternatives=true&departure_time=now&traffic_model=best_guess&key=${GOOGLE_MAPS_API_KEY}`
//       );

//       const data = await res.json();
//       if (data.status !== "OK") throw new Error(data.error_message || "Failed to fetch routes");

//       const allRoutes = data.routes.map((r: any, i: number): RouteData => {
//         const leg = r.legs[0];
//         const fuel = selectedMotor ? leg.distance.value / 1000 / selectedMotor.fuelEfficiency : 0;

//         return {
//           id: `route-${i}`,
//           distance: leg.distance.value,
//           duration: leg.duration.value,
//           fuelEstimate: fuel,
//           trafficRate: Math.floor(Math.random() * 5) + 1,
//           coordinates: polyline.decode(r.overview_polyline.points).map(([lat, lng]) => ({
//             latitude: lat,
//             longitude: lng,
//           })),
//           instructions: leg.steps.map((step: any) =>
//             step.html_instructions.replace(/<[^>]*>/g, "")
//           ),
//         };
//       });

//       const alternatives = allRoutes.slice(1);
//       while (alternatives.length < 3 && alternatives.length > 0) {
//         const last = alternatives[alternatives.length - 1];
//         alternatives.push({
//           ...last,
//           id: `route-${alternatives.length + 1}`,
//           distance: last.distance * 1.1,
//           duration: last.duration * 1.1,
//           fuelEstimate: last.fuelEstimate * 1.1,
//         });
//       }

//       setTripSummary(allRoutes[0]);
//       setAlternativeRoutes(alternatives);
//       setSelectedRouteId(allRoutes[0].id);
//       setShowBottomSheet(true);
//       await fetchTrafficReports();
//     } catch (error) {
//       console.error("❌ Route Fetch Error:", error.message);
//       Alert.alert("Route Error", error.message);
//     } finally {
//       setIsLoading(false);
//     }
//   }, [currentLocation, destination, selectedMotor, fetchTrafficReports]);

// const [startAddress, setStartAddress] = useState<string>("");

// const startNavigation = useCallback(async () => {
//   if (!selectedRoute || !currentLocation) return;
//   setPathCoords([]);
//   setIsNavigating(true);
//   setIsFollowingUser(true);
//   setTripStartTime(Date.now());
  

//   // ✅ Get the start address
//   const address = await reverseGeocodeLocation(currentLocation.latitude, currentLocation.longitude);
//   setStartAddress(address);

//   animateToRegion({
//     ...currentLocation,
//     latitudeDelta: 0.005,
//     longitudeDelta: 0.005,
//   });
// }, [selectedRoute, currentLocation]);



// const endNavigation = useCallback(async (arrived: boolean = false) => {
//   setIsNavigating(false);
//   setIsFollowingUser(false);

//   if (!user || !destination || !selectedRoute || !selectedMotor || pathCoords.length < 2) {
//     console.warn("Missing data to save trip summary.");
//     return;
//   }

//   const durationInMinutes =
//     tripStartTime ? Math.round((Date.now() - tripStartTime) / 60000) : 0;

//   const actualDistance = calculateTotalPathDistance(pathCoords);

//   const estimatedFuel = calculateFuelRange(
//     selectedRoute.distance / 1000,
//     selectedMotor.fuelEfficiency
//   );

//   const actualFuel = calculateFuelRange(actualDistance, selectedMotor.fuelEfficiency);

//   const summary: TripSummary = {
//     userId: user._id,
//     motorId: selectedMotor._id,
//     distance: Number((selectedRoute.distance / 1000).toFixed(2)),
//     fuelUsed: Number(selectedRoute.fuelEstimate.toFixed(2)),
//     eta: new Date(Date.now() + selectedRoute.duration * 1000).toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     }),
//     timeArrived: new Date().toLocaleTimeString([], {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     }),
//     destination: destination.address || "Unknown",
//   };

//   await saveTripSummaryToBackend(summary, arrived, {
//     startAddress,
//     estimatedFuel,
//     actualFuel,
//     actualDistance,
//     pathCoords,
//     plannedCoords: selectedRoute.coordinates, // ✅ added this
//     wasRerouted,
//     durationInMinutes,
//   });

//   setTripSummaryModalVisible(true);
// }, [
//   user,
//   destination,
//   selectedRoute,
//   selectedMotor,
//   pathCoords,
//   tripStartTime,
//   wasRerouted,
// ]);







// const actualDistance = selectedRoute ? calculateTotalPathDistance(pathCoords) : 0;
// const estimatedFuel = selectedRoute && selectedMotor
//   ? calculateFuelRange(selectedRoute.distance / 1000, selectedMotor.fuelEfficiency)
//   : { min: 0, max: 0, avg: 0 };
// const actualFuel = selectedMotor
//   ? calculateFuelRange(actualDistance, selectedMotor.fuelEfficiency)
//   : { min: 0, max: 0, avg: 0 };



// // 💾 Save trip summary to backend
// // const saveTripSummaryToBackend = async (
// //   summary: TripSummary,
// //   arrived: boolean,
// //   extras: {
// //     startAddress?: string;
// //     estimatedFuel: { min: number; max: number };
// //     actualFuel: { min: number; max: number };
// //     actualDistance: number;
// //     pathCoords: LocationCoords[];
// //     wasRerouted: boolean;
// //     durationInMinutes: number;
// //   }
// // ) => {
// //   try {
// //     await fetch(`${LOCALHOST_IP}/api/trips/`, {
// //       method: "POST",
// //       headers: { "Content-Type": "application/json" },
// //       body: JSON.stringify({
// //         ...summary,
// //         startAddress: extras.startAddress,
// //         fuelUsedMin: extras.estimatedFuel.min,
// //         fuelUsedMax: extras.estimatedFuel.max,
// //         actualDistance: extras.actualDistance,
// //         actualFuelUsedMin: extras.actualFuel.min,
// //         actualFuelUsedMax: extras.actualFuel.max,
// //         startLocation: {
// //           lat: extras.pathCoords[0]?.latitude,
// //           lng: extras.pathCoords[0]?.longitude,
// //         },
// //         endLocation: {
// //           lat: extras.pathCoords[extras.pathCoords.length - 1]?.latitude,
// //           lng: extras.pathCoords[extras.pathCoords.length - 1]?.longitude,
// //         },
// //         plannedPolyline: polyline.encode(selectedRoute.coordinates),
// //         actualPolyline: polyline.encode(extras.pathCoords),
// //         wasRerouted: extras.wasRerouted,
// //         isSuccessful: arrived,
// //         status: arrived ? "completed" : "cancelled",
// //         durationInMinutes: extras.durationInMinutes,
// //       }),
// //     });

// //     console.log("Trip summary saved successfully");
// //   } catch (err) {
// //     console.error("Error saving trip:", err);
// //   }
// // };

// const saveTripSummaryToBackend = async (
//   summary: TripSummary,
//   arrived: boolean,
//   extras: {
//     startAddress?: string;
//     estimatedFuel: { min: number; max: number };
//     actualFuel: { min: number; max: number };
//     actualDistance: number;
//     actualFuel: { min: number; max: number };
//     pathCoords: LocationCoords[];
//     plannedCoords: LocationCoords[]; // ✅ Add this
//     wasRerouted: boolean;
//     durationInMinutes: number;
//   }
// ) => {
//   try {
//     await fetch(`${LOCALHOST_IP}/api/trips/`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         ...summary,
//         startAddress: extras.startAddress,
//         fuelUsedMin: extras.estimatedFuel.min,
//         fuelUsedMax: extras.estimatedFuel.max,
//         actualFuelUsedMin: extras.actualFuel.min,
//         actualFuelUsedMax: extras.actualFuel.max,
//         actualDistance: extras.actualDistance,
//         startLocation: {
//           lat: extras.pathCoords[0]?.latitude,
//           lng: extras.pathCoords[0]?.longitude,
//         },
//         endLocation: {
//           lat: extras.pathCoords[extras.pathCoords.length - 1]?.latitude,
//           lng: extras.pathCoords[extras.pathCoords.length - 1]?.longitude,
//         },
//         plannedPolyline: polyline.encode(extras.plannedCoords), // ✅ safer now
//         actualPolyline: polyline.encode(extras.pathCoords),
//         wasRerouted: extras.wasRerouted,
//         isSuccessful: arrived,
//         status: arrived ? "completed" : "cancelled",
//         durationInMinutes: extras.durationInMinutes,
//       }),
//     });

//     console.log("✅ Trip summary saved successfully");
//   } catch (err) {
//     console.error("🔥 Error saving trip:", err);
//   }
// };




//   // 🌐 Loading States
//   if (!user || isLoading) {
//     return (
//       <View style={styles.loadingContainer}>
//         <ActivityIndicator size="large" color="#3498db" />
//         <Text style={styles.loadingText}>
//           {!user ? "Loading user data..." : "Loading location..."}
//         </Text>
//       </View>
//     );
//   }



//   // ✅ Continue with render (map, modals, UI controls, etc.)
//   // The rest of the render JSX you've written (header, map view, modals, route sheets, etc.)
//   // remains unchanged and is already well-structured.


//   return (
//     <SafeAreaProvider>
//       <SafeAreaView style={styles.safeArea}>
//         {/* Header */}
//         <View style={styles.header}>
//           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
//             <MaterialIcons name="arrow-back" size={24} color="black" />
//           </TouchableOpacity>
//           <Text style={styles.headerText}>Traffic Slight</Text>
//           <TouchableOpacity onPress={() => setMapStyle(mapStyle === "light" ? "dark" : "light")}>
//             <MaterialIcons name={mapStyle === "light" ? "dark-mode" : "light-mode"} size={24} color="black" />
//           </TouchableOpacity>
//         </View>

//         {/* Destination Display */}
//         {destination && (
//           <Pressable onPress={() => setModalVisible(true)} style={styles.destinationHeader}>
//             <Text style={styles.destinationText} numberOfLines={1}>
//               {destination.address}
//             </Text>
//           </Pressable>
//         )}

//         {/* Search Modal */}
//         <Modal animationType="slide" visible={modalVisible}>
//           <View style={styles.modalContainer}>
//             <View style={styles.modalHeader}>
//               <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalBackButton}>
//                 <MaterialIcons name="arrow-back" size={24} color="black" />
//               </TouchableOpacity>
//               <Text style={styles.modalTitle}>Search Destination</Text>
//             </View>

//             <SearchBar
//   searchRef={searchRef}
//   searchText={searchText}
//   setSearchText={setSearchText}
//   isTyping={isTyping}
//   setIsTyping={setIsTyping}
//   setDestination={setDestination}
//   animateToRegion={animateToRegion}
 
//   selectedMotor={selectedMotor}
//   setSelectedMotor={setSelectedMotor}
//   motorList={motorList}
//   onPlaceSelectedCloseModal={() => setModalVisible(false)}
//   userId={user?._id} // ✅ MAKE SURE 'user' is available from context or props
// />

//           </View>
//         </Modal>

//         {/* Map View */}
//         <View style={styles.mapContainer}>
//           <MapView
//             ref={mapRef}
//             style={styles.map}
//             provider={PROVIDER_GOOGLE}
//             region={region}
//             customMapStyle={mapStyle === "dark" ? darkMapStyle : []}
//             showsUserLocation
//             showsTraffic={!isOffline}
//             showsMyLocationButton={false}
//           >
//             {isOffline && (
//               <UrlTile
//                 urlTemplate="http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
//                 maximumZ={19}
//               />
//             )}

//             {/* Routes */}
//             {alternativeRoutes.map((route) => (
//               <Polyline
//                 key={route.id}
//                 coordinates={route.coordinates}
//                 strokeColor="#95a5a6"
//                 strokeWidth={4}
//               />
//             ))}

//             {selectedRoute && (
//               <Polyline
//                 coordinates={selectedRoute.coordinates}
//                 strokeColor="#3498db"
//                 strokeWidth={6}
//               />
//             )}
//             <Polyline
//               coordinates={pathCoords}
//               strokeColor="#2ecc71"
//               strokeWidth={4}
//             />

//             {/* Markers */}
//             {currentLocation && (
//               <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
//                 <View style={styles.userMarker}>
//                   <MaterialIcons name="person-pin-circle" size={32} color="#3498db" />
//                 </View>
//               </Marker>
//             )}

//             {destination && (
//               <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
//                 <View style={styles.destinationMarker}>
//                   <MaterialIcons name="place" size={32} color="#e74c3c" />
//                 </View>
//               </Marker>
//             )}

//             {/* Traffic Incidents */}
//             {trafficIncidents.map((incident) => (
//               <TrafficIncidentMarker key={incident.id} incident={incident} />
//             ))}
//           </MapView>

//           {/* Controls */}
//           {!selectedRoute && (

//             <TouchableOpacity onPress={fetchRoutes} style={styles.getRouteButton}>
//               <Text style={styles.buttonText}>Get Routes</Text>
//             </TouchableOpacity>
//           )}

//           {selectedRoute && !isNavigating && (
//             <TouchableOpacity onPress={startNavigation} style={styles.navigationButton}>
//               <Text style={styles.buttonText}>Start Navigation</Text>
//             </TouchableOpacity>

//           )}


//           {/* Navigation Overlay */}
//           {isNavigating && (
//             <View style={styles.navigationOverlay}>
//               <View style={styles.navigationHeader}>
//                 <Text style={styles.navigationTitle}>Active Navigation</Text>
//                 <View style={styles.navigationControls}>
//                   <TouchableOpacity onPress={() => setVoiceEnabled(!voiceEnabled)} style={styles.controlButton}>
//                     <MaterialIcons name={voiceEnabled ? "volume-up" : "volume-off"} size={24} color="#fff" />
//                   </TouchableOpacity>
//                   <TouchableOpacity onPress={() => setIsFollowingUser(!isFollowingUser)} style={styles.controlButton}>
//                     <MaterialIcons name={isFollowingUser ? "my-location" : "location-disabled"} size={24} color="#fff" />
//                   </TouchableOpacity>
//                 </View>
//               </View>

//               <View style={styles.navigationInfo}>
//                 <Text style={styles.navigationText}>
//                   Fuel to Consume: {selectedRoute ? `${(selectedRoute.fuelEstimate).toFixed(3)} L` : 'Calculating...'}
//                 </Text>
//                 <Text style={styles.navigationText}>
//                   Distance: {selectedRoute ? `${(selectedRoute.distance / 1000).toFixed(1)} km` : 'Calculating...'}
//                 </Text>
//                 <Text style={styles.navigationText}>
//                   ETA: {selectedRoute ? formatETA(selectedRoute.duration) : 'Calculating...'}
//                 </Text>
//               </View>

//               <TouchableOpacity onPress={() => endNavigation(false)} style={styles.stopButton}>
//                 <Text style={styles.stopButtonText}>End Navigation</Text>
//               </TouchableOpacity>
//             </View>
//           )}
//         </View>

//         {/* Route Details */}
//         <RouteDetailsBottomSheet
//           visible={showBottomSheet}
//           bestRoute={tripSummary}
//           alternatives={alternativeRoutes}
//           onClose={() => setShowBottomSheet(false)}
//           selectedRouteId={selectedRouteId}
//           selectedMotor={selectedMotor} // ✅ Add this
//           onSelectRoute={(id) => {
//             setSelectedRouteId(id);
//             const route = id === tripSummary?.id ? tripSummary : alternativeRoutes.find(r => r.id === id);
//             if (route) {
//               mapRef.current?.fitToCoordinates(route.coordinates, {
//                 edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
//                 animated: true,
//               });
//             }
//           }}
//         />



 
//         {/* Trip Summary Modal */}
//         <Modal transparent visible={tripSummaryModalVisible} animationType="fade">

// <View style={styles.summaryModal}>
//   <Text style={styles.summaryTitle}>Trip Summary</Text>

//   {/* Starting Location */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="my-location" size={20} color="#34495e" />
//     <Text style={styles.summaryText}>From: {startAddress || "Unknown"}</Text>
//   </View>

//   {/* Destination */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="place" size={20} color="#e74c3c" />
//     <Text style={styles.summaryText}>Destination: {destination?.address || "Unknown"}</Text>
//   </View>

//   {/* Distance */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="directions-car" size={20} color="#3498db" />
//     <Text style={styles.summaryText}>
//       Distance: {selectedRoute ? (selectedRoute.distance / 1000).toFixed(2) : "--"} km
//       {"  →  "}
//       Actual: {calculateTotalPathDistance(pathCoords).toFixed(2)} km
//     </Text>
//   </View>

//   {/* Fuel Estimate */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
//     <Text style={styles.summaryText}>
//       Fuel Used: {selectedRoute ? selectedRoute.fuelEstimate.toFixed(2) : "--"} L
//       {"  →  "}
//       Actual: ~{selectedRoute ? (selectedRoute.fuelEstimate * 1.1).toFixed(2) : "--"} L
//     </Text>
//   </View>

//   {/* ETA vs Arrival Time */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="schedule" size={20} color="#9b59b6" />
//     <Text style={styles.summaryText}>
//       ETA: {selectedRoute ? formatETA(selectedRoute.duration) : "--"}
//       {"  →  "}
//       Arrived: {new Date().toLocaleTimeString([], {
//         hour: "2-digit",
//         minute: "2-digit",
//         hour12: true,
//       })}
//     </Text>
//   </View>

//   {/* Duration Comparison */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="timelapse" size={20} color="#34495e" />
//     <Text style={styles.summaryText}>
//       Expected Duration: {selectedRoute ? (selectedRoute.duration / 60).toFixed(1) : "--"} mins
//       {"  →  "}
//       Actual: {durationInMinutes} mins
//     </Text>
//   </View>

//   {/* Motor Used */}
//   <View style={styles.summaryRow}>
//     <MaterialIcons name="two-wheeler" size={20} color="#1abc9c" />
//     <Text style={styles.summaryText}>
//       Motor: {selectedMotor?.name || "--"} ({selectedMotor?.fuelEfficiency || "--"} km/L)
//     </Text>
//   </View>

//   <TouchableOpacity
//     onPress={() => {
//       setTripSummaryModalVisible(false);
//       navigation.goBack();
//     }}
//     style={styles.closeSummaryButton}
//   >
//     <Text style={styles.closeSummaryText}>Done</Text>
//   </TouchableOpacity>
// </View>

//         </Modal>


//       </SafeAreaView>
//     </SafeAreaProvider>
//   );
// }

// // ----------------------------------------------------------------
// // Styles
// // ----------------------------------------------------------------
// const darkMapStyle = [
//   { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
//   { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
//   { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
// ];

// const styles = StyleSheet.create({
//   safeArea: {
//     paddingTop: Platform.OS === "android" ? 25 : 0,
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   loadingContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: '#fff',
//   },
//   loadingText: {
//     marginTop: 16,
//     fontSize: 16,
//     color: '#7f8c8d',
//   },
//   header: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     backgroundColor: '#fff',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#ddd',
//   },
//   backButton: {
//     marginRight: 16,
//   },
//   headerText: {
//     flex: 1,
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   destinationHeader: {
//     paddingHorizontal: 16,
//     paddingVertical: 12,
//     backgroundColor: '#fff',
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#ddd',
//   },
//   destinationText: {
//     fontSize: 16,
//     fontWeight: '600',
//     color: '#2c3e50',
//   },
//   mapContainer: {
//     flex: 1,
//     position: 'relative',
//   },
//   map: {
//     ...StyleSheet.absoluteFillObject,
//   },
//   modalContainer: {
//     flex: 1,
//     backgroundColor: '#fff',
//   },
//   modalHeader: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     padding: 16,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#ddd',
//   },
//   modalBackButton: {
//     marginRight: 16,
//   },
//   modalTitle: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   getRouteButton: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     right: 20,
//     backgroundColor: '#3498db',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   navigationButton: {
//     position: 'absolute',
//     top: 20,
//     left: 20,
//     right: 20,
//     backgroundColor: '#2ecc71',
//     padding: 16,
//     borderRadius: 8,
//     alignItems: 'center',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   buttonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   userMarker: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   destinationMarker: {
//     backgroundColor: '#fff',
//     borderRadius: 20,
//     padding: 4,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   incidentMarker: {
//     backgroundColor: '#fff',
//     borderRadius: 15,
//     padding: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   navigationOverlay: {
//     position: 'absolute',
//     bottom: 20,
//     left: 20,
//     right: 20,
//     backgroundColor: 'rgba(44, 62, 80, 0.9)',
//     borderRadius: 12,
//     padding: 16,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.2,
//     shadowRadius: 4,
//     elevation: 4,
//   },
//   navigationHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   navigationTitle: {
//     color: '#fff',
//     fontSize: 18,
//     fontWeight: 'bold',
//   },
//   navigationControls: {
//     flexDirection: 'row',
//   },
//   controlButton: {
//     marginLeft: 16,
//   },
//   navigationInfo: {
//     marginBottom: 16,
//   },
//   navigationText: {
//     color: '#fff',
//     fontSize: 16,
//     marginVertical: 4,
//   },
//   stopButton: {
//     backgroundColor: '#e74c3c',
//     padding: 12,
//     borderRadius: 8,
//     alignItems: 'center',
//   },
//   stopButtonText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
//   bottomSheetContainer: {
//     position: 'absolute',
//     bottom: 0,
//     left: 0,
//     right: 0,
//     backgroundColor: '#fff',
//     borderTopLeftRadius: 20,
//     borderTopRightRadius: 20,
//     padding: 16,
//     paddingBottom: 32,
//     maxHeight: '40%',
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: -2 },
//     shadowOpacity: 0.1,
//     shadowRadius: 8,
//     elevation: 10,
//   },
//   bottomSheetHeader: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   bottomSheetTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   summaryContainer: {
//     marginBottom: 16,
//     paddingBottom: 16,
//     borderBottomWidth: StyleSheet.hairlineWidth,
//     borderBottomColor: '#ddd',
//   },
//   summaryTitle: {
//     fontSize: 16,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     marginBottom: 8,
//   },
//   routeItem: {
//     padding: 12,
//     borderRadius: 8,
//     marginBottom: 8,
//     backgroundColor: '#f8f9fa',
//   },
//   activeRouteItem: {
//     backgroundColor: '#e3f2fd',
//     borderLeftWidth: 4,
//     borderLeftColor: '#3498db',
//   },
//   routeStatBig: {
//     fontSize: 18,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     marginBottom: 4,
//   },
//   routeStat: {
//     fontSize: 14,
//     color: '#7f8c8d',
//     marginBottom: 2,
//   },
//   sortOptionsContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 16,
//   },
//   sectionTitle: {
//     fontSize: 14,
//     fontWeight: 'bold',
//     color: '#7f8c8d',
//     marginRight: 12,
//   },
//   sortButton: {
//     backgroundColor: '#ecf0f1',
//     paddingHorizontal: 12,
//     paddingVertical: 6,
//     borderRadius: 15,
//     marginRight: 8,
//   },
//   activeSortButton: {
//     backgroundColor: '#3498db',
//   },
//   sortButtonText: {
//     fontSize: 12,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//   },
//   activeSortButtonText: {
//     color: '#fff',
//   },
//   alternativesContainer: {
//     marginTop: 8,
//   },
//   summaryModalContainer: {
//     flex: 1,
//     justifyContent: 'center',
//     alignItems: 'center',
//     backgroundColor: 'rgba(0,0,0,0.5)',
//   },
//   summaryModal: {
//     backgroundColor: '#fff',
//     borderRadius: 12,
//     padding: 24,
//     width: '85%',
//   },
//   summaryTitle: {
//     fontSize: 20,
//     fontWeight: 'bold',
//     color: '#2c3e50',
//     marginBottom: 20,
//     textAlign: 'center',
//   },
//   summaryRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: 12,
//   },
//   summaryText: {
//     fontSize: 16,
//     color: '#2c3e50',
//     marginLeft: 12,
//     flex: 1,
//   },
//   closeSummaryButton: {
//     backgroundColor: '#3498db',
//     padding: 12,
//     borderRadius: 8,
//     marginTop: 20,
//     alignItems: 'center',
//   },
//   closeSummaryText: {
//     color: '#fff',
//     fontSize: 16,
//     fontWeight: 'bold',
//   },
// });