import React from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";

type Props = {
  visible: boolean;
  onClose: () => void;
  destination?: string;
  startAddress?: string;
  distance?: { planned: number; actual: number };
  fuelUsed?: { planned: number; actual: number };
  eta?: string;
  arrivalTime?: string;
  duration?: { planned: number; actual: number };
  motorUsed?: { name: string; efficiency: number };
};

const TripSummaryModal: React.FC<Props> = ({
  visible,
  onClose,
  destination = "Unknown",
  startAddress = "Unknown",
  distance = { planned: 0, actual: 0 },
  fuelUsed = { planned: 0, actual: 0 },
  eta = "--",
  arrivalTime = "--",
  duration = { planned: 0, actual: 0 },
  motorUsed,
}) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Trip Summary</Text>

          <View style={styles.row}>
            <MaterialIcons name="my-location" size={20} color="#34495e" />
            <Text style={styles.text}>From: {startAddress}</Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="place" size={20} color="#e74c3c" />
            <Text style={styles.text}>Destination: {destination}</Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="directions-car" size={20} color="#3498db" />
            <Text style={styles.text}>
              Distance: {distance.planned.toFixed(2)} km → Actual: {distance.actual.toFixed(2)} km
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
            <Text style={styles.text}>
              Fuel Used: {fuelUsed.planned.toFixed(2)} L → Actual: {fuelUsed.actual.toFixed(2)} L
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="schedule" size={20} color="#9b59b6" />
            <Text style={styles.text}>ETA: {eta} → Arrived: {arrivalTime}</Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="timelapse" size={20} color="#34495e" />
            <Text style={styles.text}>
              Duration: {duration.planned.toFixed(1)} mins → Actual: {duration.actual.toFixed(1)} mins
            </Text>
          </View>

          <View style={styles.row}>
            <MaterialIcons name="two-wheeler" size={20} color="#1abc9c" />
            <Text style={styles.text}>
              Motor: {motorUsed?.name || "--"} ({motorUsed?.efficiency || "--"} km/L)
            </Text>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TripSummaryModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
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
  closeButton: {
    backgroundColor: "#3498db",
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  closeButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
