import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  RefreshControl,
} from 'react-native';
import axios from 'axios';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
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
  icon?: string;
};

const renderItemLabel = (item: any, type: string) => {
  switch (type) {
    case 'Your Motors':
      return item.nickname || item.motorcycleId?.model || 'Motor';
    case 'Your Trips':
      return item.origin ? `${item.origin} ➜ ${item.destination}` : 'Trip';
    case 'Traffic Reports':
      return item.reportType || 'Alert';
    case 'Saved Destinations':
      return item.label || item.address || 'Destination';
    case 'Fuel Logs':
      return item.totalCost && item.liters
        ? `₱${item.totalCost.toFixed(2)} • ${item.liters.toFixed(1)}L`
        : 'Fuel Log';
    default:
      return 'View';
  }
};



const Section: React.FC<SectionProps> = ({ title, data, navTarget, onAdd, icon }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {icon && <Ionicons name={icon as any} size={20} />} {title}
        </Text>
        <View style={styles.headerActions}>
          {data.length > 5 && (
            <TouchableOpacity onPress={() => navigation.navigate(navTarget, { fullList: data })}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          )}
          {onAdd && (
            <TouchableOpacity onPress={onAdd}>
              <Ionicons name="add-circle-outline" size={24} color="#007AFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {data.length === 0 ? (
        <Text style={styles.emptyText}>No {title.toLowerCase()} yet.</Text>
      ) : (
        <FlatList
          horizontal
          data={data.slice(0, 5)}
          keyExtractor={(item, index) => item._id || index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate(navTarget, { item })}
            >
              <Text style={styles.itemText}>
  {renderItemLabel(item, title)}
</Text>

            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    try {
      const [
        motorsRes,
        tripsRes,
        alertsRes,
        destinationsRes,
        logsRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/user-motors/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/trips/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/saved-destinations/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/fuel-logs/${user._id}`).catch(() => ({ data: [] })),
      ]);

      setMotors(motorsRes.data);
      setTrips(tripsRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setAlerts(alertsRes.data);
      setDestinations(destinationsRes.data);
      setFuelLogs(logsRes.data);
    } catch (err) {
      console.error("🔥 Unexpected Fetch Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const sections = [
    {
      title: 'Your Motors',
      icon: 'car-sport-outline',
      data: motors,
      navTarget: 'MotorDetails',
      onAdd: () => navigation.navigate('AddMotorScreen'),
    },
    {
      title: 'Your Trips',
      icon: 'map-outline',
      data: trips,
      navTarget: 'TripDetails',
    },
    {
      title: 'Traffic Reports',
      icon: 'alert-circle-outline',
      data: alerts,
      navTarget: 'AlertDetails',
    },
    {
      title: 'Saved Destinations',
      icon: 'location-outline',
      data: destinations,
      navTarget: 'DestinationDetails',
      onAdd: () => navigation.navigate('addSavedDestinationScreen'),
    },
    {
      title: 'Fuel Logs',
      icon: 'analytics-outline',
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
          icon={item.icon}
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
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      ListEmptyComponent={
        loading ? <ActivityIndicator size="large" color="#007AFF" /> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAll: {
    color: '#007AFF',
    marginRight: 10,
    fontWeight: '500',
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
    minWidth: 120,
    alignItems: 'center',
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
