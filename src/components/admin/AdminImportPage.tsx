import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Download, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  MapPin,
  Utensils,
  Shirt
} from 'lucide-react';
import { importFromGoogle, ImportStats } from '../../services/googleImport';
import { ListingType } from '../../types';
import { APIProvider } from '@vis.gl/react-google-maps';

export function AdminImportPage() {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <APIProvider apiKey={apiKey} libraries={['places']}>
      <AdminImportContent />
    </APIProvider>
  );
}

function AdminImportContent() {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [stats, setStats] = useState<ImportStats | null>(null);
  const [selectedType, setSelectedType] = useState<ListingType>('food');

  const handleImport = async () => {
    if (importing) return;
    
    setImporting(true);
    setStats({
      totalFound: 0,
      totalImported: 0,
      totalSkipped: 0,
      errors: []
    });

    try {
      await importFromGoogle(selectedType, (currentStats) => {
        setStats({ ...currentStats });
      });
    } catch (error: any) {
      console.error('Import failed:', error);
      setStats(prev => ({
        ...prev!,
        errors: [...(prev?.errors || []), error.message]
      }));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Download size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Google Maps Import</h2>
            <p className="text-sm text-gray-500 font-medium">Bulk import restaurants and shops from Google Places API</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-4">
            <label className="text-sm font-black text-gray-700 uppercase tracking-wider">Select Category</label>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedType('food')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedType === 'food' 
                    ? 'border-amber-500 bg-amber-50 text-amber-700' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <Utensils size={20} />
                <span className="font-bold">Restaurants</span>
              </button>
              <button
                onClick={() => setSelectedType('clothes')}
                className={`flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                  selectedType === 'clothes' 
                    ? 'border-amber-500 bg-amber-50 text-amber-700' 
                    : 'border-gray-100 bg-white text-gray-500 hover:border-gray-200'
                }`}
              >
                <Shirt size={20} />
                <span className="font-bold">Shops</span>
              </button>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
              <div className="space-y-1">
                <p className="text-sm font-bold text-blue-900">Important Note</p>
                <p className="text-xs text-blue-700 leading-relaxed">
                  This tool uses a grid search (9 points) across Tashkent. Each point searches a 3km radius. 
                  Duplicate places are automatically skipped based on their Google Place ID.
                </p>
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={handleImport}
          disabled={importing}
          className={`w-full flex items-center justify-center gap-3 p-5 rounded-2xl font-black text-lg shadow-lg transition-all ${
            importing 
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
              : 'bg-amber-500 text-white hover:bg-amber-600 hover:scale-[1.01] active:scale-[0.99]'
          }`}
        >
          {importing ? (
            <>
              <Loader2 className="animate-spin" size={24} />
              Importing Data...
            </>
          ) : (
            <>
              <Search size={24} />
              Start Tashkent Bulk Import
            </>
          )}
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
              <Search size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Found</p>
              <p className="text-2xl font-black text-gray-900">{stats.totalFound}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Imported</p>
              <p className="text-2xl font-black text-gray-900">{stats.totalImported}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
              <MapPin size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Skipped</p>
              <p className="text-2xl font-black text-gray-900">{stats.totalSkipped}</p>
            </div>
          </div>
        </div>
      )}

      {stats?.errors && stats.errors.length > 0 && (
        <div className="bg-red-50 rounded-3xl p-6 border border-red-100">
          <h3 className="text-sm font-black text-red-900 mb-3 flex items-center gap-2">
            <AlertCircle size={16} />
            Import Errors ({stats.errors.length})
          </h3>
          <div className="max-h-40 overflow-y-auto space-y-2">
            {stats.errors.map((error, i) => (
              <p key={i} className="text-xs text-red-700 font-medium bg-white/50 p-2 rounded-lg">
                {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
