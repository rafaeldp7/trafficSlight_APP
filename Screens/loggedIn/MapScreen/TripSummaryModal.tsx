// components/Modals/TripSummaryModal.tsx
import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { RouteData, LocationCoords } from "../MapScreenTry111";  

export default function TripSummaryModal({
  visible,
  route,
  motor,
  destination,
  onClose,
}) {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.box}>
          <Text style={styles.title}>Trip Completed</Text>

          <View style={styles.row}>
            <MaterialIcons name="place" size={20} color="#e74c3c" />
            <Text style={styles.text}>To: {destination?.address}</Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="directions-car" size={20} color="#3498db" />
            <Text style={styles.text}>
              Distance: {(route.distance / 1000).toFixed(2)} km
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
            <Text style={styles.text}>
              Fuel Used: {route.fuelEstimate.toFixed(2)} L
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="two-wheeler" size={20} color="#1abc9c" />
            <Text style={styles.text}>
              Motor Used: {motor.name} ({motor.fuelEfficiency} km/L)
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  box: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    width: "85%",
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2c3e50",
    marginBottom: 20,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "#2c3e50",
    marginLeft: 12,
    flex: 1,
  },
  closeBtn: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  closeText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
