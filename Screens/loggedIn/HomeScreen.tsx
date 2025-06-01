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
  StatusBar,
  Platform,
  useColorScheme,
  SafeAreaView,
} from 'react-native';
import axios from 'axios';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { StackNavigationProp } from '@react-navigation/stack';
import { LinearGradient } from 'expo-linear-gradient';

import * as Location from "expo-location";

import { useUser } from '../../AuthContext/UserContext';

const API_BASE = 'https://ts-backend-1-jyit.onrender.com';

export type RootStackParamList = {
  MotorDetails: { item: any };
  TripDetails: { item: any };
  AlertDetails: { item: any };
  DestinationDetails: { item: any; fullList?: any[] };
  FuelLogDetails: { item: any; fullList?: any[] };
  MaintenanceDetails: { item: any; fullList?: any[] };
  FuelCalculator: undefined;
  AddMotorScreen: undefined;
  AddFuelLogScreen: undefined;
  AddSavedDestinationScreen: undefined;
  allSavedDestinations: undefined;
  GasStations: { item: any };
};

type SectionProps = {
  title: string;
  subtitle?: string;
  text?: string;
  data: any[];
  navTarget: keyof RootStackParamList;
  onAdd?: () => void;
  showSeeAll?: boolean;
  isDarkMode: boolean;
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
      const maintenanceText = item.maintenanceActions?.length 
        ? `${item.maintenanceActions.length} maintenance action${item.maintenanceActions.length > 1 ? 's' : ''}`
        : 'No maintenance';
      return {
        line1: `${item.startAddress || 'Start'} → ${item.destination || 'End'}`,
        line2: `Distance: ${item.distance?.toFixed(1) || '--'} km • ${maintenanceText}`,
        line3: `ETA: ${item.eta || '--'}`,
      };
    case 'Maintenance Records':
      const actionType = item.type.replace('_', ' ');
      const actionCost = item.details?.cost ? `₱${Number(item.details.cost).toFixed(2)}` : 'No cost data';
      const actionQuantity = item.details?.quantity ? ` • ${item.details.quantity.toFixed(1)}L` : '';
      return {
        line1: actionType.toUpperCase(),
        line2: `${actionCost}${actionQuantity}`,
        line3: new Date(item.timestamp).toLocaleString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          month: "long",
          day: "numeric",
        }),
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
      const fuelLocation = item.location?.address ? ` at ${item.location.address}` : '';
      return {
        line1: `₱${item.cost?.toFixed(2) || '--'}`,
        line2: `${item.quantity?.toFixed(1) || '--'} Liters${fuelLocation}`,
        line3: new Date(item.date).toLocaleString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
          month: "long",
          day: "numeric",
        }),
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
    case 'Maintenance Records':
      switch (description?.toLowerCase()) {
        case 'refuel':
          return require('../../assets/icons/gas_station-71.png');
        case 'oil_change':
          return require('../../assets/icons/oil-change.png');
        case 'tune_up':
          return require('../../assets/icons/tune-up.png');
        default:
          return require('../../assets/icons/maintenance.png');
      }
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

