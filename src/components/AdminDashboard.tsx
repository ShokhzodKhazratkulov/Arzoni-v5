import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  LayoutDashboard, 
  Store, 
  Image as ImageIcon, 
  Bell, 
  TrendingUp, 
  ArrowLeft,
  Send,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AdminOverviewPage } from './admin/AdminOverviewPage';
import { AdminListingsPage } from './admin/AdminListingsPage';
import { AdminBannersPage } from './admin/AdminBannersPage';
import { AdminImportPage } from './admin/AdminImportPage';

interface AdminDashboardProps {
  onBack: () => void;
}

type AdminTab = 'overview' | 'restaurants' | 'banners' | 'import';

export default function AdminDashboard({ onBack }: AdminDashboardProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [listingsFilter, setListingsFilter] = useState<string>('all');

  const handleNavigate = (tab: 'restaurants' | 'banners', filter?: string) => {
    if (tab === 'restaurants') {
      setListingsFilter(filter || 'all');
      setActiveTab('restaurants');
    } else {
      setActiveTab('banners');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                <LayoutDashboard className="text-amber-500" size={24} />
                {t('adminDashboard')}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Management Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end leading-none mr-2">
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-tighter">System Administrator</span>
              <span className="text-[9px] font-bold text-gray-400">Live Control</span>
            </div>
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 border border-amber-100">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 p-6 space-y-2 border-r border-gray-100 bg-white/50">
          <button 
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'overview' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <LayoutDashboard size={18} />
            Overview
          </button>
          <button 
            onClick={() => {
              setListingsFilter('all');
              setActiveTab('restaurants');
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'restaurants' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Store size={18} />
            Restaurants & Shops
          </button>
          <button 
            onClick={() => setActiveTab('banners')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'banners' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <ImageIcon size={18} />
            Ad Banners
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
              activeTab === 'import' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Download size={18} />
            Google Import
          </button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <AdminOverviewPage key="overview" onNavigate={handleNavigate} />
            )}

            {activeTab === 'restaurants' && (
              <AdminListingsPage key="restaurants" initialFilter={listingsFilter} />
            )}

            {activeTab === 'banners' && (
              <AdminBannersPage key="banners" />
            )}

            {activeTab === 'import' && (
              <AdminImportPage key="import" />
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
