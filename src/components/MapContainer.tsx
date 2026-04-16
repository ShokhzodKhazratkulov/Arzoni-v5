import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  InfoWindow, 
  useMap,
  Pin
} from '@vis.gl/react-google-maps';
import { useTranslation } from 'react-i18next';
import { Listing, DishStats } from '../types';
import { TASHKENT_CENTER, DISH_TYPES } from '../constants';
import { Navigation, Star, MapPin, Crosshair, Info, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import RestaurantDetailsModal from './RestaurantDetailsModal';
import DirectionsPicker from './DirectionsPicker';

interface MapPopupCardProps {
  restaurantName: string;
  address: string;
  openingHoursLabel?: string;
  selectedDish: string;
  dishStatsForSelected: DishStats | null;
  onOpenDetails: () => void;
  onOpenDirections: () => void;
  t: any;
}

function MapPopupCard({
  restaurantName,
  address,
  openingHoursLabel,
  selectedDish,
  dishStatsForSelected,
  onOpenDetails,
  onOpenDirections,
  t
}: MapPopupCardProps) {
  return (
    <div className="p-1 w-[280px] flex flex-col gap-2">
      <div className="pr-6">
        <div 
          className="font-black text-sm text-gray-900 cursor-pointer hover:text-[#1D9E75] transition-colors leading-tight line-clamp-1"
          onClick={onOpenDetails}
        >
          {restaurantName}
        </div>
        <div className="text-[10px] text-gray-400 font-bold line-clamp-1 mt-0.5">{address}</div>
      </div>

      {openingHoursLabel && (
        <div className="text-[9px] text-gray-500 font-medium">
          {t('workingHours')}: {openingHoursLabel}
        </div>
      )}

      {dishStatsForSelected ? (
        <div className="space-y-1 py-1.5 border-y border-gray-50">
          <div className="flex justify-between items-baseline gap-2">
            <div className="text-[11px] font-black text-[#1D9E75] whitespace-nowrap">
              {t(`dishes.${selectedDish.toLowerCase()}`, t(`clothes.${selectedDish.toLowerCase()}`, selectedDish))}:{' '}
              {dishStatsForSelected.avgPrice.toLocaleString()} {t('som')}
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold text-gray-700 whitespace-nowrap">
              <Star size={10} className="text-yellow-400 fill-yellow-400" />
              {dishStatsForSelected.avgRating.toFixed(1)} ({dishStatsForSelected.reviewCount})
            </div>
          </div>
          <div className="text-[9px] font-bold text-gray-400">
            {Math.round(dishStatsForSelected.popularity * 100)}% {t('popularity')}
          </div>
        </div>
      ) : (
        <div className="py-1.5 border-y border-gray-50 text-[10px] text-gray-500 font-bold italic">
          Hozircha {t(`dishes.${selectedDish.toLowerCase()}`, t(`clothes.${selectedDish.toLowerCase()}`, selectedDish))} bo‘yicha sharhlar yoʻq.
        </div>
      )}

      <div className="flex items-center gap-2 mt-0.5">
        <button 
          onClick={onOpenDetails}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-[10px] font-black text-[#1D9E75] border-2 border-[#1D9E75] rounded-lg hover:bg-[#1D9E75] hover:text-white transition-all"
        >
          <MessageSquare size={10} />
          {t('reviews')}
        </button>
        <button 
          onClick={onOpenDirections}
          className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-[#1D9E75] text-white rounded-lg text-[10px] font-black shadow-md hover:bg-[#168a65] transition-all border-2 border-[#1D9E75]"
        >
          <Navigation size={10} />
          {t('getDirections')}
        </button>
      </div>
    </div>
  );
}

interface MapContainerProps {
  restaurants: Listing[];
  onAddRestaurant: () => void;
  selectedDishes?: string[];
  customDish?: string;
  selectedCategory: 'food' | 'clothes';
}

const MapContent = ({ restaurants, onAddRestaurant, selectedDishes = [], customDish, selectedCategory }: MapContainerProps) => {
  const { t } = useTranslation();
  const map = useMap();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<google.maps.LatLngLiteral | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDirectionsOpen, setIsDirectionsOpen] = useState(false);

  const selectedRestaurant = restaurants.find(r => r.id === selectedId);

  // Calculate info for selected restaurant
  const activeDishId = useMemo(() => {
    if (!selectedRestaurant || selectedDishes.length === 0) return null;
    
    if (selectedDishes.includes('custom') && customDish) {
      const normalizedSearch = customDish.toLowerCase();
      const matchingKey = Object.keys(selectedRestaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedSearch);
      return matchingKey || customDish;
    }
    
    return selectedDishes.find(id => selectedRestaurant.dishStats?.[id]?.reviewCount) || selectedDishes[0];
  }, [selectedRestaurant, selectedDishes, customDish]);

  const displayPrice = selectedRestaurant 
    ? (activeDishId && selectedRestaurant.dishStats?.[activeDishId] 
        ? selectedRestaurant.dishStats[activeDishId].avgPrice 
        : (selectedRestaurant.avg_price || 0))
    : 0;

  const displayDescription = selectedRestaurant
    ? (activeDishId && selectedRestaurant.dishStats?.[activeDishId]
        ? `${selectedRestaurant.dishStats[activeDishId].reviewCount} reviews`
        : selectedRestaurant.description || '')
    : '';

  const isReview = !!(selectedRestaurant && activeDishId && selectedRestaurant.dishStats?.[activeDishId]?.reviewCount);

  const handleFindMe = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(pos);
          map?.panTo(pos);
          map?.setZoom(15);
        },
        () => {
          console.error("Error: The Geolocation service failed.");
        }
      );
    }
  }, [map]);

  const getPinColor = (price: number) => {
    if (selectedCategory === 'clothes') {
      if (price < 100000) return '#1D9E75'; // Green
      if (price <= 170000) return '#F59E0B'; // Amber
      return '#EF4444'; // Red
    }
    if (price < 40000) return '#1D9E75'; // Green
    if (price <= 70000) return '#F59E0B'; // Amber
    return '#EF4444'; // Red
  };

  return (
    <div className="relative w-full h-[400px] sm:h-[500px] rounded-2xl overflow-hidden shadow-inner border border-gray-100">
      <Map
        defaultCenter={TASHKENT_CENTER}
        defaultZoom={13}
        mapId="ARZONI_MAP_ID"
        disableDefaultUI={true}
        zoomControl={true}
        gestureHandling={'greedy'}
      >
        {restaurants.map((restaurant) => {
          // Find the most relevant dish to display info for (same logic as RestaurantCard)
          const activeDishId = (() => {
            if (selectedDishes.length === 0) return null;
            
            if (selectedDishes.includes('custom') && customDish) {
              const normalizedSearch = customDish.toLowerCase();
              const matchingKey = Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedSearch);
              return matchingKey || customDish;
            }
            
            // Find the first selected dish that has a comment, or just the first selected dish
            // We also need to handle case-insensitivity here for consistency
            const foundId = selectedDishes.find(id => {
              const normalizedId = id.toLowerCase();
              const matchingKey = Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedId);
              return matchingKey && restaurant.dishStats[matchingKey]?.reviewCount;
            });

            if (foundId) {
              const normalizedId = foundId.toLowerCase();
              return Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedId) || foundId;
            }

            const firstId = selectedDishes[0];
            const normalizedFirstId = firstId.toLowerCase();
            return Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === normalizedFirstId) || firstId;
          })();

          const displayPrice = activeDishId && restaurant.dishStats?.[activeDishId] 
            ? restaurant.dishStats[activeDishId].avgPrice 
            : (restaurant.avg_price || 0);

          const dishStats = activeDishId && restaurant.dishStats?.[activeDishId];
          const rating = dishStats ? dishStats.avgRating : (restaurant.totalAvgRating || 0);
          const reviewCount = dishStats ? dishStats.reviewCount : (restaurant.totalReviewCount || 0);
          const shortPrice = displayPrice >= 1000 ? `${Math.round(displayPrice / 1000)}k` : displayPrice;
          const dishLabel = activeDishId ? t(`dishes.${activeDishId.toLowerCase()}`, t(`clothes.${activeDishId.toLowerCase()}`, activeDishId)) : '';

          return (
            <AdvancedMarker
              key={restaurant.id}
              position={{ lat: restaurant.latitude, lng: restaurant.longitude }}
              onClick={() => setSelectedId(restaurant.id || null)}
            >
              <div className="relative group">
                <Pin 
                  background={getPinColor(displayPrice)} 
                  borderColor={'#ffffff'} 
                  glyphColor={'#ffffff'}
                  scale={1.2}
                />
                {/* Short info badge above pin */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-white px-2 py-0.5 rounded-full shadow-md border border-gray-100 whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-[9px] font-black text-gray-800">
                    {shortPrice} {dishLabel ? `(${dishLabel})` : ''}
                  </p>
                </div>
              </div>
            </AdvancedMarker>
          );
        })}

        {userLocation && (
          <AdvancedMarker position={userLocation}>
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg animate-pulse" />
          </AdvancedMarker>
        )}

        {selectedRestaurant && (
          <InfoWindow
            position={{ lat: selectedRestaurant.latitude, lng: selectedRestaurant.longitude }}
            onCloseClick={() => setSelectedId(null)}
          >
            <MapPopupCard 
              restaurantName={selectedRestaurant.name}
              address={selectedRestaurant.address}
              openingHoursLabel={selectedRestaurant.working_hours}
              selectedDish={selectedDishes[0] || (selectedCategory === 'food' ? 'Osh' : 'T-shirt')}
              dishStatsForSelected={selectedRestaurant.dishStats?.[selectedDishes[0] || (selectedCategory === 'food' ? 'Osh' : 'T-shirt')] || null}
              onOpenDetails={() => setIsDetailsOpen(true)}
              onOpenDirections={() => {
                if (selectedRestaurant) {
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  if (isIOS) {
                    setIsDirectionsOpen(true);
                  } else {
                    const url = `geo:${selectedRestaurant.latitude},${selectedRestaurant.longitude}?q=${selectedRestaurant.latitude},${selectedRestaurant.longitude}(${encodeURIComponent(selectedRestaurant.name)})`;
                    window.location.href = url;
                  }
                }
              }}
              t={t}
            />
          </InfoWindow>
        )}
      </Map>

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2" style={{ marginRight: '-12px', marginTop: '222px' }}>
        <button
          onClick={handleFindMe}
          className="p-3 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-all text-[#1D9E75] border border-gray-100"
          title={selectedCategory === 'food' ? t('findNearMe') : t('findNearMeClothes')}
        >
          <Crosshair size={20} />
        </button>
      </div>

      {selectedRestaurant && (
        <RestaurantDetailsModal 
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          restaurant={selectedRestaurant}
          selectedDishes={selectedDishes}
          customDish={customDish}
          selectedCategory={selectedCategory}
        />
      )}

      {selectedRestaurant && (
        <DirectionsPicker 
          isOpen={isDirectionsOpen}
          onClose={() => setIsDirectionsOpen(false)}
          location={{ lat: selectedRestaurant.latitude, lng: selectedRestaurant.longitude }}
          name={selectedRestaurant.name}
        />
      )}
    </div>
  );
};

export default function MapContainer(props: MapContainerProps) {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey}>
      <MapContent {...props} />
    </APIProvider>
  );
}
