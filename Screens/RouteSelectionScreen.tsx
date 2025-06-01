import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, View, ActivityIndicator, KeyboardAvoidingView,
  TouchableWithoutFeedback, Keyboard, Platform, Image, Text,
  TouchableOpacity, Modal, Alert, TextInput, SafeAreaView, ImageStyle,
  Animated
} from "react-native";
import Toast from "react-native-toast-message";
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import DropDownPicker from "react-native-dropdown-picker";
import { useUser } from "../AuthContext/UserContext";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";
import * as Linking from "expo-linking";
import { LinearGradient } from 'expo-linear-gradient';

// Define types for our components
interface MapComponentProps {
  mapRef: React.RefObject<MapView>;
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  mapStyle: string;
  currentLocation: {
    latitude: number;
    longitude: number;
  } | null;
  reportMarkers: any[];
  gasStations: any[];
  showReports: boolean;
  showGasStations: boolean;
  routeCoordinates?: {
    latitude: number;
    longitude: number;
  }[];
  isTracking?: boolean;
}

// Screen modes
type ScreenMode = 'planning' | 'tracking' | 'summary';

const FAB = ({ onPress, label, bottom }) => (
  <TouchableOpacity style={[styles.fab, { bottom }]} onPress={onPress}>
    <View style={styles.fabContent}>
      <MaterialIcons name="search" size={40} color="#000" />
      <Text style={styles.fabText}>{label}</Text>
    </View>
  </TouchableOpacity>
);

const MyLocationButton = ({ onPress, bottom, iconName, left, disabled }) => (
  <TouchableOpacity
    style={[styles.myLocationButton, { bottom, left }, disabled && styles.disabledBtn]}
    onPress={disabled ? () => Alert.alert("Location Denied", "Enable location in settings.") : onPress}
    activeOpacity={disabled ? 1 : 0.7}
  >
    <MaterialIcons name={iconName} size={40} color="#fff" />
  </TouchableOpacity>
);

const getIcon = (type) => {
  switch (type) {
    case "Accident": return require("../assets/icons/accident.png");
    case "Police": return require("../assets/icons/police.png");
    default: return require("../assets/icons/default.png");
  }
};

const CustomMapViewComponent: React.FC<MapComponentProps> = ({
  mapRef, region, mapStyle, currentLocation, reportMarkers,
  gasStations, showReports, showGasStations, routeCoordinates, isTracking
}) => (
  <MapView
    ref={mapRef}
    style={styles.map}
    provider={PROVIDER_GOOGLE}
    region={region}
    customMapStyle={mapStyle === "dark" ? darkMapStyle : []}
    showsUserLocation
    showsTraffic
    showsMyLocationButton={false}
    followsUserLocation={isTracking}
  >
    {currentLocation && (
      <Marker coordinate={currentLocation} title="Your Location">
        <Image
          source={require("../assets/icons/User-onTrack-MARKER.png")}
          style={styles.userMarker as ImageStyle}
        />
      </Marker>
    )}

    {showReports && reportMarkers.map((report, index) => (
      <Marker
        key={`report-${index}`}
        coordinate={report.location}
        title={report.reportType}
        description={`${report.description} - ${new Date(report.timestamp).toLocaleString()}`}
      >
        <Image 
          source={getIcon(report.reportType)} 
          style={styles.iconMarker as ImageStyle} 
        />
      </Marker>
    ))}

    {showGasStations && gasStations.map((station, index) => (
      <Marker
        key={`gas-${index}`}
        coordinate={{
          latitude: station.location.coordinates[1],
          longitude: station.location.coordinates[0],
        }}
        title={`${station.name} (${station.brand})`}
        description={`Gasoline: ₱${station.fuelPrices?.gasoline || "N/A"}\nDiesel: ₱${station.fuelPrices?.diesel || "N/A"}`}
        pinColor="#00cc44"
      />
    ))}

    {isTracking && routeCoordinates && routeCoordinates.length > 1 && (
      <Polyline
        coordinates={routeCoordinates}
        strokeColor="#FF0000"
        strokeWidth={3}
      />
    )}
  </MapView>
);

const darkMapStyle = [/* your dark map style array */];

