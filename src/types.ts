export type Language = 'en' | 'uz' | 'ru';

export interface Location {
  lat: number;
  lng: number;
}

export type ListingType = 'food' | 'clothes';
export type PriceFeeling = 'cheap' | 'fair' | 'expensive';
export type PortionSize = 'small' | 'normal' | 'big';

export interface Listing {
  id: string;
  name: string;
  type: ListingType;
  address: string;
  latitude: number;
  longitude: number;
  working_hours?: string;
  is_sponsored: boolean;
  is_verified: boolean;
  is_active: boolean;
  photo_url?: string;
  photo_urls?: string[];
  description?: string;
  dishes: string[];
  avg_price?: number;
  totalAvgRating?: number;
  totalReviewCount?: number;
  likes?: number;
  dislikes?: number;
  phone?: string;
  social_link?: string;
  google_maps_url?: string;
  google_place_id?: string;
  created_at: string;
  updated_at: string;
  
  // Computed fields (not in DB)
  dishStats?: { [dishName: string]: DishStats };
}

export interface Dish {
  id: string;
  listing_id: string;
  name: string;
  created_at: string;
}

export interface Review {
  id: string;
  listing_id: string;
  dish_name: string;
  price_paid: number;
  rating: number;
  visit_date?: string;
  price_feeling?: PriceFeeling;
  portion_size?: PortionSize;
  title?: string;
  text?: string;
  tags?: string[];
  submitter_name?: string;
  photo_urls?: string[];
  likes?: number;
  dislikes?: number;
  created_at: string;
}

export interface Banner {
  id: string;
  restaurant_id?: string;
  name: string;
  languages: string[];
  start_date: string;
  end_date: string;
  position: number;
  is_active: boolean;
  is_paused: boolean;
  category: ListingType;
  image_url?: string;
  image_url_uz?: string;
  image_url_ru?: string;
  image_url_en?: string;
  created_at: string;
  updated_at: string;
  restaurant_name?: string; // Joined from listings
}

export interface Visit {
  id: string;
  session_id: string;
  first_seen_at: string;
  last_seen_at: string;
  visit_count: number;
  user_agent?: string;
  device_type: string;
  country?: string;
  city?: string;
}

export interface DishStats {
  name: string;
  avgPrice: number;
  avgRating: number;
  reviewCount: number;
  popularity: number;
  bestComment?: string;
  displayName?: string;
}

export const DISH_TYPES = ['Osh', 'Somsa', 'Shashlik', 'Manti', 'Norin', 'Plov', 'Lagman', 'Chuchvara', 'Shorva', 'Dimlama'];
export const CLOTHING_TYPES = ['T-shirt', 'Jeans', 'Dress', 'Shoes', 'Jacket', 'Shirt', 'Skirt', 'Pants', 'Sweater', 'Coat'];

export type AddReviewFormState = {
  dish: string;
  customDishName: string;
  pricePaid: string;
  rating: number;
  visitDate: string;
  priceFeeling: PriceFeeling | '';
  portionSize: PortionSize | '';
  title: string;
  text: string;
  tags: string[];
};

export type SortOption = 'price_asc' | 'price_desc' | 'rating' | 'distance';
