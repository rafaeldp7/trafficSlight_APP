import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";

export default function ReportBugScreen({ navigation }) {
  const [bugTitle, setBugTitle] = useState("");
  const [bugDescription, setBugDescription] = useState("");

  const handleSubmit = () => {
    console.log("Bug Report Submitted:", { bugTitle, bugDescription });
    // Placeholder action for submission
    alert("Bug report submitted! Our team will look into it.");
    setBugTitle("");
    setBugDescription("");
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

      {/* Scrollable Bug Report Form */}
      <ScrollView style={tw`p-5`}showsVerticalScrollIndicator={false}>
        <Text style={tw`text-lg font-semibold mb-2`}>Describe the Issue</Text>

        {/* Bug Title Input */}
        <TextInput
          style={tw`border border-gray-300 p-3 rounded-lg mb-3`}
          placeholder="Bug Title (e.g., App crashes when logging in)"
          value={bugTitle}
          onChangeText={setBugTitle}
        />

        {/* Bug Description Input */}
        <TextInput
          style={tw`border border-gray-300 p-3 rounded-lg mb-3 h-32`}
          placeholder="Describe the issue in detail..."
          value={bugDescription}
          onChangeText={setBugDescription}
          multiline
        />

        {/* Upload Screenshot Button (Placeholder) */}
        <TouchableOpacity style={tw`bg-gray-200 p-4 rounded-lg items-center mb-5`}>
          <Text style={tw`text-gray-700`}>Upload Screenshot (Optional)</Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={tw`bg-red-500 p-4 rounded-lg items-center`}
          onPress={handleSubmit}
        >
          <Text style={tw`text-white font-bold text-lg`}>Submit Bug Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
