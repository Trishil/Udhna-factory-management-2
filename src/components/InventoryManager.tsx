import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Layers, 
  Plus, 
  ArrowUpDown, 
  PlusCircle, 
  MinusCircle, 
  Edit2, 
  Trash2, 
  Download, 
  QrCode,
  Ruler,
  Building2,
  Palette,
  Flame,
  Clock,
  AlertTriangle,
  Settings,
  Sparkles,
  Tag
} from 'lucide-react';
import { RawMaterial, Machine } from '../types';
import { getStoredCategories, deleteStoredCategory, bulkDeleteUnusedCategories } from '../utils/inventoryPresets';
import { calculatePredictiveInventory } from '../utils/predictiveInventory';
import { CategoryManagerModal } from './CategoryManagerModal';

interface InventoryManagerProps {
  materials: RawMaterial[];
  machines: Machine[];
  lowStockFilterActive: boolean;
  onClearLowStockFilter: () => void;
  onOpenAddMaterial: () => void;
  onOpenQuickAdjust: (material: RawMaterial, type: 'restock' | 'consumption') => void;
  onOpenAssignMaterial: (material: RawMaterial) => void;
  onEditMaterial: (material: RawMaterial) => void;
  onDeleteMaterial: (materialId: string, materialName?: string) => void;
  onCategoriesUpdated?: (updatedCats: string[], updatedMats?: RawMaterial[]) => void;
  onExportCsv: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  materials,
  machines,
  lowStockFilterActive,
  onClearLowStockFilter,
  onOpenAddMaterial,
  onOpenQuickAdjust,
  onOpenAssignMaterial,
  onEditMaterial,
  onDeleteMaterial,
  onCategoriesUpdated,
  onExportCsv
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'stock-asc' | 'stock-desc' | 'name' | 'category' | 'code' | 'depletion'>('stock-asc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  const allStoredCategories = getStoredCategories(materials);
  const unusedCategoriesCount = allStoredCategories.filter(cat => {
    const count = materials.filter(m => (m.category || '').toLowerCase() === cat.toLowerCase()).length;
    return count === 0 && cat.toLowerCase() !== 'other';
  }).length;

  const handleCategoriesUpdatedLocal = (updatedCats: string[], updatedMats?: RawMaterial[]) => {
    if (!updatedCats.some(c => c.toLowerCase() === selectedCategory.toLowerCase())) {
      setSelectedCategory('all');
    }
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCats, updatedMats);
    }
  };

  const handleQuickDeleteCategory = (catToDelete: string) => {
    const { updatedCategories, updatedMaterials } = deleteStoredCategory(catToDelete, materials, 'Other');
    if (selectedCategory.toLowerCase() === catToDelete.toLowerCase()) {
      setSelectedCategory('all');
    }
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories, updatedMaterials);
    }
  };

  const handleQuickBulkClean = () => {
    const { updatedCategories } = bulkDeleteUnusedCategories(materials);
    if (selectedCategory !== 'all' && !updatedCategories.some(c => c.toLowerCase() === selectedCategory.toLowerCase())) {
      setSelectedCategory('all');
    }
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories);
    }
  };

  // Compute predictive inventory metrics based on active floor run rates
  const predictiveMap = useMemo(() => {
    const metrics = calculatePredictiveInventory(materials, machines);
    const map = new Map<string, typeof metrics[0]>();
    metrics.forEach(m => map.set(m.materialId, m));
    return map;
  }, [materials, machines]);

  // Filter materials based on search, category, and low stock status
  const filteredMaterials = materials.filter(mat => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || (
      mat.name.toLowerCase().includes(q) ||
      (mat.code && mat.code.toLowerCase().includes(q)) ||
      (mat.size && mat.size.toLowerCase().includes(q)) ||
      (mat.colorName && mat.colorName.toLowerCase().includes(q)) ||
      mat.supplier.toLowerCase().includes(q) ||
      mat.category.toLowerCase().includes(q) ||
      mat.lotNumber.toLowerCase().includes(q) ||
      mat.locationBin.toLowerCase().includes(q)
    );

    const matchesCategory = selectedCategory === 'all' || mat.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesLowStock = !lowStockFilterActive || mat.currentStock <= mat.minThreshold;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  // Sort materials
  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
    if (sortBy === 'depletion') {
      const aMetric = predictiveMap.get(a.id);
      const bMetric = predictiveMap.get(b.id);
      const aH = aMetric?.hoursRemaining !== null && aMetric?.hoursRemaining !== undefined ? aMetric.hoursRemaining : 999999;
      const bH = bMetric?.hoursRemaining !== null && bMetric?.hoursRemaining !== undefined ? bMetric.hoursRemaining : 999999;
      return aH - bH;
    }
    if (sortBy === 'stock-asc') return a.currentStock - b.currentStock;
    if (sortBy === 'stock-desc') return b.currentStock - a.currentStock;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'category') return a.category.localeCompare(b.category);
    if (sortBy === 'code') return (a.code || '').localeCompare(b.code || '');
    return 0;
  });

  return (
    <section id="inventory-section" className="mb-10">
      
      {/* Header with Title & Primary Actions */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Raw Material Inventory Levels
          </h2>
          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            {materials.length} SKUS
          </span>
        </div>
        <div className="h-px flex-1 mx-4 bg-slate-300 hidden sm:block"></div>
        <div className="flex items-center space-x-2">
          <button
            id="btn-export-inventory-csv"
            onClick={onExportCsv}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 shadow-2xs transition-colors"
            title="Download Inventory CSV Spreadsheet"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-add-material"
            onClick={onOpenAddMaterial}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-lg border border-slate-200 p-3.5 mb-4 shadow-sm space-y-3">
        
        {/* Top search & sort row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Search box */}
          <div className="relative w-full sm:w-96">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="input-inventory-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by code (PD080), size (4mm, 1.7mm), color, vendor..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400 font-medium"
            />
          </div>

          {/* Controls right */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            
            {/* Low stock pill toggle */}
            {lowStockFilterActive && (
              <button
                id="btn-clear-low-stock-filter"
                onClick={onClearLowStockFilter}
                className="flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200 transition-colors"
              >
                <span>Low Stock Filter Active &times;</span>
              </button>
            )}

            {/* Sort Dropdown */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-600">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
              <select
                id="select-inventory-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="stock-asc">Stock: Low &rarr; High (Urgent)</option>
                <option value="depletion">Predictive: Fewest Hours Left</option>
                <option value="stock-desc">Stock: High &rarr; Low</option>
                <option value="code">Item Code (A &rarr; Z)</option>
                <option value="name">Name (A &rarr; Z)</option>
                <option value="category">Category</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-xs">
              <button
                id="btn-viewmode-table"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Table
              </button>
              <button
                id="btn-viewmode-cards"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded font-semibold text-xs transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Cards
              </button>
            </div>

          </div>
        </div>

        {/* Category Pills & Quick Management Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
          <div className="flex items-center space-x-1.5 overflow-x-auto max-w-full pb-1">
            <button
              id="btn-filter-cat-all"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-full font-bold text-[11px] shrink-0 transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              ALL MATERIALS ({materials.length})
            </button>

            {allStoredCategories.map(cat => {
              const count = materials.filter(m => (m.category || '').toLowerCase() === cat.toLowerCase()).length;
              const isSelected = selectedCategory.toLowerCase() === cat.toLowerCase();
              const isUnused = count === 0 && cat.toLowerCase() !== 'other';

              return (
                <div key={cat} className="inline-flex items-center shrink-0">
                  <button
                    id={`btn-filter-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1 rounded-full font-semibold text-[11px] transition-colors flex items-center space-x-1.5 ${
                      isSelected
                        ? 'bg-blue-600 text-white font-bold'
                        : isUnused
                        ? 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{cat.toUpperCase()} ({count})</span>
                    {isUnused && isSelected && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Delete empty category "${cat}" from all lists?`)) {
                            handleQuickDeleteCategory(cat);
                          }
                        }}
                        className="p-0.5 hover:bg-rose-500 hover:text-white rounded-full text-white/80 transition-colors"
                        title={`Delete empty category "${cat}"`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex items-center space-x-1.5 shrink-0 ml-auto">
            {unusedCategoriesCount > 0 && (
              <button
                type="button"
                id="btn-clean-unused-cats-inventory"
                onClick={handleQuickBulkClean}
                className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-full text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
                title={`Delete all ${unusedCategoriesCount} unused clutter categories with 0 items`}
              >
                <Trash2 className="h-3 w-3 text-amber-700" />
                <span>Clean {unusedCategoriesCount} Unused</span>
              </button>
            )}

            <button
              type="button"
              id="btn-manage-categories-inventory"
              onClick={() => setIsCategoryManagerOpen(true)}
              className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[11px] font-bold flex items-center space-x-1 transition-colors shadow-2xs"
              title="Open Category Manager to add, rename, or delete categories"
            >
              <Settings className="h-3 w-3 text-blue-600" />
              <span>Manage Categories</span>
            </button>
          </div>
        </div>

      </div>

      {/* Table View */}
      {viewMode === 'table' ? (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-3.5">Code &amp; Size</th>
                  <th className="py-3 px-3.5">Material Name &amp; Color</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Vendor</th>
                  <th className="py-3 px-3">Current Stock</th>
                  <th className="py-3 px-3">Active Burn &amp; Depletion ETA</th>
                  <th className="py-3 px-3">Buffer Integrity</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Bin Location</th>
                  <th className="py-3 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedMaterials.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-10 text-slate-400">
                      No raw materials found matching your search.
                    </td>
                  </tr>
                ) : (
                  sortedMaterials.map((mat) => {
                    const isLow = mat.currentStock <= mat.minThreshold;
                    const isDepleted = mat.currentStock <= 0;
                    const bufferRatio = mat.minThreshold > 0 ? (mat.currentStock / mat.minThreshold) : 1;
                    const pred = predictiveMap.get(mat.id);
                    const isBurning = (pred?.totalBurnRatePerHour || 0) > 0;

                    return (
                      <tr 
                        key={mat.id} 
                        id={`inventory-row-${mat.id}`}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isDepleted ? 'bg-rose-50/30' : isLow ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* Item Code & Size */}
                        <td className="py-3 px-3.5 font-mono">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] w-max">
                              {mat.code || 'N/A'}
                            </span>
                            {mat.size && (
                              <span className="text-[10px] text-indigo-700 font-semibold mt-0.5">
                                Size: {mat.size}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Name, Color Swatch & Color Name */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-start space-x-2">
                            <span 
                              className="w-3 h-3 rounded-full shrink-0 border border-slate-300 shadow-2xs mt-0.5"
                              style={{ backgroundColor: mat.colorCode || '#2563EB' }}
                              title={`Hex: ${mat.colorCode}`}
                            />
                            <div>
                              <p className="font-bold text-slate-800 text-xs">{mat.name}</p>
                              <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-medium">
                                {mat.colorName && (
                                  <span className="text-slate-700 font-semibold">
                                    Color: {mat.colorName}
                                  </span>
                                )}
                                <span>&bull;</span>
                                <span className="font-mono text-slate-400">LOT #{mat.lotNumber}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            mat.category.toLowerCase() === 'beads'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {mat.category}
                          </span>
                        </td>

                        {/* Vendor / Supplier */}
                        <td className="py-3 px-3 text-slate-700 font-medium text-xs">
                          <span className="truncate max-w-[120px] block" title={mat.supplier}>
                            {mat.supplier}
                          </span>
                        </td>

                        {/* Current Stock */}
                        <td className="py-3 px-3">
                          <div className="font-mono">
                            <span className={`text-sm font-bold ${
                              isDepleted ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-slate-800'
                            }`}>
                              {mat.currentStock.toLocaleString()}
                            </span>
                            <span className="text-[11px] text-slate-500 font-normal ml-1">{mat.unit}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Min: {mat.minThreshold.toLocaleString()} {mat.unit}
                          </p>
                        </td>

                        {/* Active Burn & Predictive Depletion ETA */}
                        <td className="py-3 px-3">
                          {isBurning && pred ? (
                            <div className="flex flex-col space-y-1">
                              <div className="flex items-center space-x-1 font-mono text-[11px] text-slate-700 font-bold">
                                <Flame className="h-3 w-3 text-orange-500 shrink-0" />
                                <span>{pred.totalBurnRatePerHour.toFixed(1)} {mat.unit}/h</span>
                              </div>
                              <span 
                                title={`Active tasks: ${pred.activeTaskCodes.join(', ') || 'N/A'}`}
                                className={`inline-flex items-center space-x-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold w-max ${
                                  pred.depletionStatus === 'critical'
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : pred.depletionStatus === 'warning'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                <Clock className="h-2.5 w-2.5" />
                                <span>{pred.formattedTimeRemaining} left</span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              0 {mat.unit}/h (Idle)
                            </span>
                          )}
                        </td>

                        {/* Buffer Integrity Bar */}
                        <td className="py-3 px-3 min-w-[110px]">
                          <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isDepleted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-blue-500'
                              }`}
                              style={{ width: `${Math.min(100, bufferRatio * 50)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                            {Math.round(bufferRatio * 100)}% of min
                          </span>
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-3">
                          {isDepleted ? (
                            <span className="text-[10px] px-2 py-0.5 bg-rose-100 text-rose-700 font-bold border border-rose-200 rounded-full uppercase">
                              DEPLETED
                            </span>
                          ) : isLow ? (
                            <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 font-bold border border-amber-200 rounded-full uppercase">
                              LOW STOCK
                            </span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 rounded-full uppercase">
                              STABLE
                            </span>
                          )}
                        </td>

                        {/* Storage Bin */}
                        <td className="py-3 px-3">
                          <span className="font-mono text-slate-700 font-bold text-[11px] bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {mat.locationBin}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              id={`btn-restock-${mat.id}`}
                              onClick={() => onOpenQuickAdjust(mat, 'restock')}
                              className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                              title="Quick Restock / Add Stock"
                            >
                              <PlusCircle className="h-3.5 w-3.5" />
                            </button>

                            <button
                              id={`btn-consume-${mat.id}`}
                              onClick={() => onOpenQuickAdjust(mat, 'consumption')}
                              className="p-1.5 text-amber-700 hover:bg-amber-50 rounded border border-amber-200 transition-colors"
                              title="Log Consumption / Deduct"
                            >
                              <MinusCircle className="h-3.5 w-3.5" />
                            </button>

                            <button
                              id={`btn-edit-${mat.id}`}
                              onClick={() => onEditMaterial(mat)}
                              className="p-1.5 text-slate-600 hover:bg-slate-100 rounded border border-slate-200 transition-colors"
                              title="Edit Material"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>

                            <button
                              id={`btn-delete-${mat.id}`}
                              onClick={() => onDeleteMaterial(mat.id, mat.name)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded border border-rose-200 transition-colors"
                              title="Delete Material"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMaterials.map((mat) => {
            const isLow = mat.currentStock <= mat.minThreshold;
            const isDepleted = mat.currentStock <= 0;
            const bufferRatio = mat.minThreshold > 0 ? (mat.currentStock / mat.minThreshold) : 1;
            const pred = predictiveMap.get(mat.id);
            const isBurning = (pred?.totalBurnRatePerHour || 0) > 0;

            return (
              <div 
                key={mat.id}
                id={`inventory-card-${mat.id}`}
                className={`bg-white rounded-xl border p-4 shadow-sm flex flex-col justify-between ${
                  isDepleted ? 'border-rose-300 ring-1 ring-rose-500/20' : isLow ? 'border-amber-300 ring-1 ring-amber-500/20' : 'border-slate-200'
                }`}
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-1.5">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                        style={{ backgroundColor: mat.colorCode || '#2563EB' }}
                      />
                      <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                        {mat.code || 'NO-CODE'}
                      </span>
                      {mat.size && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {mat.size}
                        </span>
                      )}
                    </div>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      isDepleted ? 'bg-rose-100 text-rose-800' : isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isDepleted ? 'DEPLETED' : isLow ? 'LOW STOCK' : 'STABLE'}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-800 mb-1">{mat.name}</h4>
                  
                  {/* Attributes metadata */}
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[11px] text-slate-500 mb-2.5">
                    {mat.colorName && (
                      <span className="font-semibold text-slate-700">
                        Color: {mat.colorName}
                      </span>
                    )}
                    <span>&bull;</span>
                    <span>Vendor: <strong className="text-slate-700">{mat.supplier}</strong></span>
                    <span>&bull;</span>
                    <span className="font-mono">BIN: {mat.locationBin}</span>
                  </div>

                  {/* Floor Burn Rate & Depletion ETA Pill */}
                  {isBurning && pred ? (
                    <div className="mb-2.5 p-2 bg-orange-50/70 border border-orange-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 font-mono text-[11px] text-orange-950 font-bold">
                        <Flame className="h-3.5 w-3.5 text-orange-600 shrink-0" />
                        <span>{pred.totalBurnRatePerHour.toFixed(1)} {mat.unit}/h</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        pred.depletionStatus === 'critical'
                          ? 'bg-rose-600 text-white'
                          : pred.depletionStatus === 'warning'
                          ? 'bg-amber-500 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        ETA: {pred.formattedTimeRemaining}
                      </span>
                    </div>
                  ) : null}

                  {/* Stock Gauge */}
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100 mb-3">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-[11px] text-slate-500 font-semibold">Current Stock</span>
                      <span className="text-sm font-bold text-slate-800 font-mono">
                        {mat.currentStock.toLocaleString()} {mat.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full ${isDepleted ? 'bg-rose-500' : isLow ? 'bg-amber-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, bufferRatio * 50)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                      <span>Safety Buffer: {mat.minThreshold} {mat.unit}</span>
                      <span>{Math.round(bufferRatio * 100)}%</span>
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex space-x-1">
                    <button
                      id={`btn-card-restock-${mat.id}`}
                      onClick={() => onOpenQuickAdjust(mat, 'restock')}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    >
                      + Restock
                    </button>
                    <button
                      id={`btn-card-consume-${mat.id}`}
                      onClick={() => onOpenQuickAdjust(mat, 'consumption')}
                      className="px-2.5 py-1 text-xs font-semibold rounded bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                    >
                      - Consume
                    </button>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      id={`btn-card-edit-${mat.id}`}
                      onClick={() => onEditMaterial(mat)}
                      className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100"
                      title="Edit Material"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      id={`btn-card-delete-${mat.id}`}
                      onClick={() => onDeleteMaterial(mat.id, mat.name)}
                      className="p-1 text-rose-500 hover:text-rose-700 rounded hover:bg-rose-50"
                      title="Delete Material"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        materials={materials}
        onCategoriesUpdated={handleCategoriesUpdatedLocal}
      />
    </section>
  );
};
