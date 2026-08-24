import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  Tag, 
  Plus, 
  Check, 
  AlertTriangle, 
  Sparkles, 
  RefreshCw, 
  Search, 
  Layers, 
  ArrowRight,
  Edit2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { RawMaterial } from '../types';
import { 
  getStoredCategories, 
  saveStoredCategory, 
  deleteStoredCategory, 
  bulkDeleteUnusedCategories, 
  renameStoredCategory, 
  resetDefaultCategories,
  getCategoryProfile 
} from '../utils/inventoryPresets';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: RawMaterial[];
  onCategoriesUpdated?: (updatedCategories: string[], updatedMaterials?: RawMaterial[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  materials = [],
  onCategoriesUpdated
}) => {
  const [categories, setCategories] = useState<string[]>(() => getStoredCategories(materials));
  const [searchQuery, setSearchQuery] = useState('');
  const [newCatInput, setNewCatInput] = useState('');
  const [isAddingInline, setIsAddingInline] = useState(false);
  
  // Deletion state
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
  const [fallbackCategory, setFallbackCategory] = useState<string>('Other');
  
  // Renaming state
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCatInput, setEditCatInput] = useState('');

  // Notifications
  const [notice, setNotice] = useState<{ type: 'success' | 'info' | 'warn'; message: string } | null>(null);

  if (!isOpen) return null;

  // Compute materials usage per category
  const usageMap: Record<string, number> = {};
  materials.forEach(m => {
    const cat = (m.category || 'Other').trim();
    usageMap[cat.toLowerCase()] = (usageMap[cat.toLowerCase()] || 0) + 1;
  });

  const getUsageCount = (catName: string): number => {
    return usageMap[catName.toLowerCase().trim()] || 0;
  };

  const unusedCategories = categories.filter(c => getUsageCount(c) === 0 && c.toLowerCase().trim() !== 'other');
  const usedCategoriesCount = categories.filter(c => getUsageCount(c) > 0).length;

  const filteredCategories = categories.filter(c => 
    !searchQuery.trim() || c.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const showNotification = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleAddCategory = () => {
    const trimmed = newCatInput.trim();
    if (!trimmed) return;
    if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
      showNotification(`Category "${trimmed}" already exists.`, 'warn');
      return;
    }
    const updated = saveStoredCategory(trimmed);
    setCategories(updated);
    setNewCatInput('');
    setIsAddingInline(false);
    showNotification(`Added category "${trimmed}"`, 'success');
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updated);
    }
  };

  const handleInitiateDelete = (cat: string) => {
    const count = getUsageCount(cat);
    if (count === 0) {
      // Direct delete without reassignment required
      const { updatedCategories, updatedMaterials } = deleteStoredCategory(cat, materials, 'Other');
      setCategories(updatedCategories);
      showNotification(`Deleted category "${cat}" from all lists.`, 'success');
      if (onCategoriesUpdated) {
        onCategoriesUpdated(updatedCategories, updatedMaterials);
      }
    } else {
      // Requires confirmation / reassignment
      setCategoryToDelete(cat);
      const availableFallbacks = categories.filter(c => c.toLowerCase() !== cat.toLowerCase());
      setFallbackCategory(availableFallbacks[0] || 'Other');
    }
  };

  const handleConfirmDeleteWithReassign = () => {
    if (!categoryToDelete) return;
    const { updatedCategories, updatedMaterials, reassignedCount } = deleteStoredCategory(
      categoryToDelete,
      materials,
      fallbackCategory
    );
    setCategories(updatedCategories);
    showNotification(
      `Deleted category "${categoryToDelete}" & moved ${reassignedCount} material(s) to "${fallbackCategory}".`,
      'success'
    );
    setCategoryToDelete(null);
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories, updatedMaterials);
    }
  };

  const handleBulkDeleteUnused = () => {
    if (unusedCategories.length === 0) {
      showNotification('No unused categories found to clean up.', 'info');
      return;
    }
    const count = unusedCategories.length;
    const { updatedCategories } = bulkDeleteUnusedCategories(materials);
    setCategories(updatedCategories);
    showNotification(`Cleaned up ${count} unused categories from all lists.`, 'success');
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories);
    }
  };

  const handleStartRename = (cat: string) => {
    setEditingCategory(cat);
    setEditCatInput(cat);
  };

  const handleSaveRename = () => {
    if (!editingCategory) return;
    const trimmedNew = editCatInput.trim();
    if (!trimmedNew || trimmedNew.toLowerCase() === editingCategory.toLowerCase()) {
      setEditingCategory(null);
      return;
    }
    const { updatedCategories, updatedMaterials, modifiedCount } = renameStoredCategory(
      editingCategory,
      trimmedNew,
      materials
    );
    setCategories(updatedCategories);
    setEditingCategory(null);
    showNotification(`Renamed to "${trimmedNew}" (updated ${modifiedCount} material items)`, 'success');
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories, updatedMaterials);
    }
  };

  const handleResetDefaults = () => {
    const res = resetDefaultCategories(materials);
    setCategories(res);
    showNotification('Restored default category list presets.', 'info');
    if (onCategoriesUpdated) {
      onCategoriesUpdated(res);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <Tag className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Manage Material Categories</h3>
                <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  {categories.length} TOTAL
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Delete unused, redundant, or clutter categories from dropdowns &amp; filters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic Notification Notice */}
        {notice && (
          <div className={`mb-3 px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-100 ${
            notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
            notice.type === 'warn' ? 'bg-amber-50 text-amber-800 border border-amber-200' :
            'bg-blue-50 text-blue-800 border border-blue-200'
          }`}>
            {notice.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Clutter Cleaner Banner */}
        <div className="p-3.5 mb-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800">
                {unusedCategories.length > 0 ? (
                  <span><strong className="text-amber-700 font-mono">{unusedCategories.length}</strong> clutter categories have 0 items</span>
                ) : (
                  <span className="text-emerald-700 font-semibold">Category list is clean! All categories are active.</span>
                )}
              </p>
              <p className="text-[11px] text-slate-500">
                {usedCategoriesCount} active categories in use across {materials.length} material SKUs
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {unusedCategories.length > 0 && (
              <button
                type="button"
                id="btn-bulk-delete-unused-cats"
                onClick={handleBulkDeleteUnused}
                className="w-full sm:w-auto px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-colors"
                title="Deletes all categories that have zero assigned materials"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete All {unusedCategories.length} Unused</span>
              </button>
            )}
            <button
              type="button"
              id="btn-restore-default-cats"
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
              title="Reset to factory category defaults"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Search & Inline Add Toolbar */}
        <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
          <div className="relative flex-1 w-full">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search categories (e.g. Beads, Dhaga, Sequins)..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {isAddingInline ? (
            <div className="flex items-center space-x-1.5 w-full sm:w-auto animate-in fade-in duration-100">
              <input
                type="text"
                autoFocus
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCategory(); } }}
                placeholder="New category name..."
                className="px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setIsAddingInline(false)}
                className="px-2 py-1.5 text-slate-500 hover:text-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              id="btn-open-add-cat-inline"
              onClick={() => setIsAddingInline(true)}
              className="w-full sm:w-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center space-x-1 shrink-0 transition-colors shadow-2xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>+ Add Category</span>
            </button>
          )}
        </div>

        {/* Scrollable Categories List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 min-h-[220px]">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-600">No categories found matching "{searchQuery}"</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Click "+ Add Category" above to create one.</p>
            </div>
          ) : (
            filteredCategories.map(cat => {
              const count = getUsageCount(cat);
              const isUnused = count === 0;
              const isEditing = editingCategory === cat;
              const isOther = cat.toLowerCase() === 'other';

              return (
                <div
                  key={cat}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isUnused 
                      ? 'bg-amber-50/30 border-amber-200/60 hover:bg-amber-50/60' 
                      : 'bg-white border-slate-200 hover:border-blue-200 hover:bg-blue-50/20'
                  }`}
                >
                  {/* Category Name or Inline Editor */}
                  <div className="flex items-center space-x-2.5 flex-1 min-w-0 pr-2">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isUnused ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Tag className="h-3.5 w-3.5" />
                    </div>

                    {isEditing ? (
                      <div className="flex items-center space-x-1.5 flex-1">
                        <input
                          type="text"
                          autoFocus
                          value={editCatInput}
                          onChange={(e) => setEditCatInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename();
                            if (e.key === 'Escape') setEditingCategory(null);
                          }}
                          className="px-2 py-1 bg-white border border-blue-400 rounded-md text-xs font-bold text-slate-900 flex-1"
                        />
                        <button
                          type="button"
                          onClick={handleSaveRename}
                          className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          title="Save Rename"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategory(null)}
                          className="p-1 text-slate-500 hover:text-slate-800"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">
                          {cat}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isUnused ? 'Unused / Clutter' : `Assigned to ${count} SKU${count > 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Usage Badge & Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isUnused 
                        ? 'bg-slate-100 text-slate-500 border border-slate-200' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {count} items
                    </span>

                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => handleStartRename(cat)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title={`Rename "${cat}"`}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    {!isOther ? (
                      <button
                        type="button"
                        id={`btn-delete-cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                        onClick={() => handleInitiateDelete(cat)}
                        className={`p-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                          isUnused
                            ? 'text-rose-600 hover:bg-rose-100 bg-rose-50/70 border border-rose-200/60'
                            : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                        }`}
                        title={`Delete category "${cat}" from all lists`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isUnused && <span className="text-[10px] font-bold text-rose-700">Delete</span>}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 italic px-1">Default</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reassignment Delete Confirmation Modal / Popover */}
        {categoryToDelete && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-start space-x-3 mb-3">
              <div className="p-2 bg-rose-100 text-rose-700 rounded-lg shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">
                  Delete Category "{categoryToDelete}"?
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  <strong>{getUsageCount(categoryToDelete)} material(s)</strong> are currently assigned to this category. Select which category to move them to before deleting:
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 mb-3">
              <label className="text-xs font-semibold text-slate-700 shrink-0">Reassign items to:</label>
              <select
                value={fallbackCategory}
                onChange={(e) => setFallbackCategory(e.target.value)}
                className="w-full sm:flex-1 px-3 py-1.5 bg-white border border-rose-300 rounded-lg text-xs font-bold text-slate-900"
              >
                {categories.filter(c => c.toLowerCase() !== categoryToDelete.toLowerCase()).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-confirm-reassign-delete-cat"
                onClick={handleConfirmDeleteWithReassign}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Move Items &amp; Delete Category</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-3 text-xs">
          <span className="text-slate-500 text-[11px]">
            Deleted categories are permanently excluded from all dropdowns &amp; filters.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
