import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Modal,
  SafeAreaView,
  Dimensions,
  Alert,
  ScrollView,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { Ionicons } from "@expo/vector-icons";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import tw from "twrnc";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "../../AuthContext/UserContext";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";

const screen = Dimensions.get("window");
const API_URL = `http://${LOCALHOST_IP}:5000/api/saved-destinations`;
const GOOGLE_API_KEY = GOOGLE_MAPS_API_KEY;

export default function AddSavedDestinationScreen() {
  const { user } = useUser();
  const navigation = useNavigation();
  const [destinations, setDestinations] = useState([]);
  const [address, setAddress] = useState("");
  const [shortAddress, setShortAddress] = useState("");
  const [markerCoord, setMarkerCoord] = useState(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [category, setCategory] = useState("Other");
  const [searchHistory, setSearchHistory] = useState([]);
  const [favoriteDestinations, setFavoriteDestinations] = useState([]);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState("All");

  const getCategoryIcon = (cat) =>
    cat === "Home" ? "🏠" : cat === "Work" ? "💼" : cat === "School" ? "🏫" : "🧭";

  const fetchDestinations = async () => {
    try {
      const res = await axios.get(`${API_URL}/${user.id}`);
      setDestinations(res.data);
    } catch {
      Alert.alert("Error", "Failed to fetch destinations");
    }
  };

  const saveToHistory = async (entry) => {
    try {
      const history = await AsyncStorage.getItem("search_history");
      const parsed = history ? JSON.parse(history) : [];
      if (!parsed.includes(entry)) {
        parsed.unshift(entry);
        if (parsed.length > 5) parsed.pop();
        await AsyncStorage.setItem("search_history", JSON.stringify(parsed));
        setSearchHistory(parsed);
      }
    } catch {}
  };

  const loadHistory = async () => {
    const history = await AsyncStorage.getItem("search_history");
    if (history) setSearchHistory(JSON.parse(history));
  };

  const reverseGeocode = async (lat, lng) => {
    try {
      const res = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
      );
      const formatted = res.data.results[0]?.formatted_address || "Unknown";
      const short = formatted.split(",").slice(0, 2).join(", ");
      setShortAddress(short);
    } catch {
      setShortAddress("Unknown");
    }
  };

  const saveDestination = async () => {
    if (!address || !markerCoord) {
      Alert.alert("Missing", "Address and map marker required");
      return;
    }

    const payload = {
      userId: user.id,
      label: address,
      location: {
        latitude: markerCoord.latitude,
        longitude: markerCoord.longitude,
      },
      category,
    };

    try {
      if (editing) {
        await axios.put(`${API_URL}/${editing._id}`, payload);
      } else {
        await axios.post(API_URL, payload);
      }
      saveToHistory(address);
      resetFields();
      fetchDestinations();
    } catch {
      Alert.alert("Error", "Failed to save destination");
    }
  };

  const deleteDestination = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}`);
      fetchDestinations();
    } catch {
      Alert.alert("Error", "Failed to delete destination");
    }
  };

  const resetFields = () => {
    setAddress("");
    setMarkerCoord(null);
    setEditing(null);
    setCategory("Other");
  };

  useEffect(() => {
    fetchDestinations();
    loadHistory();
  }, []);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <View style={tw`flex-row justify-between items-center px-4 pt-5 pb-3 bg-white shadow`}>
        <Text style={tw`text-2xl font-bold text-gray-800`}>📍 Saved Destinations</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("AllDestinationsMap")}
          style={tw`p-2 bg-blue-100 rounded-full`}
        >
          <Ionicons name="map" size={22} color="#2563eb" />
        </TouchableOpacity>
      </View>

      <View style={tw`mx-4 mt-4`}>
        <Text style={tw`text-base font-semibold mb-2 text-gray-800`}>Search New Address</Text>
        <GooglePlacesAutocomplete
          placeholder="Type address here..."
          fetchDetails
          onPress={(data, details = null) => {
            const loc = details.geometry.location;
            const fullAddress = data.description;
            setAddress(fullAddress);
            setMarkerCoord({ latitude: loc.lat, longitude: loc.lng });
            reverseGeocode(loc.lat, loc.lng);
            setShowMapModal(true);
          }}
          query={{ key: GOOGLE_API_KEY, language: "en" }}
          styles={{
            textInput: tw`border border-gray-300 p-3 rounded-lg bg-white shadow-sm`,
            listView: { backgroundColor: "white" },
          }}
        />
        {searchHistory.length > 0 && (
          <View style={tw`mt-3`}>
            <Text style={tw`text-sm text-gray-500 mb-2`}>Recent:</Text>
            <View style={tw`flex-row flex-wrap gap-2`}>
              {searchHistory.map((item, idx) => (
                <TouchableOpacity key={idx} onPress={() => setAddress(item)} style={tw`px-3 py-1 bg-blue-100 rounded-full`}>
                  <Text style={tw`text-blue-600 text-sm`}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`px-4 mt-5`}>
        {["All", "Home", "Work", "School", "Other"].map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setActiveCategoryFilter(cat)}
            style={tw`px-4 py-2 mr-3 rounded-full ${activeCategoryFilter === cat ? "bg-blue-600" : "bg-gray-200"}`}
          >
            <Text style={tw`${activeCategoryFilter === cat ? "text-white font-semibold" : "text-gray-800"}`}>
              {getCategoryIcon(cat)} {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={activeCategoryFilter === "All" ? destinations : destinations.filter((d) => d.category === activeCategoryFilter)}
        keyExtractor={(item) => item._id}
        contentContainerStyle={tw`p-4`}
        renderItem={({ item }) => (
          <View style={tw`p-4 bg-white rounded-xl mb-3 shadow-sm flex-row justify-between items-start`}>
            <View style={tw`w-3/4`}>
              <Text style={tw`text-base font-bold text-gray-800`}>
                {getCategoryIcon(item.category)} {item.label.length > 40 ? item.label.slice(0, 40) + "..." : item.label}
              </Text>
              <Text style={tw`text-sm text-gray-500 mt-1`}>
                {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
              </Text>
            </View>
            <View style={tw`flex-row items-center gap-3`}>
              <TouchableOpacity onPress={() => {
                setAddress(item.label);
                setMarkerCoord(item.location);
                setCategory(item.category);
                setEditing(item);
                reverseGeocode(item.location.latitude, item.location.longitude);
                setShowMapModal(true);
              }}>
                <Ionicons name="create" size={22} color="#2563eb" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteDestination(item._id)}>
                <Ionicons name="trash" size={22} color="red" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => {
                setFavoriteDestinations((prev) =>
                  prev.includes(item._id)
                    ? prev.filter((id) => id !== item._id)
                    : [...prev, item._id]
                );
              }}>
                <Ionicons
                  name={favoriteDestinations.includes(item._id) ? "star" : "star-outline"}
                  size={22}
                  color={favoriteDestinations.includes(item._id) ? "gold" : "gray"}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      <Modal visible={showMapModal} animationType="slide">
        <View style={tw`flex-1`}>
          <MapView
            style={{ width: screen.width, height: screen.height - 220 }}
            initialRegion={{
              latitude: markerCoord?.latitude || 14.7,
              longitude: markerCoord?.longitude || 120.98,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            onPress={(e) => {
              const coord = e.nativeEvent.coordinate;
              setMarkerCoord(coord);
              reverseGeocode(coord.latitude, coord.longitude);
            }}
          >
            {markerCoord && (
              <Marker
                coordinate={markerCoord}
                pinColor={category === "Home" ? "green" : category === "Work" ? "blue" : category === "School" ? "orange" : "gray"}
              />
            )}
          </MapView>
          <View style={tw`p-4 bg-white`}>
            <Text style={tw`text-base mb-1 text-gray-600`}>Selected Address:</Text>
            <Text style={tw`font-bold mb-3`}>{shortAddress}</Text>
            <View style={tw`mb-4`}>
              <Text style={tw`mb-1 font-semibold`}>Category</Text>
              <View style={tw`flex-row gap-2 flex-wrap`}>
                {["Home", "Work", "School", "Other"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setCategory(cat)}
                    style={tw`px-3 py-2 rounded-lg ${category === cat ? "bg-blue-600" : "bg-gray-200"}`}
                  >
                    <Text style={tw`${category === cat ? "text-white font-bold" : "text-gray-700"}`}>
                      {getCategoryIcon(cat)} {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TouchableOpacity onPress={() => { saveDestination(); setShowMapModal(false); }} style={tw`bg-green-600 p-3 rounded-lg mb-2`}>
              <Text style={tw`text-white text-center font-bold`}>Confirm & Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowMapModal(false); if (!editing) resetFields(); }} style={tw`bg-gray-300 p-3 rounded-lg`}>
              <Text style={tw`text-center text-black`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}