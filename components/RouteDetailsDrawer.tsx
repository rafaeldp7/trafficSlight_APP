import React, { memo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

type RouteData = {
  summary: string;
  distance: string;
  duration: string;
  polyline: { latitude: number; longitude: number }[];
};

type RouteDetailsDrawerProps = {
  selectedTab: number;
  setSelectedTab: (tab: number) => void;
  alternativeRoutes: RouteData[];
  selectedAlternativeIndex: number;
  setSelectedAlternativeIndex: (index: number) => void;
  sortingCriteria: string;
  handleSortingChange: (criteria: string) => void;
  estimatedFuelUsage: number | null;
  setRouteDetailsVisible: (visible: boolean) => void;
};

const RouteDetailsDrawer: React.FC<RouteDetailsDrawerProps> = ({
  selectedTab,
  setSelectedTab,
  alternativeRoutes,
  selectedAlternativeIndex,
  setSelectedAlternativeIndex,
  sortingCriteria,
  handleSortingChange,
  estimatedFuelUsage,
  setRouteDetailsVisible,
}) => {
  return (
    <View style={styles.drawerContainer}>
      <Text style={styles.title}>Route Details</Text>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 0 && styles.activeTab,
          ]}
          onPress={() => setSelectedTab(0)}
        >
          <Text>Routes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 1 && styles.activeTab,
          ]}
          onPress={() => setSelectedTab(1)}
        >
          <Text>Fuel Usage</Text>
        </TouchableOpacity>
      </View>

      {selectedTab === 0 && (
        <View style={styles.routeOptions}>
          {alternativeRoutes.map((route, index) => (
            <View key={index} style={styles.routeCard}>
              <Text style={styles.routeSummary}>
                Route {index + 1}: {route.summary || "Unnamed"}
              </Text>
              <Text>Distance: {route.distance}</Text>
              <Text>Duration: {route.duration}</Text>
            </View>
          ))}
        </View>
      )}

      {selectedTab === 1 && estimatedFuelUsage !== null && (
        <View style={styles.fuelUsageContainer}>
          <Text>Estimated Fuel Usage: {estimatedFuelUsage} liters</Text>
        </View>
      )}

      <TouchableOpacity onPress={() => setRouteDetailsVisible(false)} style={styles.closeButton}>
        <Text style={styles.closeButtonText}>Close</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  drawerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tabContainer: {
    flexDirection: "row",
    marginVertical: 10,
  },
  tab: {
    padding: 10,
    flex: 1,
    alignItems: "center",
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "blue",
  },
  routeOptions: {
    marginVertical: 10,
  },
  routeCard: {
    padding: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    borderRadius: 5,
  },
  routeSummary: {
    fontWeight: "bold",
  },
  fuelUsageContainer: {
    marginVertical: 10,
  },
  closeButton: {
    marginTop: 20,
    backgroundColor: "red",
    padding: 10,
    borderRadius: 5,
  },
  closeButtonText: {
    color: "white",
    textAlign: "center",
  },
});

export default memo(RouteDetailsDrawer);
