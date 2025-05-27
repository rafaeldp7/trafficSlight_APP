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

const API_BASE = "https://ts-backend-1-jyit.onrender.com/api/saved-destinations";

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
  selectedMotor: { name: string; fuelEfficiency: number } | null;
  setSelectedMotor: (motor: { name: string; fuelEfficiency: number } | null) => void;
  motorList: { name: string; fuelEfficiency: number;  }[];
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

  useEffect(() => {
  const fetchSaved = async () => {
    try {
      const response = await axios.get(
        `https://ts-backend-1-jyit.onrender.com/api/saved-destinations/${userId}`
      );
      const mapped = response.data.map((loc: any) => ({
        latitude: loc.location.latitude,
        longitude: loc.location.longitude,
        address: loc.label,
      }));
      setSavedLocations(mapped);
    } catch (error) {
      console.error("❌ Failed to fetch saved destinations:", error);
    }
  };

  if (userId) {
    fetchSaved();
  }
}, [userId]);


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
    onPlaceSelectedCloseModal();
  };

  return (
    <View>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 26, fontWeight: "bold", padding: 10 }}>Motor Used</Text>
        {motorList.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {motorList.map((motor, index) => (
<TouchableOpacity
  key={index}
  onPress={() => setSelectedMotor(motor)}
  style={{
    backgroundColor: selectedMotor?.name === motor.name ? "#3498db" : "#ecf0f1",
    padding: 10,
    borderRadius: 10,
    marginRight: 8,
    marginLeft: 10,
    width: 150,
    alignItems: "center",
  }}
>
  {/* Image */}
  <Image
    source={require('../../assets/icons/motor-silhouette.png')}
    style={{
      width: 50,
      height: 50,
      borderRadius: 25,
      marginBottom: 6,
      borderWidth: 2,
      borderColor: selectedMotor?.name === motor.name ? "#fff" : "#bdc3c7",
    }}
    resizeMode="cover"
  />

  {/* Text */}
  <Text
    style={{
      fontSize: 15,
      textAlign: "center",
      color: selectedMotor?.name === motor.name ? "#fff" : "#2c3e50",
    }}
  >
    {motor.name}
  </Text>
  <Text
    style={{
      fontSize: 13,
      color: selectedMotor?.name === motor.name ? "#ecf0f1" : "#7f8c8d",
    }}
  >
    {motor.fuelEfficiency} km/L
  </Text>
</TouchableOpacity>

            ))}
          </ScrollView>
        ) : (
          <Text style={{ color: "#888" }}>No motors found.</Text>
        )}
      </View>

      <GooglePlacesAutocomplete
        ref={searchRef}
        placeholder="Where to?"
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
          textInput: {
            backgroundColor: "#fff",
            borderRadius: 10,
            paddingRight: 50,
            paddingVertical: 10,
            fontSize: 16,
          },
          container: { flex: 1, marginBottom: 10 },
          listView: {
            position: "absolute",
            top: 50,
            backgroundColor: "#fff",
            width: "100%",
            zIndex: 100,
            elevation: 5,
          },
        }}
      />

      {!isTyping && (
        <>
          <Text style={styles.savedHeader}>Saved Locations</Text>
          <ScrollView style={styles.tabContent}>
            {savedLocations.map((place, index) =>
              place?.address ? (
                <TouchableOpacity key={index} onPress={() => handlePlaceSelect(place)}>
                  <Text style={styles.savedItem}>{place.address}</Text>
                </TouchableOpacity>
              ) : null
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  savedHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginHorizontal: 10,
    marginTop: 20,
    color: "#444",
  },
  savedItem: {
    padding: 12,
    fontSize: 15,
    borderBottomColor: "#ddd",
    borderBottomWidth: 1,
    marginHorizontal: 10,
  },
  tabContent: {
    marginTop: 10,
    maxHeight: 180,
  },
});