export default function RouteSelectionScreen({ navigation, route }) {
  const { focusLocation } = route.params || {};
  const { user } = useUser();
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);
  const [screenMode, setScreenMode] = useState<ScreenMode>('planning');
  
  // Existing states
  const [region, setRegion] = useState({ latitude: 14.7006, longitude: 120.9836, latitudeDelta: 0.005, longitudeDelta: 0.005 });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [reportMarkers, setReportMarkers] = useState([]);
  const [gasStations, setGasStations] = useState([]);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [trafficReportType, setTrafficReportType] = useState("Accident");
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showReports, setShowReports] = useState(true);
  const [showGasStations, setShowGasStations] = useState(true);
  const [mapStyle, setMapStyle] = useState("standard");
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);
  const [open, setOpen] = useState(false);

  // New states for tracking mode
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [rideStats, setRideStats] = useState({
    duration: 0,
    distance: 0,
    fuelConsumed: 0,
    avgSpeed: 0
  });
  const [isTracking, setIsTracking] = useState(false);
  const statsTimer = useRef(null);

  // Animation value for the stats panel
  const slideAnim = useRef(new Animated.Value(0)).current;

  const reportTypes = [
    { label: "Accident", value: "Accident" },
    { label: "Traffic Jam", value: "Traffic Jam" },
    { label: "Road Closure", value: "Road Closure" },
    { label: "Hazard", value: "Hazard" },
    { label: "Police", value: "Police" },
  ];

  useEffect(() => {
    fetchReports();
    fetchValenzuelaGasStations();
    startWatchingLocation();

    // ✅ If a location is passed, zoom in there
    if (focusLocation?.latitude && focusLocation?.longitude) {
      const targetRegion = {
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      };
      setRegion(targetRegion);
      mapRef.current?.animateToRegion(targetRegion, 1200);
    } else {
      getCurrentLocation(); // fallback to user's own location
    }

    return () => locationSubscription.current?.remove();
  }, []);

  const startWatchingLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationPermissionGranted(false);
      return;
    }
    setLocationPermissionGranted(true);
    locationSubscription.current = await Location.watchPositionAsync(
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

  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      const loc = await Location.getCurrentPositionAsync({});
      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(coords);
      const newRegion = { ...coords, latitudeDelta: 0.0015, longitudeDelta: 0.0015 };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Failed to fetch location.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/reports/`);
      const data = await res.json();
      setReportMarkers(data || []);
    } catch (err) {
      console.error("Reports fetch error:", err);
    }
  }, []);

  const fetchValenzuelaGasStations = async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/gas-stations`);
      const data = await res.json();
      setGasStations(data || []);
    } catch (err) {
      console.error("Gas fetch error:", err);
    }
  };

  const submitTrafficReport = async () => {
    if (submitting || !description.trim()) {
      return Alert.alert("Required", "Enter description");
    }
    setSubmitting(true);
    try {
      const response = await fetch(`${LOCALHOST_IP}/api/reports/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: trafficReportType,
          location: currentLocation,
          description,
          userId: user?._id,
        }),
      });

      if (response.ok) {
        Toast.show({ type: "success", text1: "Report Submitted", text2: `Type: ${trafficReportType}` });
        setDescription("");
        fetchReports();
      } else {
        Alert.alert("Error", "Submit failed");
      }
    } catch (e) {
      console.error("Submit error:", e);
    } finally {
      setSubmitting(false);
      setIsReportModalVisible(false);
    }
  };

  const startTracking = useCallback(() => {
    setIsTracking(true);
    setScreenMode('tracking');
    setRouteCoordinates([]);
    setRideStats({
      duration: 0,
      distance: 0,
      fuelConsumed: 0,
      avgSpeed: 0
    });

    // Start stats timer
    statsTimer.current = setInterval(() => {
      setRideStats(prev => ({
        ...prev,
        duration: prev.duration + 1,
        fuelConsumed: prev.fuelConsumed + (Math.random() * 0.01) // Simulate fuel consumption
      }));
    }, 1000);
  }, []);

  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setScreenMode('summary');
    if (statsTimer.current) {
      clearInterval(statsTimer.current);
    }
  }, []);

  const renderTrackingControls = () => (
    <View style={styles.trackingControls}>
      <TouchableOpacity
        style={[styles.controlButton, isTracking ? styles.stopButton : styles.startButton]}
        onPress={isTracking ? stopTracking : startTracking}
      >
        <MaterialIcons 
          name={isTracking ? "stop" : "play-arrow"} 
          size={32} 
          color="#FFF" 
        />
      </TouchableOpacity>
    </View>
  );

  const renderStatsPanel = () => {
    if (screenMode !== 'tracking') return null;

    return (
      <Animated.View style={[styles.statsPanel, {
        transform: [{
          translateY: slideAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -200]
          })
        }]
      }]}>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>
              {Math.floor(rideStats.duration / 60)}:{(rideStats.duration % 60).toString().padStart(2, '0')}
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Fuel Used</Text>
            <Text style={styles.statValue}>{rideStats.fuelConsumed.toFixed(2)}L</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg Speed</Text>
            <Text style={styles.statValue}>{(rideStats.avgSpeed * 3.6).toFixed(1)} km/h</Text>
          </View>
        </View>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <LinearGradient
          colors={['#00ADB5', '#00C2CC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <MaterialIcons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Route Selection</Text>
              <Text style={styles.headerSubtitle}>Plan your journey and track fuel consumption</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.container}>
            {/* Search Bar - Waze Style */}
            <TouchableOpacity 
              style={styles.searchBar}
              onPress={() => navigation.navigate("MapScreenTry", {
                currentLocation,
                mapStyle,
                fromRoute: true
              })}
            >
              <MaterialIcons name="search" size={24} color="#666" />
              <Text style={styles.searchText}>Where to?</Text>
            </TouchableOpacity>

            <CustomMapViewComponent
              mapRef={mapRef}
              region={region}
              mapStyle={mapStyle}
              currentLocation={currentLocation}
              reportMarkers={reportMarkers}
              gasStations={gasStations}
              showReports={showReports && !isTracking}
              showGasStations={showGasStations && !isTracking}
              routeCoordinates={routeCoordinates}
              isTracking={isTracking}
            />

            {renderStatsPanel()}

            {!isTracking ? (
              <>
                {/* Floating Action Buttons - Waze Style */}
                <View style={styles.floatingButtonsContainer}>
                  {/* Left Side Buttons */}
                  <View style={styles.leftButtons}>
                    <TouchableOpacity 
                      style={[styles.floatingButton, styles.reportButton]}
                      onPress={() => setIsReportModalVisible(true)}
                    >
                      <MaterialIcons name="warning" size={24} color="#FFF" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.floatingButton, { backgroundColor: showReports ? '#00ADB5' : '#FFF' }]}
                      onPress={() => setShowReports(!showReports)}
                    >
                      <MaterialIcons 
                        name="report" 
                        size={24} 
                        color={showReports ? '#FFF' : '#666'} 
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Right Side Buttons */}
                  <View style={styles.rightButtons}>
                    <TouchableOpacity 
                      style={[styles.floatingButton, { backgroundColor: showGasStations ? '#00ADB5' : '#FFF' }]}
                      onPress={() => setShowGasStations(!showGasStations)}
                    >
                      <MaterialIcons 
                        name="local-gas-station" 
                        size={24} 
                        color={showGasStations ? '#FFF' : '#666'} 
                      />
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.floatingButton, styles.locationButton]}
                      onPress={getCurrentLocation}
                      disabled={!locationPermissionGranted}
                    >
                      <MaterialIcons name="my-location" size={24} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : (
              renderTrackingControls()
            )}

            <Modal transparent visible={isReportModalVisible} animationType="slide">
              <TouchableWithoutFeedback onPress={() => setIsReportModalVisible(false)}>
                <View style={styles.modalOverlay}>
                  <View style={styles.modalContent}>
                    <Text style={styles.menuHeader}>Add Traffic Report</Text>
                    <DropDownPicker
                      open={open}
                      value={trafficReportType}
                      items={reportTypes}
                      setOpen={setOpen}
                      setValue={setTrafficReportType}
                      setItems={() => { }}
                      style={{ borderColor: "#ccc", marginBottom: 20 }}
                    />
                    <TextInput
                      value={description}
                      onChangeText={(text) => setDescription(text)}
                      placeholder="Short description"
                      style={styles.input}
                      maxLength={20}
                    />
                    <TouchableOpacity onPress={submitTrafficReport} disabled={submitting} style={styles.closeButton}>
                      <Text style={styles.btnText}>{submitting ? "Submitting..." : "Submit Report"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setIsReportModalVisible(false)} style={[styles.closeButton, { backgroundColor: "#aaa" }]}>
                      <Text style={styles.btnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableWithoutFeedback>
            </Modal>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2EEEE',
  },
  header: {
    width: '100%',
    backgroundColor: '#F2EEEE',
    zIndex: 10,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  searchBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 20 : 10,
    left: 16,
    right: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 40 : 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  leftButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  rightButtons: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
  },
  floatingButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  reportButton: {
    backgroundColor: '#FF6B6B',
  },
  locationButton: {
    backgroundColor: '#4CAF50',
  },
  fab: { position: 'absolute', right: 0, left: 0, padding: 15, backgroundColor: "#007AFF", zIndex: 999 },
  fabText: { color: "#000", fontSize: 16, marginLeft: 8 },
  fabContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", padding: 10, borderRadius: 50 },
  userMarker: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  iconMarker: {
    width: 35,
    height: 35,
    resizeMode: "contain",
  },
  myLocationButton: { position: "absolute", padding: 15, borderRadius: 50, zIndex: 300, backgroundColor: "#007AFF" },
  disabledBtn: { backgroundColor: "#aaa", opacity: 0.6 },
  loadingContainer: { position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -50 }, { translateY: -50 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "80%" },
  menuHeader: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 },
  closeButton: { backgroundColor: "#3498db", padding: 10, borderRadius: 5, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center" },
  statsPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    padding: 10,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  trackingControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
  },
  stopButton: {
    backgroundColor: '#FF0000',
  },
});
