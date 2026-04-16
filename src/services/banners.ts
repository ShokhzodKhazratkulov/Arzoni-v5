import { supabase } from '../supabase';
import { Banner } from '../types';

export const getActiveBanners = async () => {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .lte('start_date', today)
    .gte('end_date', today)
    .order('position', { ascending: true });
  
  if (error) {
    if (error.code === '406' || error.message?.includes('406')) {
      console.warn('Banners fetch failed (schema stale).');
      return [];
    }
    console.error('Error fetching active banners:', error);
    return [];
  }
  return data as Banner[];
};

export const getAllBanners = async () => {
  const { data, error } = await supabase
    .from('banners')
    .select(`
      *,
      listings (name)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map((b: any) => ({
    ...b,
    restaurant_name: b.listings?.name
  })) as Banner[];
};

export const createBanner = async (data: Partial<Banner>) => {
  const { data: result, error } = await supabase
    .from('banners')
    .insert([data])
    .select();
  if (error) throw error;
  return result[0];
};

export const updateBanner = async (id: string, data: Partial<Banner>) => {
  const { data: result, error } = await supabase
    .from('banners')
    .update(data)
    .eq('id', id)
    .select();
  if (error) throw error;
  return result[0];
};

export const deleteBanner = async (id: string) => {
  const { error } = await supabase
    .from('banners')
    .delete()
    .eq('id', id);
  if (error) throw error;
};

export const pauseBanner = async (id: string) => {
  return updateBanner(id, { is_active: false });
};

export const resumeBanner = async (id: string) => {
  return updateBanner(id, { is_active: true });
};
