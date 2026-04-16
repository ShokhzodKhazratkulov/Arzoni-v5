import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  Store, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { StatTile } from './StatTile';
import { getListingsWithStats } from '../../services/listings';
import { getAllBanners } from '../../services/banners';
import { Listing, Banner } from '../../types';

interface AdminOverviewPageProps {
  onNavigate: (tab: 'restaurants' | 'banners', filter?: string) => void;
}

export const AdminOverviewPage: React.FC<AdminOverviewPageProps> = ({ onNavigate }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [listingsData, bannersData] = await Promise.all([
          getListingsWithStats({}),
          getAllBanners()
        ]);
        setListings(listingsData);
        setBanners(bannersData);
      } catch (error) {
        console.error('Error loading overview data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const stats = {
    total: listings.length,
    food: listings.filter(l => l.type === 'food').length,
    clothes: listings.filter(l => l.type === 'clothes').length,
    sponsored: listings.filter(l => l.is_sponsored).length,
    verified: listings.filter(l => l.is_verified).length,
    lowData: listings.filter(l => (l.totalReviewCount || 0) <= 1).length,
  };

  const topReviewed = [...listings]
    .sort((a, b) => (b.totalReviewCount || 0) - (a.totalReviewCount || 0))
    .slice(0, 5);

  const recentBanners = [...banners]
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())
    .slice(0, 5);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl font-black text-gray-900">Overview</h2>
        <p className="text-gray-500 text-sm">From here you can manage your listings, advertising, and communication with users.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatTile 
          title="Total Listings"
          value={stats.total}
          subtitle={`Ovqat: ${stats.food}, Kiyim: ${stats.clothes}`}
          icon={Store}
          colorClass="bg-gray-50 text-gray-600"
          onClick={() => onNavigate('restaurants', 'all')}
        />
        <StatTile 
          title="Sponsored"
          value={stats.sponsored}
          icon={Star}
          colorClass="bg-amber-50 text-amber-600"
          onClick={() => onNavigate('restaurants', 'sponsored')}
        />
        <StatTile 
          title="Verified"
          value={stats.verified}
          icon={CheckCircle2}
          colorClass="bg-blue-50 text-blue-600"
          onClick={() => onNavigate('restaurants', 'verified')}
        />
        <StatTile 
          title="≤ 1 sharh"
          value={stats.lowData}
          icon={AlertCircle}
          colorClass="bg-red-50 text-red-600"
          onClick={() => onNavigate('restaurants', 'low-data')}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Reviewed */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <TrendingUp className="text-amber-500" size={20} />
              Top 5 most-reviewed listings
            </h3>
          </div>
          <div className="space-y-4">
            {topReviewed.map((l, i) => (
              <div key={l.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-gray-300 w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{l.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-black">{l.type}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-amber-600">{l.totalReviewCount} reviews</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Banners */}
        <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
              <Calendar className="text-blue-500" size={20} />
              Recent banners
            </h3>
            <button 
              onClick={() => onNavigate('banners')}
              className="text-xs font-black text-blue-600 flex items-center gap-1 hover:underline"
            >
              View All <ArrowRight size={14} />
            </button>
          </div>
          <div className="space-y-4">
            {recentBanners.map((b) => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200">
                    <img src={b.image_url} alt="Banner" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{b.restaurant_name || 'Unnamed Banner'}</p>
                    <p className="text-[10px] text-gray-400">Expires: {new Date(b.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase ${
                  new Date(b.end_date) >= new Date() ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  {new Date(b.end_date) >= new Date() ? 'Active' : 'Expired'}
                </div>
              </div>
            ))}
            {recentBanners.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8 italic">No banners found.</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
