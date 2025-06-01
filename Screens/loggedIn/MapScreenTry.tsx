import React, { useState, useRef, useEffect, useCallback, useMemo, Dispatch, SetStateAction } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
  Alert,
  TextInput,
  Animated,
} from "react-native";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, UrlTile } from "react-native-maps";
import { LinearGradient } from 'expo-linear-gradient';
import { useColorScheme } from 'react-native';
import Toast from 'react-native-toast-message';

import * as Location from "expo-location";
import * as FileSystem from "expo-file-system";
import polyline from "@mapbox/polyline";
import { GOOGLE_MAPS_API_KEY, LOCALHOST_IP } from "@env";
import { useUser } from "../../AuthContext/UserContext";

import SearchBar from "./SearchBar";
import "react-native-get-random-values";
import { usePredictiveAnalytics } from './usePredictiveAnalytics';
import Speedometer from "./Speedometer";
import { calculateTotalPathDistance, calcDistance } from '../screens/utils/mapUtils';

// Types
type LocationCoords = {
  latitude: number;
  longitude: number;
  address?: string;
};

type RouteData = {
  id: string;
  distance: number;
  duration: number;
  fuelEstimate: number;
  trafficRate: number;
  coordinates: LocationCoords[];
  instructions?: string[];
};

type TripSummary = {
  userId: string;
  motorId: string;
  distance: number;         // in kilometers
  fuelUsed: number;         // in liters
  timeArrived: string;      // in minutes since trip start (or epoch)
  eta: string;              // estimated time in minutes
  destination: string;
  startAddress?: string;
};

type TrafficIncident = {
  id: string;
  location: LocationCoords;
  type: string;
  severity: string;
  description: string;
};

type MaintenanceAction = {
  type: 'oil_change' | 'refuel' | 'tune_up';
  timestamp: number;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  details: {
    cost: number;  // Change from optional to required
    quantity?: number;
    notes?: string;
  };
};

type MapRef = React.RefObject<MapView>;
type SearchRef = React.RefObject<typeof GooglePlacesAutocomplete>;

type MaintenanceFormData = {
  type: string;
  cost: string;
  quantity: string;
  notes: string;
};

type MaintenanceFormProps = {
  visible: boolean;
  formData: MaintenanceFormData;
  onClose: () => void;
  onSave: () => void;
  onChange: (field: string, value: string) => void;
};

// Add these types near the top with other type definitions
type MotorAnalytics = {
  totalDistance: number;
  tripsCompleted: number;
  totalFuelUsed: number;
};

// Update type definitions at the top of the file
type FuelType = 'Regular' | 'Diesel' | 'Premium';
type OilType = 'Mineral' | 'Semi-Synthetic' | 'Synthetic';

