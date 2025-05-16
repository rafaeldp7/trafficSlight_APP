import axios from "axios";
import { GOOGLE_MAPS_API_KEY } from "@env";

// Decode polyline function (para sa route coordinates)
const decodePolyline = (encoded) => {
  let points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
};

// ✅ Unified getDirections function
export const getDirections = async (start, end) => {
  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${start.latitude},${start.longitude}&destination=${end.latitude},${end.longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(url);
    if (response.data.routes.length) {
      const points = response.data.routes[0].overview_polyline.points;
      const coordinates = decodePolyline(points);
      const distanceInMeters = response.data.routes[0].legs[0].distance.value;
      const distanceInKm = distanceInMeters / 1000;

      return { distance: distanceInKm, coordinates };
    }
  } catch (error) {
    console.error("Error fetching directions:", error);
    return null;
  }
};

// ✅ Function to get nearby gas stations
export const getNearbyGasStations = async (latitude, longitude) => {
  try {
    const response = await axios.get(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=7000&type=gas_station&key=${GOOGLE_MAPS_API_KEY}`
    );
    return response.data.results;
  } catch (error) {
    console.error("Error fetching gas stations:", error);
    return [];
  }
};
