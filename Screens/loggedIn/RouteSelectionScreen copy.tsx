import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import * as Location from "expo-location";
import "react-native-get-random-values";
import "react-native-gesture-handler"; // Only load on native platforms
import { useFocusEffect } from "@react-navigation/native";

// Menu Button Component to open the Drawer
const MenuButton = ({ onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.menuButton}
    accessible
    accessibilityLabel="Menu"
  >
    <MaterialIcons name="menu" size={36} color="blue" />
  </TouchableOpacity>
);

// Toggle Map Style Button inside the drawer's navigation view
const ToggleMapStyleButton = ({ mapStyle, toggle }) => (
  <TouchableOpacity
    style={styles.styleToggle}
    onPress={toggle}
    accessible
    accessibilityLabel="Toggle map style"
  >
    <MaterialIcons
      name={mapStyle === "standard" ? "wb-sunny" : "nightlight-round"}
      size={30}
      color="yellow"
    />
  </TouchableOpacity>
);

// Floating Action Button (FAB)
const FAB = ({ onPress, label }) => (
  <TouchableOpacity
    style={styles.fab}
    onPress={onPress}
    accessible
    accessibilityLabel={label}
  >
    <Text style={styles.fabText}>{label}</Text>
  </TouchableOpacity>
);

// My Location Button to center map on your current location
const MyLocationButton = ({ onPress }) => (
  <TouchableOpacity
    style={styles.myLocationButton}
    onPress={onPress}
    accessible
    accessibilityLabel="Go to my location"
  >
    <MaterialIcons name="my-location" size={28} color="#fff" />
  </TouchableOpacity>
);

// Custom MapView Component
const CustomMapViewComponent = ({ mapRef, region, mapStyle, currentLocation }) => (
  <MapView
    ref={mapRef}
    style={styles.map}
    provider={PROVIDER_GOOGLE}
    region={region}
    customMapStyle={
      mapStyle === "dark"
        ? [
            { elementType: "geometry", stylers: [{ color: "#212121" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#383838" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
            { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
          ]
        : []
    }
    showsUserLocation
    showsTraffic
    showsMyLocationButton={false}
  >
    {currentLocation && (
      <Marker
        coordinate={currentLocation}
        title="Your Location"
        description="This is where you are."
      >
        <View style={{ alignItems: "center" }}>
          <Image
            source={require("../assets/icons/image.png")}
            style={{ width: 40, height: 40 }}
            resizeMode="contain"
          />
        </View>
      </Marker>
    )}
  </MapView>
);

const RouteSelectionScreen = ({ navigation }) => {
  const [region, setRegion] = useState({
    latitude: 14.7006,
    longitude: 120.9836,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [currentLocation, setCurrentLocation] = useState(null);
  const [mapStyle, setMapStyle] = useState("standard");
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = useRef(null);
  const drawer = useRef(null);

  // useFocusEffect runs every time the screen is focused.
  useFocusEffect(
    React.useCallback(() => {
      console.log("RouteSelectionScreen focused");
      if (drawer.current) {
        console.log("Drawer ref is active on focus");
      } else {
        console.log("Drawer ref is missing on focus");
      }
    }, [])
  );

  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Get current location and update region
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
      const newRegion = {
        ...userLocation,
        latitudeDelta: 0.0015,
        longitudeDelta: 0.0015,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
      setIsLoading(false);
    } catch (error) {
      alert("Error getting current location.");
      setIsLoading(false);
    }
  };

  const toggleMapStyle = () =>
    setMapStyle((prev) => (prev === "standard" ? "dark" : "standard"));

  const goToMyLocation = () => {
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
  };

  // Programmatically open the drawer with a slight delay.
  const handleOpenDrawer = () => {
    setTimeout(() => {
      drawer.current?.openDrawer();
    }, 100);
  };

  // Navigation view for the Drawer
  const navigationView = () => (
    <View style={styles.drawerContainer}>
      <Text style={styles.drawerTitle}>Menu</Text>
      <TouchableOpacity
        style={styles.drawerCloseButton}
        onPress={() => drawer.current?.closeDrawer()}
        accessible
        accessibilityLabel="Close menu"
      >
        <MaterialIcons name="close" size={28} color="black" />
      </TouchableOpacity>
      <ToggleMapStyleButton mapStyle={mapStyle} toggle={toggleMapStyle} />
      {/* Additional menu items can be added here */}
    </View>
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 64 : 0}
      >
          <MenuButton onPress={handleOpenDrawer} />
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
          <FAB onPress={() => navigation.navigate("MapScreenTry")} label="Where to?" />
          <MyLocationButton onPress={goToMyLocation} />

      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default RouteSelectionScreen;

const styles = StyleSheet.create({
  // Drawer styles
  drawerContainer: {
    flex: 1,
    backgroundColor: "#ecf0f1",
    padding: 16,
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
  },
  drawerCloseButton: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  // Map and screen elements
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
  styleToggle: {
    backgroundColor: "blue",
    padding: 8,
    borderRadius: 50,
    marginBottom: 20,
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
});
