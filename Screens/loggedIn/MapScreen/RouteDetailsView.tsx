import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";

const RouteDetailsDrawer = ({
  selectedTab,
  setSelectedTab,
  alternativeRoutes = [],
  selectedAlternativeIndex,
  setSelectedAlternativeIndex,
  sortingCriteria,
  handleSortingChange,
  estimatedFuelUsage,
  startNavigation,
  destination,
  getDistance,
  computeDistanceFromCoordinates, // Optional function
  setRouteDetailsVisible,
  styles,
}) => {
  const selectedRoute =
    selectedAlternativeIndex !== null ? alternativeRoutes[selectedAlternativeIndex] : null;

  const distanceValue =
    selectedRoute?.distance ??
    (selectedRoute?.coordinates && computeDistanceFromCoordinates
      ? computeDistanceFromCoordinates(selectedRoute.coordinates, getDistance)
      : null);

  const etaValue = selectedRoute?.eta ?? selectedRoute?.duration ?? distanceValue ?? null;

  const trafficLevelValue = selectedRoute?.trafficLevel ?? "N/A";

  const renderSortingButtons = () => {
    const options = [
      { label: "Short Dist. w/ Traffic", value: "short_distance_with_traffic" },
      { label: "Long Dist. No Traffic", value: "long_distance_no_traffic" },
      { label: "Long Dist. Low Gas", value: "long_distance_low_gas" },
      { label: "Shortest Dist.", value: "shortest_distance" },
      { label: "Lowest Gas", value: "lowest_gas_consumption" },
    ];

    return (
      <ScrollView horizontal style={styles.sortingContainer}>
        {options.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[styles.sortButton, sortingCriteria === item.value && styles.sortButtonActive]}
            onPress={() => handleSortingChange(item.value)}
          >
            <Text style={styles.sortButtonText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  return (
    <Animated.View style={styles.routeDetailsDrawer}>
      <View style={styles.routeDetailsHeader}>
        <TouchableOpacity>
          <Text style={styles.destinationText}>
            {destination?.address ?? "📍 Select Destination"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.drawerTabs}>
        <TouchableOpacity
          onPress={() => {
            setSelectedTab("details");
            if (alternativeRoutes.length > 0) setSelectedAlternativeIndex(0);
          }}
        >
          <Text style={[styles.drawerTabText, selectedTab === "details" && styles.drawerActiveTab]}>
            Details
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedTab("alternatives")}>
          <Text
            style={[
              styles.drawerTabText,
              selectedTab === "alternatives" && styles.drawerActiveTab,
            ]}
          >
            Alternatives
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alternatives View */}
      {selectedTab === "alternatives" && (
        <>
          {renderSortingButtons()}
          <View style={styles.drawerContent}>
            {alternativeRoutes.length > 0 ? (
              alternativeRoutes.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.altRouteOption,
                    selectedAlternativeIndex === index && styles.altRouteOptionSelected,
                  ]}
                  onPress={() => setSelectedAlternativeIndex(index)}
                >
                  <Text>{`Option ${index + 1}`}</Text>
                </TouchableOpacity>
              ))
            ) : (
              <Text>No alternative routes available.</Text>
            )}
          </View>
        </>
      )}

      {/* Details View */}
      {selectedTab === "details" && (
        <View style={styles.drawerContent}>
          <Text>
            {`Estimated Fuel (Range): ${
              estimatedFuelUsage
                ? `${(estimatedFuelUsage * 0.9).toFixed(2)}L - ${(estimatedFuelUsage * 1.1).toFixed(2)}L`
                : "N/A"
            }`}
          </Text>
          <Text>{`Total Distance: ${distanceValue ? `${distanceValue.toFixed(2)} km` : "N/A"}`}</Text>
          <Text>{`Estimated Time of Arrival: ${etaValue ? `${etaValue.toFixed(1)} min` : "N/A"}`}</Text>
          <Text>{`Traffic Level: ${trafficLevelValue}`}</Text>
        </View>
      )}

      {/* Start Navigation */}
      <TouchableOpacity
        style={[styles.goButton, !selectedRoute && styles.disabledButton]}
        onPress={startNavigation}
        disabled={!selectedRoute}
        accessibilityLabel="Start Navigation"
      >
        <Text style={styles.goButtonText}>Start Navigation</Text>
      </TouchableOpacity>

      {/* Cancel Button */}
      <TouchableOpacity
        style={styles.goButton}
        onPress={() => setRouteDetailsVisible(false)}
        accessibilityLabel="Cancel and Close Drawer"
      >
        <Text style={styles.goButtonText}>Cancel</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default RouteDetailsDrawer;
