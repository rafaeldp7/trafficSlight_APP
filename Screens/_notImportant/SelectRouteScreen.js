import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Dimensions  } from "react-native";
import { useNavigation } from "@react-navigation/native";
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";

const { width } = Dimensions.get("window");
export default function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={tw`flex-1 bg-gray-100 h-full`}>
      {/* Header Section */}
      <View style={tw`absolute top-0 left-0 right-0 bg-blue-800 w-full p-4 h-45 justify-center`}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`pt-2`}>
          <Text style={tw`text-white text-2xl font-bold `}>← Route</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("RouteSelectionScreen")} style={tw`pt-2`}>
          <Text style={tw`absolute top-2 right-2 text-white text-2xl font-bold bg-blue-500 px-3 rounded-full py-2`}>Map</Text>
        </TouchableOpacity>
        <Text style={tw`text-base text-white m-2 mt-2 w-60`}>
          Wherever you're going, let's compute your gas consumption
        </Text>

      </View>

      {/* Push content down to prevent overlap */}
      <View style={tw`mt-40 flex-1 items-center`}>
        <TouchableOpacity onPress={() => navigation.navigate("RouteSelectionScreen")} style={tw`bg-gray-100 rounded-xl w-90 shadow-2xl flex flex-row px-1 py-3 `}>
                      <Ionicons name="ellipse-outline" size={24} color="blue" paddingHorizontal={10} />
          <Text style={tw`text-lg text-left  font-bold text-center w-25   `}>Where To?</Text>


          
        </TouchableOpacity>

      </View>

     
      <View style={tw`absolute bottom-5 left-0 right-0 items-center px-4`}>
      <TouchableOpacity
        style={tw`flex flex-row bg-blue-800 rounded-lg py-2 px-4 w-full max-w-[${width * 0.9}px]`}
        onPress={() => navigation.navigate("SelectRouteScreen")}
      >
        <View style={tw`w-16 h-16 bg-gray-100 rounded-lg`} />
        <View style={tw`flex-1 ml-4 justify-center`}>
          <Text style={tw`font-bold text-white text-lg`}>Kawasaki Ninja</Text>

          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-white`}>Fuel Efficiency:</Text>
            <Text style={tw`text-white`}>default</Text>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-white`}>Distance Traveled:</Text>
            <Text style={tw`text-white`}>10 km</Text>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-white`}>Trips:</Text>
            <Text style={tw`text-white`}>2</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
    </View>
  );
}
