import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import DropDownPicker from "react-native-dropdown-picker";
import tw from "twrnc";
import { LOCALHOST_IP } from "@env";
import { useUser } from "../../AuthContext/UserContext";

export default function AddMotorScreen({ navigation }) {
  // State for dropdown
  const [open, setOpen] = useState(false);
  
  // Form state
  const [motorForm, setMotorForm] = useState({
    motorName: "",
    plateNumber: "",
    selectedMotor: null,
    fuelConsumption: "",
    editingId: null,
  });
  
  // Data state
  const [motorItems, setMotorItems] = useState([]);
  const [motorIdMap, setMotorIdMap] = useState({});
  const [fuelMap, setFuelMap] = useState({});
  const [motorList, setMotorList] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user } = useUser();

  // Handle form input changes
  const handleFormChange = (field, value) => {
    setMotorForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Fetch motorcycle models
  const fetchMotorModels = useCallback(async () => {
    try {
      const response = await fetch(`${LOCALHOST_IP}/api/motorcycles`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();

      const mapped = data.map((motor) => ({
        label: motor.model,
        value: motor.model,
      }));

      const idMap = {};
      const fuelData = {};
      data.forEach((m) => {
        idMap[m.model] = m._id;
        fuelData[m.model] = m.fuelConsumption;
      });

      setMotorItems(mapped);
      setMotorIdMap(idMap);
      setFuelMap(fuelData);
    } catch (error) {
      console.error("Failed to fetch motorcycle models:", error);
      Alert.alert("Error", "Unable to load motorcycle models. Please try again later.");
    }
  }, []);

  // Fetch user motors
  const fetchUserMotors = useCallback(async () => {
    if (!user?._id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${LOCALHOST_IP}/api/user-motors/${user._id}`);
      if (!response.ok) throw new Error("Network response was not ok");
      
      const data = await response.json();
      setMotorList(data);
    } catch (error) {
      console.error("Failed to fetch user motors:", error);
      Alert.alert("Error", "Failed to load your motorcycles. Please try again later.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial data fetch
  useEffect(() => {
    fetchMotorModels();
  }, [fetchMotorModels]);

  useEffect(() => {
    if (user?._id) fetchUserMotors();
  }, [user, fetchUserMotors]);

  // Update fuel consumption when motorcycle model changes
  useEffect(() => {
    if (motorForm.selectedMotor && fuelMap[motorForm.selectedMotor]) {
      handleFormChange('fuelConsumption', String(fuelMap[motorForm.selectedMotor]));
    } else {
      handleFormChange('fuelConsumption', "");
    }
  }, [motorForm.selectedMotor, fuelMap]);

  // Reset form to initial state
  const resetForm = () => {
    setMotorForm({
      motorName: "",
      plateNumber: "",
      selectedMotor: null,
      fuelConsumption: "",
      editingId: null,
    });
  };

  // Validate form
  const validateForm = () => {
    if (!motorForm.motorName) {
      Alert.alert("Error", "Please enter a motor nickname.");
      return false;
    }
    
    if (!motorForm.selectedMotor) {
      Alert.alert("Error", "Please select a motorcycle model.");
      return false;
    }
    
    if (!motorForm.plateNumber) {
      Alert.alert("Error", "Please enter a plate number.");
      return false;
    }
    
    // Check for duplicate plate number
    const duplicate = motorList.find(
      (motor) =>
        motor.plateNumber.toLowerCase() === motorForm.plateNumber.toLowerCase() &&
        motor._id !== motorForm.editingId
    );

    if (duplicate) {
      Alert.alert("Error", "This plate number is already registered.");
      return false;
    }
    
    return true;
  };

  // Save or update motor
  const handleSave = async () => {
    if (!validateForm()) return;
    if (!user?._id) {
      Alert.alert("Error", "User not logged in.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const motorcycleId = motorIdMap[motorForm.selectedMotor];
      
      const endpoint = motorForm.editingId
        ? `${LOCALHOST_IP}/api/user-motors/${motorForm.editingId}`
        : `${LOCALHOST_IP}/api/user-motors`;

      const method = motorForm.editingId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user._id,
          motorcycleId,
          plateNumber: motorForm.plateNumber,
          nickname: motorForm.motorName,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          "Success", 
          motorForm.editingId ? "Motor updated successfully!" : "Motor added successfully!"
        );
        resetForm();
        fetchUserMotors();
      } else {
        Alert.alert("Error", data?.msg || "Something went wrong. Please try again.");
      }
    } catch (error) {
      console.error("Failed to save motor:", error);
      Alert.alert("Error", "Server error. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit a motor
  const handleEdit = (motor) => {
    // Close the dropdown if it's open
    if (open) setOpen(false);
    
    setMotorForm({
      motorName: motor.nickname,
      plateNumber: motor.plateNumber,
      selectedMotor: motor.motorcycleId.model,
      fuelConsumption: String(motor.motorcycleId.fuelConsumption),
      editingId: motor._id,
    });
    
    // Scroll to top to see the form
    if (flatListRef?.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  };

  // Delete a motor
  const handleDelete = (id, motorName) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${motorName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(`${LOCALHOST_IP}/api/user-motors/${id}`, {
                method: "DELETE",
              });
              
              if (!response.ok) throw new Error("Delete failed");
              
              fetchUserMotors();
              Alert.alert("Success", "Motor deleted successfully!");
            } catch (error) {
              console.error("Failed to delete motor:", error);
              Alert.alert("Error", "Failed to delete motor. Please try again.");
            }
          }
        }
      ]
    );
  };

  // Filter motors based on search
  const filteredMotors = motorList.filter((motor) =>
    motor.nickname.toLowerCase().includes(search.toLowerCase()) ||
    motor.plateNumber.toLowerCase().includes(search.toLowerCase()) ||
    motor.motorcycleId.model.toLowerCase().includes(search.toLowerCase())
  );

  // For scrolling to top
  const flatListRef = React.useRef(null);

  // Header component for the FlatList
  const renderHeader = () => (
    <View style={tw`p-5 pb-2`}>
      <Text style={tw`text-2xl font-bold mb-4`}>Add Motor</Text>
      
      {/* Form */}
      <View style={tw`mb-6 border border-gray-200 rounded-lg p-4 bg-white shadow-sm`}>
        <Text style={tw`text-lg font-semibold mb-1`}>Motor Nickname</Text>
        <TextInput
          value={motorForm.motorName}
          onChangeText={(value) => handleFormChange('motorName', value)}
          onFocus={() => setOpen(false)}
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="Enter nickname"
        />

        <Text style={tw`text-lg font-semibold mb-1`}>Motorcycle Model</Text>
        <View style={tw`z-30`}>
          <DropDownPicker
            open={open}
            value={motorForm.selectedMotor}
            items={motorItems}
            setOpen={setOpen}
            setValue={(callback) => {
              const value = typeof callback === 'function' 
                ? callback(motorForm.selectedMotor)
                : callback;
              handleFormChange('selectedMotor', value);
            }}
            setItems={setMotorItems}
            searchable
            placeholder="Select or search motor model"
            dropDownDirection="BOTTOM"
            listMode="SCROLLVIEW"
            maxHeight={200}
            style={tw`mb-4 border border-gray-300 rounded-lg`}
            dropDownContainerStyle={tw`border border-gray-300`}
            zIndex={3000}
            zIndexInverse={1000}
          />
        </View>

        <Text style={tw`text-lg font-semibold mb-1 mt-2`}>Plate Number</Text>
        <TextInput
          value={motorForm.plateNumber}
          onChangeText={(value) => handleFormChange('plateNumber', value)}
          onFocus={() => setOpen(false)}
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="Enter plate number"
          autoCapitalize="characters"
        />

        <Text style={tw`text-lg font-semibold mb-1`}>Fuel Consumption (km/L)</Text>
        <TextInput
          value={motorForm.fuelConsumption}
          editable={false}
          style={tw`border border-gray-300 rounded-lg p-3 mb-4 bg-gray-100 text-gray-500`}
          placeholder="Auto-filled from database"
        />

        <TouchableOpacity
          style={tw`bg-blue-500 p-4 rounded-lg items-center mt-2`}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          <Text style={tw`text-white font-bold text-lg`}>
            {isSubmitting ? "Processing..." : (motorForm.editingId ? "Update Motor" : "Save Motor")}
          </Text>
        </TouchableOpacity>

        {motorForm.editingId && (
          <TouchableOpacity
            style={tw`bg-orange-500 p-3 rounded-lg items-center mt-2`}
            onPress={resetForm}
          >
            <Text style={tw`text-white`}>Cancel Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* My Motors Section */}
      <Text style={tw`text-xl font-bold mt-2 mb-2`}>My Motors</Text>
      <TextInput
        placeholder="Search by name, model, or plate..."
        value={search}
        onChangeText={setSearch}
        onFocus={() => setOpen(false)}
        style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
      />
    </View>
  );

  // Empty list message
  const renderEmptyList = () => (
    <View style={tw`items-center justify-center py-8`}>
      <Ionicons name="bicycle-outline" size={48} color="gray" />
      <Text style={tw`text-gray-500 text-lg mt-2`}>No motors found</Text>
      {search ? (
        <Text style={tw`text-gray-400 mt-1`}>Try a different search term</Text>
      ) : (
        <Text style={tw`text-gray-400 mt-1`}>Add your first motor above</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`px-5 py-4 pt-10 border-b border-gray-200 flex-row items-center bg-white`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold ml-4`}>Manage Motors</Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={tw`flex-1`}
        keyboardVerticalOffset={100}
      >
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text style={tw`mt-4 text-gray-600`}>Loading your motors...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={filteredMotors}
            keyExtractor={(item) => item._id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyList}
            contentContainerStyle={[
              tw`pb-20`,
              filteredMotors.length === 0 && tw`flex-grow`
            ]}
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => setOpen(false)}
            renderItem={({ item }) => (
              <View style={tw`border p-4 rounded-lg mx-5 mb-3 bg-white shadow-sm`}>
                <Text style={tw`font-bold text-lg text-blue-800`}>{item.nickname}</Text>
                <View style={tw`flex-row justify-between items-center mt-1`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-gray-700`}>
                      <Text style={tw`font-medium`}>Model:</Text> {item.motorcycleId.model}
                    </Text>
                    <Text style={tw`text-gray-700`}>
                      <Text style={tw`font-medium`}>Plate:</Text> {item.plateNumber}
                    </Text>
                    <Text style={tw`text-gray-700`}>
                      <Text style={tw`font-medium`}>Fuel:</Text> {item.motorcycleId.fuelConsumption} km/L
                    </Text>
                  </View>
                  <View style={tw`flex-row`}>
                    <TouchableOpacity 
                      style={tw`mr-4 p-2`} 
                      onPress={() => handleEdit(item)}
                    >
                      <Ionicons name="create-outline" size={22} color="#3b82f6" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={tw`p-2`} 
                      onPress={() => handleDelete(item._id, item.nickname)}
                    >
                      <Ionicons name="trash-outline" size={22} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}