import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_API_KEY } from "@env";



import type { GooglePlacesAutocompleteRef } from "react-native-google-places-autocomplete";

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
  saveToRecent: (location: any) => void;
  recentLocations: any[];
  savedLocations: any[];
  selectedMotor: { name: string; fuelEfficiency: number } | null;
  setSelectedMotor: (motor: { name: string; fuelEfficiency: number } | null) => void;
  motorList: { name: string; fuelEfficiency: number }[];

};

const SearchBar = ({
  searchRef,
  searchText,
  setSearchText,
  isTyping,
  setIsTyping,
  setDestination,
  animateToRegion,
  saveToRecent,
  recentLocations,
  savedLocations,
  motorList,
  selectedMotor,
  setSelectedMotor,

}: SearchBarProps) => {
  const [activeTab, setActiveTab] = useState("Recent");


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
    saveToRecent(place);
  };



  return (
    <View>
      <View style={{ marginBottom: 10 }}>
        <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 6 }}>Motor Used</Text>
        {motorList.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {motorList.map((motor, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => setSelectedMotor(motor)}
                style={{
                  backgroundColor:
                    selectedMotor?.name === motor.name ? "#3498db" : "#ecf0f1",
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 10,
                  marginRight: 8,
                }}
              >
                <Text style={{ color: selectedMotor?.name === motor.name ? "#fff" : "#2c3e50" }}>
                  {motor.name} ({motor.fuelEfficiency} km/L)
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
          <View style={styles.tabsContainer}>
            {["Recent", "Saved"].map((tab) => (
              <TouchableOpacity key={tab} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, activeTab === tab && styles.activeTab]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.tabContent}>
            {(activeTab === "Recent" ? recentLocations : savedLocations).map(
              (place, index) =>
                place?.address && (
                  <TouchableOpacity key={index} onPress={() => handlePlaceSelect(place)}>
                    <Text>{place.address}</Text>
                  </TouchableOpacity>
                )
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
};

export default SearchBar;

const styles = StyleSheet.create({
  suggestionsContainer: {
    maxHeight: 150,
    backgroundColor: "#fff",
    elevation: 5,
    marginTop: 5,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  tabsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 60,
  },
  tabText: {
    fontSize: 16,
    color: "#666",
  },
  activeTab: {
    color: "#000",
    fontWeight: "bold",
    textDecorationLine: "underline",
  },
  tabContent: {
    marginTop: 10,
  },
});
