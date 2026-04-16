import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  X,
  Upload,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Pause,
  Play
} from 'lucide-react';
import { 
  getAllBanners, 
  createBanner, 
  updateBanner, 
  deleteBanner
} from '../../services/banners';
import { getListingsWithStats } from '../../services/listings';
import { Banner, Listing } from '../../types';
import imageCompression from 'browser-image-compression';
import { supabase } from '../../supabase';

export const AdminBannersPage: React.FC = () => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [sortOption, setSortOption] = useState<'expiry' | 'name' | 'status' | 'position'>('expiry');
  
  // Form State
  const [formData, setFormData] = useState({
    name: '',
    restaurant_id: '',
    expiry_date: '',
    start_date: new Date().toISOString().split('T')[0],
    position: 1,
    category: 'food' as 'food' | 'clothes',
    languages: ['uz'] as string[],
    is_paused: false
  });
  const [bannerImages, setBannerImages] = useState<{ [key: string]: File }>({});
  const [bannerPreviews, setBannerPreviews] = useState<{ [key: string]: string }>({});
  const [activeLangTab, setActiveLangTab] = useState('uz');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [bannersData, listingsData] = await Promise.all([
        getAllBanners(),
        getListingsWithStats({})
      ]);
      setBanners(bannersData);
      setListings(listingsData);
    } catch (error) {
      console.error('Error loading banners data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const options = { maxSizeMB: 0.5, maxWidthOrHeight: 1200, useWebWorker: true };
        const compressedFile = await imageCompression(file, options);
        setBannerImages(prev => ({ ...prev, [activeLangTab]: compressedFile }));
        setBannerPreviews(prev => ({ ...prev, [activeLangTab]: URL.createObjectURL(compressedFile) }));
      } catch (error) {
        console.error('Error compressing image:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expiry_date || (!editingBanner && Object.keys(bannerImages).length === 0)) {
      alert('Please fill in all required fields and upload at least one image.');
      return;
    }

    setIsSubmitting(true);
    try {
      const urls: { [key: string]: string } = {};
      
      // Upload new images if any
      for (const lang of ['uz', 'ru', 'en']) {
        const image = bannerImages[lang];
        if (image) {
          const fileExt = image.name.split('.').pop();
          const fileName = `${Math.random()}.${fileExt}`;
          const filePath = `banners/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('restaurant-photos')
            .upload(filePath, image);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('restaurant-photos')
            .getPublicUrl(filePath);
          
          urls[`image_url_${lang}`] = publicUrl;
        }
      }

      const bannerData = {
        restaurant_id: formData.restaurant_id || null,
        end_date: formData.expiry_date,
        start_date: formData.start_date,
        position: formData.position,
        category: formData.category,
        is_paused: formData.is_paused,
        name: formData.name, // Add name field
        is_active: !formData.is_paused, // Map is_paused to is_active
        // If editing, keep old URLs if no new ones uploaded
        image_url: urls.image_url_uz || urls.image_url_ru || urls.image_url_en || (editingBanner?.image_url),
        image_url_uz: urls.image_url_uz || (editingBanner?.image_url_uz),
        image_url_ru: urls.image_url_ru || (editingBanner?.image_url_ru),
        image_url_en: urls.image_url_en || (editingBanner?.image_url_en),
      };

      if (editingBanner) {
        await updateBanner(editingBanner.id, bannerData);
      } else {
        await createBanner(bannerData);
      }

      setIsFormOpen(false);
      setEditingBanner(null);
      setBannerImages({});
      setBannerPreviews({});
      loadData();
    } catch (error) {
      console.error('Error saving banner:', error);
      alert('Failed to save banner.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this banner?')) {
      try {
        await deleteBanner(id);
        setBanners(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error('Error deleting banner:', error);
      }
    }
  };

  const handleTogglePause = async (banner: Banner) => {
    try {
      await updateBanner(banner.id, { is_paused: !banner.is_paused, is_active: banner.is_paused });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, is_paused: !banner.is_paused, is_active: banner.is_paused } : b));
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };

  const handleReorder = async (banner: Banner, direction: 'up' | 'down') => {
    const newPosition = direction === 'up' ? banner.position - 1 : banner.position + 1;
    if (newPosition < 1) return;

    try {
      await updateBanner(banner.id, { position: newPosition });
      setBanners(prev => prev.map(b => b.id === banner.id ? { ...b, position: newPosition } : b));
    } catch (error) {
      console.error('Error reordering banner:', error);
    }
  };

  const sortedBanners = useMemo(() => {
    return [...banners].sort((a, b) => {
      if (sortOption === 'expiry') return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
      if (sortOption === 'name') return (a.restaurant_name || '').localeCompare(b.restaurant_name || '');
      if (sortOption === 'position') return a.position - b.position;
      if (sortOption === 'status') {
        const getStatusOrder = (banner: Banner) => {
          const now = new Date();
          if (new Date(banner.end_date) < now) return 3;
          if (new Date(banner.start_date || '') > now) return 2;
          return 1;
        };
        return getStatusOrder(a) - getStatusOrder(b);
      }
      return 0;
    });
  }, [banners, sortOption]);

  const stats = {
    active: banners.filter(b => {
      const now = new Date();
      return new Date(b.end_date) >= now && new Date(b.start_date || '') <= now && !b.is_paused;
    }).length,
    upcoming: banners.filter(b => new Date(b.start_date || '') > new Date()).length,
    expired: banners.filter(b => new Date(b.end_date) < new Date()).length,
  };

  const openEditForm = (banner: Banner) => {
    setEditingBanner(banner);
    setFormData({
      name: banner.name || '',
      restaurant_id: banner.restaurant_id || '',
      expiry_date: new Date(banner.end_date).toISOString().split('T')[0],
      start_date: new Date(banner.start_date || Date.now()).toISOString().split('T')[0],
      position: banner.position || 1,
      category: banner.category || 'food',
      languages: [
        banner.image_url_uz ? 'uz' : '',
        banner.image_url_ru ? 'ru' : '',
        banner.image_url_en ? 'en' : ''
      ].filter(Boolean),
      is_paused: !!banner.is_paused
    });
    setBannerPreviews({
      uz: banner.image_url_uz || '',
      ru: banner.image_url_ru || '',
      en: banner.image_url_en || ''
    });
    setIsFormOpen(true);
  };

  const openAddForm = () => {
    setEditingBanner(null);
    setFormData({
      name: '',
      restaurant_id: '',
      expiry_date: '',
      start_date: new Date().toISOString().split('T')[0],
      position: banners.length + 1,
      category: 'food',
      languages: ['uz'],
      is_paused: false
    });
    setBannerImages({});
    setBannerPreviews({});
    setIsFormOpen(true);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Ad Banners</h2>
          <p className="text-xs text-gray-500">Manage billboard ads shown at the top of the home screen.</p>
        </div>
        <button 
          onClick={openAddForm}
          className="flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-2xl text-sm font-black shadow-lg shadow-amber-500/20 hover:bg-amber-600 transition-all"
        >
          <Plus size={18} />
          Add Banner
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active</span>
            <span className="text-xl font-black text-green-600">{stats.active}</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Upcoming</span>
            <span className="text-xl font-black text-blue-600">{stats.upcoming}</span>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expired</span>
            <span className="text-xl font-black text-gray-400">{stats.expired}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-bold text-gray-400 whitespace-nowrap">Sort by:</span>
          <select 
            value={sortOption}
            onChange={(e) => setSortOption(e.target.value as any)}
            className="flex-1 sm:w-48 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500/20 appearance-none cursor-pointer"
          >
            <option value="expiry">Expiry (soonest)</option>
            <option value="name">Name</option>
            <option value="status">Status</option>
            <option value="position">Position</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Banner</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Languages</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Expires</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Position</th>
                <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : sortedBanners.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400 text-sm italic">
                    No banners found.
                  </td>
                </tr>
              ) : (
                sortedBanners.map(b => {
                  const now = new Date();
                  const isExpired = new Date(b.end_date) < now;
                  const isUpcoming = new Date(b.start_date || '') > now;
                  const status = b.is_paused ? 'PAUSED' : isExpired ? 'EXPIRED' : isUpcoming ? 'SCHEDULED' : 'ACTIVE';
                  
                  return (
                    <tr key={b.id} className="hover:bg-gray-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-10 rounded-lg overflow-hidden border border-gray-100 shrink-0">
                            <img src={b.image_url} alt="Banner" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900">{b.restaurant_name || 'Unnamed Banner'}</p>
                            {b.restaurant_id && (
                              <a 
                                href={`/restaurants/${b.restaurant_id}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-amber-600 font-bold hover:underline flex items-center gap-1"
                              >
                                Linked listing <ExternalLink size={10} />
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-1">
                          {b.image_url_uz && <span className="px-1.5 py-0.5 bg-green-50 text-[8px] font-black rounded text-green-600 border border-green-100">UZ</span>}
                          {b.image_url_ru && <span className="px-1.5 py-0.5 bg-blue-50 text-[8px] font-black rounded text-blue-600 border border-blue-100">RU</span>}
                          {b.image_url_en && <span className="px-1.5 py-0.5 bg-amber-50 text-[8px] font-black rounded text-amber-600 border border-amber-100">EN</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <p className="text-xs font-bold text-gray-600">{new Date(b.end_date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter border ${
                            status === 'ACTIVE' ? 'bg-green-50 text-green-600 border-green-100' :
                            status === 'SCHEDULED' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            status === 'PAUSED' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-gray-50 text-gray-400 border-gray-200'
                          }`}>
                            {status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <button 
                            onClick={() => handleReorder(b, 'up')}
                            className="p-1 text-gray-300 hover:text-amber-500 transition-colors"
                          >
                            <ChevronUp size={14} />
                          </button>
                          <span className="text-xs font-black text-gray-900">{b.position}</span>
                          <button 
                            onClick={() => handleReorder(b, 'down')}
                            className="p-1 text-gray-300 hover:text-amber-500 transition-colors"
                          >
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleTogglePause(b)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                            title={b.is_paused ? "Resume" : "Pause"}
                          >
                            {b.is_paused ? <Play size={18} /> : <Pause size={18} />}
                          </button>
                          <button 
                            onClick={() => openEditForm(b)}
                            className="p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-all"
                            title="Edit"
                          >
                            <Edit3 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(b.id)}
                            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-xl rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900">{editingBanner ? 'Edit Banner' : 'Add New Banner'}</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Billboard Ad Configuration</p>
                </div>
                <button onClick={() => setIsFormOpen(false)} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Banner Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banner Name / Campaign</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Summer Sale 2024"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                {/* Image Upload Tabs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banner Images</label>
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                      {['uz', 'ru', 'en'].map((lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setActiveLangTab(lang)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeLangTab === lang ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                          }`}
                        >
                          {lang}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div 
                    onClick={() => document.getElementById('banner-upload')?.click()}
                    className={`aspect-[21/9] rounded-3xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 overflow-hidden relative ${
                      bannerPreviews[activeLangTab] ? 'border-amber-500 bg-amber-50' : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
                    }`}
                  >
                    {bannerPreviews[activeLangTab] ? (
                      <>
                        <img src={bannerPreviews[activeLangTab]} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Upload className="text-white" size={32} />
                        </div>
                      </>
                    ) : (
                      <>
                        <Upload className="text-gray-300" size={32} />
                        <p className="text-xs text-gray-400 font-bold">Click to upload {activeLangTab.toUpperCase()} image</p>
                        <p className="text-[10px] text-gray-300">Recommended: 1200x500px</p>
                      </>
                    )}
                    <input 
                      id="banner-upload"
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Category */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</label>
                    <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: 'food' }))}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.category === 'food' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Food
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, category: 'clothes' }))}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          formData.category === 'clothes' ? 'bg-white text-amber-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                        }`}
                      >
                        Clothes
                      </button>
                    </div>
                  </div>

                  {/* Position */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Position / Priority</label>
                    <input 
                      type="number"
                      min="1"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({ ...prev, position: parseInt(e.target.value) }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Linked Listing */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Linked Listing (Optional)</label>
                  <select 
                    value={formData.restaurant_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, restaurant_id: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  >
                    <option value="">No link</option>
                    {listings
                      .filter(l => l.type === formData.category)
                      .map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))
                    }
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Start Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</label>
                    <input 
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Expiry Date</label>
                    <input 
                      type="date"
                      required
                      value={formData.expiry_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <input 
                    type="checkbox"
                    id="is_paused"
                    checked={formData.is_paused}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_paused: e.target.checked }))}
                    className="w-5 h-5 rounded-lg border-amber-300 text-amber-600 focus:ring-amber-500"
                  />
                  <label htmlFor="is_paused" className="text-sm font-bold text-amber-900 cursor-pointer">
                    Pause this banner (hidden from users)
                  </label>
                </div>

                <div className="pt-4">
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-amber-500 text-white py-4 rounded-2xl text-sm font-black shadow-xl shadow-amber-500/20 hover:bg-amber-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <CheckCircle2 size={20} />
                    )}
                    {editingBanner ? 'Update Banner' : 'Create Banner'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
