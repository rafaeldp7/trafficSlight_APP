import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "../Screens/LoginScreen";
import RegisterScreen from "../Screens/RegisterScreen";
import IndexScreen from "../Screens/IndexScreen";
import VerifyOtpScreen from "../Screens/VerifyOtpScreen";
import ForgotPasswordScreen from "../Screens/ForgotPasswordScreen";
import ResetOtpScreen from "../Screens/ResetOtpScreen";
import NewPasswordScreen from "../Screens/NewPasswordScreen";


const Stack = createStackNavigator();

export default function SignedOutStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }} >
      <Stack.Screen name="Index" component={IndexScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetOtp" component={ResetOtpScreen} />
      <Stack.Screen name="NewPassword" component={NewPasswordScreen} />

    </Stack.Navigator>
  );
}
