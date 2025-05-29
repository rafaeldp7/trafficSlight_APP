import React from "react";
import { Image, StyleSheet } from "react-native";
import MapView, { Marker, UrlTile, PROVIDER_GOOGLE } from "react-native-maps";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

const getReportIcon = (type: string) => {
  switch (type) {
    case "Accident":
      return require("../../../../assets/icons/accident.png");
    case "Police":
      return require("../../../../assets/icons/police.png");
    default:
      return require("../../../../assets/icons/default.png");
  }
};

type Location = {
  latitude: number;
  longitude: number;
};

type Report = {
  location: Location;
  reportType: string;
  description: string;
  timestamp: string;
};

type GasStation = {
  location: {
    coordinates: [number, number]; // [lng, lat]
  };
  name: string;
  brand: string;
  fuelPrices?: {
    gasoline?: number;
    diesel?: number;
  };
};

type Props = {
  mapRef: React.RefObject<MapView>;
  region: any;
  mapStyle: "standard" | "dark";
  currentLocation: Location | null;
  reportMarkers: Report[];
  gasStations: GasStation[];
  showReports?: boolean;
  showGasStations?: boolean;
  useOfflineTiles?: boolean;
};

const CustomMapViewComponent: React.FC<Props> = ({
  mapRef,
  region,
  mapStyle,
  currentLocation,
  reportMarkers,
  gasStations,
  showReports = true,
  showGasStations = true,
  useOfflineTiles = false,
}) => {
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
      {useOfflineTiles && (
        <UrlTile
          urlTemplate="http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
      )}

      {/* User Marker */}
      {currentLocation && (
        <Marker coordinate={currentLocation} title="Your Location">
          <Image
            style={styles.userMarker}
            source={require("../../../../assets/icons/User-onTrack-MARKER.png")}
          />
        </Marker>
      )}

      {/* Report Markers */}
      {showReports &&
        reportMarkers.map((report, index) => (
          <Marker
            key={`report-${index}`}
            coordinate={report.location}
            title={report.reportType}
            description={`${report.description} - ${new Date(
              report.timestamp
            ).toLocaleString()}`}
          >
            <Image source={getReportIcon(report.reportType)} style={styles.iconMarker} />
          </Marker>
        ))}

      {/* Gas Stations */}
      {showGasStations &&
        gasStations.map((station, index) => (
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
  );
};

export default React.memo(CustomMapViewComponent);

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
  userMarker: {
    width: 50,
    height: 50,
    resizeMode: "contain",
  },
  iconMarker: {
    width: 35,
    height: 35,
  },
});

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
];
