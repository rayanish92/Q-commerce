// Get nearby products within 10km (10000 meters)
router.get('/nearby-products', async (req, res) => {
  const { lng, lat } = req.query;
  const nearbyRetailers = await User.find({
    role: 'retailer',
    location: {
      $near: {
        $geometry: { type: "Point", coordinates: [parseFloat(lng), parseFloat(lat)] },
        $maxDistance: 10000 
      }
    }
  });
  // Logic to aggregate products from these specific retailers...
});
