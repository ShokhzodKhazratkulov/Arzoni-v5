import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  Search, 
  CheckCircle2, 
  MapPin, 
  ExternalLink, 
  Trash2, 
  Edit3,
  Filter,
  AlertCircle
} from 'lucide-react';
import { 
  getListingsWithStats, 
  deleteListing, 
  setListingVerified, 
  setListingSponsored,
  updateListing
} from '../../services/listings';
import { Listing } from '../../types';

interface AdminListingsPageProps {
  initialFilter?: string;
}

export const AdminListingsPage: React.FC<AdminListingsPageProps> = ({ initialFilter = 'all' }) => {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryTab, setCategoryTab] = useState<'all' | 'food' | 'clothes'>('all');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    setLoading(true);
    try {
      const data = await getListingsWithStats({});
      setListings(data);
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        await deleteListing(id);
        setListings(prev => prev.filter(l => l.id !== id));
        showToast('Listing deleted successfully');
      } catch (error) {
        console.error('Error deleting listing:', error);
        showToast('Failed to delete listing', 'error');
      }
    }
  };

  const handleToggleSponsored = async (id: string, current: boolean) => {
    try {
      await setListingSponsored(id, !current);
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_sponsored: !current } : l));
      showToast(current ? 'Promotion removed' : 'Listing promoted to top');
    } catch (error) {
      console.error('Error toggling sponsored:', error);
      showToast('Failed to update status', 'error');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await setListingVerified(id, true);
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_verified: true } : l));
      showToast('Listing marked as verified');
    } catch (error) {
      console.error('Error verifying listing:', error);
      showToast('Failed to verify listing', 'error');
    }
  };

  const handleUnverify = async (id: string) => {
    try {
      await setListingVerified(id, false);
      setListings(prev => prev.map(l => l.id === id ? { ...l, is_verified: false } : l));
      showToast('Listing unverified');
    } catch (error) {
      console.error('Error unverifying listing:', error);
      showToast('Failed to unverify listing', 'error');
    }
  };

  const filteredListings = useMemo(() => {
    return listings.filter(l => {
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryTab === 'all' || l.type === categoryTab;
      
      let matchesStatus = true;
      if (statusFilter === 'sponsored') matchesStatus = !!l.is_sponsored;
      else if (statusFilter === 'verified') matchesStatus = !!l.is_verified;
      else if (statusFilter === 'low-data') matchesStatus = (l.totalReviewCount || 0) <= 1;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [listings, searchQuery, categoryTab, statusFilter]);

  const counts = {
    all: listings.length,
    food: listings.filter(l => l.type === 'food').length,
    clothes: listings.filter(l => l.type === 'clothes').length,
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-gray-900">Manage Listings</h2>
          <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
            <button 
              onClick={() => setCategoryTab('all')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                categoryTab === 'all' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              All ({counts.all})
            </button>
            <button 
              onClick={() => setCategoryTab('food')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                categoryTab === 'food' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Ovqat ({counts.food})
            </button>
            <button 
              onClick={() => setCategoryTab('clothes')}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                categoryTab === 'clothes' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Kiyim ({counts.clothes})
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text"
              placeholder="Search by name or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-2xl text-sm font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
            >
              <option value="all">Filter: All</option>
              <option value="sponsored">Sponsored</option>
              <option value="verified">Verified</option>
              <option value="low-data">Low data (≤ 1 sharh)</option>
            </select>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3 animate-bounce ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Listing</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Sponsored</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Verified</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredListings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-20 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <p className="text-gray-400 font-bold">No listings found</p>
                      <p className="text-xs text-gray-400">Try adjusting your filters or search query.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredListings.map(l => (
                  <tr key={l.id} className="hover:bg-gray-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 shrink-0">
                          <img 
                            src={`https://picsum.photos/seed/${l.name}/100/100`} 
                            alt={l.name} 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div>
                          <a 
                            href={`/restaurants/${l.id}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-black text-gray-900 hover:text-amber-600 flex items-center gap-1.5 transition-colors"
                          >
                            {l.name}
                            <ExternalLink size={12} className="text-gray-300" />
                          </a>
                          <p className="text-[10px] text-gray-400 font-bold flex items-center gap-1 mt-0.5">
                            <MapPin size={10} />
                            {l.address}
                          </p>
                          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter ${
                            l.type === 'food' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {l.type === 'food' ? 'Ovqat' : 'Kiyim'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        {l.is_sponsored ? (
                          <>
                            <span className="px-2.5 py-1 bg-amber-50 text-amber-600 text-[10px] font-black rounded-lg uppercase tracking-tighter border border-amber-100">
                              Sponsored
                            </span>
                            <button 
                              onClick={() => handleToggleSponsored(l.id!, true)}
                              className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Remove Promotion
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleToggleSponsored(l.id!, false)}
                            className="px-4 py-2 bg-white border-2 border-amber-500 text-amber-600 text-[10px] font-black rounded-xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                          >
                            Promote to Top
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        {l.is_verified ? (
                          <>
                            <div className="flex items-center gap-1 text-blue-600">
                              <CheckCircle2 size={16} />
                              <span className="text-[10px] font-black uppercase tracking-tighter">Verified</span>
                            </div>
                            <button 
                              onClick={() => handleUnverify(l.id!)}
                              className="text-[10px] font-bold text-gray-400 hover:text-red-500 transition-colors"
                            >
                              Unverify
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => handleVerify(l.id!)}
                            className="px-4 py-2 bg-white border-2 border-blue-500 text-blue-600 text-[10px] font-black rounded-xl hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                          >
                            Mark as Verified
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => window.open(`/map?id=${l.id}`, '_blank')}
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                          title="View on map"
                        >
                          <MapPin size={18} />
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                          title="Edit"
                        >
                          <Edit3 size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(l.id!, l.name)}
                          className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                          title="Delete"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
