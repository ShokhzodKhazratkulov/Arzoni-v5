import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';
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
  customDish?: string;
  selectedCategory: 'food' | 'clothes';
  isFilterActive: boolean;
}

export default function RestaurantList({ 
  restaurants, 
  sortOption, 
  setSortOption, 
  onAddReview, 
  onAddRestaurantClick,
  selectedDishes, 
  customDish,
  selectedCategory,
  isFilterActive
}: RestaurantListProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const activeDishId = useMemo(() => {
    const firstDish = selectedDishes && selectedDishes[0];
    if (firstDish === 'custom' && customDish) {
      return customDish;
    }
    return firstDish || (selectedCategory === 'food' ? 'Osh' : 'T-shirt');
  }, [selectedDishes, customDish, selectedCategory]);

  const getDishLabel = (dishId: string) => {
    if (!dishId) return '';
    if (dishId === 'All') return selectedCategory === 'food' ? t('allDishes') : t('allClothes');
    const isCustom = selectedDishes[0] === 'custom';
    if (isCustom) return dishId;
    const lowerId = String(dishId).toLowerCase();
    return t(`dishes.${lowerId}`, t(`clothes.${lowerId}`, String(dishId)));
  };

  const getSortClarification = () => {
    const dishName = getDishLabel(activeDishId);
    
    if (selectedDishes.length > 0 && selectedDishes[0] !== 'All') {
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
              {restaurants.length}
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

      {restaurants.length === 0 ? (
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
            // Logic to find matching key case-insensitively for custom dish
            const searchDish = String(activeDishId).toLowerCase();
            const matchingKey = Object.keys(restaurant.dishStats || {}).find(k => k.toLowerCase() === searchDish);
            const dishStatsForSelected = matchingKey ? restaurant.dishStats?.[matchingKey] : null;
            
            return (
              <RestaurantCard 
                key={restaurant.id} 
                restaurantId={restaurant.id!}
                name={restaurant.name}
                area={restaurant.address}
                workingHours={restaurant.working_hours}
                selectedDish={activeDishId}
                dishStatsForSelected={dishStatsForSelected || null}
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
