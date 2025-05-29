import React from "react";
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Platform,
} from "react-native";
import tw from "twrnc";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';

export default function HelpCenterScreen({ navigation }) {
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
              <Text style={tw`text-2xl font-semibold text-white mb-1`}>Help Center</Text>
              <Text style={tw`text-sm text-white opacity-80`}>Frequently Asked Questions</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Scrollable FAQ Section */}
      <ScrollView style={tw`p-4`} showsVerticalScrollIndicator={false}>
        <View style={tw`bg-white rounded-2xl p-5 shadow-sm`}>
          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <Text style={tw`font-semibold text-base text-gray-800`}>How do I add a motorcycle?</Text>
            <Text style={tw`text-gray-600 mt-2`}>
              Go to the "Add Motor" screen from the Account tab. Fill in the model, nickname, plate number, and select your motorcycle from the list.
            </Text>
          </View>

          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <Text style={tw`font-semibold text-base text-gray-800`}>How does fuel tracking work?</Text>
            <Text style={tw`text-gray-600 mt-2`}>
              After adding a motor, you can log fuel consumption by inputting liters, total cost, and other details. You'll find it under the Fuel Logs section.
            </Text>
          </View>

          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <Text style={tw`font-semibold text-base text-gray-800`}>How can I use the map and navigation?</Text>
            <Text style={tw`text-gray-600 mt-2`}>
              Select a destination from the map. The app will generate a route and provide fuel estimates based on your selected motorcycle's data.
            </Text>
          </View>

          <View style={tw`mb-6 p-4 border border-gray-200 rounded-xl bg-[#F8F9FA]`}>
            <Text style={tw`font-semibold text-base text-gray-800`}>How do I submit a traffic report?</Text>
            <Text style={tw`text-gray-600 mt-2`}>
              Tap the alert button on the main map screen to submit reports like accidents, road closures, or hazards. Your location will be auto-filled.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
