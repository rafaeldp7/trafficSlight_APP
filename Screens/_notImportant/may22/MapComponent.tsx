import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { GOOGLE_MAPS_API_KEY } from "@env";

// Constants (can be moved to a shared constants file)
const FUEL_EFFICIENCY = 50;
const DEFAULT_TRAFFIC_RATE = 1;

// Dummy dark style (replace with your actual style object if needed)
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
];

// Type definition (if not imported)
type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: { latitude: number; longitude: number }[];
};

type CustomMapViewProps = {
  mapRef: React.RefObject<MapView>;
  region: any;
  mapStyle: string;
  currentLocation: { latitude: number; longitude: number } | null;
  destination: { latitude: number; longitude: number; address?: string } | null;
  route: RouteData | null;
  selectedTab: string;
  selectedAlternativeIndex: number | null;
  alternativeRoutes: RouteData[];
  onRouteReady: (result: any, routeData: RouteData, alternatives: RouteData[]) => void;
};

const MapComponent = ({
  mapRef,
  region,
  mapStyle,
  currentLocation,
  destination,
  route,
  selectedTab,
  selectedAlternativeIndex,
  alternativeRoutes,
  onRouteReady,
}: CustomMapViewProps) => {
  return (
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
      {route && (
        <Polyline coordinates={route.coordinates} strokeColor="#3498db" strokeWidth={6} />
      )}

      {selectedTab === "details" && route && destination && (
        <MapViewDirections
          origin={currentLocation!}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={9}
          strokeColor="#3498db"
          optimizeWaypoints
          mode="DRIVING"
          onReady={(result) => {
            const bestRoute: RouteData = {
              id: "best",
              distance: result.distance * 1000,
              duration: result.duration * 60,
              fuelEstimate: result.distance / FUEL_EFFICIENCY,
              trafficRate: DEFAULT_TRAFFIC_RATE,
              coordinates: result.coordinates,
            };
            onRouteReady(result, bestRoute, []);
          }}
        />
      )}

      {selectedAlternativeIndex !== null &&
        alternativeRoutes[selectedAlternativeIndex] && (
          <Polyline
            coordinates={alternativeRoutes[selectedAlternativeIndex].coordinates}
            strokeColor="#e74c3c"
            strokeWidth={9}
          />
        )}

      {currentLocation && (
        <Marker coordinate={currentLocation} title="Your Location">
          <Image source={require("../assets/icons/image.png")} style={styles.markerImage} />
        </Marker>
      )}

      {destination && (
        <Marker coordinate={destination} title="Destination" description={destination?.address}>
          <Image
            source={require("../assets/icons/checkered-flag.jpg")}
            style={styles.markerImage}
          />
        </Marker>
      )}
    </MapView>
  );
};

export default MapComponent;

const styles = StyleSheet.create({
  map: {
    width: "100%",
    height: Dimensions.get("window").height,
  },
  markerImage: {
    width: 40,
    height: 40,
  },
});
