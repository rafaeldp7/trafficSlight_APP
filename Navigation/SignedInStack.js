import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons } from "react-native-vector-icons";
import HomeScreen from "../Screens/HomeScreen";
import ProfileScreen from "../Screens/loggedIn/ProfileScreen";
import RouteSelectionScreen from "../Screens/loggedIn/RouteSelectionScreen";
import TrackingScreen from "../Screens/loggedIn/TrackingScreen";
import HistoryScreen from "../Screens/loggedIn/HistoryScreen";
import AddMotorScreen from "../Screens/loggedIn/AddMotorScreen";
import HelpCenterScreen from "../Screens/loggedIn/HelpCenterScreen";
import ReportBugScreen from "../Screens/loggedIn/ReportBug";
import AccountSettingsScreen from "../Screens/loggedIn/AccountSettingsScreen";
import NotificationSettingsScreen from "../Screens/loggedIn/NotificationSettingsScreen";
import SelectRouteScreen from "../Screens/loggedIn/SelectRouteScreen";
import MapScreenTry from "../Screens/loggedIn/MapScreenTry";
import Menu from "../Screens/loggedIn/Menu";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = "home";
          } else if (route.name === "Activity") {
            iconName = "history";
          } else if (route.name === "Account") {
            iconName = "account";
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={RouteSelectionScreen} />
      <Tab.Screen name="Activity" component={HistoryScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function SignedInStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="RouteSelectionScreen" component={RouteSelectionScreen} />
      <Stack.Screen name="TrackingScreen" component={TrackingScreen} />
      <Stack.Screen name="AddMotorScreen" component={AddMotorScreen} />
      <Stack.Screen name="HelpCenterScreen" component={HelpCenterScreen} />
      <Stack.Screen name="ReportBugScreen" component={ReportBugScreen} />
      <Stack.Screen name="AccountSettingsScreen" component={AccountSettingsScreen} />
      <Stack.Screen name="NotificationSettingsScreen" component={NotificationSettingsScreen} />
      <Stack.Screen name="SelectRouteScreen" component={SelectRouteScreen} />
      <Stack.Screen name="MapScreenTry" component={MapScreenTry} />
      <Stack.Screen name="Menu" component={Menu} />
    </Stack.Navigator>
  );
}
