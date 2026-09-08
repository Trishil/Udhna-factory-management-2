import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  Search, 
  Plus, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  SlidersHorizontal,
  Edit,
  Trash2,
  Package
} from 'lucide-react';
import { RawMaterial, Machine } from '../../types';

interface MobileInventoryViewProps {
  materials: RawMaterial[];
  machines?: Machine[];
  onOpenAddMaterial: () => void;
  onOpenQuickAdjust: (material: RawMaterial, type: 'restock' | 'consumption') => void;
  onEditMaterial: (material: RawMaterial) => void;
  onDeleteMaterial: (id: string, name: string) => void;
}

export const MobileInventoryView: React.FC<MobileInventoryViewProps> = ({
  materials,
  onOpenAddMaterial,
  onOpenQuickAdjust,
  onEditMaterial,
  onDeleteMaterial
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    materials.forEach(m => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [materials]);

  // Statistics
  const lowStockCount = materials.filter(m => m.currentStock <= m.minThreshold).length;
  const totalValuation = materials.reduce((acc, m) => acc + (m.currentStock * m.unitCost), 0);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return materials.filter(m => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        m.name.toLowerCase().includes(q) || 
        (m.category || '').toLowerCase().includes(q) ||
        (m.colorName || '').toLowerCase().includes(q) ||
        (m.colorCode || '').toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || m.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || m.currentStock <= m.minThreshold;

      return matchesSearch && matchesCat && matchesLowStock;
    });
  }, [materials, searchQuery, selectedCategory, showLowStockOnly]);

  return (
    <div className="space-y-4 pb-20">
      
      {/* Executive Metrics Bar */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Total SKUs</span>
          <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">{materials.length}</span>
        </div>

        <div 
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            lowStockCount > 0 
              ? showLowStockOnly ? 'bg-amber-100 border-amber-400' : 'bg-amber-50/70 border-amber-200'
              : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase block">Low Stock</span>
          <span className="text-base font-black text-amber-900 font-mono mt-0.5 block flex items-center space-x-1">
            <span>{lowStockCount}</span>
            {lowStockCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
          </span>
        </div>

        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">Valuation</span>
          <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block truncate">
            ₹{totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search materials, threads, dyes..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={onOpenAddMaterial}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 ${
              selectedCategory === 'all' 
                ? 'bg-slate-900 text-white shadow-xs' 
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 capitalize ${
                selectedCategory === cat 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Material Cards List */}
      <div className="space-y-3">
        {filteredMaterials.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Package className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No materials match your filter</p>
            <p className="text-xs text-slate-500">Try searching for a different keyword or add a new material.</p>
          </div>
        ) : (
          filteredMaterials.map(mat => {
            const isLow = mat.currentStock <= mat.minThreshold;
            const percent = Math.min(100, Math.round((mat.currentStock / Math.max(mat.minThreshold * 2, 50)) * 100));

            return (
              <div 
                key={mat.id}
                className={`bg-white rounded-2xl border p-4 shadow-xs space-y-3 transition-colors ${
                  isLow ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/90'
                }`}
              >
                {/* Header: Name & Badge */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 text-sm">{mat.name}</span>
                      {isLow && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                      <span className="capitalize">{mat.category || 'General'}</span>
                      {(mat.colorName || mat.colorCode) && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center space-x-1">
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-slate-300 inline-block"
                              style={{ backgroundColor: mat.colorCode || '#94a3b8' }}
                            />
                            <span>{mat.colorName || mat.colorCode}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black font-mono text-slate-900 block">
                      {mat.currentStock} <span className="text-xs font-normal text-slate-500">{mat.unit}</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono block">
                      Min: {mat.minThreshold} {mat.unit}
                    </span>
                  </div>
                </div>

                {/* Stock Gauge Progress Bar */}
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Pricing & Valuation Row */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                  <span>₹{mat.unitCost} / {mat.unit}</span>
                  <span className="font-bold font-mono text-slate-700">
                    Total: ₹{(mat.currentStock * mat.unitCost).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>

                {/* Action Buttons Row */}
                <div className="flex items-center space-x-2 pt-1">
                  
                  {/* Quick Restock */}
                  <button
                    type="button"
                    onClick={() => onOpenQuickAdjust(mat, 'restock')}
                    className="flex-1 py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                    <span>+ Restock</span>
                  </button>

                  {/* Quick Consume */}
                  <button
                    type="button"
                    onClick={() => onOpenQuickAdjust(mat, 'consumption')}
                    className="flex-1 py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-1"
                  >
                    <ArrowDownRight className="h-3.5 w-3.5 text-slate-600" />
                    <span>- Consume</span>
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => onEditMaterial(mat)}
                    className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200"
                    title="Edit Material"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => onDeleteMaterial(mat.id, mat.name)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200"
                    title="Delete Material"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>

                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
