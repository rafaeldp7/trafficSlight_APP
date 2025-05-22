import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import tw from "twrnc";

const { width, height } = Dimensions.get("window");

export default function HistoryScreen({ navigation }) {
  return (
    <View style={tw`flex-1 bg-gray-100`}>
      {/* Header Section */}
      <View style={tw`bg-gray-300 rounded-t-3xl w-full py-6 px-5`}>
        <Text style={tw`text-2xl font-bold`}>Activity</Text>
      </View>

      {/* Scrollable List */}
      <ScrollView 
        contentContainerStyle={tw`pb-20`}
        showsVerticalScrollIndicator={false}
      >
        <Text style={tw`text-lg font-bold ml-5 mt-4`}>Recent</Text>

        {[...Array(10)].map((_, index) => (
          <TouchableOpacity
            key={index}
            style={tw`flex flex-row bg-white mx-5 my-2 p-4 rounded-lg shadow-md`}
            onPress={() => navigation.navigate("RouteSelectionScreen")}
          >
            <View style={{ width: width * 0.8 }}>
              <Text style={tw`text-lg font-semibold`}>Ride to Pamantasan ng Lungsod ng Valenzuela - Main</Text>
              <Text style={tw`text-gray-600`}>17 Mar 2025, 11:28</Text>
              <Text style={tw`text-gray-900 font-semibold`}>Motor: Kawasaki Ninja</Text>
              <Text style={tw`text-blue-600 font-semibold text-lg`}>Fuel Usage: 0.5L - 1L</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
