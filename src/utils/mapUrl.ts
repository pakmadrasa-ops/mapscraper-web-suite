import type { PlaceResult } from '../types/scraper';

/**
 * Generates or extracts a reliable, direct Google Maps link for a place.
 * Ensures the link always opens the exact location on Google Maps without errors.
 */
export function getGoogleMapsUrl(place: Partial<PlaceResult> & { link?: string }): string {
  if (place.googleMapsUrl && place.googleMapsUrl.startsWith('http')) {
    return place.googleMapsUrl;
  }

  if (place.link && place.link.startsWith('http')) {
    return place.link;
  }

  if (place.cid) {
    return `https://maps.google.com/?cid=${place.cid}`;
  }

  if (place.placeId) {
    const query = encodeURIComponent(place.title || '');
    return `https://www.google.com/maps/search/?api=1&query=${query}&query_place_id=${place.placeId}`;
  }

  if (typeof place.latitude === 'number' && typeof place.longitude === 'number' && (place.latitude !== 0 || place.longitude !== 0)) {
    return `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
  }

  if (place.title || place.address) {
    const fullQuery = [place.title, place.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullQuery)}`;
  }

  return 'https://www.google.com/maps';
}
