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
        <Text style={tw`text-lg font-bold ml-4`}>Notifications</Text>
      </View>

      {/* Scrollable FAQ Section */}
      <ScrollView style={tw`p-5`}showsVerticalScrollIndicator={false}>
        <Text style={tw`text-lg font-semibold mb-2`}>Frequently Asked Questions</Text>

        {/* FAQ Item */}
        <View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
          <Text style={tw`font-bold text-base`}>How do I track my rides?</Text>
          <Text style={tw`text-gray-600 mt-1`}>
            You can track your rides in the "History" section of the app.
          </Text>
        </View>

        <View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
          <Text style={tw`font-bold text-base`}>How can I add a motorcycle?</Text>
          <Text style={tw`text-gray-600 mt-1`}>
            Go to the "Profile" screen and select "Add Motor" to register a new motorcycle.
          </Text>
        </View>

        <View style={tw`mb-4 p-4 border border-gray-300 rounded-lg`}>
          <Text style={tw`font-bold text-base`}>What should I do if the app crashes?</Text>
          <Text style={tw`text-gray-600 mt-1`}>
            Try restarting the app. If the issue persists, reinstall the app or contact support.
          </Text>
        </View>

        {/* Add More FAQs Here */}

        {/* Contact Support Button */}
        <TouchableOpacity style={tw`bg-blue-500 p-4 rounded-lg items-center mt-5`}>
          <Text style={tw`text-white font-bold text-lg`}>Contact Support</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
