import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { formatETA, calculateFuelRange } from "../../utils/mapUtils";
import { Motor } from '../../../loggedIn/types';

type LocationCoords = {
  latitude: number;
  longitude: number;
};

type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: LocationCoords[];
  instructions?: string[];
};

type Props = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  selectedMotor: Motor | null;
};

const getTrafficLabel = (rate: number): string => {
  switch (rate) {
    case 1:
      return "Very Light";
    case 2:
      return "Light";
    case 3:
      return "Moderate";
    case 4:
      return "Heavy";
    case 5:
      return "Very Heavy";
    default:
      return "Unknown";
  }
};

const RouteDetailsBottomSheet: React.FC<Props> = ({
  visible,
  bestRoute,
  alternatives,
  onClose,
  selectedRouteId,
  onSelectRoute,
  selectedMotor,
}) => {
  const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">("distance");

  const sortedAlternatives = useMemo(() => {
    return [...alternatives].sort((a, b) => {
      if (sortCriteria === "fuel") return a.fuelEstimate - b.fuelEstimate;
      if (sortCriteria === "traffic") return a.trafficRate - b.trafficRate;
      return a.distance - b.distance;
    });
  }, [sortCriteria, alternatives]);

  const renderFuelRange = (fuelEstimate: number) => {
    const { min, max } = calculateFuelRange(fuelEstimate, 1); // 1 for raw estimate
    return `${min.toFixed(2)}–${max.toFixed(2)} L`;
  };

  if (!visible || !bestRoute || !selectedMotor) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Route Details</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {/* Recommended Route */}
        <View style={styles.section}>
          <TouchableOpacity
            onPress={() => onSelectRoute(bestRoute.id)}
            style={[
              styles.routeItem,
              bestRoute.id === selectedRouteId && styles.activeRouteItem,
            ]}
          >
            <Text style={styles.routeTitle}>Recommended Route</Text>
            <Text style={styles.routeStatBig}>⛽ Fuel: {renderFuelRange(bestRoute.fuelEstimate)}</Text>
            <Text style={styles.routeStat}>🛵 Motor: {selectedMotor.name} ({selectedMotor.fuelEfficiency} km/L)</Text>
            <Text style={styles.routeStat}>📏 Distance: {(bestRoute.distance / 1000).toFixed(2)} km</Text>
            <Text style={styles.routeStat}>⏱️ ETA: {formatETA(bestRoute.duration)}</Text>
            <Text style={styles.routeStat}>🚦 Traffic: {getTrafficLabel(bestRoute.trafficRate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Sort Options */}
        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>Sort Alternatives By:</Text>
          {["fuel", "traffic", "distance"].map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.sortButton, sortCriteria === c && styles.sortButtonActive]}
              onPress={() => setSortCriteria(c as any)}
            >
              <Text style={styles.sortButtonText}>{c.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Alternative Routes */}
        <View style={styles.section}>
          <Text style={styles.altTitle}>Alternative Routes</Text>
          {sortedAlternatives.map((route) => (
            <TouchableOpacity
              key={route.id}
              onPress={() => onSelectRoute(route.id)}
              style={[
                styles.routeItem,
                route.id === selectedRouteId && styles.activeRouteItem,
              ]}
            >
              <Text style={styles.routeStatBig}>⛽ Fuel: {renderFuelRange(route.fuelEstimate)}</Text>
              <Text style={styles.routeStat}>📏 Distance: {(route.distance / 1000).toFixed(2)} km</Text>
              <Text style={styles.routeStat}>⏱️ ETA: {(route.duration / 60).toFixed(0)} min</Text>
              <Text style={styles.routeStat}>🚦 Traffic: {getTrafficLabel(route.trafficRate)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default React.memo(RouteDetailsBottomSheet);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: "45%",
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
  },
  section: {
    marginBottom: 16,
  },
  routeItem: {
    backgroundColor: "#f9f9f9",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  activeRouteItem: {
    backgroundColor: "#e1f5fe",
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  routeStatBig: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 4,
  },
  routeStat: {
    fontSize: 14,
    color: "#7f8c8d",
  },
  sortRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
  },
  sortLabel: {
    marginRight: 8,
    fontWeight: "bold",
    color: "#7f8c8d",
  },
  sortButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#ecf0f1",
    borderRadius: 20,
    marginRight: 8,
    marginTop: 4,
  },
  sortButtonActive: {
    backgroundColor: "#3498db",
  },
  sortButtonText: {
    color: "#2c3e50",
    fontWeight: "bold",
    fontSize: 12,
  },
  altTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#7f8c8d",
  },
});
