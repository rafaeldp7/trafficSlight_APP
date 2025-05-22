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
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";

const FAB = ({ onPress, label }: { onPress: () => void; label: string }) => (
  <TouchableOpacity
    style={styles.fab}
    onPress={onPress}
    accessible
    accessibilityLabel={label}
  >
    <Text style={styles.fabText}>{label}</Text>
  </TouchableOpacity>
);

const MyLocationButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity
    style={styles.myLocationButton}
    onPress={onPress}
    accessible
    accessibilityLabel="Go to my location"
  >
    <MaterialIcons name="my-location" size={28} color="#fff" />
  </TouchableOpacity>
);

const CustomMapViewComponent = React.memo(({
  mapRef,
  region,
  mapStyle,
  currentLocation,
}: {
  mapRef: React.RefObject<MapView>;
  region: any;
  mapStyle: string;
  currentLocation: any;
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
  >
    {currentLocation && (
      <Marker coordinate={currentLocation} title="Your Location">
        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../../assets/icons/image.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>
      </Marker>
    )}
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
  const [region, setRegion] = useState({
    latitude: 14.7006,
    longitude: 120.9836,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [mapStyle, setMapStyle] = useState<"standard" | "dark">("standard");
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const mapRef = useRef<MapView>(null);

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
    } catch (error) {
      alert("Error getting current location.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleMapStyle = useCallback(() => {
    setMapStyle(prev => (prev === "standard" ? "dark" : "standard"));
  }, []);

  const goToMyLocation = useCallback(() => {
    if (currentLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        ...currentLocation,
        latitudeDelta: 0.0005,
        longitudeDelta: 0.0005,
      }, 1000);
    }
  }, [currentLocation]);

  const handleOpenDrawer = () => setIsMenuVisible(true);
  const handleCloseDrawer = () => setIsMenuVisible(false);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const reset = async () => {
        if (isActive) {
          // Nothing needed here for modal
        }
      };

      reset();
      return () => { isActive = false; };
    }, [])
  );

  useEffect(() => {
    getCurrentLocation();
  }, [getCurrentLocation]);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
        {/* Modal Menu */}
        <Modal
          
          transparent={true}
          visible={isMenuVisible}
          onRequestClose={handleCloseDrawer}
        >
          <TouchableWithoutFeedback onPress={handleCloseDrawer}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.modalContent}>
                  <Text style={styles.menuHeader}>Menu</Text>

                  <TouchableOpacity
                    onPress={() => {
                      handleCloseDrawer();
                      navigation.navigate("MapScreenTry");
                    }}
                    style={styles.menuItem}
                  >
                    <Text>Navigate to MapScreenTry</Text>
                  </TouchableOpacity>

                  {/* Add more items here if needed */}

                  <TouchableOpacity onPress={handleCloseDrawer} style={styles.closeButton}>
                    <Text style={{ color: "white" }}>Close</Text>
                  </TouchableOpacity>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        {/* Menu Button */}
        <TouchableOpacity
          onPress={handleOpenDrawer}
          style={styles.menuButton}
          accessible
          accessibilityLabel="Menu"
        >
          <MaterialIcons name="menu" size={36} color="blue" />
        </TouchableOpacity>

        <CustomMapViewComponent
          mapRef={mapRef}
          region={region}
          mapStyle={mapStyle}
          currentLocation={currentLocation}
        />

        {isLoading && (
          <ActivityIndicator
            size="large"
            color="#3498db"
            style={styles.loadingContainer}
          />
        )}

        <FAB
          onPress={() => navigation.navigate("MapScreenTry")}
          label="Where to?"
        />

        <MyLocationButton onPress={goToMyLocation} />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  menuButton: {
    position: "absolute",
    top: 40,
    left: 10,
    padding: 1,
    borderRadius: 5,
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
    position: "absolute",
    top: 100,
    left: 10,
    right: 10,
    alignSelf: "center",
    backgroundColor: "#3498db",
    padding: 16,
    borderRadius: 10,
    elevation: 5,
  },
  fabText: {
    color: "#000",
    fontSize: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  myLocationButton: {
    position: "absolute",
    bottom: 20,
    right: 10,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 30,
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
