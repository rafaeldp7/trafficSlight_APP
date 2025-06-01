import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_API_KEY } from "@env";
import axios from "axios";
import type { GooglePlacesAutocompleteRef } from "react-native-google-places-autocomplete";
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Motor = {
  _id: string;
  name: string;
  fuelEfficiency: number;
  fuelType: 'Diesel' | 'Regular' | 'Premium';
  oilType: 'Mineral' | 'Semi-Synthetic' | 'Synthetic';
  age: number;
  totalDistance: number;
  currentFuelLevel: number;
  tankCapacity: number;
  lastMaintenanceDate?: string;
  lastOilChange?: string;
  lastRegisteredDate?: string;
  lastTripDate?: string;
  lastRefuelDate?: string;
};

type SearchBarProps = {
  searchRef: React.RefObject<GooglePlacesAutocompleteRef>;
  searchText: string;
  setSearchText: (value: string) => void;
  isTyping: boolean;
  setIsTyping: (value: boolean) => void;
  setDestination: (
    destination: { latitude: number; longitude: number; address?: string } | null
  ) => void;
  animateToRegion: (region: any) => void;
  selectedMotor: Motor | null;
  setSelectedMotor: (motor: Motor | null) => void;
  motorList: Motor[];
  onPlaceSelectedCloseModal: () => void;
  userId: string; // added prop
};

