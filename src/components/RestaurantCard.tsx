import { Star, MapPin, Navigation, MessageSquare, Quote } from 'lucide-react';
import { DishStats } from '../types';
import { useTranslation } from 'react-i18next';
import { getMapUrl } from '../lib/utils';

type RestaurantCardProps = {
  restaurantId: string;
  name: string;
  area: string;          // "Iftikhor street, Tashkent"
  selectedDish: string;  // "Osh"
  dishStatsForSelected: DishStats | null;
  allDishStats: DishStats[];
  distanceKm?: number;
  durationMin?: number;
  workingHours?: string;
  category: 'food' | 'clothes';
  description?: string;
  isFilterActive: boolean;
  onViewReviews?: (id: string) => void;
  onGetDirections?: (id: string) => void;
};

export default function RestaurantCard({
  restaurantId,
  name,
  area,
  selectedDish,
  dishStatsForSelected,
  allDishStats,
  distanceKm,
  durationMin,
  workingHours,
  category,
  description,
  isFilterActive,
  onViewReviews,
  onGetDirections,
}: RestaurantCardProps) {
  const { t } = useTranslation();
  const popularityPercent = dishStatsForSelected ? Math.round(dishStatsForSelected.popularity * 100) : 0;
  const isLowReviewCount = dishStatsForSelected?.reviewCount === 1;

  const getDishLabel = (dish: string) => {
    if (dish === 'All') {
      return category === 'food' ? t('allDishes') : t('allClothes');
    }
    return t(`dishes.${dish.toLowerCase()}`, t(`clothes.${dish.toLowerCase()}`, dish));
  };

  return (
    <div className={`bg-white rounded-2xl border transition-all p-5 flex flex-col gap-4 ${
      isLowReviewCount ? 'border-gray-100 opacity-90' : 'border-gray-100 shadow-sm hover:shadow-md'
    }`}>
      {/* Header */}
      <div className="flex flex-col">
        <h3 className={`font-black text-gray-900 leading-tight ${isLowReviewCount ? 'text-lg' : 'text-xl'}`}>{name}</h3>
        <div className="flex items-center gap-1.5 text-gray-400 text-xs mt-1">
          <MapPin size={12} className="text-[#1D9E75]" />
          <span className="line-clamp-1">{area}</span>
        </div>
        {workingHours && (
          <p className="text-[12px] text-[#6b7280] mt-0.5">
            {t('workingHours')}: {workingHours}
          </p>
        )}
      </div>

      {/* Main Stats Line */}
      {dishStatsForSelected ? (
        <div className="flex justify-between items-center py-2 border-y border-gray-50">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              {t('formPrice')} ({getDishLabel(selectedDish)})
            </span>
            <span className={`font-black text-[#1D9E75] ${isLowReviewCount ? 'text-base' : 'text-lg'}`}>
              {dishStatsForSelected.avgPrice.toLocaleString()} {t('som')}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1">
              <Star size={16} className="text-yellow-400 fill-yellow-400" />
              <span className={`font-black text-gray-900 ${isLowReviewCount ? 'text-base' : 'text-lg'}`}>
                {dishStatsForSelected.avgRating.toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] font-bold text-gray-400">
              ({dishStatsForSelected.reviewCount} {t('reviewsCount')})
            </span>
          </div>
        </div>
      ) : (
        <div className="py-3 border-y border-gray-50">
          {!isFilterActive && description ? (
            <p className="text-xs text-gray-500 font-medium line-clamp-2">
              {description}
            </p>
          ) : (
            <p className="text-xs text-gray-500 font-bold italic">
              {t('noReviewsHint')}
            </p>
          )}
        </div>
      )}

      {/* Popularity Line & Warning */}
      <div className="space-y-2">
        {dishStatsForSelected && (
          <div className="bg-gray-50 rounded-xl px-3 py-2">
            <p className="text-xs font-medium text-gray-600">
              <span className="font-black text-[#1D9E75]">{popularityPercent}%</span> {t('popularity')} <span className="font-black">{getDishLabel(selectedDish)}</span>
            </p>
          </div>
        )}
        
        {isLowReviewCount && (
          <p className="text-[10px] text-gray-400 italic px-1">
            {t('lowReviewWarning')}
          </p>
        )}

        {dishStatsForSelected?.bestComment && (
          <div className="bg-green-50/50 p-3 rounded-xl border border-green-100/50 relative">
            <Quote size={12} className="text-[#1D9E75] opacity-20 absolute top-2 left-2" />
            <p className="text-[11px] text-gray-600 italic line-clamp-2 pl-4">
              "{dishStatsForSelected.bestComment}"
            </p>
          </div>
        )}

        {/* Dish Chips - Now on its own line below popularity */}
        <div className="flex flex-wrap gap-2 pt-1">
          {allDishStats.map((stats) => (
            <span
              key={stats.name}
              className={`px-3 py-1 rounded-full text-[10px] font-black transition-colors ${
                stats.name === selectedDish
                  ? 'bg-[#1D9E75] text-white shadow-sm'
                  : 'bg-white border border-gray-100 text-gray-500'
              }`}
            >
              {getDishLabel(stats.name)}
            </span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-2">
        <div className="flex items-center gap-2 text-gray-400 text-xs font-bold">
          {distanceKm !== undefined && (
            <>
              <span>{distanceKm} km</span>
              <span>·</span>
              <span>{durationMin} min</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewReviews?.(restaurantId)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-black text-[#1D9E75] border-2 border-[#1D9E75] rounded-xl hover:bg-[#1D9E75] hover:text-white transition-all"
          >
            <MessageSquare size={14} />
            {t('reviews')}
          </button>
          <button
            onClick={() => onGetDirections?.(restaurantId)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#1D9E75] text-white rounded-xl text-xs font-black shadow-md hover:bg-[#168a65] transition-all border-2 border-[#1D9E75]"
          >
            <Navigation size={14} />
            {t('getDirections')}
          </button>
        </div>
      </div>
    </div>
  );
}
