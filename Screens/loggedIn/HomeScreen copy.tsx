import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  LayoutAnimation,
  RefreshControl,
  Image,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';

import * as Location from "expo-location";

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
  AddSavedDestinationScreen: undefined;
};

type SectionProps = {
  title: string;
  subtitle?: string;
  text?: string;
  data: any[];
  navTarget: keyof RootStackParamList;
  onAdd?: () => void;
  icon?: string;
};



const renderItemLabel = (item: any, type: string) => {
  switch (type) {
    case 'My Motors':
      return {
        line1: item.name || 'Motorcycle',
        line2: `${item.fuelEfficiency} km/L` || 'Fuel Efficiency Unknown',
        line3: item.nickname || 'Nickname Unknown',
      };
    case 'My Trips':
      return {
        line1: `${item.origin || 'Start'} → ${item.destination || 'End'}`,
        line2: `Distance: ${item.distance?.toFixed(1) || '--'} km`,
        line3: `ETA: ${item.eta || '--'}`,
      };
    case 'Traffic Reports':
      return {
        line1: item.reportType || 'Alert',
        line2: item.description || 'No description',
        line3: new Date(item.timestamp).toLocaleString("en-PH", {
  hour: "2-digit",
  minute: "2-digit",
  
  hour12: true,
  month: "long",
  day: "numeric",

})



      };
    case 'Saved Destinations':
      return {
        line1: item.label || 'Saved Place',
        line2: item.address || 'No address',
        line3: '',
      };
    case 'Fuel Logs':
      return {
        line1: `₱${item.totalCost?.toFixed(2) || '--'}`,
        line2: `${item.liters?.toFixed(1) || '--'} Liters`,
        line3: `@ ₱${item.pricePerLiter?.toFixed(2) || '--'}/L`,
      };
      case 'Nearby Gas Stations':
  return {
    line1: item.name || 'Unnamed Station',
    line2: `${item.brand || 'Brand Unknown'} • ₱${item.fuelPrices?.gasoline || '--'} (Gasoline)`,
    line3: item.address?.street || 'No address',
  };

    default:
      return {
        line1: 'Item',
        line2: '',
        line3: '',
      };
  }
};


const getImageForSection = (title: string, description: string) => {
  switch (title) {
    case 'My Motors':
      return require('../../assets/icons/motor-silhouette.png');
    case 'My Trips':
      return require('../../assets/icons/Trips.png');
    case 'Traffic Reports':
      switch (description) {
        case 'Accident':
          return require('../../assets/icons/ROAD INCIDENTS ICON/Hazard.png')

      }

    case 'Saved Destinations':
      return require('../../assets/icons/checkered-flag.jpg');
    case 'Fuel Logs':
      return require('../../assets/icons/gas_station-71.png');
    default:
      return require('../../assets/icons/default.png');
  }
};

const getCurrentLocation = async () => {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Permission to access location was denied");
  }

  const location = await Location.getCurrentPositionAsync({});
  return location.coords;
};

