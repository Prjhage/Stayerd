let apiKey = mapToken;

let lat = 28.6139;
let lng = 77.209;

if (listing.geometry && listing.geometry.coordinates) {
  lng = listing.geometry.coordinates[0];
  lat = listing.geometry.coordinates[1];
}

const map = L.map("map").setView([lat, lng], 13);

L.tileLayer(
  `https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${apiKey}`,
  {
    attribution: "&copy; MapTiler",
  },
).addTo(map);

const marker = L.marker([lat, lng]).addTo(map);

// Show hotel title/name in popup, fallback to location if not found
const popupContent = listing.title || listing.location;
marker.bindPopup(`<b>${popupContent}</b>`);

marker.on("click", () => {
  const googleMapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
  window.open(googleMapUrl, "_blank");
});
