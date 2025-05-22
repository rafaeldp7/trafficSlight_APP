import React from "react";
import { View, Image } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import styles from "./CustomMapView.styles"; // Your external styles
import { GOOGLE_MAPS_API_KEY } from "../config";

const CustomMapView = ({
  mapRef,
  region,
  mapStyle = "default",
  currentLocation,
  destination,
  route,
  selectedTab,
  selectedAlternativeIndex,
  alternativeRoutes = [],
  onRouteReady,
}) => {
  const darkStyle = [
    { elementType: "geometry", stylers: [{ color: "#212121" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#ffffff" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#000000" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#383838" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
    { featureType: "poi", elementType: "geometry", stylers: [{ color: "#2c2c2c" }] },
  ];

  const fallbackRegion = {
    latitude: 14.5995,
    longitude: 120.9842,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  return (
    <MapView
      ref={mapRef}
      style={styles.map}
      provider={PROVIDER_GOOGLE}
      region={region || fallbackRegion}
      customMapStyle={mapStyle === "dark" ? darkStyle : []}
      showsUserLocation
      showsTraffic
      showsMyLocationButton={false}
    >
      {/* Route directions (only if valid and tab is 'details') */}
      {route?.origin && route?.destination && selectedTab === "details" && (
        <MapViewDirections
          origin={route.origin}
          destination={route.destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={9}
          strokeColor="#3498db"
          optimizeWaypoints
          alternatives
          avoid="tolls|highways"
          mode="driving" // ✅ valid Google API value
          onReady={onRouteReady}
        />
      )}

      {/* Alternative routes (only if selected) */}
      {selectedTab === "alternatives" &&
        selectedAlternativeIndex !== null &&
        alternativeRoutes[selectedAlternativeIndex] && (
          <Polyline
            coordinates={alternativeRoutes[selectedAlternativeIndex].coordinates}
            strokeColor="#e74c3c"
            strokeWidth={6}
          />
        )}

      {/* Current Location Marker */}
      {currentLocation && (
        <Marker coordinate={currentLocation} title="Your Location">
          <Image
            source={require("../assets/icons/current-location.png")} // ✅ use PNG
            style={styles.markerImage}
            resizeMode="contain"
          />
        </Marker>
      )}

      {/* Destination Marker */}
      {destination && (
        <Marker coordinate={destination} title="Destination" description={destination?.address}>
          <Image
            source={require("../assets/icons/checkered-flag.png")} // ✅ changed to PNG
            style={styles.markerImage}
            resizeMode="contain"
          />
        </Marker>
      )}
    </MapView>
  );
};

export default CustomMapView;
