import { supabase } from '../supabase';
import { Listing, DishStats, ListingType } from '../types';

export const getListingsWithStats = async (filters: { 
  selectedDish?: string; 
  type?: ListingType; 
  searchQuery?: string;
  sort?: string;
}) => {
  let query = supabase
    .from('listings')
    .select(`
      *,
      reviews (*)
    `)
    .eq('is_active', true);

  if (filters.type) {
    query = query.eq('type', filters.type);
  }

  if (filters.searchQuery) {
    query = query.ilike('name', `%${filters.searchQuery}%`);
  }

  const { data, error } = await query;

  if (error) {
    if (error.code === '406' || error.message?.includes('406')) {
      console.warn('Database schema cache is stale. Please run the SQL script to refresh it.');
      return [];
    }
    console.error('Error fetching listings:', error);
    return [];
  }

  const listingsWithStats = data.map((listing: any) => {
    const reviews = listing.reviews || [];
    const dishStats: { [key: string]: DishStats } = {};
    const totalReviewCount = reviews.length;

    // Group reviews by dish_name
    const reviewsByDish: { [key: string]: any[] } = {};
    reviews.forEach((review: any) => {
      if (!reviewsByDish[review.dish_name]) {
        reviewsByDish[review.dish_name] = [];
      }
      reviewsByDish[review.dish_name].push(review);
    });

    // Compute stats for each dish
    Object.keys(reviewsByDish).forEach(dishName => {
      const dishReviews = reviewsByDish[dishName];
      const avgPrice = dishReviews.reduce((sum, r) => sum + r.price_paid, 0) / dishReviews.length;
      const avgRating = dishReviews.reduce((sum, r) => sum + r.rating, 0) / dishReviews.length;
      const popularity = totalReviewCount > 0 ? dishReviews.length / totalReviewCount : 0;

      const reviewsWithPax = dishReviews.filter(r => r.price_per_pax !== null && r.price_per_pax !== undefined && r.price_per_pax > 0);
      const avgPricePerPax = reviewsWithPax.length > 0 
        ? reviewsWithPax.reduce((sum, r) => sum + (r.price_per_pax || 0), 0) / reviewsWithPax.length 
        : undefined;

      const reviewsWithTax = dishReviews.filter(r => r.service_tax !== null && r.service_tax !== undefined && r.service_tax > 0);
      const avgServiceTax = reviewsWithTax.length > 0 
        ? reviewsWithTax.reduce((sum, r) => sum + (r.service_tax || 0), 0) / reviewsWithTax.length 
        : undefined;

      // Find best comment (most liked)
      const reviewsWithComments = dishReviews.filter(r => r.text && r.text.trim().length > 0);
      const bestReview = reviewsWithComments.length > 0
        ? reviewsWithComments.reduce((prev, curr) => (curr.likes || 0) > (prev.likes || 0) ? curr : prev, reviewsWithComments[0])
        : null;

      dishStats[dishName] = {
        name: dishName,
        avgPrice,
        avgRating,
        reviewCount: dishReviews.length,
        popularity,
        avgPricePerPax,
        avgServiceTax,
        bestComment: bestReview?.text,
        displayName: dishName
      };
    });

    const totalAvgRating = totalReviewCount > 0 
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviewCount 
      : 0;

    return {
      ...listing,
      dishStats,
      totalReviewCount,
      totalAvgRating
    } as Listing;
  });

  // Filter by selected dish if provided
  let filtered = listingsWithStats;
  if (filters.selectedDish && filters.selectedDish !== 'All') {
    const searchDish = filters.selectedDish.toLowerCase();
    filtered = listingsWithStats.filter(l => {
      if (!l.dishStats) return false;
      // Look for a key that matches case-insensitively
      const matchingKey = Object.keys(l.dishStats).find(k => k.toLowerCase() === searchDish);
      return !!matchingKey;
    });
  }

  // Sort
  if (filters.sort === 'price_asc') {
    filtered.sort((a, b) => {
      const searchDish = filters.selectedDish?.toLowerCase();
      const matchingKeyA = searchDish && a.dishStats ? Object.keys(a.dishStats).find(k => k.toLowerCase() === searchDish) : null;
      const matchingKeyB = searchDish && b.dishStats ? Object.keys(b.dishStats).find(k => k.toLowerCase() === searchDish) : null;

      const priceA = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyA ? a.dishStats?.[matchingKeyA]?.avgPrice : Infinity) 
        : (a.avg_price || Infinity);
      const priceB = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyB ? b.dishStats?.[matchingKeyB]?.avgPrice : Infinity) 
        : (b.avg_price || Infinity);
      return (priceA as number) - (priceB as number);
    });
  } else if (filters.sort === 'price_desc') {
    filtered.sort((a, b) => {
      const searchDish = filters.selectedDish?.toLowerCase();
      const matchingKeyA = searchDish && a.dishStats ? Object.keys(a.dishStats).find(k => k.toLowerCase() === searchDish) : null;
      const matchingKeyB = searchDish && b.dishStats ? Object.keys(b.dishStats).find(k => k.toLowerCase() === searchDish) : null;

      const priceA = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyA ? a.dishStats?.[matchingKeyA]?.avgPrice : 0) 
        : (a.avg_price || 0);
      const priceB = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyB ? b.dishStats?.[matchingKeyB]?.avgPrice : 0) 
        : (b.avg_price || 0);
      return (priceB as number) - (priceA as number);
    });
  } else if (filters.sort === 'rating') {
    filtered.sort((a, b) => {
      const searchDish = filters.selectedDish?.toLowerCase();
      const matchingKeyA = searchDish && a.dishStats ? Object.keys(a.dishStats).find(k => k.toLowerCase() === searchDish) : null;
      const matchingKeyB = searchDish && b.dishStats ? Object.keys(b.dishStats).find(k => k.toLowerCase() === searchDish) : null;

      const ratingA = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyA ? a.dishStats?.[matchingKeyA]?.avgRating : 0) 
        : (a.totalAvgRating || 0);
      const ratingB = (filters.selectedDish && filters.selectedDish !== 'All') 
        ? (matchingKeyB ? b.dishStats?.[matchingKeyB]?.avgRating : 0) 
        : (b.totalAvgRating || 0);
      return (ratingB as number) - (ratingA as number);
    });
  }

  // Always put sponsored first
  filtered.sort((a, b) => (b.is_sponsored ? 1 : 0) - (a.is_sponsored ? 1 : 0));

  return filtered;
};

