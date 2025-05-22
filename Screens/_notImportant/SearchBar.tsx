import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { GOOGLE_MAPS_API_KEY } from "@env";

type SearchBarProps = {
  searchRef: React.RefObject<typeof GooglePlacesAutocomplete>;
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
}: SearchBarProps) => {
  const [activeTab, setActiveTab] = useState("Recent");
  const [suggestions, setSuggestions] = useState<
    { address: string; latitude: number; longitude: number }[]
  >([]);

  useEffect(() => {
    if (searchText.length > 0) {
      setSuggestions([
        {
          address: `${searchText} Suggestion 1`,
          latitude: 14.5995,
          longitude: 120.9842,
        },
        {
          address: `${searchText} Suggestion 2`,
          latitude: 14.6095,
          longitude: 120.9942,
        },
      ]);
    } else {
      setSuggestions([]);
    }
  }, [searchText]);

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
      <GooglePlacesAutocomplete
        ref={searchRef}
        placeholder="Where to?"
        fetchDetails
        onPress={(data, details = null) => {
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
        onFocus={() => setIsTyping(true)}
        onBlur={() => setIsTyping(false)}
        textInputProps={{
          value: searchText,
          onChangeText: setSearchText,
          placeholderTextColor: "#888",
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

      {isTyping && suggestions.length > 0 && (
        <ScrollView style={styles.suggestionsContainer}>
          {suggestions.map((item, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => handlePlaceSelect(item)}
              style={styles.suggestionItem}
            >
              <Text>{item.address}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
