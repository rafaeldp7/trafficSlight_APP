import React, { useState } from "react";
import { View, Text, Switch } from "react-native";
import tw from "twrnc";

export default function NotificationSettingsScreen() {
  const [appUpdates, setAppUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [alerts, setAlerts] = useState(true);

  return (
    <View style={tw`flex-1 bg-white p-6`}>
      <Text style={tw`text-xl font-bold mb-6`}>Notification Settings</Text>

      <View style={tw`flex-row justify-between items-center mb-5`}>
        <Text style={tw`text-base`}>App Updates</Text>
        <Switch value={appUpdates} onValueChange={setAppUpdates} />
      </View>

      <View style={tw`flex-row justify-between items-center mb-5`}>
        <Text style={tw`text-base`}>Promotions</Text>
        <Switch value={promotions} onValueChange={setPromotions} />
      </View>

      <View style={tw`flex-row justify-between items-center`}>
        <Text style={tw`text-base`}>Important Alerts</Text>
        <Switch value={alerts} onValueChange={setAlerts} />
      </View>
    </View>
  );
}
