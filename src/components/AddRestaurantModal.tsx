import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, MapPin, Camera, Star, Search, Loader2, AlertTriangle } from 'lucide-react';
import { DISH_TYPES, CLOTHING_TYPES, TASHKENT_CENTER } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { supabase } from '../supabase';
import { Listing } from '../types';

import { useAuth } from '../lib/AuthContext';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface AddRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  onAddReview: (restaurantId: string, reviewData: any) => void;
  initialRestaurant?: Listing | null;
  selectedCategory: 'food' | 'clothes';
}

export default function AddRestaurantModal({ isOpen, onClose, onSubmit, onAddReview, initialRestaurant, selectedCategory }: AddRestaurantModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    dishes: [] as string[],
    price: 0,
    description: '',
    workingHours: '',
    phone: '',
    socialLink: '',
    submitter: '',
    location: TASHKENT_CENTER,
    category: selectedCategory
  });

  const themeColor = formData.category === 'food' ? '#1D9E75' : '#3B82F6';
  const themeBg = formData.category === 'food' ? 'bg-[#1D9E75]' : 'bg-blue-500';
  const themeText = formData.category === 'food' ? 'text-[#1D9E75]' : 'text-blue-500';
  const themeRing = formData.category === 'food' ? 'focus:ring-[#1D9E75]' : 'focus:ring-blue-500';
  const themeHover = formData.category === 'food' ? 'hover:bg-[#168a65]' : 'hover:bg-blue-600';

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapRef = useRef<google.maps.Map | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialRestaurant) {
        setFormData({
          name: initialRestaurant.name || '',
          address: initialRestaurant.address || '',
          dishes: initialRestaurant.dishes || [],
          price: initialRestaurant.avg_price || 0,
          description: initialRestaurant.description || '',
          workingHours: initialRestaurant.working_hours || '',
          phone: initialRestaurant.phone || '',
          socialLink: initialRestaurant.social_link || '',
          submitter: '',
          location: { lat: initialRestaurant.latitude, lng: initialRestaurant.longitude },
          category: initialRestaurant.type || selectedCategory
        });
        setPhotos(initialRestaurant.photo_urls || (initialRestaurant.photo_url ? [initialRestaurant.photo_url] : []));
      } else {
        setPhotos([]);
        setPhotoFiles([]);
        setFormData({
          name: '',
          address: '',
          dishes: [],
          price: 0,
          description: '',
          workingHours: '',
          phone: '',
          socialLink: '',
          submitter: '',
          location: TASHKENT_CENTER,
          category: selectedCategory
        });
      }
    }
  }, [isOpen, initialRestaurant, selectedCategory]);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    const validFiles = newFiles.filter(file => {
      if (file.size > 5 * 1024 * 1024) {
        setLocalError(t('imageTooLarge') || "Image is too large. Max 5MB.");
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setLocalError(null);
    setPhotoFiles(prev => [...prev, ...validFiles]);
    
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    // Note: photoFiles might be harder to sync if we have mixed existing URLs and new files
    // But we'll handle it in handleSubmit by filtering out data URLs
  };

  const toggleDish = (id: string) => {
    if (formData.dishes.includes(id)) {
      setFormData({ ...formData, dishes: formData.dishes.filter(d => d !== id) });
    } else {
      setFormData({ ...formData, dishes: [...formData.dishes, id] });
    }
  };

  const handleRecenter = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setFormData({
          ...formData,
          location: newLocation
        });
        if (mapRef.current) {
          mapRef.current.panTo(newLocation);
        }
      });
    }
  };

  const handleMapClick = (e: any) => {
    if (e.detail.latLng) {
      setFormData(prev => ({
        ...prev,
        location: {
          lat: e.detail.latLng.lat,
          lng: e.detail.latLng.lng
        }
      }));
    }
  };

  const handleMarkerDragEnd = (e: any) => {
    if (e.latLng) {
      setFormData(prev => ({
        ...prev,
        location: {
          lat: e.latLng.lat(),
          lng: e.latLng.lng()
        }
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        id: initialRestaurant?.id,
        name: formData.name,
        address: formData.address,
        working_hours: formData.workingHours,
        phone: formData.phone,
        social_link: formData.socialLink,
        description: formData.description,
        latitude: formData.location.lat,
        longitude: formData.location.lng,
        type: formData.category,
        dishes: formData.dishes,
        is_active: true,
        is_sponsored: initialRestaurant?.is_sponsored || false,
        is_verified: initialRestaurant?.is_verified || false,
        photoFiles: photoFiles,
        photo_urls: photos.filter(p => p.startsWith('http')), // Keep existing URLs
        photo_url: photos.find(p => p.startsWith('http')) || initialRestaurant?.photo_url,
        created_at: initialRestaurant?.created_at || new Date().toISOString()
      });
      onClose();
    } catch (error: any) {
      console.error('Submit error:', error);
      setLocalError(error.message || String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderPhotoSection = () => (
    <div className="space-y-2">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
        <Camera size={12} />
        {t('addPhoto')}
      </label>
      <div className="flex flex-wrap gap-4">
        {photos.map((p, idx) => (
          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-gray-200 group">
            <img src={p} alt="Captured" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removePhoto(idx)}
              className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
            >
              <X size={20} />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className={`w-24 h-24 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-[#1D9E75] hover:text-[#1D9E75] transition-all`}
        >
          <Camera size={24} />
          <span className="text-[10px] font-bold mt-1 uppercase">{t('takePhoto')}</span>
        </button>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          ref={fileInputRef}
          onChange={handleCapture}
          className="hidden"
        />
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]"
          >
            <div className={`p-6 border-b border-gray-100 flex justify-between items-center ${themeBg} text-white`}>
              <h2 className="text-xl font-bold">
                {initialRestaurant 
                  ? t('editPlace') 
                  : (formData.category === 'food' ? t('addRestaurant') : t('addShop'))
                }
              </h2>
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-all">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
              {localError && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p>{localError}</p>
                </div>
              )}
              
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    {t('formBasicInfo')}
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formCategory')}</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, category: 'food' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all",
                          formData.category === 'food' 
                            ? "bg-[#1D9E75] border-[#1D9E75] text-white shadow-md" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {t('categoryFood')}
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, category: 'clothes' })}
                        className={cn(
                          "flex-1 py-3 rounded-xl font-bold text-sm border-2 transition-all",
                          formData.category === 'clothes' 
                            ? "bg-blue-500 border-blue-500 text-white shadow-md" 
                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200"
                        )}
                      >
                        {t('categoryClothes')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="restaurant-name" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formName')}</label>
                    <input
                      required
                      id="restaurant-name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                      placeholder={formData.category === 'food' ? t('searchRestaurantPlaceholder') : t('searchShopPlaceholder')}
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="restaurant-address" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formAddress')}</label>
                    <input
                      required
                      id="restaurant-address"
                      name="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                      placeholder="e.g. Beruniy ko'chasi, 12"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="restaurant-description" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('description')}</label>
                    <textarea
                      id="restaurant-description"
                      name="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none resize-none`}
                      placeholder={t('commentPlaceholder')}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <MapPin size={12} />
                      {t('selectOnMap')}
                    </label>
                    <div className="h-[220px] w-full rounded-xl overflow-hidden border border-gray-200 relative mb-2">
                      <APIProvider apiKey={apiKey} libraries={['places']}>
                        <Map
                          defaultCenter={formData.location}
                          defaultZoom={13}
                          mapId="ADD_PLACE_MAP"
                          onClick={handleMapClick}
                          onIdle={(e) => {
                            mapRef.current = e.map;
                          }}
                          disableDefaultUI={true}
                          zoomControl={true}
                          gestureHandling={'greedy'}
                        >
                          <AdvancedMarker 
                            position={formData.location}
                            draggable={true}
                            onDragEnd={handleMarkerDragEnd}
                          >
                            <Pin background={themeColor} borderColor={'#ffffff'} glyphColor={'#ffffff'} />
                          </AdvancedMarker>
                        </Map>
                      </APIProvider>
                      <button
                        type="button"
                        onClick={handleRecenter}
                        className={`absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg border border-gray-200 ${themeText} hover:bg-gray-50 transition-all z-10`}
                      >
                        <MapPin size={20} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Working Hours */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    {t('workingHours')}
                  </h3>
                  <input
                    id="working-hours"
                    name="workingHours"
                    type="text"
                    value={formData.workingHours}
                    onChange={(e) => setFormData({ ...formData, workingHours: e.target.value })}
                    className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                    placeholder="e.g. Har kuni 09:00 – 22:00"
                  />
                </div>

                {/* Dishes / Products */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    {formData.category === 'food' ? t('formDishesFood') : t('formDishesClothes')}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(formData.category === 'food' ? DISH_TYPES : CLOTHING_TYPES).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleDish(item.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2",
                          formData.dishes.includes(item.id)
                            ? `${themeBg} border-transparent text-white shadow-sm`
                            : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                        )}
                      >
                        {t(item.label)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Contact Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-2">
                    {t('formContact')}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label htmlFor="phone" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formPhone')}</label>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                        placeholder="+998 90 123 45 67"
                      />
                    </div>
                    <div className="space-y-1">
                      <label htmlFor="social-link" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formSocial')}</label>
                      <input
                        id="social-link"
                        name="socialLink"
                        type="text"
                        value={formData.socialLink}
                        onChange={(e) => setFormData({ ...formData, socialLink: e.target.value })}
                        className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                        placeholder="@username or link"
                      />
                    </div>
                  </div>
                </div>

                {renderPhotoSection()}

                <div className="space-y-1">
                  <label htmlFor="submitter" className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('formSubmitter')}</label>
                  <input
                    id="submitter"
                    name="submitter"
                    type="text"
                    value={formData.submitter}
                    onChange={(e) => setFormData({ ...formData, submitter: e.target.value })}
                    className={`w-full px-4 py-2 border border-gray-200 rounded-xl ${themeRing} focus:outline-none`}
                    placeholder={t('anonymous')}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-all"
                >
                  {t('cancel') || "Cancel"}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-6 py-3 ${themeBg} text-white rounded-xl font-black ${themeHover} transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('saving')}
                    </>
                  ) : (
                    t('submit')
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
