import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";

type ControlsProps = {
  onGetRoute: () => void;
  onReroute: () => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  isNavigating: boolean;
  hasRoute: boolean;
};

const Controls = ({
  onGetRoute,
  onReroute,
  onStartNavigation,
  onStopNavigation,
  isNavigating,
  hasRoute,
}: ControlsProps) => (
  <>
    <TouchableOpacity onPress={onGetRoute} style={styles.getrouteButton}>
      <Text style={styles.rerouteText}>Get Route</Text>
    </TouchableOpacity>

    <TouchableOpacity onPress={onReroute} style={styles.rerouteButton}>
      <Text style={styles.rerouteText}>Reroute</Text>
    </TouchableOpacity>

    {hasRoute && !isNavigating && (
      <TouchableOpacity onPress={onStartNavigation} style={styles.getrouteButton}>
        <Text style={styles.rerouteText}>Start Navigation</Text>
      </TouchableOpacity>
    )}

    {isNavigating && (
      <TouchableOpacity onPress={onStopNavigation} style={styles.getrouteButton}>
        <Text style={styles.rerouteText}>Stop Navigation</Text>
      </TouchableOpacity>
    )}
  </>
);

export default Controls;

const styles = StyleSheet.create({
  getrouteButton: {
    position: "absolute",
    top: 60,
    right: 20,
    left: 20,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  rerouteButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 30,
    elevation: 5,
  },
  rerouteText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});
