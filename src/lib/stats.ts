import { Review, DishStats } from '../types';

export function computeDishStats(reviews: Review[]): DishStats[] {
  const totalReviews = reviews.length;
  if (totalReviews === 0) return [];

  const dishMap: { [key: string]: { 
    totalPrice: number; 
    totalRating: number; 
    count: number;
    totalPricePerPax: number;
    paxCount: number;
    totalServiceTax: number;
    taxCount: number;
  } } = {};

  reviews.forEach((review) => {
    const dish = review.dish_name || 'Unknown';
    if (!dishMap[dish]) {
      dishMap[dish] = { 
        totalPrice: 0, 
        totalRating: 0, 
        count: 0,
        totalPricePerPax: 0,
        paxCount: 0,
        totalServiceTax: 0,
        taxCount: 0
      };
    }
    dishMap[dish].totalPrice += review.price_paid || 0;
    dishMap[dish].totalRating += review.rating || 0;
    dishMap[dish].count += 1;

    if (review.price_per_pax !== undefined && review.price_per_pax !== null) {
      dishMap[dish].totalPricePerPax += review.price_per_pax;
      dishMap[dish].paxCount += 1;
    }

    if (review.service_tax !== undefined && review.service_tax !== null) {
      dishMap[dish].totalServiceTax += review.service_tax;
      dishMap[dish].taxCount += 1;
    }
  });

  return Object.entries(dishMap).map(([name, stats]) => ({
    name,
    avgPrice: Math.round(stats.totalPrice / stats.count),
    avgRating: Number((stats.totalRating / stats.count).toFixed(1)),
    reviewCount: stats.count,
    popularity: stats.count / totalReviews,
    avgPricePerPax: stats.paxCount > 0 ? Math.round(stats.totalPricePerPax / stats.paxCount) : undefined,
    avgServiceTax: stats.taxCount > 0 ? Number((stats.totalServiceTax / stats.taxCount).toFixed(1)) : undefined,
  }));
}

export function filterReviewsByDishAndSort(
  reviews: Review[],
  selectedDish: string,
  sortKey: 'recent' | 'cheapest' | 'most_expensive' | 'highest_rating'
): Review[] {
  let filtered = reviews;
  if (selectedDish !== 'All') {
    filtered = reviews.filter((r) => r.dish_name === selectedDish);
  }

  return [...filtered].sort((a, b) => {
    if (sortKey === 'recent') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortKey === 'cheapest') {
      return (a.price_paid || 0) - (b.price_paid || 0);
    }
    if (sortKey === 'most_expensive') {
      return (b.price_paid || 0) - (a.price_paid || 0);
    }
    if (sortKey === 'highest_rating') {
      return b.rating - a.rating;
    }
    return 0;
  });
}
