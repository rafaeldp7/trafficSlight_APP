import React, { useState } from "react";
import { View, Text, TouchableOpacity, Switch, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";

export default function NotificationSettingsScreen({ navigation }) {
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [smsNotifications, setSmsNotifications] = useState(true);

  const handleSaveSettings = () => {
    // Implement save logic here (API call or AsyncStorage)
    alert("Notification settings saved!");
  };

  return (
    <View style={tw`flex-1 bg-white pt-7`}>
      {/* Header */}
      <View style={tw`px-5 py-4 border-b border-gray-200 flex-row items-center`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold ml-4`}>Notifications</Text>
      </View>

      {/* Scrollable Content */}
      <ScrollView style={tw`p-5`}>
        <Text style={tw`text-gray-600 text-sm mb-3`}>Manage your notification preferences</Text>

        {/* Push Notifications */}
        <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="notifications-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Push Notifications</Text>
          </View>
          <Switch
            value={pushNotifications}
            onValueChange={(value) => setPushNotifications(value)}
          />
        </View>

        {/* Email Notifications */}
        <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="mail-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>Email Notifications</Text>
          </View>
          <Switch
            value={emailNotifications}
            onValueChange={(value) => setEmailNotifications(value)}
          />
        </View>

        {/* SMS Notifications */}
        <View style={tw`flex-row items-center justify-between p-4 border-b border-gray-200`}>
          <View style={tw`flex-row items-center`}>
            <Ionicons name="chatbubble-outline" size={22} color="#000" />
            <Text style={tw`ml-3 text-base`}>SMS Notifications</Text>
          </View>
          <Switch
            value={smsNotifications}
            onValueChange={(value) => setSmsNotifications(value)}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={tw`mt-5 bg-blue-500 p-4 rounded-lg flex-row items-center justify-center`}
          onPress={handleSaveSettings}
        >
          <Ionicons name="save-outline" size={22} color="white" />
          <Text style={tw`ml-3 text-white text-base font-bold`}>Save Settings</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
