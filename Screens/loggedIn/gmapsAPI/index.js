import axios from 'axios';
import { GOOGLE_MAPS_API_KEY } from '@env';

const GOOGLE_API_BASE = 'https://maps.googleapis.com/maps/api';

/**
 * Geocode an address to coordinates
 */
export async function geocodeAddress(address) {
  const url = `${GOOGLE_API_BASE}/geocode/json`;
  const params = { address, key: GOOGLE_MAPS_API_KEY };
  const res = await axios.get(url, { params });
  const result = res.data.results[0];
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    address: result.formatted_address,
  };
}

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(coords) {
  const url = `${GOOGLE_API_BASE}/geocode/json`;
  const params = { latlng: `${coords.lat},${coords.lng}`, key: GOOGLE_MAPS_API_KEY };
  const res = await axios.get(url, { params });
  return res.data.results[0].formatted_address;
}

/**
 * Get directions between two points
 */
export async function getDirections(origin, destination, mode = 'driving') {
  const url = `${GOOGLE_API_BASE}/directions/json`;
  const params = {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    mode,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  const leg = res.data.routes[0].legs[0];
  return {
    distance: leg.distance.text,
    duration: leg.duration.text,
    polyline: res.data.routes[0].overview_polyline.points,
  };
}

/**
 * Get ETA and traffic info
 */
export async function getETAWithTraffic(origin, destination, mode = 'driving') {
  const url = `${GOOGLE_API_BASE}/distancematrix/json`;
  const params = {
    origins: `${origin.lat},${origin.lng}`,
    destinations: `${destination.lat},${destination.lng}`,
    mode,
    departure_time: 'now',
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  const info = res.data.rows[0].elements[0];
  return {
    distance: info.distance.text,
    duration: info.duration.text,
    durationInTraffic: info.duration_in_traffic?.text || info.duration.text,
  };
}

/**
 * Autocomplete places
 */
export async function getAutocompleteSuggestions(input) {
  const url = `${GOOGLE_API_BASE}/place/autocomplete/json`;
  const params = {
    input,
    key: GOOGLE_MAPS_API_KEY,
    components: 'country:ph',
  };
  const res = await axios.get(url, { params });
  return res.data.predictions.map(item => ({
    description: item.description,
    place_id: item.place_id,
  }));
}

/**
 * Get place details by place ID
 */
export async function getPlaceDetails(placeId) {
  const url = `${GOOGLE_API_BASE}/place/details/json`;
  const params = { place_id: placeId, key: GOOGLE_MAPS_API_KEY };
  const res = await axios.get(url, { params });
  const result = res.data.result;
  return {
    lat: result.geometry.location.lat,
    lng: result.geometry.location.lng,
    address: result.formatted_address,
  };
}

/**
 * Snap path to nearest roads
 */
export async function snapToRoads(path) {
  const url = `https://roads.googleapis.com/v1/snapToRoads`;
  const params = {
    path: path.map(p => `${p.lat},${p.lng}`).join('|'),
    interpolate: true,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  return res.data.snappedPoints.map(pt => ({
    lat: pt.location.latitude,
    lng: pt.location.longitude,
  }));
}

/**
 * Get nearby places of a specific type
 */
export async function getNearbyPlaces({ location, radius = 1500, type = 'recycling_center' }) {
  const url = `${GOOGLE_API_BASE}/place/nearbysearch/json`;
  const params = {
    location: `${location.lat},${location.lng}`,
    radius,
    type,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  return res.data.results;
}

/**
 * Get optimized directions with waypoints
 */
export async function getOptimizedRoute({ origin, destination, waypoints = [] }) {
  const waypointsStr = waypoints.map(w => `${w.lat},${w.lng}`).join('|');
  const url = `${GOOGLE_API_BASE}/directions/json`;
  const params = {
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    waypoints: `optimize:true|${waypointsStr}`,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  return res.data;
}

/**
 * Get elevation data for points
 */
export async function getElevation({ path }) {
  const pathStr = path.map(p => `${p.lat},${p.lng}`).join('|');
  const url = `${GOOGLE_API_BASE}/elevation/json`;
  const params = {
    locations: pathStr,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  return res.data.results;
}

/**
 * Get place photo URL
 */
export function getPlacePhotoUrl(photoReference, maxWidth = 400) {
  return `${GOOGLE_API_BASE}/place/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
}

/**
 * Get timezone info
 */
export async function getTimezone({ location, timestamp = Math.floor(Date.now() / 1000) }) {
  const url = `${GOOGLE_API_BASE}/timezone/json`;
  const params = {
    location: `${location.lat},${location.lng}`,
    timestamp,
    key: GOOGLE_MAPS_API_KEY,
  };
  const res = await axios.get(url, { params });
  return res.data;
}

/**
 * Generate static map image
 */
export function getStaticMapUrl({ center, zoom = 14, size = '600x300', markers = [] }) {
  const markersStr = markers.map(m => `${m.lat},${m.lng}`).join('|');
  return `${GOOGLE_API_BASE}/staticmap?center=${center.lat},${center.lng}&zoom=${zoom}&size=${size}&markers=${markersStr}&key=${GOOGLE_MAPS_API_KEY}`;
}
