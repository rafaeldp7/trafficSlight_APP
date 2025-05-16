import { GOOGLE_MAPS_API_KEY } from "@env";

export const getNewRoute = async (origin, destination) => {
  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}`
    );
    const data = await response.json();

    if (data.routes.length > 0) {
      return data.routes[0].overview_polyline.points;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error fetching new route:", error);
    return null;
  }
};
