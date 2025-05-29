import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import axios from 'axios';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://ts-backend-1-jyit.onrender.com';

export default function GasStationsScreen() {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();

  useEffect(() => {
    const fetchStations = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          alert('Location permission denied');
          return;
        }

        const { coords } = await Location.getCurrentPositionAsync({});
        const res = await axios.get(
          `${API_BASE}/api/gas-stations/nearby?lat=${coords.latitude}&lng=${coords.longitude}`
        );
        setStations(res.data);
      } catch (err) {
        console.error('⛽ Fetch Gas Stations Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStations();
  }, []);

  if (loading) {
    return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Nearby Gas Stations</Text>
      <FlatList
        data={stations}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("RouteSelectionScreen", {
                focusLocation: {
                  latitude: item.location.coordinates[1],
                  longitude: item.location.coordinates[0],
                },
              })
            }
          >
            <Ionicons name="fuel" size={24} color="#333" />
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.brand}>Brand: {item.brand}</Text>
            <Text style={styles.price}>
              Gasoline: ₱{item.fuelPrices?.gasoline ?? '--'} | Diesel: ₱{item.fuelPrices?.diesel ?? '--'}
            </Text>
            <Text style={styles.address}>{item.address?.street}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flex: 1 },
  header: { fontSize: 22, fontWeight: 'bold', marginBottom: 10 },
  card: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
  },
  name: { fontSize: 16, fontWeight: 'bold' },
  brand: { fontSize: 14, color: '#555' },
  price: { fontSize: 14, color: '#333' },
  address: { fontSize: 13, color: '#666', marginTop: 4 },
});
