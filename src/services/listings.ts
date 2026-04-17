import { supabase } from '../supabase';
import { Listing, DishStats, ListingType } from '../types';
import { resolveDishConcept } from './dishService';

export const seedSmartConcepts = async () => {
  const dishes = [
    { canonical: 'osh', emoji: '🍛', aliases: [{ name: 'Osh (Palov)', lang: 'uz' }, { name: 'Плов', lang: 'ru' }, { name: 'Pilaf', lang: 'en' }] },
    { canonical: 'qozon-kabob', emoji: '🥘', aliases: [{ name: 'Qozon Kabob', lang: 'uz' }, { name: 'Казан-кебаб', lang: 'ru' }, { name: 'Kazan Kebab', lang: 'en' }] },
    { canonical: 'dimlama', emoji: '🍲', aliases: [{ name: 'Dimlama', lang: 'uz' }, { name: 'Димляма', lang: 'ru' }, { name: 'Dimlama', lang: 'en' }] },
    { canonical: 'shashlik', emoji: '🍢', aliases: [{ name: 'Shashlik', lang: 'uz' }, { name: 'Шашлык', lang: 'ru' }, { name: 'Shashlik', lang: 'en' }] },
    { canonical: 'norin', emoji: '🍝', aliases: [{ name: 'Norin', lang: 'uz' }, { name: 'Нарын', lang: 'ru' }, { name: 'Naryn', lang: 'en' }] },
    { canonical: 'hasib', emoji: '🌭', aliases: [{ name: 'Hasib', lang: 'uz' }, { name: 'Хасиб', lang: 'ru' }, { name: 'Hasib', lang: 'en' }] },
    { canonical: 'jiz-biz', emoji: '🥩', aliases: [{ name: 'Jiz-biz', lang: 'uz' }, { name: 'Жиз-биз', lang: 'ru' }, { name: 'Jiz-biz', lang: 'en' }] },
    { canonical: 'qovurma-lagmon', emoji: '🍜', aliases: [{ name: 'Qovurma Lag\'mon', lang: 'uz' }, { name: 'Ковурма лагман', lang: 'ru' }, { name: 'Fried Lagman', lang: 'en' }] },
    { canonical: 'shorva', emoji: '🥣', aliases: [{ name: 'Sho\'rva', lang: 'uz' }, { name: 'Шурпа', lang: 'ru' }, { name: 'Shurpa', lang: 'en' }] },
    { canonical: 'mastava', emoji: '🍚', aliases: [{ name: 'Mastava', lang: 'uz' }, { name: 'Мастава', lang: 'ru' }, { name: 'Mastava', lang: 'en' }] },
    { canonical: 'lagmon', emoji: '🍜', aliases: [{ name: 'Lag\'mon', lang: 'uz' }, { name: 'Лагман', lang: 'ru' }, { name: 'Lagman', lang: 'en' }] },
    { canonical: 'moshxorda', emoji: '🍲', aliases: [{ name: 'Moshxo\'rda', lang: 'uz' }, { name: 'Мошхурда', lang: 'ru' }, { name: 'Moshkhurda', lang: 'en' }] },
    { canonical: 'chuchvara', emoji: '🥟', aliases: [{ name: 'Chuchvara', lang: 'uz' }, { name: 'Чучвара', lang: 'ru' }, { name: 'Chuchvara', lang: 'en' }] },
    { canonical: 'ugra-osh', emoji: '🍜', aliases: [{ name: 'Ugra-Osh', lang: 'uz' }, { name: 'Угра-ош', lang: 'ru' }, { name: 'Ugra-Osh', lang: 'en' }] },
    { canonical: 'somsa', emoji: '🥐', aliases: [{ name: 'Somsa', lang: 'uz' }, { name: 'Самса', lang: 'ru' }, { name: 'Somsa', lang: 'en' }] },
    { canonical: 'manti', emoji: '🥟', aliases: [{ name: 'Manti', lang: 'uz' }, { name: 'Манты', lang: 'ru' }, { name: 'Manti', lang: 'en' }] },
    { canonical: 'xonim', emoji: '🌯', aliases: [{ name: 'Xonim', lang: 'uz' }, { name: 'Ханум', lang: 'ru' }, { name: 'Khanum', lang: 'en' }] },
    { canonical: 'tuxum-barak', emoji: '🥚', aliases: [{ name: 'Tuxum Barak', lang: 'uz' }, { name: 'Тухум барак', lang: 'ru' }, { name: 'Tuxum Barak', lang: 'en' }] },
    { canonical: 'shivit-oshi', emoji: '🍝', aliases: [{ name: 'Shivit Oshi', lang: 'uz' }, { name: 'Шивит оши', lang: 'ru' }, { name: 'Shivit Oshi', lang: 'en' }] },
    { canonical: 'gummaa', emoji: '🥟', aliases: [{ name: 'Gummaa', lang: 'uz' }, { name: 'Гумма', lang: 'ru' }, { name: 'Gummaa', lang: 'en' }] },
    { canonical: 'non', emoji: '🍞', aliases: [{ name: 'Yopgan Non', lang: 'uz' }, { name: 'Лепешка', lang: 'ru' }, { name: 'Flatbread', lang: 'en' }] },
    { canonical: 'achichuq', emoji: '🥗', aliases: [{ name: 'Achichuq', lang: 'uz' }, { name: 'Ачичук', lang: 'ru' }, { name: 'Achichuq', lang: 'en' }] },
    { canonical: 'chakka', emoji: '🥛', aliases: [{ name: 'Chakka', lang: 'uz' }, { name: 'Чакка', lang: 'ru' }, { name: 'Chakka', lang: 'en' }] },
    { canonical: 'suzma', emoji: '🥣', aliases: [{ name: 'Suzma', lang: 'uz' }, { name: 'Сузма', lang: 'ru' }, { name: 'Suzma', lang: 'en' }] },
    { canonical: 'kuygan-opka', emoji: '🥘', aliases: [{ name: 'Kuygan O\'pka', lang: 'uz' }, { name: 'Куйган опка', lang: 'ru' }, { name: 'Kuygan Opka', lang: 'en' }] },
    { canonical: 'halva', emoji: '🍯', aliases: [{ name: 'Halva', lang: 'uz' }, { name: 'Халва', lang: 'ru' }, { name: 'Halva', lang: 'en' }] },
    { canonical: 'sumalak', emoji: '🥣', aliases: [{ name: 'Sumalak', lang: 'uz' }, { name: 'Сумаляк', lang: 'ru' }, { name: 'Sumalak', lang: 'en' }] },
    { canonical: 'nisholda', emoji: '🥛', aliases: [{ name: 'Nisholda', lang: 'uz' }, { name: 'Нишолда', lang: 'ru' }, { name: 'Nisholda', lang: 'en' }] },
    { canonical: 'pashmak', emoji: '🍬', aliases: [{ name: 'Pashmak', lang: 'uz' }, { name: 'Пашмак', lang: 'ru' }, { name: 'Pashmak', lang: 'en' }] },
    { canonical: 'holvaytar', emoji: '🍮', aliases: [{ name: 'Holvaytar', lang: 'uz' }, { name: 'Холвайтар', lang: 'ru' }, { name: 'Holvaytar', lang: 'en' }] },
    { canonical: 'parvarda', emoji: '🍬', aliases: [{ name: 'Parvarda', lang: 'uz' }, { name: 'Парварда', lang: 'ru' }, { name: 'Parvarda', lang: 'en' }] }
  ];

  for (const item of dishes) {
    // Check if concept already exists
    const { data: existing } = await supabase
      .from('dish_concepts')
      .select('id')
      .eq('canonical_name', item.canonical)
      .single();

    if (!existing) {
      const { data: concept } = await supabase
        .from('dish_concepts')
        .insert([{ canonical_name: item.canonical, category: 'food', emoji: item.emoji }])
        .select()
        .single();

      if (concept) {
        const aliasInserts = item.aliases.map(a => ({
          concept_id: concept.id,
          name: a.name,
          language_code: a.lang
        }));
        await supabase.from('dish_aliases').insert(aliasInserts);
      }
    }
  }

  console.log('Smart concepts seeded with comprehensive dish list!');
};

