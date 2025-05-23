import React, { useState, useEffect } from "react";
import {
  View, Text, TouchableOpacity, Alert, ScrollView, Modal, TextInput
} from "react-native";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "../../AuthContext/UserContext";
import axios from "axios";
import tw from "twrnc";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";

const API_URL = `${LOCALHOST_IP}/api/saved-destinations`;

export default function GooglePlacesTestScreen() {
  const navigation = useNavigation();
  const { user } = useUser();

  const [address, setAddress] = useState("");
  const [coord, setCoord] = useState(null);
  const [destinations, setDestinations] = useState([]);

  const [editModal, setEditModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] = useState("");

  useEffect(() => {
    fetchDestinations();
  }, []);

  const fetchDestinations = async () => {
    try {
      const res = await axios.get(`${API_URL}/${user._id}`);
      setDestinations(res.data);
    } catch (error) {
      console.error("Failed to load destinations:", error);
    }
  };

  const handleSave = async () => {
    if (!address || !coord) {
      return Alert.alert("Missing info", "Select a destination first.");
    }

    const payload = {
      userId: user._id,
      label: address,
      location: coord,
      category: "Other",
    };

    try {
      await axios.post(API_URL, payload);
      Alert.alert("Success", "Destination saved!");
      setAddress("");
      setCoord(null);
      fetchDestinations();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to save destination.");
    }
  };

  const handleDelete = async (id) => {
    Alert.alert("Confirm Delete", "Are you sure you want to delete this destination?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            await axios.delete(`${API_URL}/${id}`);
            fetchDestinations();
          } catch (err) {
            console.error("Delete error:", err);
            Alert.alert("Error", "Failed to delete.");
          }
        }
      }
    ]);
  };

  const openEdit = (dest) => {
    setEditId(dest._id);
    setEditLabel(dest.label);
    setEditCategory(dest.category);
    setEditModal(true);
  };

  const handleUpdate = async () => {
    try {
      await axios.put(`${API_URL}/${editId}`, {
        label: editLabel,
        category: editCategory,
      });
      setEditModal(false);
      fetchDestinations();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to update destination.");
    }
  };

  return (
    <ScrollView style={tw`flex-1 bg-white`} contentContainerStyle={tw`p-4 pt-10`}>
      <View style={tw`flex-row items-center mb-4`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold ml-4`}>Save a Destination</Text>
      </View>

      <GooglePlacesAutocomplete
        placeholder="Search a place..."
        fetchDetails={true}
        onPress={(data, details = null) => {
          const loc = details.geometry.location;
          setAddress(data.description);
          setCoord({ latitude: loc.lat, longitude: loc.lng });
        }}
        onFail={(error) => console.log("Autocomplete Error:", error)}
        query={{
          key: GOOGLE_MAPS_API_KEY,
          language: "en",
          components: "country:ph",
        }}
        minLength={2}
        debounce={400}
        styles={{
          textInput: tw`border border-gray-300 rounded-lg p-3`,
          listView: { backgroundColor: "white" },
        }}
      />

      {address && coord && (
        <View style={tw`mt-6`}>
          <Text style={tw`text-gray-700 mb-2`}>Selected Address:</Text>
          <Text style={tw`text-base font-medium mb-4`}>{address}</Text>
          <TouchableOpacity onPress={handleSave} style={tw`bg-green-600 p-4 rounded-lg`}>
            <Text style={tw`text-white text-center font-bold text-lg`}>Save Destination</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={tw`mt-8 text-xl font-semibold mb-2`}>Your Saved Destinations</Text>
      {destinations.length === 0 ? (
        <Text style={tw`text-gray-500`}>No destinations saved yet.</Text>
      ) : (
        destinations.map((item, index) => (
          <View key={index} style={tw`mb-3 p-4 bg-gray-100 rounded-lg`}>
            <Text style={tw`font-bold text-base text-gray-800`}>{item.label}</Text>
            <Text style={tw`text-sm text-gray-600`}>Category: {item.category}</Text>
            <Text style={tw`text-sm text-gray-600`}>
              Lat: {item.location.latitude} | Lng: {item.location.longitude}
            </Text>

            <View style={tw`flex-row mt-3 gap-2`}>
              <TouchableOpacity onPress={() => openEdit(item)} style={tw`bg-blue-500 px-4 py-2 rounded-lg`}>
                <Text style={tw`text-white font-bold`}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item._id)} style={tw`bg-red-500 px-4 py-2 rounded-lg`}>
                <Text style={tw`text-white font-bold`}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}

      {/* Edit Modal */}
      <Modal visible={editModal} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/40 justify-center items-center`}>
          <View style={tw`bg-white p-6 rounded-lg w-80`}>
            <Text style={tw`text-lg font-bold mb-4`}>Edit Destination</Text>
            <TextInput
              placeholder="Label"
              value={editLabel}
              onChangeText={setEditLabel}
              style={tw`border border-gray-300 rounded-lg p-3 mb-3`}
            />
            <TextInput
              placeholder="Category (e.g. Home, Work)"
              value={editCategory}
              onChangeText={setEditCategory}
              style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
            />
            <TouchableOpacity onPress={handleUpdate} style={tw`bg-green-600 p-3 rounded-lg mb-2`}>
              <Text style={tw`text-white text-center font-bold`}>Update</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditModal(false)} style={tw`bg-gray-300 p-3 rounded-lg`}>
              <Text style={tw`text-center`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
