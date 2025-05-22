import React from "react";
import { View, Image, Text, TouchableOpacity, ScrollView, Dimensions } from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";

const { width, height } = Dimensions.get("window");

export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={tw`flex-1 bg-gray-100`}>
      {/* Header Section */}
      <View style={tw`absolute top-0 left-0 right-0 bg-blue-700 w-full py-6 px-5`}>
        <Text style={tw`text-xl font-bold text-white pt-2`}>Welcome to Traffic Slight</Text>
        <Text style={tw`text-base text-white mt-2 w-[80%]`}>
          Wherever you're going, let's compute your gas consumption
        </Text>
      </View>

      {/* Push content down to prevent overlap */}
      <View style={tw`mt-[180px] flex-1`}>
        <View style={tw`bg-blue-200 rounded-t-3xl w-full flex-1 pb-20`}>
          <Text style={tw`text-2xl font-bold text-center p-5`}>PICK A MOTORCYCLE</Text>

          {/* Scrollable List */}
          <ScrollView
            contentContainerStyle={tw`pb-20 px-5`}
            showsVerticalScrollIndicator={false}
          >
            {[...Array(1)].map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  tw`flex flex-row bg-white rounded-lg py-4 px-4 mb-3 shadow-md`,
                  { width: width * 0.9 }, // Dynamic width
                ]}
                onPress={() => navigation.navigate("SelectRouteScreen")}
              >
                {/* Motorcycle Image Placeholder */}
                <View style={tw`w-20 h-20 bg-gray-800 rounded-lg`}>
                    <Image 
                        source={require("../../../assets/icons/motor.jpg")}  
                        style={{ width: 80, height: 80, borderRadius: 5 }} 
                    />
                </View>
                {/* Motorcycle Details */}
                <View style={tw`flex-1 ml-4`}>
                  <Text style={tw`font-bold text-lg`}>Kawasaki Ninja</Text>

                  {/* Information Rows */}
                  {/* TODO: Replace "default" with user.motor.name.fuel_efficiency from database */}
                  <View style={tw`flex-row justify-between`}>
                      <Text style={tw`text-gray-600`}>Fuel Efficiency:</Text>
                      <Text style={tw`text-black font-semibold`}>default</Text> 
                     
                  </View>


                  {/* database user.motor.name.distance_traveled*/}
                  <View style={tw`flex-row justify-between`}>
                    <Text style={tw`text-gray-600`}>Distance Traveled:</Text>
                    <Text style={tw`text-black font-semibold`}>10 km</Text> 
                    
                  </View>


                  {/* database user.motor.name.trips*/}
                  <View style={tw`flex-row justify-between`}>
                    <Text style={tw`text-gray-600`}>Trips:</Text>
                    <Text style={tw`text-black font-semibold`}>2</Text> 
                    
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Add Motor Button (Fixed at Bottom) */}
      <View style={tw`absolute bottom-5 left-0 right-0 items-center`}>
        <TouchableOpacity
          style={[
            tw`bg-blue-500 py-3 px-6 rounded-full shadow-lg`,
            { width: width * 0.8 }, // Dynamic button width
          ]}
          onPress={() => navigation.navigate("AddMotorScreen")}
        >
          <Text style={tw`text-white font-bold text-lg text-center`}>+ Add Motor</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
