import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatTileProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string;
  onClick: () => void;
}

export const StatTile: React.FC<StatTileProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  colorClass, 
  onClick 
}) => {
  return (
    <button 
      onClick={onClick}
      className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-start text-left hover:shadow-md hover:border-amber-200 transition-all group w-full"
    >
      <div className={`p-3 rounded-2xl ${colorClass} mb-4 group-hover:scale-110 transition-transform`}>
        <Icon size={24} />
      </div>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{title}</p>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      {subtitle && <p className="text-[10px] font-bold text-gray-400 mt-1">{subtitle}</p>}
    </button>
  );
};
