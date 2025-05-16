import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: { latitude: number; longitude: number }[];
};

type RouteDetailsBottomSheetProps = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedAlternativeId: string | null;
  onSelectAlternative: (routeId: string) => void;
};

const RouteDetailsBottomSheet = ({
  visible,
  bestRoute,
  alternatives,
  onClose,
  selectedAlternativeId,
  onSelectAlternative,
}: RouteDetailsBottomSheetProps) => {
  const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">("distance");
  const [sortedAlternatives, setSortedAlternatives] = useState<RouteData[]>(alternatives);

  useEffect(() => {
    const sorted = [...alternatives].sort((a, b) => {
      if (sortCriteria === "fuel") return a.fuelEstimate - b.fuelEstimate;
      if (sortCriteria === "traffic") return a.trafficRate - b.trafficRate;
      return a.distance - b.distance;
    });
    setSortedAlternatives(sorted);
  }, [sortCriteria, alternatives]);

  if (!visible) return null;

  return (
    <View style={styles.bottomSheetContainer}>
      <View style={styles.bottomSheetHeader}>
        <Text style={styles.bottomSheetTitle}>Route Details</Text>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="close" size={24} color="black" />
        </TouchableOpacity>
      </View>

      <ScrollView>
        {bestRoute && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Trip Summary</Text>
            <Text style={{ fontSize: 18, fontWeight: "bold" }}>
              Fuel Estimate: {(bestRoute.fuelEstimate * 0.9).toFixed(2)} -{" "}
              {(bestRoute.fuelEstimate * 1.1).toFixed(2)} L
            </Text>
            <Text>Distance: {(bestRoute.distance / 1000).toFixed(2)} km</Text>
            <Text>ETA: {(bestRoute.duration / 60).toFixed(0)} min</Text>
            <Text>Traffic Rate: {bestRoute.trafficRate}</Text>
          </View>
        )}

        <View style={styles.sortOptionsContainer}>
          <Text style={styles.sectionTitle}>Sort Alternatives By:</Text>
          {["fuel", "traffic", "distance"].map((criteria) => (
            <TouchableOpacity
              key={criteria}
              style={[
                styles.sortButton,
                sortCriteria === criteria && styles.activeSortButton,
              ]}
              onPress={() => setSortCriteria(criteria as any)}
            >
              <Text style={styles.sortButtonText}>{criteria.toUpperCase()}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.alternativesContainer}>
          <Text style={styles.sectionTitle}>Alternative Routes</Text>
          {sortedAlternatives.map((routeItem) => (
            <TouchableOpacity
              key={routeItem.id}
              style={[
                styles.routeItem,
                routeItem.id === selectedAlternativeId && styles.activeRouteItem,
              ]}
              onPress={() => onSelectAlternative(routeItem.id)}
            >
              <Text style={{ fontWeight: "bold", fontSize: 16 }}>
                Fuel: {(routeItem.fuelEstimate * 0.9).toFixed(2)} -{" "}
                {(routeItem.fuelEstimate * 1.1).toFixed(2)} L
              </Text>
              <Text>Distance: {(routeItem.distance / 1000).toFixed(2)} km</Text>
              <Text>ETA: {(routeItem.duration / 60).toFixed(0)} min</Text>
              <Text>Traffic Rate: {routeItem.trafficRate}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default RouteDetailsBottomSheet;

const styles = StyleSheet.create({
  bottomSheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 10,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  summaryContainer: {
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  sortOptionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginRight: 10,
  },
  sortButton: {
    backgroundColor: "#eee",
    padding: 6,
    marginRight: 8,
    borderRadius: 4,
  },
  activeSortButton: {
    backgroundColor: "#3498db",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#000",
  },
  alternativesContainer: {
    marginTop: 10,
  },
  routeItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  activeRouteItem: {
    backgroundColor: "#e0f7fa",
    borderLeftWidth: 4,
    borderLeftColor: "#3498db",
  },
});
