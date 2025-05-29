import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Keyboard,
  ActivityIndicator,
  TouchableWithoutFeedback,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import { LOCALHOST_IP } from "@env";
import { useUser } from "../../AuthContext/UserContext";

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
  const [showOdoModal, setShowOdoModal] = useState(false);
  const [customModelName, setCustomModelName] = useState("");
  const [odoStart, setOdoStart] = useState("");
  const [odoEnd, setOdoEnd] = useState("");
  const [litersAdded, setLitersAdded] = useState("");
  const [formInputs, setFormInputs] = useState({ motorName: "" });
  const [motorForm, setMotorForm] = useState({
    selectedMotor: null,
    fuelEfficiency: "",
    editingId: null,
  });

  const handleFormChange = (field, value) => {
    setMotorForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setMotorForm({ selectedMotor: null, fuelEfficiency: "", editingId: null });
    setFormInputs({ motorName: "" });
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

  useEffect(() => { fetchMotorModels(); }, [fetchMotorModels]);
  useEffect(() => { if (user?._id) fetchUserMotors(); }, [user, fetchUserMotors]);

  useEffect(() => {
    if (motorForm.selectedMotor && fuelMap[motorForm.selectedMotor]) {
      handleFormChange("fuelEfficiency", String(fuelMap[motorForm.selectedMotor]));
    } else {
      handleFormChange("fuelEfficiency", "");
    }
  }, [motorForm.selectedMotor, fuelMap]);

  const validateForm = () => {
    
    
    if (!motorForm.selectedMotor) return Alert.alert("Error", "Select a motorcycle model.");
    return true;
  };

const handleSave = async () => {
  if (!validateForm() || !user?._id) return;
  setIsSubmitting(true);
  try {
    const motorcycleId = motorIdMap[motorForm.selectedMotor];
    const endpoint = motorForm.editingId
      ? `${LOCALHOST_IP}/api/user-motors/${motorForm.editingId}`
      : `${LOCALHOST_IP}/api/user-motors/`;
    const method = motorForm.editingId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user._id,
        motorcycleId,
        nickname: formInputs.motorName.trim(),
      }),
    });

    const resData = await res.json();

    if (!res.ok) {
      console.log("❌ Save failed response:", resData);
      throw new Error(resData?.msg || "Request failed.");
    }

    Alert.alert("Success", motorForm.editingId ? "Motor updated!" : "Motor added!");
    resetForm();
    fetchUserMotors();
  } catch (err) {
    console.error("❌ Save Error:", err.message);
    Alert.alert("Error", err.message || "Something went wrong while saving.");
  } finally {
    setIsSubmitting(false);
  }
};


  const handleDelete = (id, nickname) => {
    Alert.alert("Delete Motor", `Delete "${nickname}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const res = await fetch(`${LOCALHOST_IP}/api/user-motors/user/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error();
            fetchUserMotors();
            Alert.alert("Deleted", "Motor removed.");
          } catch {
            Alert.alert("Error", "Failed to delete. Try again.");
          }
        },
      },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={tw`flex-1 bg-gray-50`}>
        <View style={tw`px-5 py-4 pt-10 border-b border-gray-200 flex-row items-center bg-white`}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={tw`text-lg font-bold ml-4`}>Manage Motors</Text>
        </View>

        <ScrollView style={tw`px-5`}>
          <Text style={tw`text-2xl font-bold my-4`}>Add Motor</Text>

          <Text style={tw`text-lg font-semibold mb-1`}>Motor Nickname</Text>
          <TextInput
            value={formInputs.motorName}
            onChangeText={(v) => setFormInputs((prev) => ({ ...prev, motorName: v }))}
            style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
            placeholder="Enter nickname"
          />

          <Text style={tw`text-lg font-semibold mb-1`}>Motorcycle Model</Text>
          <TouchableOpacity
            onPress={() => setShowModelModal(true)}
            style={tw`border border-gray-300 rounded-lg p-3 mb-4 bg-white`}
          >
            <Text style={tw`${motorForm.selectedMotor ? "text-black" : "text-gray-400"}`}>
              {motorForm.selectedMotor || "Select model"}
            </Text>
          </TouchableOpacity>

          <Text style={tw`text-lg font-semibold mb-1`}>Fuel Efficiency (km/L)</Text>
          <View style={tw`border border-gray-300 rounded-lg p-3 bg-gray-100`}>
            <Text style={tw`text-gray-500`}>
              {motorForm.fuelEfficiency ? `${motorForm.fuelEfficiency} km/L` : "Not set"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            style={tw`bg-blue-600 p-4 rounded-lg items-center mt-4`}
          >
            <Text style={tw`text-white font-bold`}>
              {isSubmitting ? "Processing..." : motorForm.editingId ? "Update Motor" : "Save Motor"}
            </Text>
          </TouchableOpacity>

          <Text style={tw`text-xl font-bold mt-6 mb-2`}>My Motors</Text>

          {loading ? (
            <ActivityIndicator size="large" color="#3b82f6" />
          ) : (
            motorList.map((item) => (
              <View key={item._id} style={tw`border p-4 rounded-lg mb-3 bg-white shadow-sm`}>
                <Text style={tw`font-bold text-lg text-blue-800`}>{item.nickname}</Text>
                <Text style={tw`text-gray-600`}>Model: {item.name}</Text>
                <Text style={tw`text-gray-600`}>
                  Fuel Efficiency: {item.fuelEfficiency ? `${item.fuelEfficiency} km/L` : "N/A"}
                </Text>
                <View style={tw`flex-row justify-end mt-2`}>
                  <TouchableOpacity
                    style={tw`mr-4`}
                    onPress={() => {
                      setMotorForm({
                        selectedMotor: item.name,
                        fuelEfficiency: String(item.fuelEfficiency || ""),
                        editingId: item._id,
                      });
                      setFormInputs({ motorName: item.nickname });
                    }}
                  >
                    <Ionicons name="create-outline" size={22} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(item._id, item.nickname)}>
                    <Ionicons name="trash-outline" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {/* Modal for selecting or creating new model */}
        {showModelModal && (
          <View style={tw`absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 justify-center items-center`}>
            <View style={tw`w-11/12 max-h-[80%] bg-white rounded-lg p-4`}>
              <TextInput
                placeholder="Search model..."
                value={modelSearchQuery}
                onChangeText={setModelSearchQuery}
                style={tw`border border-gray-300 rounded-lg p-2 mb-4`}
              />
              <ScrollView style={tw`max-h-64`} contentContainerStyle={tw`pb-2`}>
                {motorItems
                  .filter((item) => item.label.toLowerCase().includes(modelSearchQuery.toLowerCase()))
                  .map((item) => (
                    <TouchableOpacity
                      key={item.value}
                      onPress={() => {
                        handleFormChange("selectedMotor", item.value);
                        handleFormChange("fuelEfficiency", fuelMap[item.value] || "");
                        setShowModelModal(false);
                      }}
                      style={tw`p-3 border-b border-gray-200`}
                    >
                      <Text>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
              <TouchableOpacity
                onPress={() => {
                  setShowModelModal(false);
                  setTimeout(() => setShowOdoModal(true), 100);
                }}
                style={tw`mt-4 bg-blue-500 p-3 rounded-lg items-center`}
              >
                <Text style={tw`text-white font-bold`}>+ Create New Model</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowModelModal(false)}
                style={tw`mt-3 bg-gray-400 p-2 rounded-lg items-center`}
              >
                <Text style={tw`text-white`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Custom Model Creation Modal */}
        {showOdoModal && (
          <View style={tw`absolute top-0 left-0 right-0 bottom-0 bg-black bg-opacity-50 justify-center items-center`}>
            <View style={tw`w-11/12 bg-white rounded-lg p-4`}>
              <Text style={tw`text-lg font-bold mb-3`}>Add Custom Motorcycle Model</Text>
              <TextInput
                placeholder="Model Name"
                value={customModelName}
                onChangeText={setCustomModelName}
                style={tw`border border-gray-300 rounded-lg p-2 mb-2`}
              />
              <TextInput
                placeholder="First Odometer Reading"
                keyboardType="numeric"
                value={odoStart}
                onChangeText={setOdoStart}
                style={tw`border border-gray-300 rounded-lg p-2 mb-2`}
              />
              <TextInput
                placeholder="Latest Odometer Reading"
                keyboardType="numeric"
                value={odoEnd}
                onChangeText={setOdoEnd}
                style={tw`border border-gray-300 rounded-lg p-2 mb-2`}
              />
              <TextInput
                placeholder="Fuel Gained (Liters)"
                keyboardType="numeric"
                value={litersAdded}
                onChangeText={setLitersAdded}
                style={tw`border border-gray-300 rounded-lg p-2 mb-4`}
              />
              <TouchableOpacity
                onPress={async () => {
                  const distance = parseFloat(odoEnd) - parseFloat(odoStart);
                  const liters = parseFloat(litersAdded);
                  if (!customModelName || distance <= 0 || liters <= 0) {
                    return Alert.alert("Error", "Invalid input values.");
                  }
                  const efficiency = distance / liters;
                  try {
                    const res = await fetch(`${LOCALHOST_IP}/api/motorcycles`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        model: customModelName,
                        fuelConsumption: parseFloat(efficiency.toFixed(2)),
                        engineDisplacement: 110,
                        power: "Custom",
                      }),
                    });
                    if (!res.ok) throw new Error();
                    await fetchMotorModels();
                    handleFormChange("selectedMotor", customModelName);
                    handleFormChange("fuelEfficiency", efficiency.toFixed(2));
                    setShowOdoModal(false);
                    setCustomModelName("");
                    setOdoStart("");
                    setOdoEnd("");
                    setLitersAdded("");
                  } catch {
                    Alert.alert("Error", "Failed to save model.");
                  }
                }}
                style={tw`bg-green-600 p-3 rounded-lg items-center`}
              >
                <Text style={tw`text-white font-bold`}>Save Model</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowOdoModal(false)}
                style={tw`mt-3 bg-gray-400 p-2 rounded-lg items-center`}
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
