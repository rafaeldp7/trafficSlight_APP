import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from "react-native";
import tw from "twrnc";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from 'expo-linear-gradient';

import { useUser } from "../../AuthContext/UserContext";
import { LOCALHOST_IP } from "@env";

const PAGE_SIZE = 5;

type RouteParams = {
  item?: any;
  fullList?: any[];
};

export default function FuelLogDetailsScreen() {
  const { user } = useUser();
  const navigation = useNavigation();
  const route = useRoute();
  const { item, fullList } = route.params as RouteParams;
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDateStr, setFromDateStr] = useState("");
  const [toDateStr, setToDateStr] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (user?._id) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/fuel-logs/${user._id}`);
      const data = await res.json();
      const sorted = [...data].reverse();
      setLogs(sorted);
      setFiltered(sorted);
    } catch {
      alert("Failed to fetch fuel logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let temp = [...logs];

    if (search.trim()) {
      const term = search.toLowerCase();
      temp = temp.filter((log) => {
        const nickname = log.motorId?.nickname?.toLowerCase() || "";
        const model = log.motorId?.motorcycleId?.model?.toLowerCase() || "";
        const date = new Date(log.date).toLocaleString("en-PH").toLowerCase();
        const liters = String(log.liters || "").toLowerCase();
        const price = String(log.pricePerLiter?.toFixed(2) || "").toLowerCase();
        const totalCost = String(log.totalCost?.toFixed(2) || "").toLowerCase();
        const notes = log.notes?.toLowerCase() || "";

        return (
          nickname.includes(term) ||
          model.includes(term) ||
          date.includes(term) ||
          liters.includes(term) ||
          price.includes(term) ||
          totalCost.includes(term) ||
          notes.includes(term)
        );
      });
    }

    if (fromDateStr && toDateStr) {
      const from = new Date(fromDateStr);
      const to = new Date(toDateStr);
      temp = temp.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= from && logDate <= to;
      });
    }

    if (sortBy === "date") {
      temp.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "liters") {
      temp.sort((a, b) => b.liters - a.liters);
    } else if (sortBy === "cost") {
      temp.sort((a, b) => b.totalCost - a.totalCost);
    }

    setFiltered(temp);
    setPage(1);
  }, [search, fromDateStr, toDateStr, sortBy, logs]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const loadMore = () => {
    if (page * PAGE_SIZE < filtered.length) setPage((p) => p + 1);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFuelLog = ({ item }) => (
    <TouchableOpacity 
      style={styles.logCard}
      onPress={() => navigation.navigate('FuelLogDetails', { item })}
    >
      <View style={styles.logHeader}>
        <View style={styles.logHeaderLeft}>
          <Text style={styles.dateText}>{formatDate(item.date)}</Text>
          <Text style={styles.motorName}>{item.motorId?.nickname ?? 'Unknown Motor'}</Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.totalPrice}>₱{item.totalCost?.toFixed(2) || '--'}</Text>
        </View>
      </View>

      <View style={styles.logDetails}>
        <View style={styles.detailRow}>
          <View style={styles.detailItem}>
            <Ionicons name="water-outline" size={20} color="#00ADB5" />
            <Text style={styles.detailLabel}>Volume</Text>
            <Text style={styles.detailValue}>{item.liters?.toFixed(1) || '--'} L</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="pricetag-outline" size={20} color="#00ADB5" />
            <Text style={styles.detailLabel}>Price/L</Text>
            <Text style={styles.detailValue}>₱{item.pricePerLiter?.toFixed(2) || '--'}</Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="speedometer-outline" size={20} color="#00ADB5" />
            <Text style={styles.detailLabel}>Odometer</Text>
            <Text style={styles.detailValue}>{item.odometer || '--'} km</Text>
          </View>
        </View>
        {item.notes && (
          <Text style={styles.notes}>{item.notes}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (fullList) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
        
        {/* Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={['#00ADB5', '#00C2CC']}
            style={styles.headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.headerContent}>
              <TouchableOpacity 
                onPress={() => navigation.goBack()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>Fuel Logs</Text>
                <Text style={styles.headerSubtitle}>Track your refueling history</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <FlatList
          data={fullList}
          renderItem={renderFuelLog}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="water-outline" size={48} color="#00ADB5" />
              <Text style={styles.emptyStateText}>No fuel logs yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Add your first fuel log to start tracking
              </Text>
            </View>
          }
        />

        <TouchableOpacity 
          style={styles.fab}
          onPress={() => navigation.navigate('AddFuelLogScreen')}
        >
          <LinearGradient
            colors={['#00ADB5', '#00C2CC']}
            style={styles.fabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
      
      {/* Header */}
      <View style={styles.header}>
        <LinearGradient
          colors={['#00ADB5', '#00C2CC']}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.headerContent}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Fuel Log Details</Text>
              <Text style={styles.headerSubtitle}>{formatDate(item?.date)}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.detailsContainer}>
        {renderFuelLog({ item })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2EEEE',
  },
  header: {
    width: '100%',
    backgroundColor: '#00ADB5',
  },
  headerGradient: {
    width: '100%',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  listContainer: {
    padding: 16,
  },
  detailsContainer: {
    padding: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  logHeaderLeft: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  motorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
  },
  priceContainer: {
    backgroundColor: '#F8F9FA',
    padding: 8,
    borderRadius: 8,
  },
  totalPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#00ADB5',
  },
  logDetails: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 4,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  notes: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
