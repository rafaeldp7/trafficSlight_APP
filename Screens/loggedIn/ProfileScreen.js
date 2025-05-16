// import React, { useState, useEffect, useContext } from "react";
// import { View } from "react-native";
// import { Text, Button, Card } from "react-native-paper";
// import AsyncStorage from "@react-native-async-storage/async-storage";
// import { AuthContext } from "../AuthContext/AuthContext";
// import tw from "twrnc";

// export default function ProfileScreen({ navigation }) {
//   const { logout } = useContext(AuthContext);


//   return (
//     <View style={tw`flex-1 justify-center items-center`}>
//       <Text style={tw`text-xl mb-5`}>Welcome to Profile Screen</Text>
//       <Button mode="contained" onPress={logout} style={tw`bg-red-500`}>
//         Logout
//       </Button>
//     </View>
//   );
// }

import React, { useState, useEffect, useContext } from "react";
import { View, Alert, TouchableOpacity, Text } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { AuthContext } from "../../AuthContext/AuthContext";
import tw from "twrnc";
import { useUser } from "../../AuthContext/UserContext";


const ProfileScreen = ({ navigation }) => {
  const { user } = useUser();

  if (!user) {
    return (
      <View >
        <ActivityIndicator size="large" color="#3498db" />
        <Text >Loading user data...</Text>
      </View>
    );
  }
  const { logout } = useContext(AuthContext);
  
  const handleLogout = () => {
    Alert.alert(
      "Confirm Logout",
      "Are you sure you want to log out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Logout",
          onPress: () => logout(),
          style: "destructive",
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={tw`flex-1 bg-white p-5`}>
      {/* Header */}
      <Text style={tw`text-4xl font-bold mt-10 mb-10`}>Account</Text>

      {/* Profile Info */}
      <View style={tw`items-center p-5 border-2 border-black rounded-lg`}>
        <Ionicons name="person-circle-outline" size={70} color="#000" />
        <Text style={tw`text-lg font-semibold`}>{user.name}</Text>
        <Text style={tw`text-gray-500`}>{user.email}</Text>
      </View>



      {/* Settings Section */}
      <Text style={tw`text-lg font-semibold mt-4 mb-3`}>Account</Text>
      <View style={tw`rounded-lg bg-gray-100 p-1`}>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 `} onPress={() => navigation.navigate("NotificationSettingsScreen")}>
          <Ionicons name="notifications-outline" width={43} size={34}  color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Notifications</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 `}  onPress={() => navigation.navigate("AccountSettingsScreen")}>
          <Ionicons name="lock-closed-outline" width={43} size={34}  color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Account Settings</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 `}  onPress={() => navigation.navigate("AddMotorScreen")}>
          <Ionicons name="construct-outline" width={43} size={34}  color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Motors</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 `} onPress={handleLogout}>
          <Ionicons name="log-out-outline" width={43} size={34} color="red" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Logout</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>



      {/* Support Section */}
      <Text style={tw`text-lg font-semibold mt-4 mb-3`}>Support</Text>
      <View style={tw`rounded-lg bg-gray-100 p-1`}>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 ` } onPress={() => navigation.navigate("HelpCenterScreen")}>
          <Ionicons name="help-outline" width={43} size={34}  color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Help Center</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
        <TouchableOpacity style={tw`flex-row justify-between items-center bg-gray-100 p-2 m-1 `} onPress={() => navigation.navigate("ReportBugScreen")}>
          <Ionicons name="bug-outline" width={43} size={34}  color="#000" />
          <Text style={tw`text-black text-base flex-1 text-left`}>Report a Bug</Text>
          <Ionicons name="chevron-forward-outline" size={24} color="#000" />
        </TouchableOpacity>
      </View>

    </View>
  );
};

export default ProfileScreen;
