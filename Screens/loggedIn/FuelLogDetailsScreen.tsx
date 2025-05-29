import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import tw from "twrnc";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useUser } from "../../AuthContext/UserContext";
import { LOCALHOST_IP } from "@env";

const PAGE_SIZE = 5;

export default function FuelLogDetailsScreen() {
  const { user } = useUser();
  const navigation = useNavigation();
  const [logs, setLogs] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [fromDateStr, setFromDateStr] = useState("");
  const [toDateStr, setToDateStr] = useState("");
  const [sortBy, setSortBy] = useState("date");
  const [showFromPicker, setShowFromPicker] = useState(false);
const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (user?._id) fetchLogs();
  }, [user]);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`${LOCALHOST_IP}/api/fuel-logs/${user._id}`);
      const data = await res.json();
      const sorted = [...data].reverse();
      setLogs(sorted);
      setFiltered(sorted);
    } catch {
      alert("Failed to fetch fuel logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let temp = [...logs];

if (search.trim()) {
  const term = search.toLowerCase();
  temp = temp.filter((log) => {
    const nickname = log.motorId?.nickname?.toLowerCase() || "";
    const model = log.motorId?.motorcycleId?.model?.toLowerCase() || "";
    const date = new Date(log.date).toLocaleString("en-PH").toLowerCase();
    const liters = String(log.liters || "").toLowerCase();
    const price = String(log.pricePerLiter?.toFixed(2) || "").toLowerCase();
    const totalCost = String(log.totalCost?.toFixed(2) || "").toLowerCase();
    const notes = log.notes?.toLowerCase() || "";

    return (
      nickname.includes(term) ||
      model.includes(term) ||
      date.includes(term) ||
      liters.includes(term) ||
      price.includes(term) ||
      totalCost.includes(term) ||
      notes.includes(term)
    );
  });
}


    if (fromDateStr && toDateStr) {
      const from = new Date(fromDateStr);
      const to = new Date(toDateStr);
      temp = temp.filter((log) => {
        const logDate = new Date(log.date);
        return logDate >= from && logDate <= to;
      });
    }

    if (sortBy === "date") {
      temp.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === "liters") {
      temp.sort((a, b) => b.liters - a.liters);
    } else if (sortBy === "cost") {
      temp.sort((a, b) => b.totalCost - a.totalCost);
    }

    setFiltered(temp);
    setPage(1);
  }, [search, fromDateStr, toDateStr, sortBy, logs]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const loadMore = () => {
    if (page * PAGE_SIZE < filtered.length) setPage((p) => p + 1);
  };

  return (
    <View style={tw`flex-1 bg-gray-50 px-4 pt-7`}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={tw`mb-4`}>
        <View style={tw`flex-row items-center`}>
          <Ionicons name="arrow-back" size={24} color="black" />
          <Text style={tw`ml-2 text-lg`}>Back</Text>
        </View>
      </TouchableOpacity>

      <Text style={tw`text-2xl font-bold mb-4`}>Fuel Logs</Text>

      <TextInput
        placeholder="Search by motor or notes"
        value={search}
        onChangeText={setSearch}
        style={tw`border border-gray-300 rounded-lg p-3 mb-2`}
      />

      <View style={tw`flex-row justify-between mb-2`}>
  <TouchableOpacity
    onPress={() => setShowFromPicker(true)}
    style={tw`border border-gray-300 px-3 py-2 rounded-lg flex-1 mr-1`}
  >
    <Text style={tw`text-gray-700`}>
      {fromDateStr ? fromDateStr : "From Date"}
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    onPress={() => setShowToPicker(true)}
    style={tw`border border-gray-300 px-3 py-2 rounded-lg flex-1 ml-1`}
  >
    <Text style={tw`text-gray-700`}>
      {toDateStr ? toDateStr : "To Date"}
    </Text>
  </TouchableOpacity>
</View>
{showFromPicker && (
  <DateTimePicker
    value={fromDateStr ? new Date(fromDateStr) : new Date()}
    mode="date"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={(event, selectedDate) => {
      setShowFromPicker(false);
      if (event.type !== "dismissed" && selectedDate) {
        setFromDateStr(selectedDate.toISOString().split("T")[0]);
      }
    }}
  />
)}


{showToPicker && (
  <DateTimePicker
    value={toDateStr ? new Date(toDateStr) : new Date()}
    mode="date"
    display={Platform.OS === "ios" ? "spinner" : "default"}
    onChange={(event, selectedDate) => {
      setShowToPicker(false);
      if (event.type !== "dismissed" && selectedDate) {
        setToDateStr(selectedDate.toISOString().split("T")[0]);
      }
    }}
  />
)}




      <TouchableOpacity
        onPress={() => {
          setFromDateStr("");
          setToDateStr("");
        }}
        style={tw`px-3 py-2 bg-red-500 rounded-lg items-center mb-2`}
      >
        <Text style={tw`text-white`}>Clear Dates</Text>
      </TouchableOpacity>

      <View style={tw`flex-row mb-2`}>
        {["date", "liters", "cost"].map((key) => (
          <TouchableOpacity
            key={key}
            onPress={() => setSortBy(key)}
            style={tw`mr-2 px-3 py-2 rounded-lg border ${
              sortBy === key ? "border-blue-500" : "border-gray-300"
            }`}
          >
            <Text>{key.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" />
      ) : paginated.length === 0 ? (
        <Text style={tw`text-center mt-10 text-gray-400`}>
          No fuel logs found.
        </Text>
      ) : (
        <FlatList
          data={paginated}
          keyExtractor={(item) => item._id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.2}
          renderItem={({ item }) => (
            <View style={tw`bg-white p-4 mb-3 rounded-lg shadow`}>
              <Text style={tw`font-bold text-lg`}>
                {item.motorId?.nickname ?? "Unnamed Motor"}
              </Text>
              <Text style={tw`text-gray-700`}>
                Model: {item.motorId?.motorcycleId?.model ?? "Unknown"}
              </Text>
              <Text style={tw`text-gray-700`}>
                Plate: {item.motorId?.plateNumber ?? "N/A"}
              </Text>
              <Text>
                Date: {new Date(item.date).toLocaleString("en-PH", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </Text>
              <Text>Liters: {item.liters}</Text>
              <Text>Price/L: ₱{item.pricePerLiter.toFixed(2)}</Text>
              <Text>Total Cost: ₱{item.totalCost.toFixed(2)}</Text>
              {item.notes && <Text>Notes: {item.notes}</Text>}
            </View>
          )}
        />
      )}
    </View>
  );
}
