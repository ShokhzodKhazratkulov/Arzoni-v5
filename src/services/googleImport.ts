import { Listing, ListingType } from '../types';
import { createListing } from './listings';

const GOOGLE_MAPS_API_KEY = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY;

export interface ImportStats {
  totalFound: number;
  totalImported: number;
  totalSkipped: number;
  errors: string[];
}

// Tashkent Grid Points for Search
const TASHKENT_GRID = [
  { lat: 41.3111, lng: 69.2797 }, // Center
  { lat: 41.3411, lng: 69.2797 }, // North
  { lat: 41.2811, lng: 69.2797 }, // South
  { lat: 41.3111, lng: 69.3197 }, // East
  { lat: 41.3111, lng: 69.2397 }, // West
  { lat: 41.3411, lng: 69.3197 }, // North-East
  { lat: 41.3411, lng: 69.2397 }, // North-West
  { lat: 41.2811, lng: 69.3197 }, // South-East
  { lat: 41.2811, lng: 69.2397 }, // South-West
];

export async function importFromGoogle(
  type: ListingType, 
  onProgress: (stats: ImportStats) => void
) {
  const stats: ImportStats = {
    totalFound: 0,
    totalImported: 0,
    totalSkipped: 0,
    errors: []
  };

  const queryType = type === 'food' ? 'restaurant' : 'clothing_store';
  
  // We need to use the Google Maps JavaScript API PlacesService.
  // This requires the 'google' object and 'places' library to be available.
  if (!(window as any).google || !(window as any).google.maps || !(window as any).google.maps.places) {
    throw new Error('Google Maps Places library not loaded. Please ensure the API is fully initialized with the "places" library.');
  }

  const service = new (window as any).google.maps.places.PlacesService(document.createElement('div'));

  for (const center of TASHKENT_GRID) {
    try {
      const results = await new Promise<any[]>((resolve, reject) => {
        service.nearbySearch(
          {
            location: center,
            radius: 3000,
            type: queryType
          },
          (results: any[], status: any) => {
            if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
              resolve(results);
            } else if (status === (window as any).google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              resolve([]);
            } else {
              reject(new Error(`Places API error: ${status}`));
            }
          }
        );
      });

      stats.totalFound += results.length;
      onProgress({ ...stats });

      for (const place of results) {
        try {
          // Get full details for each place
          const details = await new Promise<any>((resolve, reject) => {
            service.getDetails(
              {
                placeId: place.place_id,
                fields: [
                  'name', 
                  'formatted_address', 
                  'geometry', 
                  'opening_hours', 
                  'formatted_phone_number', 
                  'website', 
                  'photos', 
                  'editorial_summary',
                  'url'
                ]
              },
              (result: any, status: any) => {
                if (status === (window as any).google.maps.places.PlacesServiceStatus.OK) {
                  resolve(result);
                } else {
                  reject(new Error(`Details API error: ${status}`));
                }
              }
            );
          });

          const photoUrl = details.photos && details.photos.length > 0 
            ? details.photos[0].getUrl({ maxWidth: 800 }) 
            : null;

          const listing: Partial<Listing> = {
            name: details.name,
            type: type,
            address: details.formatted_address,
            latitude: details.geometry.location.lat(),
            longitude: details.geometry.location.lng(),
            working_hours: details.opening_hours?.weekday_text?.join(', '),
            phone: details.formatted_phone_number,
            social_link: details.website,
            google_maps_url: details.url,
            google_place_id: place.place_id,
            description: details.editorial_summary?.overview || '',
            photo_url: photoUrl || '',
            photo_urls: details.photos?.slice(0, 5).map((p: any) => p.getUrl({ maxWidth: 800 })) || [],
            is_active: true,
            is_sponsored: false,
            is_verified: false,
            dishes: []
          };

          await createListing(listing);
          stats.totalImported++;
        } catch (err: any) {
          if (err.message?.includes('duplicate key')) {
            stats.totalSkipped++;
          } else {
            console.error(`Error importing place ${place.name}:`, err);
            stats.errors.push(`${place.name}: ${err.message}`);
          }
        }
        onProgress({ ...stats });
      }
    } catch (err: any) {
      console.error('Error in grid search point:', err);
      stats.errors.push(`Grid point ${center.lat}, ${center.lng}: ${err.message}`);
      onProgress({ ...stats });
    }
  }

  return stats;
}
