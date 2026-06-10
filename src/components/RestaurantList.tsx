import { useTranslation } from 'react-i18next';
import { Listing, SortOption, DishStats } from '../types';
import RestaurantCard from './RestaurantCard';
import { ArrowUpDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMapUrl } from '../lib/utils';

interface RestaurantListProps {
  restaurants: Listing[];
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
  onAddReview: (restaurant: Listing) => void;
  onAddRestaurantClick: () => void;
  selectedDishes: string[];
  selectedCategory: 'food' | 'clothes';
  isFilterActive: boolean;
  customDish?: string;
  isLoading?: boolean;
}

function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-4 animate-pulse">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="h-6 bg-gray-200 rounded w-2/3" />
        <div className="flex items-center gap-1.5 mt-1">
          <div className="w-3 h-3 bg-gray-200 rounded-full" />
          <div className="h-3.5 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="h-3 bg-gray-100 rounded w-1/3 mt-0.5" />
      </div>

      {/* Stats Line */}
      <div className="flex justify-between items-center py-2.5 border-y border-gray-50">
        <div className="flex flex-col gap-1.5">
          <div className="h-3 bg-gray-100 rounded w-14" />
          <div className="h-5 bg-gray-200 rounded w-24" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="h-5 bg-gray-200 rounded w-12" />
          <div className="h-3 bg-gray-100 rounded w-10" />
        </div>
      </div>

      {/* Details / Popularity */}
      <div className="space-y-3">
        <div className="h-8 bg-gray-50 rounded-xl w-full" />
        <div className="flex flex-wrap gap-2 pt-1">
          <div className="h-5 bg-gray-100 rounded-full w-14" />
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-5 bg-gray-100 rounded-full w-16" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="h-4 bg-gray-100 rounded w-1/4" />
        <div className="flex items-center gap-2">
          <div className="h-9 bg-gray-200 rounded-xl w-24" />
          <div className="h-9 bg-gray-200 rounded-xl w-28" />
        </div>
      </div>
    </div>
  );
}

export default function RestaurantList({ 
  restaurants, 
  sortOption, 
  setSortOption, 
  onAddReview, 
  onAddRestaurantClick,
  selectedDishes, 
  selectedCategory,
  isFilterActive,
  customDish,
  isLoading = false
}: RestaurantListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const selectedDish = selectedDishes[0] || 'Osh';

  const getSortClarification = () => {
    let dishName = t(`dishes.${selectedDish.toLowerCase()}`, t(`clothes.${selectedDish.toLowerCase()}`, selectedDish));
    if (selectedDish === 'custom' && customDish) {
      dishName = customDish;
    }
    
    if (selectedDishes.length > 0 && selectedDish !== 'All') {
      return t(`sort_${sortOption}`, { dish: dishName });
    }
    
    return t(`sort_default_${selectedCategory}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            {selectedCategory === 'food' ? t('totalRestaurants') : t('totalShops')}
            <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full text-xs">
              {isLoading ? '...' : restaurants.length}
            </span>
          </h2>

          <div className="flex items-center gap-2">
            <ArrowUpDown size={16} className="text-gray-400" />
            <select 
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              className="bg-transparent text-xs font-bold text-gray-600 focus:outline-none cursor-pointer"
            >
              <option value="price_asc">{t('price_asc')}</option>
              <option value="price_desc">{t('price_desc')}</option>
              <option value="rating">{t('rating')}</option>
              <option value="distance">{t('distance')}</option>
            </select>
          </div>
        </div>
        
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
          {getSortClarification()}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <RestaurantCardSkeleton key={index} />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-gray-100 flex flex-col items-center gap-4">
          <div className="p-4 bg-gray-50 rounded-full">
            <ArrowUpDown size={32} className="text-gray-300" />
          </div>
          <div className="space-y-1">
            <p className="text-gray-900 font-black">
              {t('noResultsDetailed')}
            </p>
            <p className="text-sm text-gray-400 font-medium">
              {selectedCategory === 'food' ? t('noResults') : t('noResultsClothes')}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {restaurants.map(restaurant => {
            let dishStatsForSelected = restaurant.dishStats?.[selectedDish] || null;
            let activeMatchKey = selectedDish;

            // If it's a custom search, try to find a match in the restaurant's stats
            if (selectedDish === 'custom' && customDish && restaurant.dishStats) {
              const search = customDish.toLowerCase();
              const matchingKey = Object.keys(restaurant.dishStats).find(key => 
                key.toLowerCase() === search || 
                key.toLowerCase().includes(search) || 
                search.includes(key.toLowerCase())
              );
              
              if (matchingKey) {
                dishStatsForSelected = restaurant.dishStats[matchingKey];
                activeMatchKey = matchingKey;
              }
            }
            
            return (
              <RestaurantCard 
                key={restaurant.id} 
                restaurantId={restaurant.id!}
                name={restaurant.name}
                area={restaurant.address}
                workingHours={restaurant.working_hours}
                selectedDish={activeMatchKey === 'custom' && customDish ? customDish : activeMatchKey}
                dishStatsForSelected={dishStatsForSelected}
                allDishStats={Object.values(restaurant.dishStats || {})}
                category={selectedCategory}
                description={restaurant.description}
                isFilterActive={isFilterActive}
                onViewReviews={(id) => navigate(`/restaurants/${id}`)}
                onGetDirections={(id) => {
                  const url = getMapUrl(restaurant.latitude, restaurant.longitude, restaurant.name);
                  window.open(url, '_blank');
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
