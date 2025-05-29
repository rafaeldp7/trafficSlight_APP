import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { Portal, Modal, List } from "react-native-paper";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import axios from "axios";
import { useUser } from "../../AuthContext/UserContext";
import { LOCALHOST_IP } from "@env";

const barangays = [
  "Arkong Bato", "Bagbaguin", "Bignay", "Bisig", "Canumay East", "Canumay West", "Coloong",
  "Dalandanan", "Gen. T. De Leon", "Karuhatan", "Lawang Bato", "Lingunan", "Malanday",
  "Mapulang Lupa", "Malinta", "Maysan", "Palasan", "Parada", "Paso de Blas", "Pasolo", "Polo",
  "Punturin", "Rincon", "Tagalag", "Ugong", "Veinte Reales", "Wawang Pulo",
];

export default function AccountSettingsScreen({ navigation }) {
  const { user, saveUser, clearUser } = useUser();
  const [barangayModal, setBarangayModal] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    city: "",
    province: "",
    barangay: "",
    street: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        id: user._id, // 👈 Include this
        name: user.name,
        email: user.email,
        city: user.city,
        province: user.province,
        barangay: user.barangay,
        street: user.street,
      });
    }
  }, [user]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      const res = await axios.put(`${LOCALHOST_IP}/api/auth/update-profile`, form, {
        headers: {
          Authorization: `Bearer ${user?.token}`,
        },
      });

      Alert.alert("Success", "Profile updated successfully");
      saveUser({ ...user, ...res.data.user });
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", err?.response?.data?.msg || "Update failed");
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          onPress: () => {
            clearUser();
            navigation.replace("Login");
          },
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={tw`flex-1 bg-white pt-7`}>
      {/* Header */}
      <View style={tw`px-5 py-4 border-b border-gray-200 flex-row items-center`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold ml-4`}>Account Settings</Text>
      </View>

      {/* Form */}
      <ScrollView style={tw`p-5`}>
        <Text style={tw`text-gray-600 text-sm mb-3`}>
          Edit your profile information
        </Text>

        {[
          { label: "Name", key: "name" },
          { label: "Email", key: "email" },
          { label: "City", key: "city" },
          { label: "Province", key: "province" },
        ].map(({ label, key }) => (
          <View key={key} style={tw`mb-4`}>
            <Text style={tw`text-sm text-gray-700 mb-1`}>{label}</Text>
            <TextInput
              value={form[key]}
              onChangeText={(value) => handleChange(key, value)}
              editable={key !== "city" && key !== "province"}
              style={tw`border border-gray-300 rounded-lg px-4 py-2 bg-white ${
                key === "city" || key === "province" ? "text-gray-400" : ""
              }`}
              placeholder={`Enter ${label.toLowerCase()}`}
            />
          </View>
        ))}

        {/* Barangay before Street */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-sm text-gray-700 mb-1`}>Barangay</Text>
          <TouchableOpacity
            style={tw`border border-gray-300 rounded-lg px-4 py-2 bg-white`}
            onPress={() => setBarangayModal(true)}
          >
            <Text style={tw`${form.barangay ? "text-black" : "text-gray-400"}`}>
              {form.barangay || "Select Barangay"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={tw`mb-4`}>
          <Text style={tw`text-sm text-gray-700 mb-1`}>Street</Text>
          <TextInput
            value={form["street"]}
            onChangeText={(value) => handleChange("street", value)}
            style={tw`border border-gray-300 rounded-lg px-4 py-2 bg-white`}
            placeholder="Enter street"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={tw`bg-blue-500 mt-3 p-4 rounded-lg items-center`}
        >
          <Text style={tw`text-white font-bold text-base`}>Save Changes</Text>
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity
          style={tw`mt-5 bg-red-500 p-4 rounded-lg flex-row items-center justify-center`}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={22} color="white" />
          <Text style={tw`ml-3 text-white text-base font-bold`}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Barangay Modal */}
      <Portal>
        <Modal
          visible={barangayModal}
          onDismiss={() => setBarangayModal(false)}
          contentContainerStyle={{
            backgroundColor: "white",
            margin: 20,
            padding: 20,
            borderRadius: 10,
            maxHeight: "80%",
          }}
        >
          <Text style={{ fontWeight: "bold", fontSize: 18, marginBottom: 10 }}>
            Select Your Barangay
          </Text>
          <ScrollView>
            {barangays.map((b) => (
              <List.Item
                key={b}
                title={b}
                onPress={() => {
                  handleChange("barangay", b);
                  setBarangayModal(false);
                }}
              />
            ))}
          </ScrollView>
        </Modal>
      </Portal>
    </View>
  );
}