export const getListingsWithStats = async (filters: { 
  selectedDish?: string; 
  customDish?: string;
  type?: ListingType; 
  searchQuery?: string;
  sort?: string;
}) => {
  // --- New Multilingual Concept Resolution ---
  let resolvedConceptIds: string[] = [];
  
  // If user is searching 'custom' text, we try to resolve concepts first
  if (filters.selectedDish === 'custom' && filters.customDish) {
    const search = filters.customDish.toLowerCase().trim();
    // Search aliases table for this text in ANY language
    const { data: aliasMatches } = await supabase
      .from('dish_aliases')
      .select('concept_id')
      .ilike('name', `%${search}%`);
    
    if (aliasMatches && aliasMatches.length > 0) {
      resolvedConceptIds = Array.from(new Set(aliasMatches.map(m => m.concept_id)));
    } else {
      // AI FALLBACK: If DB doesn't have the translation yet, ask Gemini
      console.log('DB Search for', search, 'returned no results. Trying AI resolution...');
      const conceptId = await resolveDishConcept(filters.customDish, filters.type || 'food');
      if (conceptId) {
        resolvedConceptIds = [conceptId];
        console.log('AI resolved', search, 'to Concept ID:', conceptId);
      }
    }
  }

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
  // ... (keeping existing error handling) ...
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

    // Group reviews by dish_name OR dish_concept_id
    const reviewsByDish: { [key: string]: any[] } = {};
    reviews.forEach((review: any) => {
      // Logic: Prefer grouping by Concept for "Smart Search"
      // but fallback to dish_name for backwards compatibility
      const dishKey = review.dish_concept_id || review.dish_name;
      if (!reviewsByDish[dishKey]) {
        reviewsByDish[dishKey] = [];
      }
      reviewsByDish[dishKey].push(review);
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
    if (filters.selectedDish === 'custom' && filters.customDish) {
      const dbSearch = filters.customDish.toLowerCase().trim();
      filtered = listingsWithStats.filter(l => {
        const matchesName = l.name.toLowerCase().includes(dbSearch);
        const matchesDish = l.dishes?.some(d => d.toLowerCase().includes(dbSearch));
        // Smart Check: 
        // 1. Matches text in dishStats keys
        // 2. OR matches one of the resolved CONCEPT IDs from the aliases table
        const hasStatsText = l.dishStats && Object.keys(l.dishStats).some(k => k.toLowerCase().includes(dbSearch));
        const hasResolvedConcept = l.dishStats && Object.keys(l.dishStats).some(k => resolvedConceptIds.includes(k));
        
        return matchesName || matchesDish || hasStatsText || hasResolvedConcept;
      });
    } else {
      filtered = listingsWithStats.filter(l => l.dishStats && l.dishStats[filters.selectedDish!]);
    }
  }

  // Sort helper function to find specific dish price accurately
  const getDishPrice = (listing: Listing, dishId?: string, customStr?: string, resolvedIds: string[] = []) => {
    if (!dishId || dishId === 'All') return listing.avg_price || Infinity;
    
    let stats = null;
    if (dishId === 'custom' && customStr) {
      const search = customStr.toLowerCase();
      // Try resolved concept IDs first
      const conceptKey = Object.keys(listing.dishStats || {}).find(k => resolvedIds.includes(k));
      if (conceptKey) {
        stats = listing.dishStats![conceptKey];
      } else {
        // Fallback to fuzzy text match
        const matchingKey = Object.keys(listing.dishStats || {}).find(k => 
          k.toLowerCase().includes(search) || search.includes(k.toLowerCase())
        );
        stats = matchingKey ? listing.dishStats![matchingKey] : null;
      }
    } else {
      stats = listing.dishStats?.[dishId];
    }
    
    return stats ? stats.avgPrice : (listing.avg_price || Infinity);
  };

  const getDishRating = (listing: Listing, dishId?: string, customStr?: string, resolvedIds: string[] = []) => {
    if (!dishId || dishId === 'All') return listing.totalAvgRating || 0;
    
    let stats = null;
    if (dishId === 'custom' && customStr) {
      const search = customStr.toLowerCase();
      // Try resolved concept IDs first
      const conceptKey = Object.keys(listing.dishStats || {}).find(k => resolvedIds.includes(k));
      if (conceptKey) {
        stats = listing.dishStats![conceptKey];
      } else {
        // Fallback to fuzzy text match
        const matchingKey = Object.keys(listing.dishStats || {}).find(k => 
          k.toLowerCase().includes(search) || search.includes(k.toLowerCase())
        );
        stats = matchingKey ? listing.dishStats![matchingKey] : null;
      }
    } else {
      stats = listing.dishStats?.[dishId];
    }
    
    return stats ? stats.avgRating : (listing.totalAvgRating || 0);
  };

  // Sort
  if (filters.sort === 'price_asc') {
    filtered.sort((a, b) => getDishPrice(a, filters.selectedDish, filters.customDish, resolvedConceptIds) - getDishPrice(b, filters.selectedDish, filters.customDish, resolvedConceptIds));
  } else if (filters.sort === 'price_desc') {
    filtered.sort((a, b) => getDishPrice(b, filters.selectedDish, filters.customDish, resolvedConceptIds) - getDishPrice(a, filters.selectedDish, filters.customDish, resolvedConceptIds));
  } else if (filters.sort === 'rating') {
    filtered.sort((a, b) => getDishRating(b, filters.selectedDish, filters.customDish, resolvedConceptIds) - getDishRating(a, filters.selectedDish, filters.customDish, resolvedConceptIds));
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