const SearchBar = ({
  searchRef,
  searchText,
  setSearchText,
  isTyping,
  setIsTyping,
  setDestination,
  animateToRegion,
  selectedMotor,
  setSelectedMotor,
  motorList,
  onPlaceSelectedCloseModal,
  userId,
}: SearchBarProps) => {
  const [savedLocations, setSavedLocations] = useState([]);
  const [recentLocations, setRecentLocations] = useState([]);
  const [activeTab, setActiveTab] = useState('recent');

  // Load both saved and recent locations on mount
  useEffect(() => {
    const loadLocations = async () => {
      try {
        // Load saved locations
        if (userId) {
          const response = await axios.get(
            `https://ts-backend-1-jyit.onrender.com/api/saved-destinations/${userId}`
          );
          const mapped = response.data.map((loc: any) => ({
            latitude: loc.location.latitude,
            longitude: loc.location.longitude,
            address: loc.label,
          }));
          setSavedLocations(mapped);
        }

        // Load recent locations from AsyncStorage
        const storedRecent = await AsyncStorage.getItem("recentLocations");
        if (storedRecent) {
          setRecentLocations(JSON.parse(storedRecent));
        }
      } catch (error) {
        console.error("Failed to load locations:", error);
      }
    };

    loadLocations();
  }, [userId]);

  // Function to save to recent locations
  const addToRecent = async (place: { latitude: number; longitude: number; address: string }) => {
    try {
      const storedRecent = await AsyncStorage.getItem("recentLocations");
      let recentList = storedRecent ? JSON.parse(storedRecent) : [];
      
      // Remove duplicates
      recentList = recentList.filter((item: any) => item.address !== place.address);
      
      // Add new place to the beginning
      recentList.unshift(place);
      
      // Keep only the last 10 items
      if (recentList.length > 10) {
        recentList = recentList.slice(0, 10);
      }

      // Save to AsyncStorage and update state
      await AsyncStorage.setItem("recentLocations", JSON.stringify(recentList));
      setRecentLocations(recentList);
    } catch (error) {
      console.error("Error saving to recent:", error);
    }
  };

  const handlePlaceSelect = (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setDestination(place);
    animateToRegion({
      latitude: place.latitude,
      longitude: place.longitude,
      latitudeDelta: 0.001,
      longitudeDelta: 0.001,
    });
    addToRecent(place);
    onPlaceSelectedCloseModal();
  };

  return (
    <View style={styles.container}>
      {/* Motor Selection */}
      <View style={styles.motorSection}>
        <Text style={styles.sectionTitle}>Select Your Motor</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.motorList}
        >
          {motorList.map((motor) => (
            <TouchableOpacity
              key={motor._id}
              style={[
                styles.motorItem,
                selectedMotor?._id === motor._id && styles.selectedMotorItem
              ]}
              onPress={() => setSelectedMotor(motor)}
            >
              <Image 
                source={require('../../assets/icons/motor-silhouette.png')} 
                style={styles.motorIcon} 
              />
              <Text style={[
                styles.motorName,
                selectedMotor?._id === motor._id && styles.selectedMotorText
              ]}>
                {motor.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <GooglePlacesAutocomplete
          ref={searchRef}
          placeholder="Enter destination"
          fetchDetails
          onPress={(data, details = null) => {
            if (!selectedMotor) {
              Alert.alert("Select Motor", "Please select a motor before choosing a destination.");
              return;
            }

            if (details) {
              const newDestination = {
                latitude: details.geometry.location.lat,
                longitude: details.geometry.location.lng,
                address: data.description,
              };
              handlePlaceSelect(newDestination);
              searchRef.current?.setAddressText("");
              setIsTyping(false);
            }
          }}
          textInputProps={{
            value: searchText,
            onChangeText: setSearchText,
            placeholderTextColor: "#888",
            onFocus: () => setIsTyping(true),
            onBlur: () => setIsTyping(false),
          }}
          query={{ key: GOOGLE_MAPS_API_KEY, language: "en" }}
          styles={{
            textInput: styles.searchInput,
            container: styles.searchContainer,
            listView: styles.searchResults,
            row: styles.searchResultItem,
            description: styles.searchResultText,
          }}
        />
      </View>

      {/* Tabs for Recent/Saved */}
      {!isTyping && (
        <View style={styles.tabsContainer}>
          <View style={styles.tabButtons}>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'recent' && styles.activeTab]}
              onPress={() => setActiveTab('recent')}
            >
              <MaterialIcons 
                name="history" 
                size={24} 
                color={activeTab === 'recent' ? '#00ADB5' : '#666'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'recent' && styles.activeTabText
              ]}>Recent</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, activeTab === 'saved' && styles.activeTab]}
              onPress={() => setActiveTab('saved')}
            >
              <MaterialIcons 
                name="star" 
                size={24} 
                color={activeTab === 'saved' ? '#00ADB5' : '#666'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === 'saved' && styles.activeTabText
              ]}>Saved</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.locationList}>
            {(activeTab === 'recent' ? recentLocations : savedLocations).map((location, index) => (
              <TouchableOpacity
                key={index}
                style={styles.locationItem}
                onPress={() => handlePlaceSelect(location)}
              >
                <MaterialIcons 
                  name={activeTab === 'recent' ? "history" : "star"} 
                  size={24} 
                  color="#00ADB5" 
                />
                <Text style={styles.locationText} numberOfLines={1}>
                  {location.address}
                </Text>
              </TouchableOpacity>
            ))}
            {(activeTab === 'recent' ? recentLocations : savedLocations).length === 0 && (
              <Text style={styles.emptyText}>
                {activeTab === 'recent' 
                  ? "No recent searches" 
                  : "No saved locations"}
              </Text>
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  motorSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 12,
  },
  motorList: {
    flexGrow: 0,
  },
  motorItem: {
    alignItems: 'center',
    padding: 12,
    marginRight: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    width: 100,
  },
  selectedMotorItem: {
    backgroundColor: '#00ADB5',
  },
  motorIcon: {
    width: 40,
    height: 40,
    marginBottom: 8,
  },
  motorName: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  selectedMotorText: {
    color: '#FFFFFF',
  },
  searchSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchContainer: {
    flex: 0,
  },
  searchInput: {
    height: 50,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchResults: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
  },
  searchResultItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchResultText: {
    fontSize: 16,
    color: '#333333',
  },
  tabsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  tabButtons: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00ADB5',
  },
  tabText: {
    fontSize: 16,
    color: '#666666',
    marginLeft: 8,
  },
  activeTabText: {
    color: '#00ADB5',
    fontWeight: '600',
  },
  locationList: {
    flex: 1,
    padding: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    marginBottom: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#333333',
    marginLeft: 12,
    flex: 1,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
    fontStyle: 'italic'
  }
});

export default SearchBar;
