import React from "react";
import {
  Modal,
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

// You can import these from a shared constants/utils file
const FUEL_EFFICIENCY = 50;

const formatETA = (duration: number): string => {
  const eta = new Date(Date.now() + duration * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// You can import this from a shared types file
type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: { latitude: number; longitude: number }[];
};

type TripSummaryModalProps = {
  visible: boolean;
  summary: RouteData | null;
  onClose: () => void;
};

const TripSummaryModal = ({ visible, summary, onClose }: TripSummaryModalProps) => {
  if (!summary) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.tripSummaryContainer}>
          <Text style={styles.tripSummaryTitle}>Trip Completed</Text>
          <Text>Distance: {(summary.distance / 1000).toFixed(2)} km</Text>
          <Text>ETA: {formatETA(summary.duration)}</Text>
          <Text>
            Gas Consumed: {((summary.distance / 1000) / FUEL_EFFICIENCY).toFixed(2)} L
          </Text>
          <Text>Time Arrived: {formatETA(summary.duration)}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeSummaryButton}>
            <Text style={styles.closeSummaryText}>Close Summary</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default TripSummaryModal;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  tripSummaryContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  tripSummaryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  closeSummaryButton: {
    marginTop: 20,
    backgroundColor: "#3498db",
    padding: 10,
    borderRadius: 5,
  },
  closeSummaryText: {
    color: "#fff",
    fontSize: 16,
  },
});