const Section: React.FC<SectionProps> = ({ title, subtitle, text, data, navTarget, onAdd, showSeeAll, isDarkMode }) => {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  return (
    <View style={[styles.section, isDarkMode && styles.sectionDark]}>
      <View style={styles.sectionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, isDarkMode && styles.sectionTitleDark]}>
            {title}
          </Text>
          {subtitle && <Text style={[styles.sectionSubtitle, isDarkMode && styles.sectionSubtitleDark]}>{subtitle}</Text>}
          {text && <Text style={[styles.sectionText, isDarkMode && styles.sectionTextDark]}>{text}</Text>}
        </View>
        <View style={styles.headerActions}>
          {(showSeeAll || data.length > 2) && (
            <TouchableOpacity 
              onPress={title === 'My Motors' ? onAdd : () => navigation.navigate(navTarget as any, { fullList: data })}
              style={styles.seeAllButton}
            >
              <Text style={styles.seeAll}>See All</Text>
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
                style={[styles.item, isDarkMode && styles.itemDark]}
                onPress={() => navigation.navigate(navTarget as any, { item })}
              >
                <Image
                  source={getImageForSection(title, item.reportType)}
                  style={[styles.itemImage, isDarkMode && styles.itemImageDark]}
                  resizeMode="cover"
                />
                <Text style={[styles.itemText, isDarkMode && styles.itemTextDark]}>{label.line1}</Text>
                {label.line2 ? <Text style={[styles.itemText, isDarkMode && styles.itemTextDark]}>{label.line2}</Text> : null}
                {label.line3 ? <Text style={[styles.itemText, isDarkMode && styles.itemTextDark]}>{label.line3}</Text> : null}
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
  const systemColorScheme = useColorScheme();
  const [isManualDark, setIsManualDark] = useState<boolean | null>(null);
  const isDarkMode = isManualDark ?? (systemColorScheme === 'dark');

  const userName = user?.name || 'User';

  const [motors, setMotors] = useState([]);
  const [trips, setTrips] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [fuelLogs, setFuelLogs] = useState([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
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
        logsRes,
        maintenanceRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/user-motors/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/trips/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/saved-destinations/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/fuel-logs/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/maintenance-records/user/${user._id}`).catch(() => ({ data: [] })),
      ]);

      console.log("🔧 Maintenance response:", maintenanceRes.data);

      // Process maintenance records
      const maintenanceData = maintenanceRes.data.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      console.log("🔧 Sorted maintenance data:", maintenanceData);
      setMaintenanceRecords(maintenanceData);

      setMotors(motorsRes.data);
      setTrips(tripsRes.data);
      setAlerts(alertsRes.data);
      setDestinations(destinationsRes.data);
      setFuelLogs(logsRes.data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

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

  const sections: Array<{
    title: string;
    subtitle: string;
    text: string;
    data: any[];
    navTarget: keyof RootStackParamList;
    onAdd?: () => void;
    showSeeAll?: boolean;
  }> = [
    {
      title: 'My Motors',
      subtitle: 'Registered Vehicles',
      text: 'Your currently linked motorcycles.',
      data: motors,
      navTarget: 'MotorDetails',
      onAdd: () => navigation.navigate('AddMotorScreen'),
      showSeeAll: true,
    },
    {
      title: 'My Trips',
      subtitle: 'Recent Travels',
      text: 'Review your past and ongoing trips.',
      data: trips,
      navTarget: 'TripDetails',
      showSeeAll: true,
    },
    {
      title: 'Traffic Reports',
      subtitle: 'Hazards & Warnings',
      text: 'Be aware of community-submitted alerts.',
      data: alerts,
      navTarget: 'AlertDetails',
      showSeeAll: true,
    },
    {
      title: 'Saved Destinations',
      subtitle: 'Favorites',
      text: 'Quickly navigate to your common spots.',
      data: destinations,
      navTarget: 'DestinationDetails',
      onAdd: () => navigation.navigate('allSavedDestinations'),
      showSeeAll: true,
    },
    {
      title: 'Fuel Logs',
      subtitle: 'Refueling Activity',
      text: 'Track fuel usage and costs.',
      data: fuelLogs,
      navTarget: 'FuelLogDetails',
      onAdd: () => navigation.navigate('AddFuelLogScreen'),
      showSeeAll: true,
    },
    {
      title: 'Nearby Gas Stations',
      subtitle: 'Up to 5km away',
      text: 'View nearby gas stations with available services.',
      data: gasStations,
      navTarget: 'GasStations',
    },
    {
      title: 'Maintenance Records',
      subtitle: 'Service History',
      text: 'Track your motorcycle maintenance.',
      data: maintenanceRecords,
      navTarget: 'MaintenanceDetails',
      showSeeAll: true,
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
        maintenanceRes,
        gasStationsRes
      ] = await Promise.all([
        axios.get(`${API_BASE}/api/user-motors/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/trips/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/reports`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/saved-destinations/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/fuel-logs/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/maintenance-records/user/${user._id}`).catch(() => ({ data: [] })),
        axios.get(`${API_BASE}/api/gas-stations/nearby?lat=${coords.latitude}&lng=${coords.longitude}`).catch(() => ({ data: [] })),
      ]);

      console.log("🔧 Maintenance response (silent):", maintenanceRes.data);
      const maintenanceData = maintenanceRes.data.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setMaintenanceRecords(maintenanceData);

      setMotors(motorsRes.data);
      setTrips(tripsRes.data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
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

  const toggleTheme = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsManualDark(prev => prev === null ? systemColorScheme !== 'dark' : !prev);
  };

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode && styles.safeAreaDark]}>
      <StatusBar 
        barStyle={isDarkMode ? "light-content" : "dark-content"} 
        backgroundColor={isDarkMode ? '#00858B' : '#00ADB5'} 
      />
      
      {/* Fixed Header */}
      <View style={[styles.fixedHeader, isDarkMode && { backgroundColor: '#1A1A1A' }]}>
        <LinearGradient
          colors={isDarkMode ? ['#00858B', '#006A6F'] : ['#00ADB5', '#00C2CC']}
          style={styles.headerGradient}
        >
          <Image
            source={isDarkMode 
              ? require('../../assets/logo_trafficSlight_dark.png')
              : require('../../assets/logo_trafficSlight.png')
            }
            style={styles.logoImage}
          />
        </LinearGradient>
      </View>

      {/* Scrollable Content */}
      <FlatList
        data={sections}
        keyExtractor={(item) => item.title}
        ListHeaderComponent={
          <View style={styles.scrollableHeader}>
            <Text style={[styles.greeting, isDarkMode && styles.greetingDark]}>
              Welcome, {userName}
            </Text>
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
            showSeeAll={item.showSeeAll}
            isDarkMode={isDarkMode}
          />
        )}
        ListFooterComponent={
          <TouchableOpacity
            style={styles.calcBtn}
            onPress={() => navigation.navigate('FuelCalculator')}
          >
            <LinearGradient
              colors={isDarkMode ? ['#00858B', '#006A6F'] : ['#00ADB5', '#00C2CC']}
              style={styles.calcBtnGradient}
            >
              <Text style={styles.calcBtnText}>Go to Fuel Calculator</Text>
            </LinearGradient>
          </TouchableOpacity>
        }
        contentContainerStyle={[
          styles.container,
          isDarkMode && styles.containerDark
        ]}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh}
            tintColor={isDarkMode ? "#00858B" : "#00ADB5"}
            colors={[isDarkMode ? "#00858B" : "#00ADB5"]}
          />
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={isDarkMode ? "#00858B" : "#00ADB5"} />
              <Text style={[styles.loadingText, isDarkMode && styles.loadingTextDark]}>
                Loading your data...
              </Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2EEEE',
  },
  safeAreaDark: {
    backgroundColor: '#1A1A1A',
  },
  container: {
    padding: 16,
    paddingTop: 24,
  },
  containerDark: {
    backgroundColor: '#1A1A1A',
  },
  fixedHeader: {
    width: '100%',
    backgroundColor: '#F2EEEE',
    zIndex: 10,
    overflow: 'hidden',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerGradient: {
    padding: 24,
    paddingTop: Platform.OS === 'ios' ? 20 : 24,
    paddingBottom: 16,
  },
  logoImage: {
    width: "70%",
    height: 69,
    alignSelf: 'center',
  },
  scrollableHeader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    textShadowColor: 'rgba(0, 0, 0, 0.05)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  greetingDark: {
    color: '#FFFFFF',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingTextDark: {
    color: '#AAA',
  },
  calcBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 32,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#00ADB5',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  calcBtnGradient: {
    padding: 16,
    alignItems: 'center',
  },
  calcBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    marginBottom: 24,
    backgroundColor: '#FFFAFA',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16,
  },
  sectionDark: {
    backgroundColor: '#2A2A2A',
    shadowColor: '#000',
    shadowOpacity: 0.3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  sectionTitleDark: {
    color: '#FFFFFF',
  },
  seeAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
  },
  seeAll: {
    color: '#00ADB5',
    fontSize: 14,
    fontWeight: '600',
  },
  item: {
    backgroundColor: '#FFFAFA',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    width: 160,
    minHeight: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2.22,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemDark: {
    backgroundColor: '#2A2A2A',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  itemTextDark: {
    color: '#FFFFFF',
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 12,
    marginBottom: 12,
    alignSelf: 'center',
  },
  itemImageDark: {
    borderColor: 'rgba(255,255,255,0.1)',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    paddingLeft: 10,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 2,
    fontWeight: '500',
  },
  sectionSubtitleDark: {
    color: '#AAA',
  },
  sectionText: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  sectionTextDark: {
    color: '#777',
  },
});

