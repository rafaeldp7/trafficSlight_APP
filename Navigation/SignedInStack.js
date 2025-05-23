import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { MaterialCommunityIcons } from "react-native-vector-icons";

import ProfileScreen from "../Screens/loggedIn/ProfileScreen";
import RouteSelectionScreen from "../Screens/RouteSelectionScreen";
import TrackingScreen from "../Screens/_notImportant/TrackingScreen";
import AddMotorScreen from "../Screens/account_tab/AddMotorScreen";
import HelpCenterScreen from "../Screens/account_tab/HelpCenterScreen";
import ReportBugScreen from "../Screens/account_tab/ReportBug";
import AccountSettingsScreen from "../Screens/account_tab/AccountSettingsScreen";
import NotificationSettingsScreen from "../Screens/account_tab/NotificationSettingsScreen";
import SelectRouteScreen from "../Screens/_notImportant/SelectRouteScreen";
import MapScreenTry from "../Screens/loggedIn/MapScreenTry";
import Menu from "../Screens/_notImportant/may22/Menu";
import HomeScreen from "../Screens/loggedIn/HomeScreen";
import MotorDetailsScreen from "../Screens/loggedIn/MotorDetailsScreen";
import TripDetailsScreen from "../Screens/loggedIn/TripDetailsScreen";
import AlertDetailsScreen from "../Screens/loggedIn/AlertDetailsScreen";
import DestinationDetailsScreen from "../Screens/loggedIn/DestinationDetailsScreen";
import FuelLogDetailsScreen from "../Screens/loggedIn/FuelLogDetailsScreen.tsx";
import FuelCalculatorScreen from "../Screens/loggedIn/FuelCalculatorScreen";
import AddFuelLogScreen from "../Screens/loggedIn/addFuelLogsScreen";
import addSavedDestinationScreen from "../Screens/loggedIn/addSavedDestinationScreen";
import AllDestinationsMapScreen from "../Screens/loggedIn/allSavedDestination";
import ChangeEmailScreen from "../Screens/account_tab/ChangeEmailScreen";
import ChangePasswordScreen from "../Screens/account_tab/ChangePasswordScreen";
import PrivacySettingsScreen from "../Screens/account_tab/PrivacySettingsScreen";
import NotificationSettings from "../Screens/account_tab/NotificationSettingsScreen";


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
          } else if (route.name === "Map") {
            iconName = "map";
          } else if (route.name === "Account") {
            iconName = "account";
          }

          return <MaterialCommunityIcons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={RouteSelectionScreen} />
      <Tab.Screen name="Account" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function SignedInStack() {
  return (
<Stack.Navigator screenOptions={{ headerShown: false }}>
  <Stack.Screen name="MainTabs" component={MainTabs} />

  <Stack.Screen name="Home" component={HomeScreen} />
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

  {/* 👇 Add these for Home navigation */}
  <Stack.Screen name="MotorDetails" component={MotorDetailsScreen} />
  <Stack.Screen name="TripDetails" component={TripDetailsScreen} />
  <Stack.Screen name="AlertDetails" component={AlertDetailsScreen} />
  <Stack.Screen name="DestinationDetails" component={DestinationDetailsScreen} />
  <Stack.Screen name="FuelLogDetails" component={FuelLogDetailsScreen} />
  <Stack.Screen name="FuelCalculator" component={FuelCalculatorScreen} />

  <Stack.Screen name="addFuelLogScreen" component={AddFuelLogScreen} />
  <Stack.Screen name="addSavedDestinationScreen" component={addSavedDestinationScreen} />
  <Stack.Screen name="AllDestinationsMapScreen" component={AllDestinationsMapScreen} />
  {/* 👆 Add these for Home navigation */}
    <Stack.Screen name="ChangeEmail" component={ChangeEmailScreen} />
  <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
  <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} />
  <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />

</Stack.Navigator>

  );
}
