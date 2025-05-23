import React, { useState, useEffect } from "react";
import { View, Text, Switch, Alert } from "react-native";
import tw from "twrnc";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function NotificationSettingsScreen() {
  const [settings, setSettings] = useState({
    appUpdates: true,
    promotions: false,
    alerts: true,
  });

  // Load stored preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const stored = await AsyncStorage.getItem("notificationSettings");
        if (stored) {
          setSettings(JSON.parse(stored));
        }
      } catch (err) {
        console.warn("Failed to load notification settings:", err);
      }
    };

    loadPreferences();
  }, []);

  // Save settings to AsyncStorage
  const toggleSwitch = (key: string) => {
    const updated = { ...settings, [key]: !settings[key] };
    setSettings(updated);
    AsyncStorage.setItem("notificationSettings", JSON.stringify(updated)).catch((err) =>
      Alert.alert("Error", "Failed to save settings")
    );
  };

  return (
    <View style={tw`flex-1 bg-white p-6`}>
      <Text style={tw`text-xl font-bold mb-6`}>Notification Settings</Text>

      <View style={tw`flex-row justify-between items-center mb-5`}>
        <Text style={tw`text-base`}>App Updates</Text>
        <Switch
          value={settings.appUpdates}
          onValueChange={() => toggleSwitch("appUpdates")}
        />
      </View>

      <View style={tw`flex-row justify-between items-center mb-5`}>
        <Text style={tw`text-base`}>Promotions</Text>
        <Switch
          value={settings.promotions}
          onValueChange={() => toggleSwitch("promotions")}
        />
      </View>

      <View style={tw`flex-row justify-between items-center`}>
        <Text style={tw`text-base`}>Important Alerts</Text>
        <Switch
          value={settings.alerts}
          onValueChange={() => toggleSwitch("alerts")}
        />
      </View>
    </View>
  );
}
