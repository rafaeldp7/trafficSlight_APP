import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
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
    <View style={tw`flex-1 bg-white p-5`}>
      {/* Header */}
      <View style={tw`flex-row items-center mb-4 pt-3`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`pt-2`}>
          <Text style={tw`text-blue-500 text-lg`}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold ml-3   `}>Report a Bug</Text>
      </View>

      {/* Scrollable Bug Report Form */}
      <ScrollView showsVerticalScrollIndicator={false}>
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
