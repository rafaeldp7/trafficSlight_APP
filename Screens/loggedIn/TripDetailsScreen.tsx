import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { useUser } from "../../AuthContext/UserContext";

const API_BASE = "https://ts-backend-1-jyit.onrender.com";

export default function TripScreen() {
  const { user } = useUser();
  const [trips, setTrips] = useState([]);
  const [summary, setSummary] = useState({
    totalTrips: 0,
    totalDistance: 0,
    totalFuel: 0,
    totalTime: 0,
    totalExpense: 0,
  });
  const [filter, setFilter] = useState("month");
  const [motors, setMotors] = useState([]);
  const [selectedMotor, setSelectedMotor] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/api/trips/user/${user._id}`);
      const data = res.data;

      const now = new Date();
      const filtered = data.filter((trip) => {
        const created = new Date(trip.createdAt);
        if (selectedMotor && trip.motorId?._id !== selectedMotor) return false;

        if (filter === "today") {
          return created.toDateString() === now.toDateString();
        } else if (filter === "week") {
          const diff = (now - created) / (1000 * 60 * 60 * 24);
          return diff <= 7;
        } else {
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
        }
      });

      const totals = {
        totalTrips: filtered.length,
        totalDistance: filtered.reduce((acc, t) => acc + t.distance, 0),
        totalFuel: filtered.reduce((acc, t) => acc + t.fuelUsed, 0),
        totalTime: filtered.reduce((acc, t) => acc + t.timeArrived, 0),
        totalExpense: filtered.reduce((acc, t) => acc + t.fuelUsed * 100, 0),
      };

      setTrips(filtered);
      setSummary(totals);
    } catch (err) {
      console.error("Trip fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, selectedMotor]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    axios.get(`${API_BASE}/api/user-motors/user/${user._id}`)
      .then(res => setMotors(res.data))
      .catch(err => console.error("Failed to fetch motors:", err));
  }, []);

  const formatTime = (min: number) => {
    const hr = Math.floor(min / 60);
    const rem = min % 60;
    return hr > 0 ? `${hr}h ${rem}m` : `${rem} min`;
  };

  const TripCard = ({ trip }) => (
    <View style={styles.tripCard}>
      <View style={styles.tripHeader}>
        <Ionicons name="bicycle" size={18} color="#007AFF" />
        <Text style={styles.tripTitle}>{trip.motorId?.nickname || trip.motorId?.model || "Motor"}</Text>
      </View>
      <Text style={styles.tripText}><Ionicons name="map-outline" size={16} /> {trip.distance.toFixed(1)} km</Text>
<Text style={styles.tripText}>
  <Ionicons name="time-outline" size={16} />
  ETA: {trip.eta || "N/A"} / Arrived: {trip.timeArrived || "N/A"}
</Text>
<Text style={styles.tripText}>
  <Ionicons name="timer-outline" size={16} />
  Duration: {trip.duration ? `${trip.duration} min` : "N/A"}
</Text>

      <Text style={styles.tripText}><Ionicons name="location-outline" size={16} /> {trip.destination}</Text>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {
        setRefreshing(true);
        fetchTrips();
      }} />}
    >
      <Text style={styles.header}>Trip Summary</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}><Ionicons name="car-outline" size={20} color="#007AFF" /><Text>{summary.totalTrips} trips</Text></View>
        <View style={styles.summaryBox}><Ionicons name="map-outline" size={20} color="#007AFF" /><Text>{summary.totalDistance.toFixed(1)} km</Text></View>
        <View style={styles.summaryBox}><Ionicons name="water-outline" size={20} color="#007AFF" /><Text>{summary.totalFuel.toFixed(1)} L</Text></View>
      </View>
      <View style={styles.summaryRow}>
        <View style={styles.summaryBox}><Ionicons name="time-outline" size={20} color="#007AFF" /><Text>{formatTime(summary.totalTime)}</Text></View>
        <View style={styles.summaryBox}><Ionicons name="cash-outline" size={20} color="#007AFF" /><Text>₱{summary.totalExpense.toFixed(2)}</Text></View>
      </View>

      <Text style={styles.header}>Filter</Text>
      <View style={styles.filterRow}>
        {["today", "week", "month"].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={styles.filterText}>{f === "today" ? "Today" : f === "week" ? "Last 7d" : "This Month"}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.header}>By Motor</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
        <TouchableOpacity
          style={[styles.filterBtn, selectedMotor === null && styles.filterActive]}
          onPress={() => setSelectedMotor(null)}
        >
          <Text style={styles.filterText}>All</Text>
        </TouchableOpacity>
        {motors.map((m) => (
          <TouchableOpacity
            key={m._id}
            style={[styles.filterBtn, selectedMotor === m._id && styles.filterActive]}
            onPress={() => setSelectedMotor(m._id)}
          >
            <Text style={styles.filterText}>{m.nickname || m.motorcycleId?.model}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : trips.length === 0 ? (
        <Text style={styles.noTrips}>No trips found.</Text>
      ) : (
        trips.map((trip) => <TripCard key={trip._id} trip={trip} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  header: { fontSize: 18, fontWeight: "bold", marginVertical: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  summaryBox: {
    flex: 1,
    marginHorizontal: 5,
    backgroundColor: "#f2f2f2",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 2, elevation: 2
  },
  filterRow: { flexDirection: "row", marginBottom: 10 },
  filterBtn: {
    backgroundColor: "#eee",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterActive: {
    backgroundColor: "#007AFF",
  },
  filterText: {
    color: "#000",
    fontWeight: "500",
  },
  tripCard: {
    backgroundColor: "#fafafa",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderColor: "#e0e0e0",
    borderWidth: 1,
  },
  tripHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  tripTitle: {
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 16,
  },
  tripText: {
    fontSize: 14,
    marginBottom: 4,
    color: "#333",
  },
  noTrips: {
    marginTop: 20,
    textAlign: "center",
    color: "gray",
  },
});
