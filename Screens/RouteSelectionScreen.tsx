import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Image,
  Text,
  TouchableOpacity,
  Modal,
  Alert,
  TextInput,
  SafeAreaView
} from "react-native";
import Toast from "react-native-toast-message";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import DropDownPicker from "react-native-dropdown-picker";
import { useUser } from "../AuthContext/UserContext";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";
import * as Linking from "expo-linking"; // ⬅️ Add this at the top

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
    style={[
      styles.myLocationButton,
      { bottom, left },
      disabled && { backgroundColor: "#aaa", opacity: 0.6 },
    ]}
    onPress={disabled
      ? () => Alert.alert("Location Denied", "Please enable location permissions in your device settings.")
      : onPress
    }
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
        <Image source={require("../assets/icons/image.png")} style={{ width: 35, height: 35, borderRadius: 20 }} resizeMode="center" />
      </Marker>
    )}
    {showReports && Array.isArray(reportMarkers) &&
      reportMarkers.map((report, index) => (
        <Marker
          key={`report-${index}`}
          coordinate={{ latitude: report.location.latitude, longitude: report.location.longitude }}
          title={report.reportType}
          description={`${report.description} - ${new Date(report.timestamp).toLocaleString()}`}
        >
          <Image source={getIcon(report.reportType)} style={{ width: 35, height: 35 }} resizeMode="contain" />
        </Marker>
      ))}
    {showGasStations && Array.isArray(gasStations) &&
      gasStations.map((station, index) => (
        <Marker
          key={`gas-${index}`}
          coordinate={{ latitude: station.geometry.location.lat, longitude: station.geometry.location.lng }}
          title={station.name}
          description={station.vicinity}
          pinColor="#00cc44"
        />
      ))}
  </MapView>
));

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#383838" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
];

