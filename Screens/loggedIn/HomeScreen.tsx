import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { useUser } from '../../AuthContext/UserContext';

const API_BASE = 'https://ts-backend-1-jyit.onrender.com';

type RootStackParamList = {
  MotorDetails: { item: any };
  TripDetails: { item: any };
  AlertDetails: { item: any };
  DestinationDetails: { item: any };
  FuelLogDetails: { item: any };
  FuelCalculator: undefined;
  AddMotorScreen: undefined;
  AddFuelLogScreen: undefined;
  AddDestinationScreen: undefined;
};

type SectionProps = {
  title: string;
  data: any[];
  navTarget: keyof RootStackParamList;
  onAdd?: () => void;
};

const Section: React.FC<SectionProps> = ({ title, data, navTarget, onAdd }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {onAdd && (
          <TouchableOpacity onPress={onAdd}>
            <Text style={styles.addButton}>＋</Text>
          </TouchableOpacity>
        )}
      </View>

      {data.length === 0 ? (
        <Text style={styles.emptyText}>No {title.toLowerCase()} yet.</Text>
      ) : (
        <FlatList
          horizontal
          data={data}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate(navTarget, { item })}
            >
              <Text style={styles.itemText}>{item.nickname || item.name || 'View'}</Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          ListFooterComponent={
            onAdd ? (
              <TouchableOpacity style={styles.item} onPress={onAdd}>
                <Text style={styles.itemText}>＋ Add</Text>
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </View>
  );
};

export default function HomeScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useUser();
  const userName = user?.name || 'User';

  const [motors, setMotors] = useState([]);
  const [trips, setTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    console.log("📡 Fetching data for User ID:", user?._id);

    try {
      const [
        motorsRes,
        tripsRes,
        alertsRes,
        destinationsRes,
        logsRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/user-motors/user-motors/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/trips/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/saved-destinations/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/fuel-logs/${user._id}`).catch(() => ({ data: [] })),
      ]);

      setMotors(motorsRes.data);
      setTrips(tripsRes.data);
      setAlerts(alertsRes.data);
      setDestinations(destinationsRes.data);
      setFuelLogs(logsRes.data);
    } catch (err) {
      console.error("🔥 Unexpected Fetch Error:", err);
    }
  };

  const sections = [
    {
      title: 'Your Motors',
      data: motors,
      navTarget: 'MotorDetails',
      onAdd: () => navigation.navigate('AddMotorScreen'),
    },
    {
      title: 'Your Trips',
      data: trips,
      navTarget: 'TripDetails',
    },
    {
      title: 'Traffic Reports',
      data: alerts,
      navTarget: 'AlertDetails',
    },
    {
      title: 'Saved Destinations',
      data: destinations,
      navTarget: 'DestinationDetails',
      onAdd: () => navigation.navigate('addSavedDestinationScreen'),
    },
    {
      title: 'Fuel Logs',
      data: fuelLogs,
      navTarget: 'FuelLogDetails',
      onAdd: () => navigation.navigate('addFuelLogScreen'),
    },
  ];

  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.title}
      ListHeaderComponent={
        <Text style={styles.greeting}>Welcome, {userName} 👋</Text>
      }
      renderItem={({ item }) => (
        <Section
          title={item.title}
          data={item.data}
          navTarget={item.navTarget}
          onAdd={item.onAdd}
        />
      )}
      ListFooterComponent={
        <TouchableOpacity
          style={styles.calcBtn}
          onPress={() => navigation.navigate('FuelCalculator')}
        >
          <Text style={styles.calcBtnText}>Go to Fuel Calculator</Text>
        </TouchableOpacity>
      }
      contentContainerStyle={styles.container}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  addButton: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#007AFF',
    paddingHorizontal: 10,
  },
  item: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
  },
  itemText: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    color: 'gray',
    paddingLeft: 10,
    fontStyle: 'italic',
  },
  calcBtn: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  calcBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
