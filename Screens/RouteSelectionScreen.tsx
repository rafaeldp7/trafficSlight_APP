import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet, View, ActivityIndicator, KeyboardAvoidingView, 
  TouchableWithoutFeedback, Keyboard, Platform, Image, Text,
  TouchableOpacity, Modal, Alert, TextInput, SafeAreaView
} from "react-native";
import Toast from "react-native-toast-message";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import DropDownPicker from "react-native-dropdown-picker";
import { useUser } from "../AuthContext/UserContext";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";
import * as Linking from "expo-linking";

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

const CustomMapViewComponent = React.memo(({ mapRef, region, mapStyle, currentLocation, reportMarkers, gasStations, showReports, showGasStations }) => (
  <MapView
    ref={mapRef}
    style={styles.map}
    provider={PROVIDER_GOOGLE}
    region={region}
    customMapStyle={mapStyle === "dark" ? darkMapStyle : []}
    showsUserLocation
    showsTraffic
    showsMyLocationButton={false}
  >
    {currentLocation && (
      <Marker coordinate={currentLocation} title="Your Location">
        <Image source={require("../assets/icons/User-onTrack-MARKER.png")} style={styles.userMarker} />
      </Marker>
    )}

    {showReports && reportMarkers.map((report, index) => (
      <Marker
        key={`report-${index}`}
        coordinate={report.location}
        title={report.reportType}
        description={`${report.description} - ${new Date(report.timestamp).toLocaleString()}`}
      >
        <Image source={getIcon(report.reportType)} style={styles.iconMarker} />
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
  </MapView>
));

const darkMapStyle = [/* your dark map style array */];

export default function RouteSelectionScreen({ navigation }) {
  const { user } = useUser();
  const mapRef = useRef(null);
  const locationSubscription = useRef(null);

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

  const reportTypes = [
    { label: "Accident", value: "Accident" },
    { label: "Traffic Jam", value: "Traffic Jam" },
    { label: "Road Closure", value: "Road Closure" },
    { label: "Hazard", value: "Hazard" },
    { label: "Police", value: "Police" },
  ];

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
      const res = await fetch(`${LOCALHOST_IP}/api/gas-stations/nearby?lat=14.7000&lng=120.9830`);
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

  useEffect(() => {
    fetchReports();
    fetchValenzuelaGasStations();
    startWatchingLocation();
    return () => locationSubscription.current?.remove();
  }, []);


  const fetchNearbyGasStations = async () => {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=14.7000,120.9830&radius=5000&type=gas_station&key=${GOOGLE_MAPS_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK") {
      console.warn("Google Maps API error:", data.status);
      Alert.alert("Error", "Failed to fetch gas stations from Google.");
      return;
    }

    // Format the results to match expected structure
    const formattedStations = data.results.map((item) => ({
      name: item.name,
      brand: item.name.split(" ")[0], // crude estimate
      location: {
        coordinates: [item.geometry.location.lng, item.geometry.location.lat],
      },
      fuelPrices: { gasoline: "N/A", diesel: "N/A" }, // Google doesn't provide prices
    }));

    setGasStations(formattedStations);


    
  } catch (error) {
    console.error("Google gas station fetch error:", error);
    Alert.alert("Error", "Unable to fetch gas stations from Google.");
  }
};
useEffect(() => {
  fetchNearbyGasStations(); // Fetch from Google directly
}, []);





  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <CustomMapViewComponent
            mapRef={mapRef}
            region={region}
            mapStyle={mapStyle}
            currentLocation={currentLocation}
            reportMarkers={reportMarkers}
            gasStations={gasStations}
            showReports={showReports}
            showGasStations={showGasStations}
          />

          <View style={styles.toggleContainer}>
            {["Reports", "Gas"].map((label, idx) => (
              <TouchableOpacity
                key={label}
                onPress={() => idx === 0 ? setShowReports(!showReports) : setShowGasStations(!showGasStations)}
                style={[
                  styles.segmentButton,
                  idx === 0
                    ? showReports ? styles.activeReport : styles.inactive
                    : showGasStations ? styles.activeGas : styles.inactive
                ]}
              >
                <MaterialIcons name={idx === 0 ? "report" : "local-gas-station"} size={18} color="#000" />
                <Text style={styles.segmentText}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {isLoading && <ActivityIndicator size="large" color="#3498db" style={styles.loadingContainer} />}

          <FAB onPress={() => navigation.navigate("MapScreenTry")} label="Where to?" bottom={0} />
          <MyLocationButton onPress={() => setIsReportModalVisible(true)} bottom={100} left={20} iconName="warning" />
          <MyLocationButton onPress={getCurrentLocation} bottom={100} left={300} iconName="my-location" disabled={!locationPermissionGranted} />

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
                    setItems={() => {}}
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
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
      <Toast />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  fab: { position: 'absolute', right: 0, left: 0, padding: 15, backgroundColor: "#007AFF", zIndex: 999 },
  fabText: { color: "#000", fontSize: 16, marginLeft: 8 },
  fabContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", padding: 10, borderRadius: 50 },
  userMarker: { width: 35, height: 35, borderRadius: 20 },
  iconMarker: { width: 35, height: 35 },
  myLocationButton: { position: "absolute", padding: 15, borderRadius: 50, zIndex: 300, backgroundColor: "#007AFF" },
  disabledBtn: { backgroundColor: "#aaa", opacity: 0.6 },
  toggleContainer: {
    position: "absolute", top: 40, right: 10, flexDirection: "row",
    backgroundColor: "#f0f0f0", borderRadius: 20, elevation: 4
  },
  segmentButton: { flexDirection: "row", alignItems: "center", padding: 8 },
  activeReport: { backgroundColor: "#FFD700" },
  activeGas: { backgroundColor: "#32CD32" },
  inactive: { backgroundColor: "#ddd" },
  segmentText: { marginLeft: 6, fontWeight: "bold" },
  loadingContainer: { position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -50 }, { translateY: -50 }] },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  modalContent: { backgroundColor: "#fff", padding: 20, borderRadius: 10, width: "80%" },
  menuHeader: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 5, marginBottom: 10 },
  closeButton: { backgroundColor: "#3498db", padding: 10, borderRadius: 5, marginTop: 10 },
  btnText: { color: "#fff", textAlign: "center" },
});
