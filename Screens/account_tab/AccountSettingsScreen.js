import React, { useContext } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import { AuthContext } from "../../AuthContext/AuthContext";

export default function AccountSettingsScreen({ navigation }) {
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: () => logout(), style: "destructive" },
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

      {/* Scrollable Content */}
      <ScrollView style={tw`p-5`}>
        <Text style={tw`text-gray-600 text-sm mb-3`}>Manage your account settings</Text>

        {/* Change Email */}
        <TouchableOpacity style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="mail-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Change Email</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        {/* Change Password */}
        <TouchableOpacity style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="lock-closed-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Change Password</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        {/* Privacy Settings */}
        <TouchableOpacity style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="shield-checkmark-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Privacy Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        {/* Notifications */}
        <TouchableOpacity style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="notifications-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="gray" />
        </TouchableOpacity>

        {/* Logout */}
        <TouchableOpacity style={tw`mt-5 bg-red-500 p-4 rounded-lg flex-row items-center justify-center`} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="white" />
          <Text style={tw`ml-3 text-white text-base font-bold`}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