export const getListingById = async (id: string) => {
  const { data, error } = await supabase
    .from('listings')
    .select(`
      *,
      reviews (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) return null;

  const listing = data;
  const reviews = listing.reviews || [];
  const dishStats: { [key: string]: DishStats } = {};
  const totalReviewCount = reviews.length;

  // Group reviews by dish_name
  const reviewsByDish: { [key: string]: any[] } = {};
  reviews.forEach((review: any) => {
    if (!reviewsByDish[review.dish_name]) {
      reviewsByDish[review.dish_name] = [];
    }
    reviewsByDish[review.dish_name].push(review);
  });

  // Compute stats for each dish
  Object.keys(reviewsByDish).forEach(dishName => {
    const dishReviews = reviewsByDish[dishName];
    const avgPrice = dishReviews.reduce((sum, r) => sum + r.price_paid, 0) / dishReviews.length;
    const avgRating = dishReviews.reduce((sum, r) => sum + r.rating, 0) / dishReviews.length;
    const popularity = totalReviewCount > 0 ? dishReviews.length / totalReviewCount : 0;

    const reviewsWithPax = dishReviews.filter(r => r.price_per_pax !== null && r.price_per_pax !== undefined && r.price_per_pax > 0);
    const avgPricePerPax = reviewsWithPax.length > 0 
      ? reviewsWithPax.reduce((sum, r) => sum + (r.price_per_pax || 0), 0) / reviewsWithPax.length 
      : undefined;

    const reviewsWithTax = dishReviews.filter(r => r.service_tax !== null && r.service_tax !== undefined && r.service_tax > 0);
    const avgServiceTax = reviewsWithTax.length > 0 
      ? reviewsWithTax.reduce((sum, r) => sum + (r.service_tax || 0), 0) / reviewsWithTax.length 
      : undefined;

    // Find best comment (most liked)
    const reviewsWithComments = dishReviews.filter(r => r.text && r.text.trim().length > 0);
    const bestReview = reviewsWithComments.length > 0
      ? reviewsWithComments.reduce((prev, curr) => (curr.likes || 0) > (prev.likes || 0) ? curr : prev, reviewsWithComments[0])
      : null;

    dishStats[dishName] = {
      name: dishName,
      avgPrice,
      avgRating,
      reviewCount: dishReviews.length,
      popularity,
      avgPricePerPax,
      avgServiceTax,
      bestComment: bestReview?.text,
      displayName: dishName
    };
  });

  const totalAvgRating = totalReviewCount > 0 
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / totalReviewCount 
    : 0;

  return {
    ...listing,
    dishStats,
    totalReviewCount,
    totalAvgRating
  } as Listing;
};

export const createListing = async (data: Partial<Listing>) => {
  const { data: result, error } = await supabase
    .from('listings')
    .insert([data])
    .select();
  if (error) throw error;
  return result[0];
};

export const updateListing = async (id: string, data: Partial<Listing>) => {
  const { data: result, error } = await supabase
    .from('listings')
    .update(data)
    .eq('id', id)
    .select();
  if (error) throw error;
  return result[0];
};

export const deleteListing = async (id: string) => {
  const { error } = await supabase
    .from('listings')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const setListingSponsored = async (id: string, isSponsored: boolean) => {
  return updateListing(id, { is_sponsored: isSponsored });
};

export const setListingVerified = async (id: string, isVerified: boolean) => {
  return updateListing(id, { is_verified: isVerified });
};
