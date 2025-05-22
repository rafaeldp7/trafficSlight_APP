import React, { createContext, useState, useEffect, useContext } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Optional loading state

  useEffect(() => {
    const loadUser = async () => {
      try {
        console.log("Loading user from AsyncStorage...");
        const storedUser = await AsyncStorage.getItem("user");
        console.log("Stored user raw data:", storedUser);
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log("Parsed user data:", parsedUser);
          setUser(parsedUser);
        } else {
          console.log("No user found in storage");
        }
      } catch (error) {
        console.error("Error loading user:", error);
      }
      setLoading(false);
    };
    loadUser();
  }, []);

  const saveUser = async (userData) => {
    try {
      await AsyncStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error("Failed to save user:", error);
    }
  };

  const clearUser = async () => {
    try {
      await AsyncStorage.removeItem("user");
      setUser(null);
    } catch (error) {
      console.error("Failed to clear user:", error);
    }
  };

  return (
    <UserContext.Provider value={{ user, saveUser, clearUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook for easy access
export const useUser = () => useContext(UserContext);
