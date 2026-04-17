import React, { useState, useEffect, useMemo, ErrorInfo, ReactNode } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import AddReviewPage from './components/AddReviewPage';
import RestaurantDetailPage from './components/RestaurantDetailPage';
import { Listing, Banner, SortOption, ListingType } from './types';
import { seedDatabase } from './seed';
import { PRICE_RANGES, CLOTHING_PRICE_RANGES } from './constants';
import Navbar from './components/Navbar';
import FilterBar from './components/FilterBar';
import RestaurantList from './components/RestaurantList';
import MapContainer from './components/MapContainer';
import AddRestaurantModal from './components/AddRestaurantModal';
import AdminDashboard from './components/AdminDashboard';
import LoginPage from './components/LoginPage';
import './i18n';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Map as MapIcon, LayoutList, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { getListingsWithStats, createListing, updateListing } from './services/listings';
import { getActiveBanners } from './services/banners';
import { createReview } from './services/reviews';
import { useVisitTracking } from './lib/useVisitTracking';
import { uploadImage } from './lib/utils';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "Something went wrong.";
      try {
        const parsed = JSON.parse(this.state.error?.message || "{}");
        if (parsed.error) errorMessage = parsed.error;
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Error</h2>
            <p className="text-gray-600 mb-8">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#1D9E75] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#168a65] transition-all"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  
  // Track anonymous visit
  useVisitTracking();

  const [showAdmin, setShowAdmin] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [isBannerPaused, setIsBannerPaused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ListingType>('food');
  const [selectedDish, setSelectedDish] = useState<string>('All');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [sortOption, setSortOption] = useState<SortOption>('price_asc');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [isAddRestaurantOpen, setIsAddRestaurantOpen] = useState(false);
  const [customDish, setCustomDish] = useState<string>('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const listingsData = await getListingsWithStats({
        type: selectedCategory,
        selectedDish: selectedDish,
        customDish: customDish,
        sort: sortOption
      });
      
      if (listingsData.length === 0 && selectedDish === 'All') {
        await seedDatabase();
        // Re-fetch after seeding
        const seededData = await getListingsWithStats({
          type: selectedCategory,
          selectedDish: selectedDish,
          customDish: customDish,
          sort: sortOption
        });
        setListings(seededData);
      } else {
        setListings(listingsData);
      }

      const bannersData = await getActiveBanners();
      setBanners(bannersData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, selectedDish === 'custom' ? 500 : 0);
    
    return () => clearTimeout(timer);
  }, [selectedCategory, selectedDish, customDish, sortOption]);

  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // If "custom" dish is selected, we filter by the custom string
      if (selectedDish === 'custom' && customDish) {
        // Check if any review has this dish or if it matches the listing's popular dishes
        const matchesName = listing.name.toLowerCase().includes(customDish.toLowerCase());
        const matchesDish = listing.dishes?.some(d => d.toLowerCase().includes(customDish.toLowerCase()));
        const hasSpecificReview = listing.dishStats && Object.keys(listing.dishStats).some(d => d.toLowerCase().includes(customDish.toLowerCase()));
        
        if (!matchesName && !matchesDish && !hasSpecificReview) return false;
      }

      // Determine the correct price for filtering
      let priceToFilter = listing.avg_price;
      if (selectedDish === 'custom' && customDish) {
        const search = customDish.toLowerCase();
        const matchingKey = Object.keys(listing.dishStats || {}).find(k => k.toLowerCase() === search);
        if (matchingKey && listing.dishStats) {
          priceToFilter = listing.dishStats[matchingKey].avgPrice;
        }
      } else if (selectedDish !== 'All' && selectedDish !== 'custom') {
        priceToFilter = listing.dishStats?.[selectedDish]?.avgPrice || listing.avg_price;
      }
      
      // Price filter
      let matchesPrice = true;
      if (selectedPriceRange !== 'all' && priceToFilter !== undefined) {
        const ranges = selectedCategory === 'food' ? PRICE_RANGES : CLOTHING_PRICE_RANGES;
        const range = ranges.find(r => r.id === selectedPriceRange);
        if (range) {
          matchesPrice = priceToFilter >= range.min && priceToFilter <= range.max;
        } else if (selectedPriceRange === 'custom') {
          matchesPrice = customPrice === 0 || priceToFilter <= customPrice;
        }
      }

      return matchesPrice;
    });
  }, [listings, selectedDish, selectedPriceRange, customPrice, selectedCategory, customDish]);

  const filteredBanners = useMemo(() => {
    return banners.filter(banner => banner.category === selectedCategory);
  }, [banners, selectedCategory]);

  useEffect(() => {
    if (filteredBanners.length <= 1 || isBannerPaused) return;

    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % filteredBanners.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [filteredBanners.length, isBannerPaused]);

  const handleBannerClick = (banner: Banner) => {
    if (banner.restaurant_id) {
      navigate(`/restaurants/${banner.restaurant_id}`);
    }
  };

  const handleAddRestaurant = async (data: any) => {
    try {
      const { photoFiles, id, ...listingData } = data;
      
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
      
      if (id) {
        await updateListing(id, finalData);
      } else {
        await createListing(finalData);
      }
      
      fetchData();
      setIsAddRestaurantOpen(false);
    } catch (error) {
      console.error('Error saving restaurant:', error);
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

  const getBannerImage = (banner: Banner) => {
    const lang = i18n.language;
    if (lang === 'uz' && banner.image_url_uz) return banner.image_url_uz;
    if (lang === 'ru' && banner.image_url_ru) return banner.image_url_ru;
    if (lang === 'en' && banner.image_url_en) return banner.image_url_en;
    return banner.image_url;
  };

  if (showAdmin && isAdmin) {
    return <AdminDashboard onBack={() => setShowAdmin(false)} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
        <Navbar onAdminClick={() => setShowAdmin(true)} />
        
        <Routes>
          <Route path="/" element={
            <main className="flex-1 flex flex-col">
              {/* Banner Section */}
              {filteredBanners.length > 0 && (
                <div className="w-full bg-white border-b border-gray-100 pt-1 pb-2 overflow-hidden">
                  <div className="max-w-[1600px] mx-auto px-2 sm:px-4">
                    <div className="lg:hidden relative h-[140px] sm:h-[160px] w-full overflow-hidden rounded-3xl shadow-xl shadow-gray-200/50">
                      <AnimatePresence mode="wait">
                        {filteredBanners[activeBannerIndex] && (
                          <motion.div 
                            key={filteredBanners[activeBannerIndex].id}
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="absolute inset-0"
                            onClick={() => handleBannerClick(filteredBanners[activeBannerIndex])}
                          >
                            <img 
                              src={getBannerImage(filteredBanners[activeBannerIndex])} 
                              alt="Banner" 
                              className="w-full h-full object-cover" 
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="hidden lg:grid grid-cols-3 gap-4">
                      {filteredBanners.slice(0, 3).map((banner) => (
                        <div 
                          key={banner.id}
                          onClick={() => handleBannerClick(banner)}
                          className="relative h-[130px] rounded-2xl overflow-hidden shadow-lg border border-gray-100 cursor-pointer"
                        >
                          <img src={getBannerImage(banner)} alt="Banner" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <FilterBar 
                selectedCategory={selectedCategory}
                setSelectedCategory={(cat) => {
                  setSelectedCategory(cat as ListingType);
                  setSelectedDish('All');
                  setSelectedPriceRange('all');
                }}
                selectedDishes={[selectedDish]}
                setSelectedDishes={(dishes) => setSelectedDish(dishes[0] || 'All')}
                selectedPriceRange={selectedPriceRange}
                setSelectedPriceRange={setSelectedPriceRange}
                customPrice={customPrice}
                setCustomPrice={setCustomPrice}
                customDish={customDish}
                setCustomDish={setCustomDish}
              />

              {/* View Mode Toggle */}
              <div className="max-w-7xl mx-auto px-4 py-2 flex justify-end">
                <div className="bg-white rounded-xl border border-gray-100 p-1 flex shadow-sm">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'list' ? 'bg-[#1D9E75] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <LayoutList size={14} />
                    {t('listView') || 'List'}
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      viewMode === 'map' ? 'bg-[#1D9E75] text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <MapIcon size={14} />
                    {t('mapView') || 'Map'}
                  </button>
                </div>
              </div>

              {viewMode === 'map' ? (
                <div className="max-w-7xl mx-auto px-4 py-4 w-full space-y-4">
                  {/* Trust Note and Add Button - Only on Map Page */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-100/50">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <p className="text-[10px] sm:text-xs font-bold text-amber-800 leading-tight">
                        {t('trustNote')}
                      </p>
                    </div>
                    
                    <button
                      onClick={() => setIsAddRestaurantOpen(true)}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-[#1D9E75] text-white rounded-xl font-black shadow-lg hover:bg-[#168a65] transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-white">
                        +
                      </div>
                      {t('addPlaceCTA')}
                    </button>
                  </div>

                  <MapContainer 
                    restaurants={filteredListings}
                    onAddRestaurant={() => setIsAddRestaurantOpen(true)}
                    selectedDishes={[selectedDish]}
                    selectedCategory={selectedCategory}
                  />
                </div>
              ) : (
                <RestaurantList 
                  restaurants={filteredListings}
                  sortOption={sortOption}
                  setSortOption={setSortOption}
                  onAddReview={(r) => navigate(`/restaurants/${r.id}/review`)}
                  onAddRestaurantClick={() => setIsAddRestaurantOpen(true)}
                  selectedDishes={[selectedDish]}
                  selectedCategory={selectedCategory}
                  isFilterActive={selectedDish !== 'All' || selectedPriceRange !== 'all'}
                  customDish={customDish}
                />
              )}
            </main>
          } />
          <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
          <Route path="/place/:id" element={<RestaurantDetailPage />} />
          <Route path="/restaurants/:id/review" element={<AddReviewPage onReviewAdded={fetchData} />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>

        <AddRestaurantModal 
          isOpen={isAddRestaurantOpen}
          onClose={() => setIsAddRestaurantOpen(false)}
          onSubmit={handleAddRestaurant}
          onAddReview={handleAddReview}
          selectedCategory={selectedCategory}
        />

        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[200] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 w-full max-w-xs px-6">
              <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#1D9E75] font-bold animate-pulse">{t('loading')}</p>
            </div>
          </div>
        )}

        <footer className="bg-white border-t border-gray-100 py-12 px-4 mt-20">
          <div className="max-w-7xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#1D9E75] rounded-lg flex items-center justify-center text-white shadow-sm">
                <MapPin size={18} />
              </div>
              <span className="text-xl font-black text-gray-900 tracking-tighter">{t('appName')}</span>
            </div>
            <p className="text-sm text-gray-500 font-bold mb-2">
              {t('tagline')}
            </p>
            <p className="text-xs text-gray-400 font-medium">
              &copy; {new Date().getFullYear()} Arzoni. {t('trustNote')}
            </p>
          </div>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