interface Motor {
  _id: string;
  name: string;
  fuelEfficiency: number;
  fuelType: FuelType;
  oilType: OilType;
  age: number;
  totalDistance: number;
  currentFuelLevel: number;
  tankCapacity: number;
  lastMaintenanceDate?: string;
  lastOilChange?: string;
  lastRegisteredDate?: string;
  lastTripDate?: string;
  lastRefuelDate?: string;
  fuelLevel: number;
  oilChangeDue: boolean;
  maintenanceDue: boolean;
  analytics: MotorAnalytics;
  nickname?: string;
  engineDisplacement?: number;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------
const DEFAULT_TRAFFIC_RATE = 1;
const ARRIVAL_THRESHOLD = 50; // meters before declaring arrival
const MAX_RECENT_LOCATIONS = 10;
const OFFLINE_TILES_PATH = `${FileSystem.cacheDirectory}map_tiles/`;
const VOICE_NAV_DELAY = 3000;


const calculateFuelRange = (distance: number, fuelEfficiency: number) => {
  const base = distance / fuelEfficiency;
  return {
    min: base * 0.9,
    max: base * 1.1,
    avg: base,
  };
};




//calculateFuelRange(100, 20); // Example usage: 100 km distance, 20 km/L fuel efficiency

// ----------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------
const formatETA = (duration: number): string => {
  const eta = new Date(Date.now() + duration * 1000);
  return eta.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const isUserOffRoute = (
  currentLoc: LocationCoords,
  routeCoords: LocationCoords[],
  threshold = 50
): boolean => {
  return !routeCoords.some((coord) => {
    const dx = currentLoc.latitude - coord.latitude;
    const dy = currentLoc.longitude - coord.longitude;
    const dist = Math.sqrt(dx * dx + dy * dy) * 111139;
    return dist < threshold;
  });
};

// fetch routes



// ----------------------------------------------------------------
// Components
// ----------------------------------------------------------------
type RouteDetailsBottomSheetProps = {
  visible: boolean;
  bestRoute: RouteData | null;
  alternatives: RouteData[];
  onClose: () => void;
  selectedRouteId: string | null;
  onSelectRoute: (id: string) => void;
  selectedMotor: Motor | null;
  isNavigating: boolean;
};

const getTrafficLabel = (rate: number): string => {
  switch (rate) {
    case 1:
      return "Very Light";
    case 2:
      return "Light";
    case 3:
      return "Moderate";
    case 4:
      return "Heavy";
    case 5:
      return "Very Heavy";
    default:
      return "Unknown";
  }
};


const RouteDetailsBottomSheet = React.memo(
  ({
    visible,
    bestRoute,
    alternatives,
    onClose,
    selectedRouteId,
    onSelectRoute,
    selectedMotor,
    isNavigating,
  }: RouteDetailsBottomSheetProps) => {
    const [sortCriteria, setSortCriteria] = useState<"fuel" | "traffic" | "distance">("distance");
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);

    const sortedRoutes = useMemo(() => {
      if (!bestRoute) return [];
      const all = [bestRoute, ...(alternatives || [])].filter(Boolean);
      return all.sort((a, b) => {
        if (!a || !b) return 0;
        if (sortCriteria === "fuel") return a.fuelEstimate - b.fuelEstimate;
        if (sortCriteria === "traffic") return a.trafficRate - b.trafficRate;
        return a.distance - b.distance;
      });
    }, [sortCriteria, bestRoute, alternatives]);

    // Don't show the bottom sheet if navigating or if not visible or no best route
    if (isNavigating || !visible || !bestRoute) return null;

    return (
      <View style={styles.bottomSheetContainer}>
        <LinearGradient
          colors={['#00ADB5', '#00858B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.bottomSheetHeader}
        >
          <Text style={styles.bottomSheetTitle}>Available Routes</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sort Routes By:</Text>
          <View style={styles.sortButtonsContainer}>
            <TouchableOpacity
              style={[styles.sortButton, sortCriteria === "fuel" && styles.sortButtonActive]}
              onPress={() => setSortCriteria("fuel")}
            >
              <Text style={[styles.sortButtonText, sortCriteria === "fuel" && styles.sortButtonTextActive]}>
                FUEL
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortCriteria === "traffic" && styles.sortButtonActive]}
              onPress={() => setSortCriteria("traffic")}
            >
              <Text style={[styles.sortButtonText, sortCriteria === "traffic" && styles.sortButtonTextActive]}>
                TRAFFIC
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sortButton, sortCriteria === "distance" && styles.sortButtonActive]}
              onPress={() => setSortCriteria("distance")}
            >
              <Text style={[styles.sortButtonText, sortCriteria === "distance" && styles.sortButtonTextActive]}>
                DISTANCE
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.bottomSheetContent}>
          {sortedRoutes.map((route, index) => (
            <TouchableOpacity
              key={route.id}
              style={[styles.routeCard, selectedRouteId === route.id && styles.selectedRouteCard]}
              onPress={() => onSelectRoute(route.id)}
              disabled={isNavigating} // Disable route selection during navigation
            >
              {index === 0 && (
                <View style={styles.recommendedTag}>
                  <MaterialIcons name="star" size={20} color="#FFD700" />
                  <Text style={styles.recommendedText}>Recommended Route</Text>
                </View>
              )}
              
              <View style={styles.routeDetail}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="local-gas-station" size={24} color="#00ADB5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Estimated Fuel</Text>
                  <Text style={styles.detailValue}>
                    {(route.fuelEstimate - 0.03).toFixed(2)}–{(route.fuelEstimate + 0.03).toFixed(2)} L
                  </Text>
                </View>
              </View>

              <View style={styles.routeDetail}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="straighten" size={24} color="#00ADB5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Total Distance</Text>
                  <Text style={styles.detailValue}>
                    {(route.distance / 1000).toFixed(2)} km
                  </Text>
                </View>
              </View>

              <View style={styles.routeDetail}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="schedule" size={24} color="#00ADB5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Estimated Time</Text>
                  <Text style={styles.detailValue}>
                    {(route.duration / 60).toFixed(0)} minutes
                  </Text>
                </View>
              </View>

              <View style={styles.routeDetail}>
                <View style={styles.iconContainer}>
                  <MaterialIcons name="traffic" size={24} color="#00ADB5" />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Traffic Condition</Text>
                  <Text style={styles.detailValue}>
                    {getTrafficLabel(route.trafficRate)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  }
);


const TrafficIncidentMarker = ({ incident }: { incident: TrafficIncident }) => (
  <Marker coordinate={incident.location}>
    <View style={styles.incidentMarker}>
      <MaterialIcons
        name={
          incident.type === "Accident" ? "warning" :
            incident.type === "Hazard" ? "report-problem" :
              incident.type === "Road Closure" ? "block" :
                incident.type === "Traffic Jam" ? "traffic" :
                  incident.type === "Police" ? "local-police" :
                    "info"
        }
        size={24}
        color={incident.severity === "high" ? "#e74c3c" : "#f39c12"}
      />

    </View>
  </Marker>
);

// ----------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------
export default function NavigationApp({ navigation }: { navigation: any }) {
  // Refs
  const mapRef = useRef<MapView>(null);
  const searchRef = useRef<any>(null);
  const voiceNavTimeout = useRef<NodeJS.Timeout>();

  // Authenticated user context
  const { user } = useUser();

  // Fetch motors when user is available
  useEffect(() => {
    const fetchMotors = async () => {
      try {
        const motorsWithAnalytics = await fetchMotorAnalytics(user._id);
        if (motorsWithAnalytics.length > 0) {
          setMotorList(motorsWithAnalytics);
          setSelectedMotor(motorsWithAnalytics[0]);
        }
      } catch (error) {
        console.error("Failed to fetch motors:", error);
        Alert.alert(
          "Error",
          "Failed to fetch motor data. Please try again later.",
          [{ text: "OK" }]
        );
      }
    };

    if (user?._id) fetchMotors();
  }, [user]);

  // UI and State
  const [searchText, setSearchText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(true);
  const [showBottomSheet, setShowBottomSheet] = useState(false);
  const [tripSummaryModalVisible, setTripSummaryModalVisible] = useState(false);

  // New trip details state
  const [tripDetailsModalVisible, setTripDetailsModalVisible] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [currentEta, setCurrentEta] = useState<string | null>(null);
  const [currentFuelUsed, setCurrentFuelUsed] = useState(0);
  const [isOverSpeedLimit, setIsOverSpeedLimit] = useState(false);

  // Location, region, and navigation state
  const [region, setRegion] = useState<any>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [destination, setDestination] = useState<LocationCoords | null>(null);
  const [isFollowingUser, setIsFollowingUser] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [mapStyle, setMapStyle] = useState<"light" | "dark">("light");
  const [isOffline, setIsOffline] = useState(false);
  const [navigationStartTime, setNavigationStartTime] = useState<number | null>(null);

  // Routing and trip state
  const [pathCoords, setPathCoords] = useState<LocationCoords[]>([]);
  const [tripSummary, setTripSummary] = useState<RouteData | null>(null);
  const [alternativeRoutes, setAlternativeRoutes] = useState<RouteData[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [trafficIncidents, setTrafficIncidents] = useState<TrafficIncident[]>([]);
  const [wasRerouted, setWasRerouted] = useState(false);
  const [startAddress, setStartAddress] = useState("");

  // Motor selection state
  const [motorList, setMotorList] = useState<Motor[]>([]);
  const [selectedMotor, setSelectedMotor] = useState<Motor | null>(null);

  // Selected route (memoized from state)
  const [selectedRoute, setSelectedRoute] = useState<RouteData | null>(null);

  // Add maintenance action types
  type MaintenanceAction = {
    type: 'oil_change' | 'refuel' | 'tune_up';
    timestamp: number;
    location: LocationCoords;
    details: {
      cost?: number;
      quantity?: number;
      notes?: string;
    };
  };

  // Add state for maintenance actions
  const [maintenanceActions, setMaintenanceActions] = useState<MaintenanceAction[]>([]);

  // Add state for maintenance form
  const [maintenanceFormVisible, setMaintenanceFormVisible] = useState(false);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    type: '',
    cost: '',
    quantity: '',
    notes: ''
  });

  // Memoize the form change handler
  const handleMaintenanceFormChange = useCallback((field: string, value: string) => {
    setMaintenanceFormData(prev => ({
      ...prev,
      [field]: value
    }));
  }, []);

  // Memoize the save handler
  const handleMaintenanceFormSave = useCallback(() => {
    setMaintenanceFormVisible(false);
    saveMaintenanceRecord(maintenanceFormData.type as MaintenanceAction['type'], maintenanceFormData);
  }, [maintenanceFormData]);

  // Memoize the MaintenanceFormModal component
  const MaintenanceFormModal = useMemo(() => {
    return ({ 
      visible, 
      formData, 
      onClose, 
      onSave, 
      onChange 
    }: {
      visible: boolean;
      formData: {
        type: string;
        cost: string;
        quantity: string;
        notes: string;
      };
      onClose: () => void;
      onSave: () => void;
      onChange: (field: string, value: string) => void;
    }) => (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.formModal}>
            <Text style={styles.formTitle}>
              {formData.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
            </Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Cost (₱)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.cost}
                onChangeText={(text) => onChange('cost', text)}
                placeholder="Enter cost"
              />
            </View>

            {formData.type === 'refuel' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Fuel Quantity (L)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.quantity}
                  onChangeText={(text) => onChange('quantity', text)}
                  placeholder="Enter quantity in liters"
                />
              </View>
            )}

            {formData.type === 'oil_change' && (
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Oil Quantity (L)</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={formData.quantity}
                  onChangeText={(text) => onChange('quantity', text)}
                  placeholder="Enter quantity in liters"
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={formData.notes}
                onChangeText={(text) => onChange('notes', text)}
                placeholder={`Add notes about the ${formData.type.replace('_', ' ')} (optional)`}
                multiline
              />
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity 
                onPress={onClose}
                style={[styles.formButton, styles.cancelButton]}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={onSave}
                style={[styles.formButton, styles.saveButton]}
              >
                <Text style={[styles.buttonText, styles.saveButtonText]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  }, []); // Empty dependency array since this component doesn't depend on any external values

  // Add maintenance action handler
  const handleMaintenanceAction = useCallback((actionType: MaintenanceAction['type']) => {
    if (!currentLocation || !selectedMotor) return;

    setMaintenanceFormData({
      type: actionType,
      cost: '',
      quantity: '',
      notes: ''
    });
    setMaintenanceFormVisible(true);
  }, [currentLocation, selectedMotor]);

  // Helper function to save maintenance record
  const saveMaintenanceRecord = async (actionType: MaintenanceAction['type'], formData: any) => {
    try {
      if (!user?._id || !selectedMotor?._id) {
        throw new Error('Missing user or motor data');
      }

      // Parse the cost as a number
      const cost = parseFloat(formData.cost) || 0;
      const quantity = formData.quantity ? parseFloat(formData.quantity) : undefined;

      // Create the maintenance action
      const newAction: MaintenanceAction = {
        type: actionType,
        timestamp: Date.now(),
        location: currentLocation ? {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude,
          address: currentLocation.address
        } : {
          latitude: 0,
          longitude: 0
        },
        details: {
          cost: cost,
          quantity: quantity,
          notes: formData.notes
        }
      };

      // Save maintenance record
      const maintenanceResponse = await fetch(`${LOCALHOST_IP}/api/maintenance-records`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user._id,
          motorId: selectedMotor._id,
          type: actionType,
          timestamp: newAction.timestamp,
          location: newAction.location,
          details: newAction.details
        })
      });

      if (!maintenanceResponse.ok) {
        throw new Error('Failed to save maintenance record');
      }

      const savedRecord = await maintenanceResponse.json();
      console.log('✅ Maintenance record saved:', savedRecord);

      // Update local state
      setMaintenanceActions(prev => [...prev, newAction]);

      // Show success toast
      Toast.show({
        type: 'success',
        text1: 'Maintenance Recorded',
        text2: `${actionType.replace('_', ' ')} has been recorded successfully`,
        position: 'top',
        visibilityTime: 3000,
      });

      // Close the form modal
      setMaintenanceFormVisible(false);

    } catch (error) {
      console.error('Error in saveMaintenanceRecord:', error);
      Alert.alert('Error', error.message || 'Failed to save maintenance record');
    }
  };

  // Update the maintenance action item in the trip summary to be clickable
  const renderMaintenanceAction = (action: MaintenanceAction, index: number) => (
    <TouchableOpacity
      key={index}
      style={styles.maintenanceActionItem}
      onPress={() => {
        Alert.alert(
          'Maintenance Details',
          `Type: ${action.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}\n` +
          `Time: ${new Date(action.timestamp).toLocaleString('en-PH')}\n` +
          `Cost: ₱${action.details.cost.toFixed(2)}\n` +
          (action.details.quantity ? `Quantity: ${action.details.quantity.toFixed(2)}L\n` : '') +
          (action.location?.address ? `Location: ${action.location.address}\n` : '') +
          (action.details.notes ? `Notes: ${action.details.notes}` : '')
        );
      }}
    >
      <MaterialIcons 
        name={
          action.type === 'refuel' ? 'local-gas-station' :
          action.type === 'oil_change' ? 'opacity' :
          'build'
        } 
        size={24} 
        color={
          action.type === 'refuel' ? '#2ecc71' :
          action.type === 'oil_change' ? '#3498db' :
          '#e67e22'
        } 
      />
      <View style={styles.maintenanceActionDetails}>
        <Text style={styles.maintenanceActionType}>
          {action.type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
        </Text>
        <Text style={styles.maintenanceActionTime}>
          {new Date(action.timestamp).toLocaleString('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            month: 'long',
            day: 'numeric'
          })}
        </Text>
        <View style={styles.maintenanceActionInfo}>
          <Text style={styles.maintenanceActionCost}>
            Cost: ₱{action.details.cost.toFixed(2)}
          </Text>
          {action.details.quantity && (
            <Text style={styles.maintenanceActionQuantity}>
              Quantity: {action.details.quantity.toFixed(2)}L
            </Text>
          )}
          {action.location?.address && (
            <Text style={styles.maintenanceActionLocation}>
              Location: {action.location.address}
            </Text>
          )}
          {action.details.notes && (
            <Text style={styles.maintenanceActionNotes}>
              Notes: {action.details.notes}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Add maintenance button to navigation overlay
  const MaintenanceButton = () => (
    <View style={styles.maintenanceContainer}>
      <TouchableOpacity
        onPress={() => {
          Alert.alert(
            'Record Maintenance',
            'Select maintenance type:',
            [
              {
                text: 'Refuel',
                onPress: () => handleMaintenanceAction('refuel')
              },
              {
                text: 'Oil Change',
                onPress: () => handleMaintenanceAction('oil_change')
              },
              {
                text: 'Tune Up',
                onPress: () => handleMaintenanceAction('tune_up')
              },
              {
                text: 'Cancel',
                style: 'cancel'
              }
            ]
          );
        }}
        style={styles.maintenanceButton}
      >
        <LinearGradient
          colors={['#00ADB5', '#00858B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.maintenanceGradient}
        >
          <MaterialIcons name="build" size={24} color="#fff" />
          <Text style={styles.maintenanceButtonText}>Record Maintenance</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  // Fetch traffic reports function
  const fetchTrafficReports = useCallback(async () => {
    try {
      if (!currentLocation) {
        console.log("No current location available");
        return;
      }

      const response = await fetch(`${LOCALHOST_IP}/api/reports`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Transform the data to match TrafficIncident type
      const formattedIncidents: TrafficIncident[] = data.map((report: any) => ({
        id: report._id || String(Math.random()),
        location: {
          latitude: report.latitude || 0,
          longitude: report.longitude || 0
        },
        type: report.reportType || 'Unknown',
        severity: report.reportType?.toLowerCase().includes('accident') ? 'high' : 'medium',
        description: report.description || ''
      }));

      setTrafficIncidents(formattedIncidents);
      console.log("✅ Traffic reports fetched successfully:", formattedIncidents.length);
    } catch (error) {
      console.error("🔥 Error fetching traffic reports:", error);
      // Set empty array but don't show error to user since this is not critical
      setTrafficIncidents([]);
    }
  }, [currentLocation]);

  // Add predictive analytics after selectedMotor state is declared
  const analyticsData = usePredictiveAnalytics({
    fuelType: selectedMotor?.fuelType || 'Regular',
    oilType: selectedMotor?.oilType || 'Mineral',
    lastRegisteredDate: selectedMotor?.lastRegisteredDate || new Date().toISOString(),
    motorAge: selectedMotor?.age || 0,
    distanceTraveled: selectedMotor?.totalDistance || 0,
    lastMaintenanceDate: selectedMotor?.lastMaintenanceDate,
    lastOilChange: selectedMotor?.lastOilChange,
    currentFuelLevel: selectedMotor?.currentFuelLevel,
    averageFuelConsumption: selectedMotor?.fuelEfficiency
  });

  // Real-time monitoring during navigation
  useEffect(() => {
    if (!isNavigating || !selectedMotor || !analyticsData) return;

    // Check conditions every minute during navigation
    const monitoringInterval = setInterval(() => {
      // Low fuel warning during navigation
      if (analyticsData.lowFuel) {
        Toast.show({
          type: 'error',
          text1: 'Low Fuel Warning',
          text2: 'Consider refueling soon. Finding nearby gas stations...',
          position: 'top',
          visibilityTime: 4000,
        });
        fetchTrafficReports(); // This will also update gas stations if implemented
      }

      // Maintenance warning during navigation
      if (analyticsData.maintenanceDue) {
        Toast.show({
          type: 'warning',
          text1: 'Maintenance Reminder',
          text2: 'Your motorcycle is due for maintenance. Plan a service visit soon.',
          position: 'top',
          visibilityTime: 4000,
        });
      }

      // Oil change warning during navigation
      if (analyticsData.needsOilChange) {
        Toast.show({
          type: 'warning',
          text1: 'Oil Change Due',
          text2: 'Your motorcycle needs an oil change. Visit a service center soon.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    }, 60000); // Check every minute

    return () => clearInterval(monitoringInterval);
  }, [isNavigating, selectedMotor, analyticsData, fetchTrafficReports]);

  // Route selection handler
  const handleRouteSelect = useCallback((id: string) => {
    const route = id === tripSummary?.id ? tripSummary : alternativeRoutes.find(r => r.id === id);
    if (route) {
      setSelectedRouteId(id);
      setSelectedRoute(route);
      mapRef.current?.fitToCoordinates(route.coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 300, left: 50 },
        animated: true,
      });
    }
  }, [tripSummary, alternativeRoutes]);

  // Bottom sheet close handler
  const handleBottomSheetClose = useCallback(() => {
    setShowBottomSheet(false);
  }, []);

  // Track user's path while navigating
  useEffect(() => {
    if (!isNavigating || !currentLocation) return;

    // Initialize path with current location if empty
    if (pathCoords.length === 0) {
      setPathCoords([currentLocation]);
    }

    let subscription: Location.LocationSubscription;

    const startTracking = async () => {
      try {
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 10, // Update every 10 meters
            timeInterval: 5000    // Or every 5 seconds
          },
          (location) => {
            const newPoint = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            setPathCoords((prev) => {
              // Don't add duplicate points
              const lastPoint = prev[prev.length - 1];
              if (lastPoint && 
                  lastPoint.latitude === newPoint.latitude && 
                  lastPoint.longitude === newPoint.longitude) {
                return prev;
              }
              return [...prev, newPoint];
            });

            // Update speed and check for overspeeding
            const speedKmh = location.coords.speed ? location.coords.speed * 3.6 : 0;
            setCurrentSpeed(speedKmh);
            setIsOverSpeedLimit(speedKmh > 80);

            if (speedKmh > 80) {
              Toast.show({
                type: 'error',
                text1: 'Speed Warning',
                text2: 'You are exceeding the speed limit!',
                position: 'top',
                visibilityTime: 3000,
              });
            }

            // Update distance remaining and ETA
            if (selectedRoute) {
              const lastRoutePoint = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
              const remainingDist = calcDistance(newPoint, lastRoutePoint);
              setDistanceRemaining(remainingDist);

              // Calculate ETA based on current speed and remaining distance
              // Use average speed if current speed is too low
              const avgSpeed = Math.max(speedKmh, 20); // Assume minimum average speed of 20 km/h
              const remainingTimeHours = (remainingDist / 1000) / avgSpeed; // Convert distance to km
              const remainingTimeMs = remainingTimeHours * 3600000; // Convert hours to milliseconds
              
              const estimatedArrival = new Date(Date.now() + remainingTimeMs);
              const formattedETA = estimatedArrival.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              
              setCurrentEta(formattedETA);

              // Update fuel used based on distance traveled
              const distanceTraveled = calculateTotalPathDistance(pathCoords);
              const fuelUsed = distanceTraveled / (selectedMotor?.fuelEfficiency || 20);
              setCurrentFuelUsed(fuelUsed);
            }
          }
        );
      } catch (error) {
        console.error("⚠️ Error tracking location:", error);
      }
    };

    startTracking();

    // Update time elapsed every second
    const timer = setInterval(() => {
      if (navigationStartTime) {
        setTimeElapsed(Math.floor((Date.now() - navigationStartTime) / 1000));
      }
    }, 1000);

    return () => {
      if (subscription) {
        subscription.remove();
      }
      clearInterval(timer);
    };
  }, [isNavigating, currentLocation, selectedRoute, navigationStartTime, selectedMotor]);

  // Start navigation function update
  const startNavigation = useCallback(async () => {
    if (!selectedRoute || !currentLocation || !selectedMotor) {
      Alert.alert("Error", "Please select a route and motor first");
      return;
    }

    // Initialize path with starting point
    setPathCoords([currentLocation]);

    // Pre-navigation analytics checks
    if (analyticsData.lowFuel) {
      Alert.alert(
        "Low Fuel Warning",
        "Your fuel level is low. Would you like to find nearby gas stations before starting navigation?",
        [
          {
            text: "Find Gas Stations",
            onPress: () => {
              fetchTrafficReports();
            }
          },
          {
            text: "Continue Anyway",
            onPress: () => {
              setIsNavigating(true);
              setNavigationStartTime(Date.now());
              setIsFollowingUser(true);
            }
          }
        ]
      );
    } else {
      setIsNavigating(true);
      setNavigationStartTime(Date.now());
      setIsFollowingUser(true);
    }

    // Get the start address
    const address = await reverseGeocodeLocation(currentLocation.latitude, currentLocation.longitude);
    setStartAddress(address);

    animateToRegion({
      ...currentLocation,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    });
  }, [selectedRoute, currentLocation, selectedMotor, analyticsData, fetchTrafficReports]);

  // Voice navigation state
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  console.log(user._id);
  // 📍 Load user-linked motors on mount



  // 📡 Get current location and subscribe to updates
  useEffect(() => {
    let sub: Location.LocationSubscription;

    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission Denied", "Location access is required for navigation.");
          throw new Error("Permission denied");
        }


        const loc = await Location.getCurrentPositionAsync({});
        const initReg = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        };

        setCurrentLocation(initReg);
        setRegion(initReg);
        animateToRegion(initReg);
        downloadOfflineMap(initReg);
        setIsLoading(false);

        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 10 },
          (update) => {
            const newLocation = {
              latitude: update.coords.latitude,
              longitude: update.coords.longitude,
            };
            setCurrentLocation(newLocation);

            if (isFollowingUser || isNavigating) {
              animateToRegion({
                ...newLocation,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              });
            }
          }
        );
      } catch (error) {
        setIsLoading(false);
        Alert.alert("Location Error", "Failed to get location");
      }
    };

    getLocation();
    return () => sub?.remove();
  }, [isFollowingUser, isNavigating]);


  // off-route detection and autorerouting
  useEffect(() => {
    if (!isNavigating || !selectedRoute || !currentLocation) return;

    const userIsOffRoute = isUserOffRoute(currentLocation, selectedRoute.coordinates, 20);
    if (userIsOffRoute) {
      //Alert.alert("Rerouting", "You have deviated from the route. Fetching a new route...");
      setWasRerouted(true);
      console.warn("🚨 Off-route detected. Rerouting...");
      setCurrentInstructionIndex(0);
      fetchRoutes();
      
      setShowBottomSheet(false);
    }
  }, [currentLocation, isNavigating, selectedRoute]);


  // 🧭 Detect arrival and handle navigation cleanup
  useEffect(() => {
    if (!isNavigating || !selectedRoute || !currentLocation) return;

    const lastCoord = selectedRoute.coordinates[selectedRoute.coordinates.length - 1];
    const distance = calcDistance(currentLocation, lastCoord);
    if (distance < ARRIVAL_THRESHOLD) endNavigation(true);

    return () => {
      if (voiceNavTimeout.current) clearTimeout(voiceNavTimeout.current);
    };
  }, [isNavigating, currentLocation, selectedRoute]);

  // 🚀 Animate camera to region
  const animateToRegion = useCallback((newRegion: any) => {
    mapRef.current?.animateToRegion(newRegion, 1000);
  }, []);

  // 🛣️ Fetch route and alternatives from Google Directions API
const buildDirectionsUrl = ({
  origin,
  destination,
  alternatives = true,
  departureTime = "now",
  trafficModel = "best_guess",
  apiKey = GOOGLE_MAPS_API_KEY,
}) => {
  const baseUrl = "https://maps.googleapis.com/maps/api/directions/json";
  const params = new URLSearchParams({
    origin: `${origin.latitude},${origin.longitude}`,
    destination: `${destination.latitude},${destination.longitude}`,
    alternatives: "true",
    mode: "driving",
    departure_time: departureTime,
    traffic_model: trafficModel,
    key: apiKey,
  });
  return `${baseUrl}?${params.toString()}`;
};

const fetchRoutes = useCallback(async () => {
  if (!currentLocation || !destination || !selectedMotor) {
    console.log("Missing required data:", { 
      hasCurrentLocation: !!currentLocation, 
      hasDestination: !!destination, 
      hasSelectedMotor: !!selectedMotor 
    });
    return;
  }

  setIsLoading(true);
  console.log("🛰️ Fetching routes...");

  try {
    const url = buildDirectionsUrl({
      origin: currentLocation,
      destination: destination,
    });

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      throw new Error(data.error_message || "Failed to fetch routes");
    }

    const allRoutes = data.routes.map((r: any, i: number): RouteData => {
      const leg = r.legs[0];
      const fuel = selectedMotor ? leg.distance.value / 1000 / selectedMotor.fuelEfficiency : 0;

      return {
        id: `route-${i}`,
        distance: leg.distance.value,
        duration: leg.duration.value,
        fuelEstimate: fuel,
        trafficRate: Math.floor(Math.random() * 5) + 1,
        coordinates: polyline.decode(r.overview_polyline.points).map(([lat, lng]) => ({
          latitude: lat,
          longitude: lng,
        })),
        instructions: leg.steps.map((step: any) =>
          step.html_instructions.replace(/<[^>]*>/g, "")
        ),
      };
    });

    if (allRoutes.length === 0) {
      throw new Error("No routes found");
    }

    const mainRoute = allRoutes[0];
    const alternatives = allRoutes.slice(1);

    setTripSummary(mainRoute);
    setAlternativeRoutes(alternatives);
    
    // Always select the main route when fetching new routes
    setSelectedRouteId(mainRoute.id);
    setSelectedRoute(mainRoute);
    
    setShowBottomSheet(true);
    await fetchTrafficReports();

  } catch (error: any) {
    console.error("❌ Route Fetch Error:", error.message);
    Alert.alert("Error", "Failed to fetch routes. Please try again.");
    
    setShowBottomSheet(false);
    setTripSummary(null);
    setAlternativeRoutes([]);
    setSelectedRouteId(null);
    setSelectedRoute(null);
  } finally {
    setIsLoading(false);
  }
}, [currentLocation, destination, selectedMotor, fetchTrafficReports]);


const [currentInstructionIndex, setCurrentInstructionIndex] = useState(0);
const [durationInMinutes, setDurationInMinutes] = useState(0);

const endNavigation = useCallback(async (arrived: boolean = false) => {
  // First, stop the navigation
  setIsNavigating(false);
  setIsFollowingUser(false);
  setNavigationStartTime(null);

  // Check for required data
  if (!user) {
    console.warn("⚠️ Cannot save trip summary: No user data");
    return;
  }

  if (!destination) {
    console.warn("⚠️ Cannot save trip summary: No destination data");
    return;
  }

  if (!selectedRoute) {
    console.warn("⚠️ Cannot save trip summary: No route data");
    return;
  }

  if (!selectedMotor) {
    console.warn("⚠️ Cannot save trip summary: No motor data");
    return;
  }

  // For same location trips, ensure we have at least 2 points
  let finalPathCoords = pathCoords;
  if (pathCoords.length < 2 && currentLocation) {
    // If start and end are the same, create a small circular path
    const radius = 0.0001; // Small radius around the point
    finalPathCoords = [
      currentLocation,
      {
        latitude: currentLocation.latitude + radius,
        longitude: currentLocation.longitude + radius
      },
      {
        latitude: currentLocation.latitude - radius,
        longitude: currentLocation.longitude - radius
      },
      currentLocation
    ];
  }

  // Calculate trip metrics
  const durationInMinutes = navigationStartTime 
    ? Math.round((Date.now() - navigationStartTime) / 60000) 
    : 1; // Minimum 1 minute for same-location trips

  const actualDistance = calculateTotalPathDistance(finalPathCoords);

  const estimatedFuel = calculateFuelRange(
    selectedRoute.distance / 1000,
    selectedMotor.fuelEfficiency
  );

  const actualFuel = calculateFuelRange(
    actualDistance,
    selectedMotor.fuelEfficiency
  );

  // Prepare trip summary
  const summary: TripSummary = {
    userId: user._id,
    motorId: selectedMotor._id,
    distance: Number((selectedRoute.distance / 1000).toFixed(2)),
    fuelUsed: Number(selectedRoute.fuelEstimate.toFixed(2)),
    eta: new Date(Date.now() + selectedRoute.duration * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    timeArrived: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }),
    destination: destination.address || "Unknown",
    startAddress: startAddress || "Unknown"
  };

  try {
    // Save the trip summary with the modified path data
    await saveTripSummaryToBackend(summary, arrived, {
      startAddress,
      estimatedFuel,
      actualFuel,
      actualDistance,
      pathCoords: finalPathCoords,
      plannedCoords: selectedRoute.coordinates,
      wasRerouted,
      durationInMinutes,
    });

    console.log("✅ Trip summary saved successfully");
    
    // Show the trip summary modal
    setTripSummaryModalVisible(true);
  } catch (error) {
    console.error("🔥 Failed to save trip summary:", error);
    Alert.alert(
      "Error",
      "Failed to save trip summary. Your trip data might not be recorded.",
      [{ text: "OK" }]
    );
  }
}, [
  user,
  destination,
  selectedRoute,
  selectedMotor,
  pathCoords,
  navigationStartTime,
  wasRerouted,
  startAddress,
  currentLocation
]);







const actualDistance = selectedRoute ? calculateTotalPathDistance(pathCoords) : 0;
const estimatedFuel = selectedRoute && selectedMotor
  ? calculateFuelRange(selectedRoute.distance / 1000, selectedMotor.fuelEfficiency)
  : { min: 0, max: 0, avg: 0 };
const actualFuel = selectedMotor
  ? calculateFuelRange(actualDistance, selectedMotor.fuelEfficiency)
  : { min: 0, max: 0, avg: 0 };



// 💾 Save trip summary to backend
const saveTripSummaryToBackend = async (
  summary: TripSummary,
  arrived: boolean,
  extras: {
    startAddress?: string;
    estimatedFuel: { min: number; max: number; avg: number };
    actualFuel: { min: number; max: number; avg: number };
    actualDistance: number;
    pathCoords: LocationCoords[];
    plannedCoords: LocationCoords[];
    wasRerouted: boolean;
    durationInMinutes: number;
  }
) => {
  try {
    if (!user?._id || !selectedMotor?._id) {
      throw new Error('Missing user or motor data');
    }

    // Save the trip summary
    const tripData = {
      userId: user._id,
      motorId: selectedMotor._id,
      startAddress: extras.startAddress || 'Unknown',
      destination: summary.destination,
      distance: summary.distance,
      duration: extras.durationInMinutes,
      fuelUsed: summary.fuelUsed,
      fuelUsedMin: extras.estimatedFuel.min,
      fuelUsedMax: extras.estimatedFuel.max,
      actualFuelUsedMin: extras.actualFuel.min,
      actualFuelUsedMax: extras.actualFuel.max,
      actualDistance: extras.actualDistance,
      wasRerouted: extras.wasRerouted,
      isSuccessful: arrived,
      status: arrived ? "completed" : "cancelled",
      timeArrived: summary.timeArrived,
      eta: summary.eta,
      trafficCondition: "moderate",
      kmph: 0,
      rerouteCount: 0,
      wasInBackground: false,
      showAnalyticsModal: false
    };

    console.log('Saving trip data:', tripData);

    const tripResponse = await fetch(`${LOCALHOST_IP}/api/trips`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tripData)
    });

    if (!tripResponse.ok) {
      throw new Error('Failed to save trip summary');
    }

    const savedTrip = await tripResponse.json();
    console.log('✅ Trip saved successfully:', savedTrip);

    // Show success toast
    Toast.show({
      type: 'success',
      text1: 'Trip Saved',
      text2: 'Your trip has been recorded successfully',
      position: 'top',
      visibilityTime: 3000,
    });

    // Set trip summary modal visible
    setTripSummaryModalVisible(true);

  } catch (error) {
    console.error('🔥 Error saving trip data:', error);
    Alert.alert(
      "Error",
      "Failed to save trip data. Please try again.",
      [{ text: "OK" }]
    );
    throw error;
  }
};

  // 🌐 Loading States
  if (!user || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>
          {!user ? "Loading user data..." : "Loading location..."}
        </Text>
      </View>
    );
  }



  // ✅ Continue with render (map, modals, UI controls, etc.)
  // The rest of the render JSX you've written (header, map view, modals, route sheets, etc.)
  // remains unchanged and is already well-structured.


  return (
    <SafeAreaProvider>
      <SafeAreaView style={[styles.safeArea]}>
        {/* Header */}
        <LinearGradient
          colors={['#00ADB5', '#3498db']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerText}>Traffic Slight</Text>
          
        </LinearGradient>

        {/* Destination Display */}
        {destination && (
          <View style={styles.destinationHeader}>
            <Pressable onPress={() => {
              // When pressing the destination, show the modal but don't clear the route
              setModalVisible(true);
            }}>
              <Text style={styles.destinationText} numberOfLines={1}>
                {destination.address}
              </Text>
            </Pressable>
          </View>
        )}

        {/* Search Modal */}
        <Modal 
          animationType="slide" 
          visible={modalVisible}
          onRequestClose={() => {
            // If we have a destination and routes, just close the modal
            if (destination && (selectedRoute || selectedRouteId)) {
              setModalVisible(false);
            } else {
              // Only navigate back if we don't have an active route
              setSearchText("");
              setModalVisible(false);
              if (navigation?.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate("MainTabs", { screen: "Map" });
              }
            }
          }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity 
                onPress={() => {
                  // If we have a destination and routes, just close the modal
                  if (destination && (selectedRoute || selectedRouteId)) {
                    setModalVisible(false);
                  } else {
                    // Only clear and navigate back if we don't have an active route
                    setSearchText("");
                    setModalVisible(false);
                    if (navigation?.canGoBack()) {
                      navigation.goBack();
                    } else {
                      navigation.navigate("MainTabs", { screen: "Map" });
                    }
                  }
                }} 
                style={styles.modalBackButton}
              >
                <MaterialIcons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Where to?</Text>
            </View>

            <SearchBar
              searchRef={searchRef}
              searchText={searchText}
              setSearchText={setSearchText}
              isTyping={isTyping}
              setIsTyping={setIsTyping}
              setDestination={(dest) => {
                if (!selectedMotor) {
                  Alert.alert("Select Motor", "Please select a motor first");
                  return;
                }
                
                setDestination(dest);
                setModalVisible(false);
                
                // If we don't have current location, get it first
                if (!currentLocation) {
                  (async () => {
                    const loc = await Location.getCurrentPositionAsync({});
                    const newLocation = {
                      latitude: loc.coords.latitude,
                      longitude: loc.coords.longitude,
                    };
                    setCurrentLocation(newLocation);
                    fetchRoutes();
                  })();
                } else {
                  // If we have current location, fetch routes immediately
                  fetchRoutes();
                }
              }}
              animateToRegion={animateToRegion}
              selectedMotor={selectedMotor}
              setSelectedMotor={(motor: Motor | null) => setSelectedMotor(motor)}
              motorList={motorList}
              onPlaceSelectedCloseModal={() => setModalVisible(false)}
              userId={user?._id}
            />
          </View>
        </Modal>

        {/* Map View */}
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            region={region}
            customMapStyle={mapStyle === "dark" ? darkMapStyle : []}
            showsUserLocation
            showsTraffic={!isOffline}
            showsMyLocationButton={false}
          >
            {isOffline && (
              <UrlTile
                urlTemplate="http://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
                maximumZ={19}
              />
            )}

            {/* Routes */}
            {alternativeRoutes.map((route) => (
              <Polyline
                key={route.id}
                coordinates={route.coordinates}
                strokeColor="#95a5a6"
                strokeWidth={4}
              />
            ))}

            {selectedRoute && (
              <Polyline
                coordinates={selectedRoute.coordinates}
                strokeColor="#3498db"
                strokeWidth={6}
              />
            )}
            <Polyline
              coordinates={pathCoords}
              strokeColor="#2ecc71"
              strokeWidth={4}
            />

            {/* Markers */}
            {currentLocation && (
              <Marker coordinate={currentLocation} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.userMarker}>
                  <MaterialIcons name="person-pin-circle" size={32} color="#3498db" />
                </View>
              </Marker>
            )}

            {destination && (
              <Marker coordinate={destination} anchor={{ x: 0.5, y: 0.5 }}>
                <View style={styles.destinationMarker}>
                  <MaterialIcons name="place" size={32} color="#e74c3c" />
                </View>
              </Marker>
            )}


          </MapView>


          {/* Speedometer */}
          {isNavigating && (
            <Speedometer speed={currentSpeed} isOverSpeedLimit={isOverSpeedLimit} />
          )}

          {/* Analytics Overlay */}
          {!isNavigating && <AnalyticsOverlay analyticsData={analyticsData} selectedMotor={selectedMotor} />}

          {/* Loading State */}
          {!selectedRoute && !isNavigating && destination && isLoading && (
            <View style={styles.routeLoadingContainer}>
              <ActivityIndicator size="large" color="#00ADB5" />
              <Text style={styles.routeLoadingText}>Finding best routes...</Text>
            </View>
          )}

          {/* Bottom Buttons Container - Only show when bottom sheet is closed and not navigating */}
          {!showBottomSheet && !isNavigating && (
            <View style={styles.bottomButtonsContainer}>
              {(selectedRoute || (selectedRouteId && (tripSummary?.id === selectedRouteId || alternativeRoutes.find(r => r.id === selectedRouteId)))) && (
                <>
                  <TouchableOpacity 
                    onPress={() => setShowBottomSheet(true)} 
                    style={styles.showRoutesButton}
                    disabled={isNavigating} // Disable during navigation
                  >
                    <LinearGradient
                      colors={['#00ADB5', '#00858B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.showRoutesGradient}
                    >
                      <Text style={styles.showRoutesText}>Show Available Routes</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  
                  <View style={styles.buttonSpacer} />
                  
                  <TouchableOpacity 
                    onPress={startNavigation} 
                    style={styles.navigationButton}
                    disabled={isNavigating} // Disable during navigation
                  >
                    <LinearGradient
                      colors={['#2ecc71', '#27ae60']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.navigationGradient}
                    >
                      <Text style={styles.navigationButtonText}>Start Navigation</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}
              
              {!selectedRoute && destination && !isLoading && (
                <TouchableOpacity 
                  onPress={fetchRoutes} 
                  style={styles.showRoutesButton}
                  disabled={isNavigating} // Disable during navigation
                >
                  <LinearGradient
                    colors={['#00ADB5', '#00858B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.showRoutesGradient}
                  >
                    <Text style={styles.showRoutesText}>Show Available Routes</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Navigation Controls */}
          {isNavigating && (
            <NavigationControls
              onEndNavigation={() => endNavigation(false)}
              onShowDetails={() => setTripDetailsModalVisible(true)}
              onMaintenanceAction={(type) => handleMaintenanceAction(type)}
              currentSpeed={currentSpeed}
              distanceRemaining={distanceRemaining}
              timeElapsed={timeElapsed}
              currentEta={currentEta}
              isOverSpeedLimit={isOverSpeedLimit}
            />
          )}

          {/* Trip Details Modal */}
          <TripDetailsModal
            visible={tripDetailsModalVisible}
            onClose={() => setTripDetailsModalVisible(false)}
            currentSpeed={currentSpeed}
            distanceRemaining={distanceRemaining}
            timeElapsed={timeElapsed}
            currentEta={currentEta}
            currentFuelUsed={currentFuelUsed}
            isOverSpeedLimit={isOverSpeedLimit}
            selectedRoute={selectedRoute}
            selectedMotor={selectedMotor}
          />
        </View>


        {/* Route Details */}
        <RouteDetailsBottomSheet
          visible={showBottomSheet}
          bestRoute={tripSummary}
          alternatives={alternativeRoutes}
          onClose={handleBottomSheetClose}
          selectedRouteId={selectedRouteId}
          onSelectRoute={handleRouteSelect}
          selectedMotor={selectedMotor}
          isNavigating={isNavigating}
        />



        {/* Trip Summary Modal */}
        <Modal 
          transparent 
          visible={tripSummaryModalVisible} 
          animationType="fade"
          onRequestClose={() => setTripSummaryModalVisible(false)}
        >
          <View style={[styles.summaryModalContainer, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
            <View style={[styles.summaryModal, { margin: 20 }]}>
              <LinearGradient
                colors={['#00ADB5', '#00858B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.summaryHeaderGradient}
              >
                <Text style={[styles.summaryTitle, { color: '#fff' }]}>Trip Summary & Analytics</Text>
              </LinearGradient>

              <ScrollView style={styles.summaryContent}>
                {/* Route Information */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Route Information</Text>
                  
  <View style={styles.summaryRow}>
    <MaterialIcons name="my-location" size={20} color="#34495e" />
    <Text style={styles.summaryText}>From: {startAddress || "Unknown"}</Text>
  </View>

  <View style={styles.summaryRow}>
    <MaterialIcons name="place" size={20} color="#e74c3c" />
                    <Text style={styles.summaryText}>To: {destination?.address || "Unknown"}</Text>
                  </View>
  </View>

                {/* Distance Analytics */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Distance Analytics</Text>
                  
  <View style={styles.summaryRow}>
                    <MaterialIcons name="straighten" size={20} color="#3498db" />
                    <View style={styles.analyticsCompare}>
                      <Text style={styles.analyticsLabel}>Planned Distance:</Text>
                      <Text style={styles.analyticsValue}>{selectedRoute ? (selectedRoute.distance / 1000).toFixed(2) : "--"} km</Text>
                      <Text style={styles.analyticsLabel}>Actual Distance:</Text>
                      <Text style={styles.analyticsValue}>{calculateTotalPathDistance(pathCoords).toFixed(2)} km</Text>
                      <Text style={styles.analyticsDiff}>
                        {wasRerouted ? "Route was recalculated during trip" : "Stayed on planned route"}
    </Text>
                    </View>
                  </View>
  </View>

                {/* Fuel Analytics */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Fuel Analytics</Text>
                  
  <View style={styles.summaryRow}>
    <MaterialIcons name="local-gas-station" size={20} color="#2ecc71" />
                    <View style={styles.analyticsCompare}>
                      <Text style={styles.analyticsLabel}>Estimated Consumption:</Text>
                      <Text style={styles.analyticsValue}>{selectedRoute ? selectedRoute.fuelEstimate.toFixed(2) : "--"} L</Text>
                      <Text style={styles.analyticsLabel}>Actual Consumption:</Text>
                      <Text style={styles.analyticsValue}>
                        {selectedRoute ? (selectedRoute.fuelEstimate * (wasRerouted ? 1.1 : 1.0)).toFixed(2) : "--"} L
    </Text>
                      <Text style={styles.analyticsLabel}>Efficiency:</Text>
                      <Text style={styles.analyticsValue}>{selectedMotor?.fuelEfficiency || "--"} km/L</Text>
                    </View>
                  </View>
  </View>

                {/* Time Analytics */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Time Analytics</Text>
                  
  <View style={styles.summaryRow}>
    <MaterialIcons name="schedule" size={20} color="#9b59b6" />
                    <View style={styles.analyticsCompare}>
                      <Text style={styles.analyticsLabel}>Start Time:</Text>
                      <Text style={styles.analyticsValue}>
                        {navigationStartTime ? new Date(navigationStartTime).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }) : "--"}
                      </Text>
                      <Text style={styles.analyticsLabel}>End Time:</Text>
                      <Text style={styles.analyticsValue}>
                        {new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}
    </Text>
                      <Text style={styles.analyticsLabel}>Total Duration:</Text>
                      <Text style={styles.analyticsValue}>{durationInMinutes} minutes</Text>
  </View>
                  </View>
  </View>

                {/* Motor Information */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Motor Information</Text>
                  
  <View style={styles.summaryRow}>
    <MaterialIcons name="two-wheeler" size={20} color="#1abc9c" />
                    <View style={styles.analyticsCompare}>
                      <Text style={styles.analyticsLabel}>Motor:</Text>
                      <Text style={styles.analyticsValue}>{selectedMotor?.name || "--"}</Text>
                      <Text style={styles.analyticsLabel}>Current Fuel Level:</Text>
                      <Text style={styles.analyticsValue}>{selectedMotor?.currentFuelLevel || "--"}%</Text>
                      <Text style={styles.analyticsLabel}>Total Distance Traveled:</Text>
                      <Text style={styles.analyticsValue}>{selectedMotor?.totalDistance || "--"} km</Text>
                    </View>
                  </View>
  </View>

                {/* Maintenance Actions */}
                <View style={styles.summarySection}>
                  <Text style={styles.sectionTitle}>Maintenance Actions</Text>
                  {maintenanceActions.length > 0 ? (
                    maintenanceActions.map((action, index) => renderMaintenanceAction(action, index))
                  ) : (
                    <Text style={styles.noMaintenanceText}>No maintenance actions recorded</Text>
                  )}
                </View>
              </ScrollView>

  <TouchableOpacity
    onPress={() => {
      setTripSummaryModalVisible(false);
      navigation.goBack();
    }}
    style={styles.closeSummaryButton}
              >
                <LinearGradient
                  colors={['#00ADB5', '#00858B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.closeSummaryGradient}
  >
    <Text style={styles.closeSummaryText}>Done</Text>
                </LinearGradient>
  </TouchableOpacity>
</View>
          </View>
        </Modal>

        {/* Maintenance Form Modal */}
        <MaintenanceFormModal
          visible={maintenanceFormVisible}
          formData={maintenanceFormData}
          onClose={() => setMaintenanceFormVisible(false)}
          onSave={handleMaintenanceFormSave}
          onChange={handleMaintenanceFormChange}
        />

        {/* Update the RouteDetailsBottomSheet to pass isNavigating */}
        <RouteDetailsBottomSheet
          visible={showBottomSheet}
          bestRoute={tripSummary}
          alternatives={alternativeRoutes}
          onClose={handleBottomSheetClose}
          selectedRouteId={selectedRouteId}
          onSelectRoute={handleRouteSelect}
          selectedMotor={selectedMotor}
          isNavigating={isNavigating}
        />

        {/* Replace the old navigation controls with the new component */}
        {isNavigating && (
          <NavigationControls
            onEndNavigation={() => endNavigation(false)}
            onShowDetails={() => setTripDetailsModalVisible(true)}
            onMaintenanceAction={(type) => handleMaintenanceAction(type)}
            currentSpeed={currentSpeed}
            distanceRemaining={distanceRemaining}
            timeElapsed={timeElapsed}
            currentEta={currentEta}
            isOverSpeedLimit={isOverSpeedLimit}
          />
        )}

      </SafeAreaView>
      
      {/* Add Toast at the end of SafeAreaView */}
      <Toast />
      
      {/* Add Maintenance Form Modal */}
      <MaintenanceFormModal
        visible={maintenanceFormVisible}
        formData={maintenanceFormData}
        onClose={() => setMaintenanceFormVisible(false)}
        onSave={handleMaintenanceFormSave}
        onChange={handleMaintenanceFormChange}
      />
    </SafeAreaProvider>
  );
}

// ----------------------------------------------------------------
// Styles
// ----------------------------------------------------------------
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
];

const styles = StyleSheet.create({
  // Base Styles
  safeArea: {
    flex: 1,
    backgroundColor: '#00ADB5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },

  // Map and Container Styles
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Header Styles
  headerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === "android" ? 25 : 16,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },

  // Destination Styles
  destinationHeader: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  destinationText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },

  // Navigation Controls Container
  navigationControlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // Stats Bar
  navigationStatsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  navigationStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  navigationStatValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  navigationStatLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
  },

  navigationStatText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '600',
  },

  // Control Buttons
  navigationButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    paddingHorizontal: 20,
  },

  navigationControlButton: {
    alignItems: 'center',
    width: 80,
  },

  navigationControlGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  navigationControlLabel: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },

  navigationControlText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },

  // Top Stats Container
  topStatsContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    alignItems: 'center',
  },

  speedometerContainer: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 20,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },

  speedLimitWarning: {
    backgroundColor: 'rgba(231, 76, 60, 0.85)',
  },

  speedValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },

  speedUnit: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
    opacity: 0.8,
  },

  warningIcon: {
    marginLeft: 8,
  },

  // Bottom Sheet Styles
  bottomSheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  bottomSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#00ADB5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  bottomSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  closeButton: {
    padding: 4,
  },
  bottomSheetContent: {
    padding: 16,
    backgroundColor: '#F2EEEE',
  },

  // Route Selection Styles
  sortContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  sortLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  sortButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
  },
  sortButtonActive: {
    backgroundColor: '#00ADB5',
  },
  sortButtonText: {
    color: '#00ADB5',
    fontWeight: '600',
    fontSize: 14,
  },
  sortButtonTextActive: {
    color: '#fff',
  },

  // Route Card Styles
  routeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  selectedRouteCard: {
    backgroundColor: 'rgba(0, 173, 181, 0.05)',
    borderColor: '#00ADB5',
    borderWidth: 2,
  },
  recommendedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  recommendedText: {
    color: '#1A1A1A',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  modalBackButton: {
    padding: 8,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333333',
  },

  // Marker Styles
  markerBase: {
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  userMarker: {
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 20,
  },
  destinationMarker: {
    backgroundColor: '#fff',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 20,
  },
  incidentMarker: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    borderRadius: 15,
    padding: 5,
  },

  // Route Detail Styles
  routeDetail: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 173, 181, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },

  // Form Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formModal: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  notesInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  formButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  cancelButton: {
    backgroundColor: '#e74c3c',
  },
  saveButton: {
    backgroundColor: '#00ADB5',
  },
  saveButtonText: {
    color: '#fff',
  },

  // Maintenance Action Styles
  maintenanceActionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  maintenanceActionDetails: {
    marginLeft: 16,
    flex: 1,
  },
  maintenanceActionType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  maintenanceActionTime: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  maintenanceActionInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  maintenanceActionCost: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
    marginBottom: 4,
  },
  maintenanceActionQuantity: {
    fontSize: 14,
    color: '#27ae60',
    marginBottom: 4,
  },
  maintenanceActionLocation: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  maintenanceActionNotes: {
    fontSize: 14,
    color: '#34495e',
    fontStyle: 'italic',
    marginTop: 8,
  },

  // Maintenance Container Styles
  maintenanceContainer: {
    marginVertical: 12,
  },
  maintenanceButton: {
    backgroundColor: '#00ADB5',
  },

  // Route Loading Styles
  routeLoadingContainer: {
    position: 'absolute',
    top: '50%',
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeLoadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },

  // Bottom Buttons Container
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Navigation Button Styles
  navigationButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#2ecc71',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  navigationGradient: {
    padding: 12,
    alignItems: 'center',
  },
  navigationButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Route Button Styles
  showRoutesButton: {
    margin: 16,
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
  showRoutesGradient: {
    padding: 16,
    alignItems: 'center',
  },
  showRoutesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSpacer: {
    height: 12,
  },

  // Summary Modal Styles
  summaryModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  summaryHeaderGradient: {
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  summaryContent: {
    padding: 16,
  },
  summarySection: {
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 12,
    flex: 1,
  },

  // Analytics styles
  analyticsOverlay: {
    position: 'absolute',
    top: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
    width: '80%',
    maxWidth: 300,
  },

  analyticsGradient: {
    padding: 16,
  },

  analyticsHeaderTouchable: {
    marginBottom: 8,
  },

  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },

  analyticsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  analyticsTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },

  analyticsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 8,
    borderRadius: 8,
  },

  analyticsText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },

  analyticsCompare: {
    marginLeft: 12,
    flex: 1,
  },

  analyticsLabel: {
    color: '#7f8c8d',
    fontSize: 12,
    marginBottom: 2,
  },

  analyticsValue: {
    color: '#2c3e50',
    fontSize: 14,
    fontWeight: '500',
  },

  analyticsDiff: {
    color: '#7f8c8d',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },

  warningText: {
    color: '#e74c3c',
    fontWeight: 'bold',
  },

  // Detail Styles
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },

  detailValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },

  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },

  maintenanceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  maintenanceButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },

  // ... keep all other existing styles unchanged ...

  // Trip Details styles
  tripDetailsModal: {
    backgroundColor: '#fff',
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    marginTop: 'auto',
    marginBottom: 'auto',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },

  tripDetailsHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#00ADB5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  tripDetailsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
  },

  tripDetailsContent: {
    padding: 16,
  },

  detailsSection: {
    marginBottom: 24,
  },

  // Summary styles
  noMaintenanceText: {
    color: '#7f8c8d',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 12,
  },

  closeSummaryButton: {
    margin: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },

  closeSummaryGradient: {
    padding: 16,
    alignItems: 'center',
  },

  closeSummaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },

  warningRow: {
    backgroundColor: 'rgba(231, 76, 60, 0.1)',
  },

  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },

  detailSubtext: {
    color: '#7f8c8d',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
});

