export function buildGoogleMapsLocationUrl(lat: number, lng: number) {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

export function buildGoogleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
}
