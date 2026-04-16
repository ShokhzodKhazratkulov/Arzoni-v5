import { supabase } from '../supabase';
import { Review } from '../types';

export const createReview = async (data: Partial<Review>) => {
  const { data: result, error } = await supabase
    .from('reviews')
    .insert([data])
    .select();
  if (error) throw error;
  return result[0];
};

export const getReviewsByListingId = async (listingId: string) => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('listing_id', listingId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Review[];
};

export const likeReview = async (reviewId: string) => {
  const { data, error } = await supabase.rpc('increment_review_likes', { review_id: reviewId });
  if (error) {
    // Fallback if RPC is not defined
    const { data: review } = await supabase.from('reviews').select('likes').eq('id', reviewId).single();
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ likes: (review?.likes || 0) + 1 })
      .eq('id', reviewId);
    if (updateError) throw updateError;
  }
  return data;
};

export const dislikeReview = async (reviewId: string) => {
  const { data, error } = await supabase.rpc('increment_review_dislikes', { review_id: reviewId });
  if (error) {
    // Fallback if RPC is not defined
    const { data: review } = await supabase.from('reviews').select('dislikes').eq('id', reviewId).single();
    const { error: updateError } = await supabase
      .from('reviews')
      .update({ dislikes: (review?.dislikes || 0) + 1 })
      .eq('id', reviewId);
    if (updateError) throw updateError;
  }
  return data;
};
