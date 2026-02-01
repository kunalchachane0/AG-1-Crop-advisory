
import { REGIONS } from '../constants';
import { Region } from '../types';

// Map lat/lng to pre-bundled region bounding boxes (Offline)
export const getOfflineRegion = (lat: number, lng: number): Region | null => {
  for (const region of REGIONS) {
    const { minLat, maxLat, minLng, maxLng } = region.bounds;
    if (lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng) {
      return region;
    }
  }
  return null;
};

// Geolocation wrapper
export const detectCurrentLocation = (): Promise<{ lat: number, lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { timeout: 10000, enableHighAccuracy: false } // Coarse location for region detection
    );
  });
};
