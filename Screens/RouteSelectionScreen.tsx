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
  TextInput
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import DropDownPicker from "react-native-dropdown-picker";
import { useFocusEffect } from "@react-navigation/native";
import { LOCALHOST_IP } from "@env";
import { useUser } from "../AuthContext/UserContext"; // Assuming you have a custom hook for user context


const FAB = ({ onPress, label, bottom }: { onPress: () => void; label: string; bottom: number }) => (
  <TouchableOpacity
    style={[styles.fab, { bottom }]}
    onPress={onPress}
    accessible
    accessibilityLabel={label}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: "#fff", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50 }}>
      <MaterialIcons name="search" size={40} color="#000" />
      <Text style={styles.fabText}>{label}</Text>
    </View>
  </TouchableOpacity>
);



const MyLocationButton = ({
  onPress,
  bottom,
  iconName,
  left,
}: {
  onPress: () => void;
  bottom: number;
  iconName: string;
  left: number;
}) => (
  <TouchableOpacity
    style={[styles.myLocationButton, { bottom, left }]}
    onPress={onPress}
    accessible
    accessibilityLabel="Go to my location"
  >
    <MaterialIcons name={iconName} size={40} color="#fff" />
  </TouchableOpacity>
);


const CustomMapViewComponent = React.memo(({ mapRef, region, mapStyle, currentLocation, reportMarkers }: any) => (
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
        <Image
          source={require("../assets/icons/image.png")}
          style={{ width: 35, height: 35, borderRadius: 20 }}
          resizeMode="center"
        />
      </Marker>
    )}

    {/* 🧭 Display all report markers */}
    {reportMarkers.map((report, index) => (
      <Marker
        key={index}
        coordinate={{
          latitude: report.location.latitude,
          longitude: report.location.longitude,
        }}
        title={report.reportType}
        description={`${report.description} - ${new Date(report.timestamp).toLocaleString()}`}


        pinColor="#FFFF00"
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




const RouteSelectionScreen = ({ navigation }: { navigation: any }) => {
  const { user } = useUser();
  const [region, setRegion] = useState({
    latitude: 14.7006,
    longitude: 120.9836,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<"standard" | "dark">("standard");
  const [isLoading, setIsLoading] = useState(false);

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [trafficReportType, setTrafficReportType] = useState("Accident");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([
    { label: "Accident", value: "Accident" },
    { label: "Traffic Jam", value: "Traffic Jam" },
    { label: "Road Closure", value: "Road Closure" },
    { label: "Hazard", value: "Hazard" },
    { label: "Police", value: "Police" },
  ]);
  const mapRef = useRef<MapView>(null);
  const [reportMarkers, setReportMarkers] = useState([]);
  const [description, setDescription] = useState("");



  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/reports`);
      const data = await res.json();
      setReportMarkers(data);
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    }
  }, []);

  const getCurrentLocation = useCallback(async () => {
    try {
      setIsLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        alert("Permission to access location was denied");
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      const userLocation = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
      setCurrentLocation(userLocation);
      const newRegion = {
        ...userLocation,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } catch {
      alert("Error getting current location.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleMapStyle = useCallback(() => {
    setMapStyle((prev) => (prev === "standard" ? "dark" : "standard"));
  }, []);

  const goToMyLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          ...currentLocation,
          latitudeDelta: 0.0005,
          longitudeDelta: 0.0005,
        },
        1000
      );
    }
  }, [currentLocation]);

  const submitTrafficReport = async () => {
    try {
      const response = await fetch(`${LOCALHOST_IP}/api/reports/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType: trafficReportType,
          location: {
            latitude: currentLocation.latitude,
            longitude: currentLocation.longitude,
          },
          description,
          userId: user?.id,
        }),
      });

      const text = await response.text();
      let data;

      try {
        data = JSON.parse(text);
      } catch (jsonError) {
        console.error("Raw response:", text);
        throw new Error("Invalid JSON response from server");
      }

      if (response.ok) {
        Alert.alert("Traffic Report Submitted", `Type: ${trafficReportType}`);
        fetchReports(); // refresh markers
      } else {
        Alert.alert("Error", data.message || "Failed to submit report");
      }
    } catch (error) {
      console.error("Submission error:", error);
      Alert.alert("Error", "Could not send report");
    } finally {
      setIsReportModalVisible(false);
    }
  };



  useEffect(() => {
    getCurrentLocation();
    fetchReports();
  }, [getCurrentLocation, fetchReports]);


  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Modal Menu */}


        {/* Traffic Report Modal */}
        <Modal transparent visible={isReportModalVisible} onRequestClose={() => setIsReportModalVisible(false)} animationType="slide">
          <TouchableWithoutFeedback onPress={() => setIsReportModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={[styles.modalContent, { width: "80%", paddingVertical: 40 }]}>
                  <Text style={styles.menuHeader}>Add Traffic Report</Text>
                  <Text style={{ marginBottom: 10 }}>Select report type:</Text>

                  <View style={{ zIndex: 2000 }}>
                    <DropDownPicker
                      open={open}
                      value={trafficReportType}
                      items={items}
                      setOpen={setOpen}
                      setValue={(callback) => {
                        const val = callback(trafficReportType);
                        setTrafficReportType(val);
                      }}
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
                        color: "#000"
                      }}
                      maxLength={20}
                    />

                  </View>


                  <TouchableOpacity onPress={submitTrafficReport} style={[styles.closeButton, { marginTop: 30 }]}>
                    <Text style={{ color: "white", textAlign: "center" }}>Submit Report</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsReportModalVisible(false)} style={[styles.closeButton, { backgroundColor: "#aaa", marginTop: 10 }]}>
                    <Text style={{ color: "white", textAlign: "center" }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Buttons */}

        <CustomMapViewComponent
          mapRef={mapRef}
          region={region}
          mapStyle={mapStyle}
          currentLocation={currentLocation}
          reportMarkers={reportMarkers}
        />

        {isLoading && <ActivityIndicator size="large" color="#3498db" style={styles.loadingContainer} />}

        <FAB onPress={() => navigation.navigate("MapScreenTry")} label="Where to?" bottom={0} />

        <MyLocationButton onPress={() => setIsReportModalVisible(true)} bottom={100} left={20} iconName="warning" />
        <MyLocationButton onPress={goToMyLocation} bottom={100} iconName="my-location" left={300} />

      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  map: { flex: 1 },
  menuButton: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 4,
    borderRadius: 5,
    backgroundColor: "#3498db",
    zIndex: 100,
  },
  loadingContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    alignItems: "center",
  },
  fab: {
    position: 'absolute',
    right: 0,
    left: 0,
    padding: 15,

    backgroundColor: "#3498db",
    // no bottom here; it's passed dynamically
    zIndex: 999,
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    marginLeft: 8, // spacing between icon and text
  },
  myLocationButton: {
    position: "absolute",
    bottom: 20,
    backgroundColor: "#3498db",
    padding: 15,
    borderRadius: 50,
    zIndex: 300,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  modalContent: {
    width: "70%",
    height: "100%",
    backgroundColor: "#fff",
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 10,
  },
  menuHeader: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  menuItem: {
    marginBottom: 20,
    paddingVertical: 10,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
  },
});

export default React.memo(RouteSelectionScreen);
