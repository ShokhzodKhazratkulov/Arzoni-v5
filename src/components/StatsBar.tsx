import { useTranslation } from 'react-i18next';
import { Listing } from '../types';

interface StatsBarProps {
  restaurants: Listing[];
  selectedCategory: 'food' | 'clothes';
}

export default function StatsBar({ restaurants, selectedCategory }: StatsBarProps) {
  const { t } = useTranslation();

  const totalCount = restaurants.length;
  const cheapestPrice = restaurants.length > 0 
    ? Math.min(...restaurants.map(r => r.avg_price || 0)) 
    : 0;

  return (
    <div className={selectedCategory === 'food' ? "bg-[#1D9E75]/5 px-4 py-2 border-b border-[#1D9E75]/10" : "bg-blue-500/5 px-4 py-2 border-b border-blue-500/10"}>
      <div className={`max-w-7xl mx-auto flex flex-wrap justify-between gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider ${selectedCategory === 'food' ? 'text-[#1D9E75]' : 'text-blue-500'}`}>
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">
            {selectedCategory === 'food' ? t('totalRestaurants') : t('totalShops')}:
          </span>
          <span className="text-gray-900">{totalCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="opacity-60">
            {selectedCategory === 'food' ? t('cheapestMeal') : t('cheapestClothes')}:
          </span>
          <span className={`font-black ${(() => {
            if (selectedCategory === 'clothes') {
              if (cheapestPrice < 100000) return 'text-green-600';
              if (cheapestPrice <= 170000) return 'text-amber-600';
              return 'text-red-600';
            }
            if (cheapestPrice < 40000) return 'text-green-600';
            if (cheapestPrice <= 70000) return 'text-amber-600';
            return 'text-red-600';
          })()}`}>
            {cheapestPrice.toLocaleString()} {t('som')}
          </span>
        </div>
      </div>
    </div>
  );
}
