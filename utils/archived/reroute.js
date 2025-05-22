import haversine from "haversine"; // Para sa distance calculation

// Function para i-check kung lumihis ang user sa original route
export const checkReroute = (currentLocation, originalRoute, threshold = 50) => {
  if (!currentLocation || originalRoute.length === 0) return false;

  // Hanapin ang pinakamalapit na point sa originalRoute
  let nearestDistance = Infinity;
  for (let point of originalRoute) {
    let distance = haversine(currentLocation, point, { unit: "meter" });
    if (distance < nearestDistance) {
      nearestDistance = distance;
    }
  }

  // Kapag mas malayo sa threshold, ibig sabihin nag-reroute
  return nearestDistance > threshold;
};
