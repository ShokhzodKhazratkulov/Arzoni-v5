import { supabase } from '../supabase';
import { Review } from '../types';
import { translateReviewFull } from './translationService';
import { getDeviceId } from '../lib/deviceId';

export const checkRateLimit = async (listingId: string): Promise<boolean> => {
  const deviceId = getDeviceId();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .eq('listing_id', listingId)
    .gt('created_at', twentyFourHoursAgo);

  if (error) {
    console.error('Error checking rate limit:', error);
    // Fallback: allow the insert if the DB query fails so the user experience doesn't break
    return true;
  }

  return (count || 0) < 3;
};

export const checkGlobalRateLimit = async (): Promise<boolean> => {
  const deviceId = getDeviceId();
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('reviews')
    .select('id', { count: 'exact', head: true })
    .eq('device_id', deviceId)
    .gt('created_at', twentyFourHoursAgo);

  if (error) {
    console.error('Error checking global rate limit:', error);
    // Fallback: allow insert if query fails
    return true;
  }

  return (count || 0) < 10;
};

export const createReview = async (data: Partial<Review>) => {
  const { data: result, error } = await supabase
    .from('reviews')
    .insert([{
      ...data,
      device_id: getDeviceId()
    }])
    .select();
  
  if (error) throw error;
  const review = result[0];

  // Try to generate translations in the background (or foreground for simple persistence)
  if (review && (review.text || review.title)) {
    try {
      // 1. Generate and save translations (includes detection)
      const { detectedLang, translations } = await translateReviewFull(
        review.title || '', 
        review.text || '', 
        review.language_code || 'uz'
      );

      // 2. Update the original review with the detected language if it's different and save as original
      const finalOriginalLang = detectedLang || review.language_code || 'uz';
      
      // Save the detected/final original to review_translations table
      await supabase.from('review_translations').insert([{
        review_id: review.id,
        language_code: finalOriginalLang,
        title: review.title,
        text: review.text,
        is_original: true
      }]);

      if (translations.length > 0) {
        // We filter out any translation that matches the detected original language to avoid duplicates
        const transInserts = translations
          .filter(t => t.lang !== finalOriginalLang)
          .map(t => ({
            review_id: review.id,
            language_code: t.lang,
            title: t.title,
            text: t.text,
            is_original: false
          }));
        
        if (transInserts.length > 0) {
          await supabase.from('review_translations').insert(transInserts);
        }
      }

      // 3. Optional: Sync the original review's language_code if it changed
      if (detectedLang && detectedLang !== review.language_code) {
        await supabase.from('reviews').update({ language_code: detectedLang }).eq('id', review.id);
      }
    } catch (transError) {
      console.warn("Translation failed for some languages:", transError);
    }
  }

  return review;
};

export const getReviewsByListingId = async (listingId: string, languageCode?: string) => {
  // If languageCode is provided, we try to join with translations
  let query = supabase
    .from('reviews')
    .select(`
      *,
      translations:review_translations(
        title,
        text,
        language_code,
        is_original
      )
    `)
    .eq('listing_id', listingId);

  if (languageCode) {
    // We could filter here, but it's better to fetch all translations and filter in JS 
    // to provide "Original" tag and fallback logic.
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;

  // Process data to map translations back into the review structure for the current language
  return data.map(review => {
    const translation = review.translations?.find((t: any) => t.language_code === languageCode);
    const original = review.translations?.find((t: any) => t.is_original);
    
    return {
      ...review,
      // If we found a translation for target language, use it, else use original
      title: translation?.title || original?.title || review.title,
      text: translation?.text || original?.text || review.text,
      isTranslated: translation && !translation.is_original,
      originalLanguage: original?.language_code || review.language_code
    };
  }) as any[];
};

export const likeReview = async (reviewId: string) => {
  const { data, error } = await supabase.rpc('increment_review_likes', { review_id: reviewId });
  if (error) throw error;
  return data;
};

export const dislikeReview = async (reviewId: string) => {
  const { data, error } = await supabase.rpc('increment_review_dislikes', { review_id: reviewId });
  if (error) throw error;
  return data;
};

export const getMyReviews = async (listingId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listingId)
    .eq('device_id', getDeviceId())
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const updateReview = async (reviewId: string, data: Partial<Review>): Promise<Review> => {
  const { data: result, error } = await supabase
    .from('reviews')
    .update(data)
    .eq('id', reviewId)
    .eq('device_id', getDeviceId())
    .select();

  if (error) throw error;
  if (!result || result.length === 0) {
    throw new Error('Review not found or permission denied');
  }
  return result[0];
};
