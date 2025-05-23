import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function HelpCenterScreen({ navigation }) {
  return (
    <View style={tw`flex-1 bg-white pt-7`}>


      <View style={tw`px-5 py-4 border-b border-gray-200 flex-row items-center`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold ml-4`}>Help Center</Text>
      </View>

      {/* Scrollable FAQ Section */}
      <ScrollView style={tw`p-5`}showsVerticalScrollIndicator={false}>
        <Text style={tw`text-lg font-semibold mb-2`}>Frequently Asked Questions</Text>

        {/* FAQ Item */}



        <View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
  <Text style={tw`font-bold text-base`}>How do I add a motorcycle?</Text>
  <Text style={tw`text-gray-600 mt-1`}>
    Go to the "Add Motor" screen from the Account tab. Fill in the model, nickname, plate number, and select your motorcycle from the list.
  </Text>
</View>

<View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
  <Text style={tw`font-bold text-base`}>How does fuel tracking work?</Text>
  <Text style={tw`text-gray-600 mt-1`}>
    After adding a motor, you can log fuel consumption by inputting liters, total cost, and other details. You’ll find it under the Fuel Logs section.
  </Text>
</View>

<View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
  <Text style={tw`font-bold text-base`}>How can I use the map and navigation?</Text>
  <Text style={tw`text-gray-600 mt-1`}>
    Select a destination from the map. The app will generate a route and provide fuel estimates based on your selected motorcycle’s data.
  </Text>
</View>




<View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
  <Text style={tw`font-bold text-base`}>How do I submit a traffic report?</Text>
  <Text style={tw`text-gray-600 mt-1`}>
    Tap the alert button on the main map screen to submit reports like accidents, road closures, or hazards. Your location will be auto-filled.
  </Text>
</View>









      </ScrollView>
    </View>
  );
}
