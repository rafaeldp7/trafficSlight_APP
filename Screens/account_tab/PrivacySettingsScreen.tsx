import React, { useState } from "react";
import { 
  View, 
  Text, 
  Switch, 
  SafeAreaView,
  StatusBar,
  Platform,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

export default function PrivacySettingsScreen({ navigation }) {
  const [appUpdates, setAppUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [alerts, setAlerts] = useState(true);

  return (
    <SafeAreaView style={tw`flex-1 bg-[#F2EEEE]`}>
      <StatusBar barStyle="light-content" backgroundColor="#00ADB5" />
      
      {/* Header */}
      <View style={tw`w-full bg-[#00ADB5]`}>
        <LinearGradient
          colors={['#00ADB5', '#00C2CC']}
          style={tw`w-full`}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={tw`flex-row items-center p-4 pt-${Platform.OS === 'android' ? '6' : '4'}`}>
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              style={tw`p-2 mr-2`}
            >
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={tw`flex-1`}>
              <Text style={tw`text-2xl font-semibold text-white mb-1`}>Privacy Settings</Text>
              <Text style={tw`text-sm text-white opacity-80`}>Manage your privacy preferences</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <ScrollView style={tw`p-4`}>
        <View style={tw`bg-white rounded-2xl p-5 shadow-sm`}>
          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-base font-medium text-gray-800`}>App Updates</Text>
              <Switch 
                value={appUpdates} 
                onValueChange={setAppUpdates}
                trackColor={{ false: "#E1E1E1", true: "#00ADB5" }}
                thumbColor={appUpdates ? "#FFFFFF" : "#F5F5F5"}
              />
            </View>
            <Text style={tw`text-sm text-gray-600`}>
              Receive notifications about new app features and updates
            </Text>
          </View>

          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-base font-medium text-gray-800`}>Promotions</Text>
              <Switch 
                value={promotions} 
                onValueChange={setPromotions}
                trackColor={{ false: "#E1E1E1", true: "#00ADB5" }}
                thumbColor={promotions ? "#FFFFFF" : "#F5F5F5"}
              />
            </View>
            <Text style={tw`text-sm text-gray-600`}>
              Receive promotional offers and marketing communications
            </Text>
          </View>

          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-base font-medium text-gray-800`}>Important Alerts</Text>
              <Switch 
                value={alerts} 
                onValueChange={setAlerts}
                trackColor={{ false: "#E1E1E1", true: "#00ADB5" }}
                thumbColor={alerts ? "#FFFFFF" : "#F5F5F5"}
              />
            </View>
            <Text style={tw`text-sm text-gray-600`}>
              Receive critical alerts about your account and safety
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
