// ✅ TrafficReportsScreen with Reverse Geocoding
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import tw from "twrnc";
import { LOCALHOST_IP, GOOGLE_MAPS_API_KEY } from "@env";

export default function TrafficReportsScreen({ navigation }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReports = async () => {
    try {
      const response = await fetch(`${LOCALHOST_IP}/api/reports`);
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error("Failed to fetch reports", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const getAddressFromCoords = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      const data = await response.json();
      if (data.results.length > 0) {
        return data.results[0].formatted_address;
      } else {
        return "Unknown address";
      }
    } catch (error) {
      console.error("Reverse geocoding error:", error);
      return "Failed to fetch address";
    }
  };

  const ReportCard = ({ report }) => {
    const [address, setAddress] = useState("Resolving address...");

    useEffect(() => {
      getAddressFromCoords(report.location.latitude, report.location.longitude)
        .then(setAddress);
    }, []);

    return (
      <View style={tw`bg-white rounded-lg p-4 mb-3 shadow-sm border`}>
        <View style={tw`flex-row items-center mb-2`}>
          <Ionicons name="alert-circle" size={22} color="#f87171" style={tw`mr-2`} />
          <Text style={tw`font-bold text-lg`}>{report.reportType}</Text>
        </View>
        <Text style={tw`text-gray-600`}>{report.description}</Text>
        <Text style={tw`text-gray-400 mt-1 text-sm`}>{address}</Text>
      </View>
    );
  };

  const filtered = reports.filter((r) =>
    r.reportType.toLowerCase().includes(search.toLowerCase()) ||
    r.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-gray-50`}>
      <View style={tw`px-5 pt-10 pb-4 border-b border-gray-200 flex-row items-center bg-white`}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={tw`text-lg font-bold ml-4`}>Traffic Reports</Text>
      </View>

      <View style={tw`px-5 mt-4`}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search reports..."
          style={tw`border border-gray-300 rounded-lg p-3 mb-4`}
        />

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => <ReportCard report={item} />}
            ListEmptyComponent={
              <Text style={tw`text-center text-gray-400 mt-4`}>No reports found.</Text>
            }
            contentContainerStyle={tw`pb-20`}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
