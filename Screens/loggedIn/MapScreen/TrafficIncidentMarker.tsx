// components/Map/TrafficIncidentMarker.tsx
import React from "react";
import { Marker } from "react-native-maps";
import { View, Text, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { TrafficIncident } from "../MapScreenTry111";

export default function TrafficIncidentMarker({ incident }: { incident: TrafficIncident }) {
  return (
    <Marker coordinate={incident.location}>
      <View style={styles.container}>
        <MaterialIcons name="report-problem" size={24} color="#e67e22" />
        <Text style={styles.label}>{incident.type}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    alignItems: "center",
    elevation: 4,
  },
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2c3e50",
  },
});