const Section: React.FC<SectionProps> = ({ title, subtitle, text, data, navTarget, onAdd, icon }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>
            {icon && <Ionicons name={icon as any} size={20} />} {title}
          </Text>
          {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
          {text && <Text style={styles.sectionText}>{text}</Text>}
        </View>
        <View style={styles.headerActions}>
          {data.length > 2 && (
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
          renderItem={({ item }) => {
            const label = renderItemLabel(item, title);
            return (
              <TouchableOpacity
                style={styles.item}
                onPress={() => navigation.navigate(navTarget, { item })}
              >
                <Image
                  source={getImageForSection(title, item.reportType)}
                  style={styles.itemImage}
                  resizeMode="cover"
                />
                <Text style={styles.itemText}>{label.line1}</Text>
                {label.line2 ? <Text style={styles.itemText}>{label.line2}</Text> : null}
                {label.line3 ? <Text style={styles.itemText}>{label.line3}</Text> : null}
              </TouchableOpacity>
            );
          }}
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
  const [gasStations, setGasStations] = useState<any[]>([]);
  useFocusEffect(
    useCallback(() => {
      if (user && user._id) {
        silentFetchData();
      }
    }, [user])
  );



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
    fetchDataWithLoading();
  };

  const sections = [
    {
      title: 'My Motors',
      subtitle: 'Registered Vehicles',
      text: 'Your currently linked motorcycles.',
      data: motors,
      navTarget: 'MotorDetails',
      onAdd: () => navigation.navigate('AddMotorScreen'),
    },
    {
      title: 'My Trips',
      subtitle: 'Recent Travels',
      text: 'Review your past and ongoing trips.',
      data: trips,
      navTarget: 'TripDetails',
    },
    {
      title: 'Traffic Reports',
      subtitle: 'Hazards & Warnings',
      text: 'Be aware of community-submitted alerts.',
      data: alerts,
      navTarget: 'AlertDetails',
    },
    {
      title: 'Saved Destinations',
      subtitle: 'Favorites',
      text: 'Quickly navigate to your common spots.',
      data: destinations,
      navTarget: 'DestinationDetails',
      onAdd: () => navigation.navigate('AddDestinationScreen'),
    },
    {
      title: 'Fuel Logs',
      subtitle: 'Refueling Activity',
      text: 'Track fuel usage and costs.',
      data: fuelLogs,
      navTarget: 'FuelLogDetails',
      onAdd: () => navigation.navigate('AddFuelLogScreen'),
    },
    {
  title: 'Nearby Gas Stations',
  subtitle: 'Up to 5km away',
  text: 'View nearby gas stations with available services.',
  data: gasStations,
  navTarget: 'GasStations', // Optional or replace with a proper screen later
},

  ];



  const silentFetchData = async () => {
    try {
      const coords: any = await getCurrentLocation();
      const [
        motorsRes,
        tripsRes,
        alertsRes,
        destinationsRes,
        logsRes,
        gasStationsRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/user-motors/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/trips/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/saved-destinations/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/fuel-logs/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/gas-stations/nearby?lat=${coords.latitude}&lng=${coords.longitude}`).catch(() => ({ data: [] })),
      ]);
      console.log("user._id", user._id);
      console.log("motorsRes.data", motorsRes.data);
      setMotors(motorsRes.data);
      setTrips(tripsRes.data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setAlerts(alertsRes.data);
      setDestinations(destinationsRes.data);
      setFuelLogs(logsRes.data);
      setGasStations(gasStationsRes.data);
    } catch (err) {
      console.error("⚠️ Silent Fetch Error:", err);
    }
  };

  const fetchDataWithLoading = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setLoading(true);
    await silentFetchData();
    setLoading(false);
    setRefreshing(false);
  };



  return (
    <FlatList
      data={sections}
      keyExtractor={(item) => item.title}
      ListHeaderComponent={
        <View>
          <Image
            source={require('../../assets/logo_trafficSlight.png')}
            style={{ width: "70%", height: 69, alignSelf: 'center', marginBottom: 20 }}
          />
          <Text style={styles.greeting}>Welcome, {userName} 👋</Text>
        </View>
      }
      renderItem={({ item }) => (
        <Section
          title={item.title}
          subtitle={item.subtitle}
          text={item.text}
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

    backgroundColor: 'orange',
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
  item: {
    backgroundColor: '#f0f0f0',
    padding: 15,
    borderRadius: 10,
    marginRight: 10,
    width: 150,
    alignItems: 'center',
    height: 170,
  },
  itemText: {
    fontSize: 14,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 6,
    backgroundColor: '#ccc',
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
  sectionSubtitle: {
    fontSize: 14,
    color: '#444',
    marginTop: 2,
  },
  sectionText: {
    fontSize: 13,
    color: '#666',
    marginTop: 1,
    fontStyle: 'italic',
  },

});
function setGasStations(data: any) {
  throw new Error('Function not implemented.');
}

