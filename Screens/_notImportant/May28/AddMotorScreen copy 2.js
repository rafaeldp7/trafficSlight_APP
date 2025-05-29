// ✅ Final AddMotorScreen: Supports manual fuel efficiency input + "Need help?" button
import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, SafeAreaView, Alert,
  ScrollView, Keyboard, ActivityIndicator, TouchableWithoutFeedback, Linking,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import { LOCALHOST_IP } from "@env";
import { useUser } from "../../../AuthContext/UserContext";

export default function AddMotorScreen({ navigation }) {
  const { user } = useUser();
  const [motorItems, setMotorItems] = useState([]);
  const [motorIdMap, setMotorIdMap] = useState({});
  const [fuelMap, setFuelMap] = useState({});
  const [motorList, setMotorList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModelModal, setShowModelModal] = useState(false);
  const [modelSearchQuery, setModelSearchQuery] = useState("");
  const [formInputs, setFormInputs] = useState({ motorName: "", plateNumber: "", customFuelEfficiency: "" });
  const [motorForm, setMotorForm] = useState({ selectedMotor: "", editingId: null });

  const handleFormChange = (field, value) => {
    if (field === "selectedMotor") {
      setMotorForm((prev) => ({ ...prev, selectedMotor: value }));
    } else {
      setFormInputs((prev) => ({ ...prev, [field]: value }));
    }
  };

  const resetForm = () => {
    setMotorForm({ selectedMotor: "", editingId: null });
    setFormInputs({ motorName: "", plateNumber: "", customFuelEfficiency: "" });
  };

  const fetchMotorModels = useCallback(async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/motorcycles`);
      const data = await res.json();
      const idMap = {}, fuelData = {}, options = [];
      data.forEach((motor) => {
        idMap[motor.model] = motor._id;
        fuelData[motor.model] = motor.fuelConsumption;
        options.push({ label: motor.model, value: motor.model });
      });
      setMotorItems(options);
      setMotorIdMap(idMap);
      setFuelMap(fuelData);
    } catch {
      Alert.alert("Error", "Failed to load motorcycle models.");
    }
  }, []);

  const fetchUserMotors = useCallback(async () => {
    if (!user?._id) return;
    setLoading(true);
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${user._id}`);
      const data = await res.json();
      setMotorList(data);
    } catch {
      Alert.alert("Error", "Failed to load your motors.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMotorModels(); }, []);
  useEffect(() => { if (user?._id) fetchUserMotors(); }, [user]);

  const validateForm = () => {
    const nickname = formInputs.motorName.trim();
    const plate = formInputs.plateNumber.trim().toUpperCase();
    const model = motorForm.selectedMotor;
    const fuel = formInputs.customFuelEfficiency.trim();

    if (!nickname || !plate || !model) return Alert.alert("Error", "All fields are required.");
    if (!fuel && !fuelMap[model]) return Alert.alert("Error", "Fuel efficiency required.");
    const duplicate = motorList.find(m => m.plateNumber === plate && m._id !== motorForm.editingId);
    if (duplicate) return Alert.alert("Error", "Plate number already exists.");
    return true;
  };

  const handleSave = async () => {
    if (!validateForm() || !user?._id) return;
    setIsSubmitting(true);
    try {
      const fuelEfficiency = formInputs.customFuelEfficiency.trim()
        ? parseFloat(formInputs.customFuelEfficiency)
        : fuelMap[motorForm.selectedMotor];

      const motorcycleId = motorIdMap[motorForm.selectedMotor];
      const method = motorForm.editingId ? "PUT" : "POST";
      const url = motorForm.editingId
        ? `${LOCALHOST_IP}/api/user-motors/user/${motorForm.editingId}`
        : `${LOCALHOST_IP}/api/user-motors/`;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          motorcycleId,
          plateNumber: formInputs.plateNumber.trim().toUpperCase(),
          nickname: formInputs.motorName.trim(),
          fuelEfficiency
        }),
      });

      if (!res.ok) throw new Error();
      Alert.alert("Success", motorForm.editingId ? "Motor updated!" : "Motor added!");
      resetForm();
      fetchUserMotors();
    } catch {
      Alert.alert("Error", "Failed to save. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (motor) => {
    setMotorForm({ selectedMotor: motor.name, editingId: motor._id });
    setFormInputs({
      motorName: motor.nickname,
      plateNumber: motor.plateNumber,
      customFuelEfficiency: motor.fuelEfficiency?.toString() || "",
    });
  };

  const handleDelete = (id, nickname) => {
    Alert.alert("Delete Motor", `Delete \"${nickname}\"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: async () => {
          try {
            const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            fetchUserMotors();
          } catch {
            Alert.alert("Error", "Failed to delete motor.");
          }
        }
      }
    ]);
  };

  const filteredMotors = motorList.filter((m) =>
    m.nickname.toLowerCase().includes(search.toLowerCase()) ||
    m.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={tw`flex-1 bg-white`}>
        <View style={tw`px-4 pt-12 pb-4 bg-white border-b border-gray-200`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} />
          </TouchableOpacity>
          <Text style={tw`text-xl font-bold mt-2`}>Add Motor</Text>
        </View>

        <ScrollView style={tw`px-5`} keyboardShouldPersistTaps="handled">
          {/* Form */}
          <Text style={tw`mt-4 font-semibold`}>Nickname</Text>
          <TextInput style={tw`border p-3 rounded-lg mb-4`} value={formInputs.motorName}
            onChangeText={(v) => handleFormChange("motorName", v)} placeholder="e.g., Raider Blue" />

          <Text style={tw`font-semibold`}>Motorcycle Model</Text>
          <TouchableOpacity
            onPress={() => setShowModelModal(true)}
            style={tw`border p-3 rounded-lg mb-4 bg-white`}
          >
            <Text style={tw`${motorForm.selectedMotor ? "text-black" : "text-gray-400"}`}>
              {motorForm.selectedMotor || "Select or type model manually"}
            </Text>
          </TouchableOpacity>

          <Text style={tw`font-semibold`}>Plate Number</Text>
          <TextInput
            style={tw`border p-3 rounded-lg mb-4`}
            value={formInputs.plateNumber}
            onChangeText={(v) => handleFormChange("plateNumber", v)}
            placeholder="e.g., ABC123"
            autoCapitalize="characters"
          />

          <Text style={tw`font-semibold`}>Fuel Efficiency (km/L)</Text>
          <TextInput
            keyboardType="numeric"
            style={tw`border p-3 rounded-lg mb-1`}
            value={formInputs.customFuelEfficiency}
            onChangeText={(v) => handleFormChange("customFuelEfficiency", v)}
            placeholder="Auto-filled if known, else input manually"
          />
          <TouchableOpacity
            onPress={() => Linking.openURL("https://www.google.com/search?q=how+to+calculate+fuel+efficiency")}
          >
            <Text style={tw`text-blue-600 underline text-sm mb-4`}>
              Need to know your fuel efficiency?
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={tw`bg-blue-600 p-4 rounded-lg items-center`}
            onPress={handleSave}
            disabled={isSubmitting}
          >
            <Text style={tw`text-white font-bold`}>
              {isSubmitting ? "Saving..." : motorForm.editingId ? "Update Motor" : "Add Motor"}
            </Text>
          </TouchableOpacity>

          {motorForm.editingId && (
            <TouchableOpacity
              style={tw`bg-orange-500 p-3 mt-2 rounded-lg items-center`}
              onPress={resetForm}
            >
              <Text style={tw`text-white`}>Cancel Edit</Text>
            </TouchableOpacity>
          )}

          {/* Motor List */}
          <Text style={tw`mt-6 text-xl font-bold`}>My Motors</Text>
          <TextInput
            style={tw`border p-3 rounded-lg mt-2 mb-4`}
            value={search}
            onChangeText={setSearch}
            placeholder="Search motors..."
          />

          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            filteredMotors.map((motor) => (
              <View key={motor._id} style={tw`bg-white p-4 mb-3 rounded-lg border`}>
                <Text style={tw`font-bold text-blue-800`}>{motor.nickname}</Text>
                <Text>Model: {motor.name}</Text>
                <Text>Plate: {motor.plateNumber}</Text>
                <Text>Fuel Efficiency: {motor.fuelEfficiency || "N/A"} km/L</Text>
                <View style={tw`flex-row justify-end mt-2`}>
                  <TouchableOpacity onPress={() => handleEdit(motor)} style={tw`mr-4`}>
                    <Ionicons name="create-outline" size={20} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(motor._id, motor.nickname)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {showModelModal && (
          <View style={tw`absolute inset-0 bg-black bg-opacity-50 justify-center items-center`}>
            <View style={tw`bg-white rounded-lg w-11/12 max-h-[80%] p-4`}>
              <TextInput
                placeholder="Search model..."
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
                style={tw`border p-2 rounded-lg mb-3`}
              />
              <ScrollView>
                {motorItems
                  .filter((item) => item.label.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                  .map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      style={tw`p-3 border-b`}
                      onPress={() => {
                        handleFormChange("selectedMotor", item.label);
                        handleFormChange("customFuelEfficiency", fuelMap[item.label]?.toString() || "");
                        setShowModelModal(false);
                      }}
                    >
                      <Text>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => setShowModelModal(false)}
                style={tw`mt-4 bg-red-500 p-2 rounded-lg items-center`}
              >
                <Text style={tw`text-white`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}
