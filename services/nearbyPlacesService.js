const axios = require("axios");

module.exports.getNearbyPlaces = async (lat, lng) => {
  try {
    const query = `
      [out:json][timeout:45];
      (
        node(around:3000,${lat},${lng})[amenity];
        node(around:3000,${lat},${lng})[shop];
        node(around:3000,${lat},${lng})[tourism];
        node(around:3000,${lat},${lng})[leisure];
      );
      out body 30;
    `;

    const url = "https://overpass-api.de/api/interpreter";

    const response = await axios.post(
      url,
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    console.log("Overpass results count:", response.data.elements.length);

    if (!response.data.elements || response.data.elements.length === 0) {
      return [];
    }

    return response.data.elements
      .filter((el) => el.tags && el.tags.name)
      .map((el) => ({
        name: el.tags.name,
        type:
          el.tags.amenity ||
          el.tags.shop ||
          el.tags.tourism ||
          el.tags.leisure ||
          "place",
        lat: el.lat,
        lng: el.lon,
      }))
      .slice(0, 10);
  } catch (err) {
    console.error("Overpass API Error:", err.message);
    return [];
  }
};
