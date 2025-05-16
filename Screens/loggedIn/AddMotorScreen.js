import React from "react";
import { View, TextInput, Text, ScrollView, TouchableOpacity } from "react-native";
import tw from "twrnc";

export default function AddMotorScreen({ navigation }) {
  return (
    <View style={tw`flex-1 bg-white p-5`}>
      {/* Header with Back Button */} 
      <View style={tw`flex-row items-center mb-5`}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={tw`p-2`}>
          <Text style={tw`text-blue-500 text-lg`}>← Back</Text>
        </TouchableOpacity>
        <Text style={tw`text-xl font-bold ml-3`}>Add Motor</Text>
      </View>

      {/* Scrollable Form */}
      <ScrollView contentContainerStyle={tw`flex-1`}>
        {/* Name Input */}
        <Text style={tw`text-lg font-semibold mb-1`}>Motor Name</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="Enter motor name"
        />

        {/* Additional Input (Example: Model) */}
        <Text style={tw`text-lg font-semibold mb-1`}>Model</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="Enter model"
        />

                {/* Additional Input (Example: Model) */}
                <Text style={tw`text-lg font-semibold mb-1`}>Fuel Efficiency</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="L/KM"
        />
                {/* Additional Input (Example: Model) */}
                <Text style={tw`text-lg font-semibold mb-1`}>Model</Text>
        <TextInput
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
          placeholder="Enter model"
        />

        

        {/* Add More Fields Here (if needed) */}

        {/* Save Button */}
        <TouchableOpacity style={tw`bg-blue-500 p-4 rounded-lg items-center mt-5`}>
          <Text style={tw`text-white font-bold text-lg`}>Save Motor</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
