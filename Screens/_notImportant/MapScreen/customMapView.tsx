import React, { useState } from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";

import { GOOGLE_MAPS_API_KEY } from "@env";

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
  const [eta, setEta] = useState(null); // for distance & duration display

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
    <>
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
        {route?.origin && route?.destination && selectedTab === "details" && (
          <MapViewDirections
            origin={route.origin}
            destination={route.destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={9}
            strokeColor="#3498db"
            optimizeWaypoints
            avoid="tolls|highways"
            mode="DRIVING"
            onReady={(result) => {
              setEta({
                distance: result.distance.toFixed(2),
                duration: Math.ceil(result.duration),
              });
              if (onRouteReady) onRouteReady(result);
            }}
          />
        )}

        {selectedTab === "alternatives" &&
          selectedAlternativeIndex !== null &&
          alternativeRoutes[selectedAlternativeIndex] && (
            <Polyline
              coordinates={alternativeRoutes[selectedAlternativeIndex].coordinates}
              strokeColor="#e74c3c"
              strokeWidth={6}
            />
          )}

        {currentLocation && (
          <Marker coordinate={currentLocation} title="Your Location">
            <Image
              source={require("../assets/icons/current-location.png")}
              style={styles.markerImage}
              resizeMode="contain"
            />
          </Marker>
        )}

        {destination && (
          <Marker coordinate={destination} title="Destination" description={destination?.address}>
            <Image
              source={require("../assets/icons/checkered-flag.png")}
              style={styles.markerImage}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>

      {eta && (
        <View style={styles.etaContainer}>
          <Text style={styles.etaText}>🚗 {eta.distance} km • ⏱ {eta.duration} mins</Text>
        </View>
      )}
    </>
  );
};

export default CustomMapView;

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  markerImage: {
    width: 40,
    height: 40,
  },
  etaContainer: {
    position: "absolute",
    top: 20,
    left: 20,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    padding: 10,
    borderRadius: 8,
  },
  etaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
});


