const computeFuelEfficiency = async (motorId, distance, fuelUsed) => {
    if (!distance || !fuelUsed) return null;
    const efficiency = distance / fuelUsed;
    
    // Update motor fuel efficiency
    await Motor.findByIdAndUpdate(motorId, {
      $set: { fuelEfficiency: efficiency },
      $push: { fuelEfficiencyHistory: { distance, fuelUsed, efficiency } }
    });
  
    return efficiency;
  };
  