const reverseGeocodeLocation = async (lat: number, lng: number) => {
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await res.json();
    return data.results[0]?.formatted_address || "Unknown";
  } catch (err) {
    console.error("Reverse geocoding failed", err);
    return "Unknown";
  }
};



// Add this component before the NavigationApp component
const AnalyticsOverlay = ({ analyticsData, selectedMotor }: { 
  analyticsData: any, 
  selectedMotor: Motor | null 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const animatedValue = useRef(new Animated.Value(1)).current;

  const toggleMinimize = () => {
    Animated.spring(animatedValue, {
      toValue: isMinimized ? 1 : 0,
      useNativeDriver: false,
      friction: 8,
      tension: 40
    }).start();
    setIsMinimized(!isMinimized);
  };

  if (!selectedMotor) return null;

  return (
    <View style={styles.analyticsOverlay}>
      <LinearGradient
        colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)']}
        style={styles.analyticsGradient}
      >
        <TouchableOpacity 
          onPress={toggleMinimize}
          style={styles.analyticsHeaderTouchable}
        >
          <View style={styles.analyticsHeader}>
            <View style={styles.analyticsHeaderLeft}>
              <MaterialIcons name="analytics" size={24} color="#00ADB5" />
              <Text style={styles.analyticsTitle}>
                {selectedMotor.nickname || selectedMotor.name}
              </Text>
            </View>
            <MaterialIcons 
              name={isMinimized ? "expand-more" : "expand-less"} 
              size={24} 
              color="#fff" 
            />
          </View>
        </TouchableOpacity>

        {/* Basic Info - Always visible */}
        <View style={styles.analyticsRow}>
          <MaterialIcons 
            name="local-gas-station" 
            size={20} 
            color={analyticsData.lowFuel ? '#e74c3c' : '#2ecc71'} 
          />
          <Text style={[styles.analyticsText, analyticsData.lowFuel && styles.warningText]}>
            Fuel Level: {selectedMotor.currentFuelLevel}%
            {analyticsData.lowFuel && ' (Low)'}
          </Text>
        </View>

        <Animated.View style={{
          maxHeight: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 300]
          }),
          opacity: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1]
          }),
          overflow: 'hidden'
        }}>
          {/* Motor Info */}
          <View style={styles.analyticsRow}>
            <MaterialIcons name="two-wheeler" size={20} color="#3498db" />
            <Text style={styles.analyticsText}>
              {selectedMotor.name} ({selectedMotor.engineDisplacement || 'N/A'}cc)
            </Text>
          </View>

          {/* Total Distance */}
          <View style={styles.analyticsRow}>
            <MaterialIcons name="straighten" size={20} color="#2ecc71" />
            <Text style={styles.analyticsText}>
              Total Distance: {selectedMotor.analytics.totalDistance.toFixed(2)} km
            </Text>
          </View>

          {/* Trips Completed */}
          <View style={styles.analyticsRow}>
            <MaterialIcons name="flag" size={20} color="#e67e22" />
            <Text style={styles.analyticsText}>
              Trips Completed: {selectedMotor.analytics.tripsCompleted}
            </Text>
          </View>

          {/* Total Fuel Used */}
          <View style={styles.analyticsRow}>
            <MaterialIcons name="opacity" size={20} color="#9b59b6" />
            <Text style={styles.analyticsText}>
              Total Fuel Used: {selectedMotor.analytics.totalFuelUsed.toFixed(2)} L
            </Text>
          </View>

          {/* Fuel Efficiency */}
          <View style={styles.analyticsRow}>
            <MaterialIcons name="speed" size={20} color="#f1c40f" />
            <Text style={styles.analyticsText}>
              Avg. Efficiency: {selectedMotor.fuelEfficiency.toFixed(1)} km/L
            </Text>
          </View>

          {/* Maintenance Status */}
          <View style={styles.analyticsRow}>
            <MaterialIcons 
              name="build" 
              size={20} 
              color={analyticsData.maintenanceDue ? '#e74c3c' : '#2ecc71'} 
            />
            <Text style={[styles.analyticsText, analyticsData.maintenanceDue && styles.warningText]}>
              Maintenance: {analyticsData.maintenanceDue ? 'Due' : 'Up to date'}
            </Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const TripDetailsModal = ({ 
  visible, 
  onClose,
  currentSpeed,
  distanceRemaining,
  timeElapsed,
  currentEta,
  currentFuelUsed,
  isOverSpeedLimit,
  selectedRoute,
  selectedMotor
}: {
  visible: boolean;
  onClose: () => void;
  currentSpeed: number;
  distanceRemaining: number;
  timeElapsed: number;
  currentEta: string | null;
  currentFuelUsed: number;
  isOverSpeedLimit: boolean;
  selectedRoute: RouteData | null;
  selectedMotor: Motor | null;
}) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Status checks with default values for optional properties
  const lowFuel = (selectedMotor?.currentFuelLevel ?? 100) < 20;
  const needsOilChange = selectedMotor?.oilChangeDue ?? false;
  const needsMaintenance = selectedMotor?.maintenanceDue ?? false;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.tripDetailsModal}>
          <View style={styles.tripDetailsHeader}>
            <Text style={styles.tripDetailsTitle}>Trip Details</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialIcons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.tripDetailsContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Current Stats Section */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Current Stats</Text>

              {/* Speed */}
              <View style={[styles.detailRow, isOverSpeedLimit && styles.warningRow]}>
                <MaterialIcons name="speed" size={24} color={isOverSpeedLimit ? "#e74c3c" : "#00ADB5"} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Current Speed</Text>
                  <Text style={[styles.detailValue, isOverSpeedLimit && styles.warningText]}>
                    {currentSpeed.toFixed(1)} km/h
                    {isOverSpeedLimit && " ⚠️ Over Speed Limit"}
                  </Text>
                </View>
              </View>

              {/* Current Distance */}
              <View style={styles.detailRow}>
                <MaterialIcons name="straighten" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Distance Remaining</Text>
                  <Text style={styles.detailValue}>{(distanceRemaining / 1000).toFixed(2)} km</Text>
                </View>
              </View>

              {/* Time */}
              <View style={styles.detailRow}>
                <MaterialIcons name="timer" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Time Elapsed</Text>
                  <Text style={styles.detailValue}>{formatTime(timeElapsed)}</Text>
                </View>
              </View>

              {/* Current ETA */}
              <View style={styles.detailRow}>
                <MaterialIcons name="schedule" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Current ETA</Text>
                  <Text style={styles.detailValue}>{currentEta || 'Calculating...'}</Text>
                </View>
              </View>

              {/* Current Fuel */}
              <View style={styles.detailRow}>
                <MaterialIcons name="local-gas-station" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Fuel Used</Text>
                  <Text style={styles.detailValue}>{currentFuelUsed.toFixed(2)} L</Text>
                </View>
              </View>
            </View>

            {/* Estimated Stats Section */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Route Estimates</Text>

              {/* Estimated Distance */}
              <View style={styles.detailRow}>
                <MaterialIcons name="map" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Total Route Distance</Text>
                  <Text style={styles.detailValue}>
                    {selectedRoute ? (selectedRoute.distance / 1000).toFixed(2) : '--'} km
                  </Text>
                </View>
              </View>

              {/* Estimated Time */}
              <View style={styles.detailRow}>
                <MaterialIcons name="access-time" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Estimated Total Time</Text>
                  <Text style={styles.detailValue}>
                    {selectedRoute ? (selectedRoute.duration / 60).toFixed(0) : '--'} minutes
                  </Text>
                </View>
              </View>

              {/* Estimated Fuel */}
              <View style={styles.detailRow}>
                <MaterialIcons name="local-gas-station" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Estimated Fuel Consumption</Text>
                  <Text style={styles.detailValue}>
                    {selectedRoute ? `${(selectedRoute.fuelEstimate - 0.03).toFixed(2)}–${(selectedRoute.fuelEstimate + 0.03).toFixed(2)} L` : '--'}
                  </Text>
                  <Text style={styles.detailSubtext}>Varies based on real-world conditions</Text>
                </View>
              </View>
            </View>

            {/* Motor Analytics Section */}
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Motor Analytics</Text>

              {/* Fuel Level */}
              <View style={[styles.detailRow, lowFuel && styles.warningRow]}>
                <MaterialIcons name="local-gas-station" size={24} color={lowFuel ? "#e74c3c" : "#00ADB5"} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Fuel Level</Text>
                  <Text style={[styles.detailValue, lowFuel && styles.warningText]}>
                    {selectedMotor?.currentFuelLevel}%
                    {lowFuel && " ⚠️ Low Fuel"}
                  </Text>
                </View>
              </View>

              {/* Oil Change */}
              <View style={[styles.detailRow, needsOilChange && styles.warningRow]}>
                <MaterialIcons name="build" size={24} color={needsOilChange ? "#e74c3c" : "#00ADB5"} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Oil Change</Text>
                  <Text style={[styles.detailValue, needsOilChange && styles.warningText]}>
                    {needsOilChange ? "Due" : "Up to Date"}
                    {needsOilChange && " ⚠️ Oil Change Due"}
                  </Text>
                </View>
              </View>

              {/* Maintenance */}
              <View style={[styles.detailRow, needsMaintenance && styles.warningRow]}>
                <MaterialIcons name="build" size={24} color={needsMaintenance ? "#e74c3c" : "#00ADB5"} />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Maintenance</Text>
                  <Text style={[styles.detailValue, needsMaintenance && styles.warningText]}>
                    {needsMaintenance ? "Due" : "Up to Date"}
                    {needsMaintenance && " ⚠️ Maintenance Due"}
                  </Text>
                </View>
              </View>

              {/* Total Distance */}
              <View style={styles.detailRow}>
                <MaterialIcons name="directions-bike" size={24} color="#00ADB5" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Total Distance Traveled</Text>
                  <Text style={styles.detailValue}>
                    {selectedMotor ? (selectedMotor.totalDistance / 1000).toFixed(2) : '--'} km
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const downloadOfflineMap = async (region: any) => {
  const zoomLevel = 12;
  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  // Create directory if it doesn't exist
  await FileSystem.makeDirectoryAsync(OFFLINE_TILES_PATH, { intermediates: true });

  // Simple offline map implementation - in production you'd want a more robust solution
  console.log("Offline map data prepared for region:", region);
};

// Add this before the main NavigationApp component
const NavigationControls: React.FC<{
  onEndNavigation: () => void;
  onShowDetails: () => void;
  onMaintenanceAction: (type: 'refuel' | 'oil_change' | 'tune_up') => void;
  currentSpeed: number;
  distanceRemaining: number;
  timeElapsed: number;
  currentEta: string | null;
  isOverSpeedLimit: boolean;
}> = ({
  onEndNavigation,
  onShowDetails,
  onMaintenanceAction,
  currentSpeed,
  distanceRemaining,
  timeElapsed,
  currentEta,
  isOverSpeedLimit,
}) => {
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <View style={styles.navigationControlsContainer}>
      {/* Quick Stats Row */}
      <View style={styles.navigationStatsBar}>
        <View style={styles.navigationStat}>
          <MaterialIcons name="straighten" size={20} color="#fff" />
          <View>
            <Text style={styles.navigationStatValue}>{(distanceRemaining / 1000).toFixed(1)} km</Text>
            <Text style={styles.navigationStatLabel}>Remaining</Text>
          </View>
        </View>

        <View style={styles.navigationStat}>
          <MaterialIcons name="timer" size={20} color="#fff" />
          <View>
            <Text style={styles.navigationStatValue}>{formatTime(timeElapsed)}</Text>
            <Text style={styles.navigationStatLabel}>Duration</Text>
          </View>
        </View>

        <View style={styles.navigationStat}>
          <MaterialIcons name="schedule" size={20} color="#fff" />
          <View>
            <Text style={styles.navigationStatValue}>{currentEta || '--'}</Text>
            <Text style={styles.navigationStatLabel}>ETA</Text>
          </View>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.navigationButtonsContainer}>
        <TouchableOpacity
          onPress={() => {
            Alert.alert(
              'Record Maintenance',
              'What type of maintenance would you like to record?',
              [
                {
                  text: 'Refuel',
                  onPress: () => onMaintenanceAction('refuel'),
                  style: 'default'
                },
                {
                  text: 'Oil Change',
                  onPress: () => onMaintenanceAction('oil_change'),
                  style: 'default'
                },
                {
                  text: 'Tune Up',
                  onPress: () => onMaintenanceAction('tune_up'),
                  style: 'default'
                },
                {
                  text: 'Cancel',
                  style: 'cancel'
                }
              ],
              { cancelable: true }
            );
          }}
          style={styles.navigationControlButton}
        >
          <LinearGradient
            colors={['#00ADB5', '#00858B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navigationControlGradient}
          >
            <MaterialIcons name="build" size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.navigationControlLabel}>Maintenance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onShowDetails}
          style={styles.navigationControlButton}
        >
          <LinearGradient
            colors={['#3498db', '#2980b9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navigationControlGradient}
          >
            <MaterialIcons name="analytics" size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.navigationControlLabel}>Details</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onEndNavigation}
          style={styles.navigationControlButton}
        >
          <LinearGradient
            colors={['#e74c3c', '#c0392b']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.navigationControlGradient}
          >
            <MaterialIcons name="stop" size={24} color="#fff" />
          </LinearGradient>
          <Text style={styles.navigationControlLabel}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Add this function before the NavigationApp component
const fetchMotorAnalytics = async (userId: string): Promise<Motor[]> => {
  try {
    const response = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${userId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch motor analytics');
    }
    const rawData = await response.json();
    
    // Transform the data to match the Motor type
    const data: Motor[] = rawData.map((motor: any) => ({
      _id: motor._id,
      name: motor.name,
      nickname: motor.nickname,
      fuelEfficiency: motor.fuelEfficiency,
      engineDisplacement: motor.engineDisplacement,
      fuelType: motor.fuelType || 'Regular',
      oilType: motor.oilType || 'Mineral',
      age: motor.age || 0,
      totalDistance: motor.totalDistance || 0,
      currentFuelLevel: motor.currentFuelLevel || 100,
      tankCapacity: motor.tankCapacity || 15,
      lastMaintenanceDate: motor.lastMaintenanceDate,
      lastOilChange: motor.lastOilChange,
      lastRegisteredDate: motor.lastRegisteredDate,
      lastTripDate: motor.lastTripDate,
      lastRefuelDate: motor.lastRefuelDate,
      fuelLevel: motor.currentFuelLevel || 100,
      oilChangeDue: motor.oilChangeDue || false,
      maintenanceDue: motor.maintenanceDue || false,
      analytics: {
        totalDistance: motor.analytics?.totalDistance || 0,
        tripsCompleted: motor.analytics?.tripsCompleted || 0,
        totalFuelUsed: motor.analytics?.totalFuelUsed || 0
      }
    }));
    return data;
  } catch (error) {
    console.error('Error fetching motor analytics:', error);
    return [];
  }
};