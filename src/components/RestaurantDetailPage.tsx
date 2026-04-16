import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Navigation, MessageSquare, TrendingUp, DollarSign, Tag, Globe, ThumbsUp, ThumbsDown, Phone, Instagram, Send, Edit, MapPin, Clock, Info } from 'lucide-react';
import { Review, Listing, DishStats } from '../types';
import { computeDishStats, filterReviewsByDishAndSort } from '../lib/stats';
import { useTranslation } from 'react-i18next';
import { translateBatch } from '../services/translationService';
import { getListingById, updateListing } from '../services/listings';
import { getReviewsByListingId, likeReview, dislikeReview, createReview } from '../services/reviews';
import { getMapUrl, uploadImage } from '../lib/utils';
import AddRestaurantModal from './AddRestaurantModal';

export default function RestaurantDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [selectedDish, setSelectedDish] = useState<string>('All');
  const [sortKey, setSortKey] = useState<'recent' | 'cheapest' | 'most_expensive' | 'highest_rating'>('recent');
  const [restaurant, setRestaurant] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [translatedReviews, setTranslatedReviews] = useState<Record<string, string>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);

    try {
      const [restData, revData] = await Promise.all([
        getListingById(id),
        getReviewsByListingId(id)
      ]);

      if (restData) {
        setRestaurant(restData);
      }

      if (revData) {
        setReviews(revData);
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const handleUpdateListing = async (data: any) => {
    try {
      const { photoFiles, id: listingId, ...listingData } = data;
      
      let photo_urls = listingData.photo_urls || [];
      if (photoFiles && photoFiles.length > 0) {
        const uploadPromises = photoFiles.map((file: File) => uploadImage(file, 'listings'));
        const newUrls = await Promise.all(uploadPromises);
        photo_urls = [...photo_urls, ...newUrls];
      }

      const finalData = { 
        ...listingData, 
        photo_urls,
        photo_url: photo_urls[0] || listingData.photo_url 
      };
      
      await updateListing(listingId, finalData);
      fetchData();
      setIsEditModalOpen(false);
    } catch (error) {
      console.error('Error updating restaurant:', error);
      throw error;
    }
  };

  const handleAddReview = async (listingId: string, reviewData: any) => {
    try {
      await createReview({
        listing_id: listingId,
        dish_name: reviewData.dish === 'Custom' ? reviewData.customDishName : reviewData.dish,
        price_paid: parseInt(reviewData.pricePaid),
        rating: reviewData.rating,
        visit_date: reviewData.visitDate,
        price_feeling: reviewData.priceFeeling,
        portion_size: reviewData.portionSize,
        title: reviewData.title,
        text: reviewData.text,
        tags: reviewData.tags
      });
      fetchData();
    } catch (error) {
      console.error('Error adding review:', error);
      throw error;
    }
  };

  useEffect(() => {
    const translateReviews = async () => {
      if (reviews.length === 0) return;
      
      setIsTranslating(true);
      const comments = reviews.map(r => r.text || '');
      try {
        const translated = await translateBatch(comments, i18n.language);
        const newTranslations: Record<string, string> = {};
        reviews.forEach((r, i) => {
          if (r.id) newTranslations[r.id] = translated[i];
        });
        setTranslatedReviews(newTranslations);
      } catch (error) {
        console.error("Translation error:", error);
      } finally {
        setIsTranslating(false);
      }
    };

    translateReviews();
  }, [reviews, i18n.language]);

  const dishStats = useMemo(() => computeDishStats(reviews), [reviews]);
  const filteredReviews = useMemo(() => 
    filterReviewsByDishAndSort(reviews, selectedDish, sortKey), 
    [reviews, selectedDish, sortKey]
  );

  const selectedDishStats = useMemo(() => 
    dishStats.find(s => s.name === selectedDish) || null,
    [dishStats, selectedDish]
  );

  const cheapestDish = useMemo(() => {
    if (dishStats.length === 0) return null;
    return [...dishStats].sort((a, b) => a.avgPrice - b.avgPrice)[0];
  }, [dishStats]);

  const handleLike = async (reviewId: string) => {
    try {
      await likeReview(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, likes: (r.likes || 0) + 1 } : r));
    } catch (error) {
      console.error('Error liking review:', error);
    }
  };

  const handleDislike = async (reviewId: string) => {
    try {
      await dislikeReview(reviewId);
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, dislikes: (r.dislikes || 0) + 1 } : r));
    } catch (error) {
      console.error('Error disliking review:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Restaurant not found</h2>
        <button onClick={() => navigate('/')} className="text-[#1D9E75] font-bold underline">Go back home</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Hero Section / Gallery */}
      <div className="relative h-[250px] sm:h-[350px] w-full bg-gray-200 overflow-hidden">
        {restaurant.photo_urls && restaurant.photo_urls.length > 0 ? (
          <div className="flex h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide">
            {restaurant.photo_urls.map((url, idx) => (
              <img 
                key={idx}
                src={url} 
                alt={`${restaurant.name} ${idx + 1}`} 
                className="w-full h-full object-cover flex-shrink-0 snap-center"
                referrerPolicy="no-referrer"
              />
            ))}
          </div>
        ) : restaurant.photo_url ? (
          <img 
            src={restaurant.photo_url} 
            alt={restaurant.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <Globe size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-4 left-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all z-10"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="absolute bottom-6 left-6 right-6 text-white pointer-events-none">
          <h1 className="text-3xl font-black leading-tight">{restaurant.name}</h1>
          <div className="flex items-center gap-2 text-white/80 text-sm mt-1">
            <MapPin size={14} />
            <span>{restaurant.address}</span>
          </div>
        </div>
        {restaurant.photo_urls && restaurant.photo_urls.length > 1 && (
          <div className="absolute bottom-6 right-6 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest">
            {restaurant.photo_urls.length} Photos
          </div>
        )}
      </div>

      <main className="max-w-2xl mx-auto p-4 space-y-6 -mt-6 relative z-10">
        {/* Quick Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/restaurants/${id}/review`)}
            className="flex-1 bg-[#1D9E75] text-white py-4 rounded-2xl font-black shadow-lg hover:bg-[#168a65] transition-all flex items-center justify-center gap-2"
          >
            <MessageSquare size={18} />
            {t('addReview')}
          </button>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-6 bg-white text-gray-600 py-4 rounded-2xl font-black shadow-md border border-gray-100 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <Edit size={18} />
            {t('edit')}
          </button>
        </div>

        {/* About Section */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{t('about')}</h3>
            <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
              <Star size={14} className="text-yellow-400 fill-yellow-400" />
              <span className="text-sm font-black text-yellow-700">{(restaurant.totalAvgRating || 0).toFixed(1)}</span>
            </div>
          </div>
          
          {restaurant.description && (
            <p className="text-sm text-gray-600 leading-relaxed">
              {restaurant.description}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3 text-gray-600">
              <Clock size={18} className="text-[#1D9E75]" />
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase">{t('workingHours')}</p>
                <p className="text-sm font-bold">{restaurant.working_hours || t('noDataHours')}</p>
              </div>
            </div>
            {restaurant.phone && (
              <a href={`tel:${restaurant.phone}`} className="flex items-center gap-3 text-gray-600 hover:text-[#1D9E75] transition-colors">
                <Phone size={18} className="text-[#1D9E75]" />
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase">{t('formPhone')}</p>
                  <p className="text-sm font-bold">{restaurant.phone}</p>
                </div>
              </a>
            )}
          </div>

          {restaurant.social_link && (
            <div className="pt-4 border-t border-gray-50 flex gap-3">
              <a 
                href={restaurant.social_link.startsWith('http') ? restaurant.social_link : `https://t.me/${restaurant.social_link.replace('@', '')}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black hover:bg-blue-100 transition-all"
              >
                {restaurant.social_link.includes('instagram') ? <Instagram size={14} /> : <Send size={14} />}
                {t('socialMedia')}
              </a>
            </div>
          )}
        </section>

        {/* Menu / Items Section */}
        {restaurant.dishes && restaurant.dishes.length > 0 && (
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{restaurant.type === 'food' ? t('popularDishes') : t('popularDishesClothes')}</h3>
            <div className="flex flex-wrap gap-2">
              {restaurant.dishes.map((dish) => (
                <span 
                  key={dish}
                  className="px-3 py-1.5 bg-gray-50 text-gray-600 text-xs font-bold rounded-lg border border-gray-100"
                >
                  {t(`dishes.${dish.toLowerCase()}`, t(`clothes.${dish.toLowerCase()}`, dish))}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Dish Filter Chips */}
        <section className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedDish('All')}
            className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
              selectedDish === 'All'
                ? 'bg-[#1D9E75] text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
            }`}
          >
            {restaurant.type === 'food' ? t('allDishes') : t('allClothes')} ({reviews.length})
          </button>
          {dishStats.map((stats) => (
            <button
              key={stats.name}
              onClick={() => setSelectedDish(stats.name)}
              className={`px-4 py-2 rounded-full text-xs font-black transition-all ${
                selectedDish === stats.name
                  ? 'bg-[#1D9E75] text-white shadow-md'
                  : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50'
              }`}
            >
              {stats.name === 'All' ? t('allPrices') : t(`dishes.${stats.name.toLowerCase()}`, t(`clothes.${stats.name.toLowerCase()}`, stats.name))} ({stats.reviewCount})
            </button>
          ))}
        </section>

        {/* Stats Panel */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          {selectedDish === 'All' ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-50 rounded-xl">
                  <TrendingUp className="text-[#1D9E75]" size={24} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider">{t('mostPopular')}</h3>
                  <p className="text-xs text-gray-500 font-bold">
                    {t('cheapestMeal')}: <span className="text-[#1D9E75]">{cheapestDish?.avgPrice.toLocaleString()} {t('som')}</span> ({t(`dishes.${cheapestDish?.name.toLowerCase()}`, t(`clothes.${cheapestDish?.name.toLowerCase()}`, cheapestDish?.name))})
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase">{t('rating')}</p>
                  <p className="text-lg font-black text-gray-900">{(restaurant.totalAvgRating || 0).toFixed(1)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase">{t('reviews')}</p>
                  <p className="text-lg font-black text-gray-900">{reviews.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase">{t('dishes')}</p>
                  <p className="text-lg font-black text-gray-900">{dishStats.length}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-black text-gray-900">{t(`dishes.${selectedDish.toLowerCase()}`, t(`clothes.${selectedDish.toLowerCase()}`, selectedDish))} {t('popularity')}</h3>
                  <p className="text-sm text-gray-500 font-bold">{t('by')} {selectedDishStats?.reviewCount} {t('reviewsCount')}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-lg border border-yellow-100">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" />
                  <span className="text-lg font-black text-yellow-700">{selectedDishStats?.avgRating}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign size={14} className="text-[#1D9E75]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">{t('formPrice')}</span>
                  </div>
                  <p className="text-xl font-black text-[#1D9E75]">{selectedDishStats?.avgPrice.toLocaleString()} {t('som')}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={14} className="text-[#1D9E75]" />
                    <span className="text-[10px] font-black text-gray-400 uppercase">{t('popularity')}</span>
                  </div>
                  <p className="text-xl font-black text-gray-900">{Math.round((selectedDishStats?.popularity || 0) * 100)}%</p>
                </div>
                {selectedDishStats?.avgPricePerPax && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <DollarSign size={14} className="text-[#1D9E75]" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">{t('avgPricePerPax')}</span>
                    </div>
                    <p className="text-xl font-black text-[#1D9E75]">{selectedDishStats.avgPricePerPax.toLocaleString()} {t('som')}</p>
                  </div>
                )}
                {selectedDishStats?.avgServiceTax && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-2 mb-1">
                      <Tag size={14} className="text-[#1D9E75]" />
                      <span className="text-[10px] font-black text-gray-400 uppercase">{t('avgServiceTax')}</span>
                    </div>
                    <p className="text-xl font-black text-gray-900">{selectedDishStats.avgServiceTax}%</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Trust Note */}
        <div className="px-2">
          <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
            {t('trustNoteDetail')}
          </p>
        </div>

        {/* Reviews List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900">{t('communityReviews')}</h3>
            <div className="flex items-center gap-4">
              {isTranslating && (
                <div className="flex items-center gap-1 text-[10px] font-bold text-[#1D9E75] animate-pulse">
                  <Globe size={12} />
                  {t('loading')}
                </div>
              )}
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="bg-transparent text-xs font-black text-[#1D9E75] focus:outline-none cursor-pointer"
              >
                <option value="recent">{t('recent')}</option>
                <option value="cheapest">{t('price_asc')}</option>
                <option value="most_expensive">{t('price_desc')}</option>
                <option value="highest_rating">{t('rating')}</option>
              </select>
            </div>
          </div>

          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                      <MessageSquare size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">{review.submitter_name || t('anonymous')}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-lg">
                    <Star size={12} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-black text-gray-900">{review.rating}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-green-50 text-[#1D9E75] text-[10px] font-black rounded-md uppercase">
                    {t(`dishes.${review.dish_name.toLowerCase()}`, t(`clothes.${review.dish_name.toLowerCase()}`, review.dish_name))}
                  </span>
                  <span className="text-xs font-black text-gray-900">
                    {review.price_paid.toLocaleString()} {t('som')}
                  </span>
                  {review.price_per_pax && (
                    <span className="text-[10px] font-bold text-gray-500">
                      ({review.price_per_pax.toLocaleString()} {t('som')}/{t('pax')})
                    </span>
                  )}
                  {review.service_tax && (
                    <span className="text-[10px] font-bold text-gray-500">
                      + {review.service_tax}% {t('service')}
                    </span>
                  )}
                </div>

                <p className="text-sm text-gray-600 leading-relaxed italic">
                  "{translatedReviews[review.id!] || review.text}"
                </p>

                {review.photo_urls && review.photo_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {review.photo_urls.map((url, idx) => (
                      <img 
                        key={idx} 
                        src={url} 
                        alt="Review" 
                        className="w-24 h-24 object-cover rounded-xl border border-gray-100 flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ))}
                  </div>
                )}

                {review.tags && review.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {review.tags.map(tag => (
                      <span key={tag} className="text-[10px] font-bold text-gray-400">#{tag}</span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <button 
                    onClick={() => handleLike(review.id!)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-[#1D9E75] transition-colors"
                  >
                    <ThumbsUp size={14} />
                    <span>{review.likes || 0}</span>
                  </button>
                  <button 
                    onClick={() => handleDislike(review.id!)}
                    className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <ThumbsDown size={14} />
                    <span>{review.dislikes || 0}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer Actions */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-4 z-20">
        <button 
          onClick={() => {
            const url = getMapUrl(restaurant.latitude, restaurant.longitude, restaurant.name);
            window.open(url, '_blank');
          }}
          className="flex-1 bg-gray-100 text-gray-900 p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
        >
          <Navigation size={18} />
          {t('getDirections')}
        </button>
      </footer>

      <AddRestaurantModal 
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleUpdateListing}
        onAddReview={handleAddReview}
        initialRestaurant={restaurant}
        selectedCategory={restaurant.type}
      />
    </div>
  );
}