const RouteSelectionScreen = ({ navigation }) => {
  const { user } = useUser();
  const mapRef = useRef(null);
  const [region, setRegion] = useState({ latitude: 14.7006, longitude: 120.9836, latitudeDelta: 0.005, longitudeDelta: 0.005 });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [trafficReportType, setTrafficReportType] = useState("Accident");
  const [open, setOpen] = useState(false);
  const [gasStations, setGasStations] = useState([]);
  const [showGasStations, setShowGasStations] = useState(true);
  const [showReports, setShowReports] = useState(true);
  const [reportMarkers, setReportMarkers] = useState([]);
  const [description, setDescription] = useState("");
  const [locationPermissionGranted, setLocationPermissionGranted] = useState(true);



  const [items, setItems] = useState([
    { label: "Accident", value: "Accident" },
    { label: "Traffic Jam", value: "Traffic Jam" },
    { label: "Road Closure", value: "Road Closure" },
    { label: "Hazard", value: "Hazard" },
    { label: "Police", value: "Police" },
  ]);

  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      const loc = await Location.getCurrentPositionAsync({});
      if (!loc || !loc.coords) {
        Alert.alert("Location Error", "Could not determine your current location.");
        return;
      }

      const coords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      setCurrentLocation(coords);

      const newRegion = {
        ...coords,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      };

      setRegion(newRegion);
      if (mapRef.current && newRegion) {
  requestAnimationFrame(() => {
    mapRef.current.animateToRegion(newRegion, 1000);
  });
}

    } catch (error) {
      console.error("❌ Location fetch error:", error);
      Alert.alert("Error", "Something went wrong while fetching your location.");
    } finally {
      setIsLoading(false);
    }
  }, []);




  const fetchNearbyGasStations = async () => {
    if (!currentLocation) return;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${currentLocation.latitude},${currentLocation.longitude}&radius=7000&type=gas_station&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status !== "OK") {
        console.warn("Google Maps API Error:", data.status);
        Alert.alert("Gas Station Error", "Unable to fetch nearby gas stations.");
        return;
      }

      setGasStations(data.results || []);
    } catch (e) {
      console.error("Gas fetch error:", e);
      Alert.alert("Error", "Failed to load nearby gas stations.");
    }
  };

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/reports/`);
      const data = await res.json();
      setReportMarkers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Reports fetch error:", e);
      setReportMarkers([]);
    }
  }, []);

  const [submitting, setSubmitting] = useState(false);
  const submitTrafficReport = async () => {
    if (submitting || !description.trim()) {
      Alert.alert("Required", "Please enter a short description.");
      return;
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

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        Toast.show({
          type: "success",
          text1: "Report Submitted",
          text2: `Type: ${trafficReportType}`,
        });
        setDescription("");
        setTrafficReportType("Accident");
        fetchReports(); // refresh list
      } else {
        Alert.alert("Error", data.message || "Failed to submit");
      }
    } catch (e) {
      console.error("Submit error:", e);
      Alert.alert("Error", "Submission failed");
    } finally {
      setIsReportModalVisible(false);
      setSubmitting(false);
    }
  };

  useEffect(() => {
  (async () => {
    const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setLocationPermissionGranted(false);
      if (!canAskAgain) {
        Alert.alert(
          "Location Permission Blocked",
          "You have permanently denied location access. Please enable it in your device settings.",
          [
            { text: "Open Settings", onPress: () => Linking.openSettings() },
            { text: "Cancel", style: "cancel" }
          ]
        );
      } else {
        Alert.alert("Location Permission Denied", "Location access is needed to fetch your position.");
      }
    } else {
      setLocationPermissionGranted(true);
    }
  })();
}, []);


  useEffect(() => {
    if (locationPermissionGranted) {
      getCurrentLocation();
    }
    fetchReports();
  }, [getCurrentLocation, fetchReports, locationPermissionGranted]);


  useEffect(() => {
    if (currentLocation) fetchNearbyGasStations();
  }, [currentLocation]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!currentLocation && isLoading) {
        Alert.alert("Location Timeout", "Failed to get your location. Try again.");
        setIsLoading(false); // stop spinner
      }
    }, 8000);
    return () => clearTimeout(timeout);
  }, [currentLocation, isLoading]);


return (
  <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {region && (
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
        )}

        <View style={styles.toggleContainer}>
          <TouchableOpacity
            onPress={() => setShowReports(!showReports)}
            style={[
              styles.segmentButton,
              showReports ? styles.activeReport : styles.inactive,
            ]}
          >
            <MaterialIcons name="report" size={18} color={showReports ? "#000" : "#888"} />
            <Text style={[styles.segmentText, { color: showReports ? "#000" : "#888" }]}>
              Reports
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowGasStations(!showGasStations)}
            style={[
              styles.segmentButton,
              showGasStations ? styles.activeGas : styles.inactive,
            ]}
          >
            <MaterialIcons
              name="local-gas-station"
              size={18}
              color={showGasStations ? "#000" : "#888"}
            />
            <Text
              style={[
                styles.segmentText,
                { color: showGasStations ? "#000" : "#888" },
              ]}
            >
              Gas
            </Text>
          </TouchableOpacity>
        </View>

        {isLoading && (
          <ActivityIndicator size="large" color="#3498db" style={styles.loadingContainer} />
        )}

        <FAB onPress={() => navigation.navigate("MapScreenTry")} label="Where to?" bottom={0} />

        <MyLocationButton
          onPress={() => setIsReportModalVisible(true)}
          bottom={100}
          left={20}
          iconName="warning"
        />

        <MyLocationButton
          onPress={getCurrentLocation}
          bottom={100}
          left={300}
          iconName="my-location"
          disabled={!locationPermissionGranted}
        />

        <Modal transparent visible={isReportModalVisible} animationType="slide">
          <TouchableWithoutFeedback onPress={() => setIsReportModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View
                style={[styles.modalContent, { height: "100%", width: "80%", paddingVertical: 40 }]}
              >
                <Text style={styles.menuHeader}>Add Traffic Report</Text>
                <Text>Select report type:</Text>
                <DropDownPicker
                  open={open}
                  value={trafficReportType}
                  items={items}
                  setOpen={setOpen}
                  setValue={setTrafficReportType}
                  setItems={setItems}
                  containerStyle={{ marginBottom: open ? 150 : 20 }}
                  style={{ borderColor: "#ccc" }}
                  dropDownContainerStyle={{ backgroundColor: "#fafafa" }}
                />
                <Text style={{ marginTop: 15 }}>Short Description:</Text>
                <TextInput
                  value={description}
                  onChangeText={(text) => setDescription(text.slice(0, 20))}
                  placeholder="Max 20 characters"
                  style={{
                    borderWidth: 1,
                    borderColor: "#ccc",
                    padding: 8,
                    borderRadius: 5,
                    marginTop: 5,
                    color: "#000",
                  }}
                  maxLength={20}
                />
                <TouchableOpacity
                  onPress={submitTrafficReport}
                  disabled={submitting}
                  style={[styles.closeButton, submitting && { opacity: 0.6 }]}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>
                    {submitting ? "Submitting..." : "Submit Report"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setIsReportModalVisible(false)}
                  style={[styles.closeButton, { backgroundColor: "#aaa", marginTop: 10 }]}
                >
                  <Text style={{ color: "white", textAlign: "center" }}>Cancel</Text>
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

};

const styles = StyleSheet.create({
  map: { flex: 1 },
  fab: { position: 'absolute', right: 0, left: 0, padding: 15, backgroundColor: "#007AFF", zIndex: 999 },
  fabText: { color: "#000", fontSize: 16, marginLeft: 8 },
  fabContent: { flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 },
  myLocationButton: { position: "absolute", bottom: 20, backgroundColor: "#007AFF", padding: 15, borderRadius: 50, zIndex: 300 },
  toggleButton: { padding: 10, borderRadius: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.3, shadowRadius: 2, elevation: 3 },
  toggleText: { color: '#000', fontWeight: 'bold' },
  loadingContainer: { position: "absolute", top: "50%", left: "50%", transform: [{ translateX: -50 }, { translateY: -50 }], alignItems: "center" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.4)", justifyContent: "flex-start", alignItems: "flex-start" },
  modalContent: { backgroundColor: "#fff", paddingTop: 60, paddingHorizontal: 20, elevation: 10 },
  menuHeader: { fontSize: 24, fontWeight: "bold", marginBottom: 20 },
  closeButton: { marginTop: 20, backgroundColor: "#3498db", padding: 10, borderRadius: 5 },
  toggleContainer: {
    position: "absolute",
    top: 40,
    right: 10,
    zIndex: 1000,
    flexDirection: "row",
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },

  segmentButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  activeReport: {
    backgroundColor: "#FFD700", // Yellow for reports
  },

  activeGas: {
    backgroundColor: "#32CD32", // Green for gas
  },

  inactive: {
    backgroundColor: "#ddd",
  },

  segmentText: {
    marginLeft: 6,
    fontWeight: "bold",
    fontSize: 14,
  },


});

export default React.memo(RouteSelectionScreen);
