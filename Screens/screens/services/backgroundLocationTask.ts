
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCATION_TASK = "background-location-task";

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return console.error("❌ BG Task Error", error);

  const { locations } = data;
  if (!locations || locations.length === 0) return;

  try {
    const stored = await AsyncStorage.getItem("tripPath");
    const currentPath = stored ? JSON.parse(stored) : [];
    const updatedPath = [...currentPath, {
      latitude: locations[0].coords.latitude,
      longitude: locations[0].coords.longitude,
    }];
    await AsyncStorage.setItem("tripPath", JSON.stringify(updatedPath));
    console.log("📍 BG Location Saved", updatedPath.length);
  } catch (err) {
    console.error("🔴 Failed to save BG path:", err);
  }
});


export { LOCATION_TASK };
