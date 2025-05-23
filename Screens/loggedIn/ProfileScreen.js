import React, { useContext } from "react";
import { View, Alert, TouchableOpacity, Text, Platform, PixelRatio } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../../AuthContext/AuthContext";
import { useUser } from "../../AuthContext/UserContext";
import tw from "twrnc";

// Utility for scaling font sizes
const fontScale = PixelRatio.getFontScale();
const scaleFont = (size) => size * fontScale;

const iconSize = 34;

const ProfileScreen = ({ navigation }) => {
  const { user } = useUser();
  if (!user) {

    <View style={tw`flex-1 justify-center items-center`}>
      <Text>Loading...</Text>
    </View>
  
}
  const { logout } = useContext(AuthContext);

  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", onPress: logout, style: "destructive" },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={tw`flex-1 bg-white p-5`}>
      {/* Header */}
      <Text style={[tw`mt-10 mb-10 font-bold`, { fontSize: scaleFont(32) }]}>
        Account
      </Text>

      {/* Profile Info */}
      <View style={tw`items-center p-5 border-2 border-black rounded-lg`}>
        <Ionicons name="person-circle-outline" size={70} color="#000" />
        <Text style={[tw`font-semibold`, { fontSize: scaleFont(18) }]}>
          {user?.name}
        </Text>
        <Text style={tw`text-gray-500`}>{user?.email}</Text>
        <Text style={tw`text-gray-500`}>{user?.id}</Text>
        

      </View>

      {/* Account Section */}
      <Text style={tw`text-lg font-semibold mt-4 mb-3`}>Account</Text>
      <View style={tw`rounded-lg bg-gray-100 p-1`}>
        <TouchableOpacity
          accessible
          accessibilityLabel="Notification Settings"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={() => navigation.navigate("NotificationSettingsScreen")}
        >
          <Ionicons name="notifications-outline" size={iconSize} color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Notifications</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          accessible
          accessibilityLabel="Account Settings"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={() => navigation.navigate("AccountSettingsScreen")}
        >
          <Ionicons name="lock-closed-outline" size={iconSize} color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Account Settings</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          accessible
          accessibilityLabel="Manage Motors"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={() => navigation.navigate("AddMotorScreen")}
        >
          <Ionicons name="construct-outline" size={iconSize} color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Motors</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          accessible
          accessibilityLabel="Logout"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={iconSize} color="red" />
          <Text style={tw`text-red-500 text-base flex-1 text-left`}>Logout</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

      {/* Support Section */}
      <Text style={tw`text-lg font-semibold mt-4 mb-3`}>Support</Text>
      <View style={tw`rounded-lg bg-gray-100 p-1`}>
        <TouchableOpacity
          accessible
          accessibilityLabel="Help Center"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={() => navigation.navigate("HelpCenterScreen")}
        >
          <Ionicons name="help-outline" size={iconSize} color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Help Center</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>

        <TouchableOpacity
          accessible
          accessibilityLabel="Report a Bug"
          style={tw`flex-row justify-between items-center p-2 m-1`}
          onPress={() => navigation.navigate("ReportBugScreen")}
        >
          <Ionicons name="bug-outline" size={iconSize} color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Report a Bug</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default ProfileScreen;
