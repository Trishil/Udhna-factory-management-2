import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Layers, Plus, Check, Sparkles, Building2, MapPin, 
  Tag, Hash, Scale, Trash2, Palette, Ruler, QrCode,
  IndianRupee, CreditCard, AlertTriangle, ArrowRight, Settings
} from 'lucide-react';
import { RawMaterial } from '../types';
import { 
  getStoredCategories, 
  saveStoredCategory, 
  deleteStoredCategory,
  bulkDeleteUnusedCategories,
  getStoredUnits, 
  saveStoredUnit, 
  getStoredSuppliers, 
  saveStoredSupplier, 
  getStoredLocations, 
  saveStoredLocation, 
  getStoredLots, 
  saveStoredLot, 
  getStoredSizes,
  saveStoredSize,
  getStoredColors,
  saveStoredColor,
  getCategoryProfile,
  generateItemCode,
  generateLotNumber 
} from '../utils/inventoryPresets';
import { checkMaterialDuplicate, generateUniqueMaterialId, generateUniqueBatchId } from '../utils/idGenerator';
import { CategoryManagerModal } from './CategoryManagerModal';

export interface InitialBatchFinancialOption {
  recordInFinance: boolean;
  type: 'paid_expense' | 'supplier_payable';
  amount: number;
  supplier: string;
  dueDate?: string;
  lotNumber: string;
}

interface AddMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMaterial?: RawMaterial | null;
  materials?: RawMaterial[];
  onSaveMaterial: (
    material: RawMaterial | Omit<RawMaterial, 'id'>,
    financialOption?: InitialBatchFinancialOption
  ) => void;
  onDeleteMaterial?: (id: string, name: string) => void;
  onCategoryCreated?: (newCategory: string) => void;
  onCategoriesUpdated?: (updatedCategories: string[], updatedMaterials?: RawMaterial[]) => void;
  onSwitchToRestock?: (material: RawMaterial) => void;
}

export const AddMaterialModal: React.FC<AddMaterialModalProps> = ({
  isOpen,
  onClose,
  editingMaterial,
  materials = [],
  onSaveMaterial,
  onDeleteMaterial,
  onCategoryCreated,
  onCategoriesUpdated,
  onSwitchToRestock
}) => {
  // Form core fields
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Beads');
  const [size, setSize] = useState<string>('4 mm');
  const [colorName, setColorName] = useState<string>('Emerald Green');
  const [colorCode, setColorCode] = useState<string>('#059669');
  const [currentStock, setCurrentStock] = useState<number>(10000);
  const [unit, setUnit] = useState<string>('pcs');
  const [minThreshold, setMinThreshold] = useState<number>(2000);
  const [unitCost, setUnitCost] = useState<number>(0.04);
  const [supplier, setSupplier] = useState<string>('Apex Beads & Findings');
  const [lotNumber, setLotNumber] = useState<string>('');
  const [locationBin, setLocationBin] = useState<string>('Bead Drawer #1');
  const [consumptionRatePerHour, setConsumptionRatePerHour] = useState<number>(350);

  // Available options registries
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [unitsList, setUnitsList] = useState<string[]>([]);
  const [suppliersList, setSuppliersList] = useState<string[]>([]);
  const [locationsList, setLocationsList] = useState<string[]>([]);
  const [sizesList, setSizesList] = useState<string[]>([]);
  const [lotsList, setLotsList] = useState<string[]>([]);

  // Inline creation states
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');

  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierInput, setNewSupplierInput] = useState('');

  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');

  const [isAddingSize, setIsAddingSize] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');

  const [isAddingLot, setIsAddingLot] = useState(false);
  const [newLotInput, setNewLotInput] = useState('');

  // Delete confirmation inside modal
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Duplicate detection & finance sync
  const [recordInFinance, setRecordInFinance] = useState<boolean>(true);
  const [financeType, setFinanceType] = useState<'paid_expense' | 'supplier_payable'>('supplier_payable');
  const [financeDueDate, setFinanceDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const duplicateCheck = React.useMemo(() => {
    if (editingMaterial) return { isDuplicate: false, matchType: null, matchedMaterial: null, reason: null };
    return checkMaterialDuplicate(name, code, category, materials);
  }, [name, code, category, materials, editingMaterial]);

  // Current category dynamic profile
  const categoryProfile = getCategoryProfile(category);

  // Prevent background re-render state resets
  const isInitializedRef = useRef(false);
  const prevMaterialIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) {
      isInitializedRef.current = false;
      setIsConfirmingDelete(false);
      setFormError(null);
      return;
    }

    const shouldInitialize = !isInitializedRef.current || prevMaterialIdRef.current !== editingMaterial?.id;

    if (shouldInitialize) {
      isInitializedRef.current = true;
      prevMaterialIdRef.current = editingMaterial?.id;

      const cats = getStoredCategories(materials);
      const uns = getStoredUnits(materials);
      const sups = getStoredSuppliers(materials);
      const locs = getStoredLocations(materials);
      const lts = getStoredLots(materials);

      setCategoriesList(cats);
      setUnitsList(uns);
      setSuppliersList(sups);
      setLocationsList(locs);
      setLotsList(lts);

      if (editingMaterial) {
        setCode(editingMaterial.code || '');
        setName(editingMaterial.name || '');
        setCategory(editingMaterial.category || 'Beads');
        setSize(editingMaterial.size || '4 mm');
        setColorName(editingMaterial.colorName || 'Default');
        setColorCode(editingMaterial.colorCode || '#2563EB');
        setCurrentStock(editingMaterial.currentStock ?? 1000);
        setUnit(editingMaterial.unit || 'pcs');
        setMinThreshold(editingMaterial.minThreshold ?? 500);
        setUnitCost(editingMaterial.unitCost ?? 0.05);
        setSupplier(editingMaterial.supplier || (sups[0] || 'Supplier'));
        setLotNumber(editingMaterial.lotNumber || generateLotNumber(editingMaterial.category, editingMaterial.name));
        setLocationBin(editingMaterial.locationBin || (locs[0] || 'Rack A-01'));
        setConsumptionRatePerHour(editingMaterial.consumptionRatePerHour || 150);

        const szs = getStoredSizes(editingMaterial.category, materials);
        setSizesList(szs);
      } else {
        // Default new material initialization (defaults to Beads per user prompt)
        const initialCat = 'Beads';
        const prof = getCategoryProfile(initialCat);
        const szs = getStoredSizes(initialCat, materials);

        setCategory(initialCat);
        setSize('4 mm');
        setCode(generateItemCode(initialCat, '4 mm', 'PD080'));
        setName('Faceted Crystal Glass Beads (4mm)');
        setColorName('Emerald Green');
        setColorCode('#059669');
        setCurrentStock(10000);
        setUnit('pcs');
        setMinThreshold(2500);
        setUnitCost(0.04);
        setSupplier(prof.suggestedVendors[0] || 'Apex Beads & Findings');
        setLotNumber(generateLotNumber(initialCat, 'Faceted Beads'));
        setLocationBin('Bead Drawer #1');
        setConsumptionRatePerHour(350);
        setSizesList(szs);
      }

      setIsAddingCategory(false);
      setIsAddingUnit(false);
      setIsAddingSupplier(false);
      setIsAddingLocation(false);
      setIsAddingSize(false);
      setIsAddingLot(false);
    }
  }, [isOpen, editingMaterial, materials]);

  /**
   * Intelligently updates defaults when user changes Category
   */
  const handleCategoryChange = (newCat: string) => {
    setCategory(newCat);
    const prof = getCategoryProfile(newCat);
    const newSizes = getStoredSizes(newCat, materials);
    setSizesList(newSizes);

    // If creating new material or changing category, adapt context defaults
    if (!editingMaterial) {
      const selectedSize = newSizes[0] || '4 mm';
      setSize(selectedSize);
      setUnit(prof.defaultUnit);
      setSupplier(prof.suggestedVendors[0] || suppliersList[0] || 'Supplier');
      
      const suggestedColor = prof.suggestedColorNames[0] || { name: 'Emerald Green', hex: '#059669' };
      setColorName(suggestedColor.name);
      setColorCode(suggestedColor.hex);
      
      setCode(generateItemCode(newCat, selectedSize, prof.defaultCodePrefix));
      setName(`${prof.sampleName} (${selectedSize})`);
      setMinThreshold(prof.defaultThreshold);
      setCurrentStock(prof.defaultStock);
      setLotNumber(generateLotNumber(newCat, prof.sampleName));
      
      if (newCat.toLowerCase().includes('bead')) {
        setLocationBin('Bead Drawer #1');
      } else {
        setLocationBin(locationsList[0] || 'Rack A-01');
      }
    }
  };

  /**
   * Intelligently updates code when size is changed
   */
  const handleSizeChange = (newSize: string) => {
    setSize(newSize);
    // Suggest updating code if code follows prefix # size pattern or is empty
    if (!code || code.includes('#')) {
      const prefix = code.split('#')[0]?.trim() || categoryProfile.defaultCodePrefix || 'SKU';
      setCode(`${prefix} # ${newSize.replace(/\s+/g, '')}`);
    }
    // Update name size descriptor if user hasn't heavily customized
    if (name.includes('(') && name.includes(')')) {
      setName(name.replace(/\([^)]*\)/, `(${newSize})`));
    }
  };

  /**
   * Color selection chip helper
   */
  const handleSelectColorPreset = (cName: string, hex: string) => {
    setColorName(cName);
    setColorCode(hex);
  };

  // --- Handlers for inline creations ---

  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const updated = saveStoredCategory(trimmed);
    setCategoriesList(updated);
    setCategory(trimmed);
    handleCategoryChange(trimmed);
    setNewCategoryInput('');
    setIsAddingCategory(false);
    if (onCategoryCreated) {
      onCategoryCreated(trimmed);
    }
  };

  const handleCategoriesManagerUpdated = (updatedCats: string[], updatedMats?: RawMaterial[]) => {
    setCategoriesList(updatedCats);
    if (!updatedCats.some(c => c.toLowerCase() === category.toLowerCase())) {
      const nextCat = updatedCats[0] || 'Other';
      setCategory(nextCat);
      handleCategoryChange(nextCat);
    }
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCats, updatedMats);
    }
  };

  const handleDeleteSelectedCategory = (catToDelete: string) => {
    const { updatedCategories, updatedMaterials } = deleteStoredCategory(catToDelete, materials, 'Other');
    setCategoriesList(updatedCategories);
    const nextCat = updatedCategories[0] || 'Other';
    setCategory(nextCat);
    handleCategoryChange(nextCat);
    if (onCategoriesUpdated) {
      onCategoriesUpdated(updatedCategories, updatedMaterials);
    }
  };

  const handleCreateUnit = () => {
    const trimmed = newUnitInput.trim().toLowerCase();
    if (!trimmed) return;
    const updated = saveStoredUnit(trimmed);
    setUnitsList(updated);
    setUnit(trimmed);
    setNewUnitInput('');
    setIsAddingUnit(false);
  };

  const handleCreateSupplier = () => {
    const trimmed = newSupplierInput.trim();
    if (!trimmed) return;
    const updated = saveStoredSupplier(trimmed);
    setSuppliersList(updated);
    setSupplier(trimmed);
    setNewSupplierInput('');
    setIsAddingSupplier(false);
  };

  const handleCreateLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    const updated = saveStoredLocation(trimmed);
    setLocationsList(updated);
    setLocationBin(trimmed);
    setNewLocationInput('');
    setIsAddingLocation(false);
  };

  const handleCreateSize = () => {
    const trimmed = newSizeInput.trim();
    if (!trimmed) return;
    const updated = saveStoredSize(category, trimmed);
    setSizesList(updated);
    handleSizeChange(trimmed);
    setNewSizeInput('');
    setIsAddingSize(false);
  };

  const handleCreateLot = () => {
    const trimmed = newLotInput.trim().toUpperCase();
    if (!trimmed) return;
    const updated = saveStoredLot(trimmed);
    setLotsList(updated);
    setLotNumber(trimmed);
    setNewLotInput('');
    setIsAddingLot(false);
  };

  const handleAutoGenerateLot = () => {
    const gen = generateLotNumber(category, name);
    setLotNumber(gen);
    saveStoredLot(gen);
  };

  const handleAutoGenerateCode = () => {
    const gen = generateItemCode(category, size, categoryProfile.defaultCodePrefix);
    setCode(gen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setFormError('Please enter a valid Material Name');
      return;
    }
    setFormError(null);

    // Auto-save any custom values to presets
    saveStoredCategory(category);
    saveStoredUnit(unit);
    saveStoredSupplier(supplier);
    saveStoredLocation(locationBin);
    if (size) saveStoredSize(category, size);
    if (lotNumber) saveStoredLot(lotNumber);
    if (colorName) saveStoredColor(colorName, colorCode);

    const formattedCode = code.trim() || generateItemCode(category, size || '4mm');

    const materialData = {
      code: formattedCode,
      name: name.trim(),
      category: category.trim() || 'Beads',
      size: size.trim() || '4 mm',
      colorName: colorName.trim() || 'Default',
      currentStock: Number(currentStock) || 0,
      unit: unit.trim() || 'pcs',
      minThreshold: Number(minThreshold) || 0,
      unitCost: Number(unitCost) || 0,
      supplier: supplier.trim() || 'Supplier',
      colorCode: colorCode || '#059669',
      lotNumber: lotNumber.trim() || generateLotNumber(category, name),
      locationBin: locationBin.trim() || 'Rack A-01',
      consumptionRatePerHour: Number(consumptionRatePerHour) || 100,
      lastUpdated: new Date().toISOString(),
    };

    if (editingMaterial) {
      onSaveMaterial({
        ...materialData,
        id: editingMaterial.id
      });
    } else {
      const financialOption: InitialBatchFinancialOption | undefined = recordInFinance && currentStock > 0 ? {
        recordInFinance: true,
        type: financeType,
        amount: +(currentStock * (unitCost || 0)).toFixed(2),
        supplier: supplier.trim() || 'Supplier',
        dueDate: financeType === 'supplier_payable' ? financeDueDate : undefined,
        lotNumber: materialData.lotNumber
      } : undefined;

      onSaveMaterial(materialData, financialOption);
    }

    onClose();
  };

  const handleDeleteConfirm = () => {
    if (editingMaterial && onDeleteMaterial) {
      onDeleteMaterial(editingMaterial.id, editingMaterial.name);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-600/30 rounded-xl text-blue-400 border border-blue-500/30">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center space-x-2">
                <span>{editingMaterial ? 'Edit Raw Material' : 'Add New Raw Material'}</span>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {category}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure material specifications, code, size, color, vendor & Google Sheets sync
              </p>
            </div>
          </div>
          <button 
            id="btn-close-modal-x"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          
          {/* Anti-Duplicate Warning Banner */}
          {duplicateCheck.isDuplicate && duplicateCheck.matchedMaterial && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex items-start justify-between text-xs animate-in fade-in">
              <div className="flex items-start space-x-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-900">Anti-Duplicate Warning: Material already exists</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">{duplicateCheck.reason}</p>
                </div>
              </div>
              {onSwitchToRestock && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onSwitchToRestock(duplicateCheck.matchedMaterial!);
                  }}
                  className="ml-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shrink-0 flex items-center space-x-1 shadow-xs transition-colors"
                >
                  <span>Restock Existing</span>
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          )}

          {/* Form Error Banner */}
          {formError && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg font-medium animate-in fade-in duration-150">
              {formError}
            </div>
          )}

          {/* SECTION: Category & Dynamic Profile Switcher */}
          <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Tag className="h-4 w-4 text-blue-600" />
                <span>1. Material Category *</span>
              </label>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  id="btn-open-category-manager-modal"
                  onClick={() => setIsCategoryManagerOpen(true)}
                  className="text-[11px] font-bold text-slate-600 hover:text-blue-700 bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 px-2 py-0.5 rounded-md flex items-center space-x-1 transition-colors shadow-2xs"
                  title="Open Category Manager & Delete / Clean Categories"
                >
                  <Settings className="h-3 w-3 text-blue-600" />
                  <span>Manage / Delete ({categoriesList.length})</span>
                </button>
                <button
                  type="button"
                  id="btn-toggle-add-category"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-0.5 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isAddingCategory ? 'Cancel' : '+ New'}</span>
                </button>
              </div>
            </div>

            {isAddingCategory ? (
              <div className="flex items-center space-x-2 mt-1 animate-in fade-in duration-100">
                <input
                  id="input-new-category-name"
                  type="text"
                  autoFocus
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                  placeholder="e.g. Beads, Clasps, Charms..."
                  className="flex-1 px-3 py-2 bg-white border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-900"
                />
                <button
                  type="button"
                  id="btn-save-new-category"
                  onClick={handleCreateCategory}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center space-x-1.5">
                  <select
                    id="select-material-category"
                    value={category}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-slate-900 font-bold text-xs shadow-xs"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {/* Direct Delete button for the selected category */}
                  {category.toLowerCase() !== 'other' && (
                    <button
                      type="button"
                      id="btn-delete-active-category"
                      onClick={() => {
                        if (confirm(`Delete category "${category}" from all dropdowns and lists?`)) {
                          handleDeleteSelectedCategory(category);
                        }
                      }}
                      className="px-2.5 py-2 bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-400 hover:text-rose-600 rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 shrink-0"
                      title={`Delete "${category}" category`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline text-[10px]">Delete</span>
                    </button>
                  )}
                </div>

                {/* Category Quick Selector Pills */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {categoriesList.slice(0, 8).map(catPreset => (
                    <button
                      key={catPreset}
                      type="button"
                      id={`btn-cat-pill-${catPreset.toLowerCase()}`}
                      onClick={() => handleCategoryChange(catPreset)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        category.toLowerCase() === catPreset.toLowerCase()
                          ? 'bg-blue-600 text-white shadow-xs font-bold'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-100/50'
                      }`}
                    >
                      {catPreset}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setIsCategoryManagerOpen(true)}
                    className="px-2 py-1 rounded-md text-[10px] font-bold text-blue-700 bg-blue-100/60 hover:bg-blue-100 border border-blue-200 flex items-center space-x-1"
                  >
                    <Settings className="h-3 w-3" />
                    <span>Manage All</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* SECTION: Code & Size (Highlighted Variables for Beads and materials) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            
            {/* Item / Design Code (e.g. PD080 # 4mm) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <QrCode className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Item / Design Code *</span>
                </label>
                <button
                  type="button"
                  id="btn-autogen-code"
                  onClick={handleAutoGenerateCode}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 hover:underline"
                  title="Generate item code based on size and category prefix"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Auto-Code</span>
                </button>
              </div>
              <input
                id="input-material-code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. PD080 # 4mm, BD-101 # 1.7mm..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-mono font-bold text-xs"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                E.g. <span className="font-mono font-semibold text-slate-700">PD080 # 4mm</span>, <span className="font-mono font-semibold text-slate-700">PD080 # 1.7mm</span>
              </p>
            </div>

            {/* Size / Dimension (e.g. 1.7mm, 2mm, 3mm, 4mm) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Ruler className="h-3.5 w-3.5 text-indigo-600" />
                  <span>Size / Dimension *</span>
                </label>
                <button
                  type="button"
                  id="btn-toggle-add-size"
                  onClick={() => setIsAddingSize(!isAddingSize)}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-0.5 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isAddingSize ? 'Cancel' : '+ New Size'}</span>
                </button>
              </div>

              {isAddingSize ? (
                <div className="flex items-center space-x-1.5 animate-in fade-in duration-100">
                  <input
                    id="input-new-size-val"
                    type="text"
                    autoFocus
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSize(); } }}
                    placeholder="e.g. 1.7 mm, 2.5 mm, 4 mm..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900"
                  />
                  <button
                    type="button"
                    id="btn-save-new-size"
                    onClick={handleCreateSize}
                    className="px-2.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <select
                    id="select-material-size"
                    value={size}
                    onChange={(e) => handleSizeChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900 font-bold text-xs"
                  >
                    {sizesList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>

                  {/* Size Quick Selector Chips */}
                  <div className="flex flex-wrap gap-1">
                    {sizesList.slice(0, 5).map(sz => (
                      <button
                        key={sz}
                        type="button"
                        id={`btn-size-chip-${sz.replace(/\s+/g, '')}`}
                        onClick={() => handleSizeChange(sz)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          size === sz
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-indigo-50'
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Material Name */}
          <div>
            <label className="block font-bold text-slate-900 mb-1.5">
              Material Name & Specification *
            </label>
            <input
              id="input-material-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Faceted Emerald Crystal Glass Beads (4mm)"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-semibold text-xs"
            />
          </div>

          {/* SECTION: Color Variable (Color Name + Hex Palette) */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Palette className="h-3.5 w-3.5 text-pink-600" />
                <span>Color Variable (Name & Swatch) *</span>
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Selected: <span className="font-bold text-slate-900">{colorName}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Color Name text input */}
              <div>
                <input
                  id="input-color-name"
                  type="text"
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g. Emerald Green, Rose Pink, Sapphire Blue..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 text-slate-900 font-semibold text-xs"
                />
              </div>

              {/* Color Hex & Visual Picker */}
              <div className="flex items-center space-x-2 bg-white px-2.5 py-1 rounded-lg border border-slate-300">
                <input 
                  id="input-custom-color-picker"
                  type="color" 
                  value={colorCode} 
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-7 h-7 rounded-md border border-slate-200 cursor-pointer p-0 bg-transparent shrink-0"
                  title="Choose exact hex color"
                />
                <input
                  type="text"
                  value={colorCode}
                  onChange={(e) => setColorCode(e.target.value)}
                  className="w-20 font-mono text-xs font-bold uppercase text-slate-700 bg-transparent focus:outline-none"
                />
                <div 
                  className="w-4 h-4 rounded-full border border-slate-300 ml-auto shadow-xs" 
                  style={{ backgroundColor: colorCode }} 
                />
              </div>
            </div>

            {/* Quick Color Presets with Names */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {getStoredColors(category).slice(0, 10).map(c => (
                <button
                  key={c.name}
                  type="button"
                  id={`btn-color-preset-${c.name.replace(/\s+/g, '-').toLowerCase()}`}
                  onClick={() => handleSelectColorPreset(c.name, c.hex)}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center space-x-1.5 transition-all ${
                    colorName.toLowerCase() === c.name.toLowerCase()
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span 
                    className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" 
                    style={{ backgroundColor: c.hex }} 
                  />
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECTION: Vendor / Supplier */}
          <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Vendor / Supplier *</span>
              </label>
              <button
                type="button"
                id="btn-toggle-add-supplier"
                onClick={() => setIsAddingSupplier(!isAddingSupplier)}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-800 flex items-center space-x-0.5 hover:underline"
              >
                <Plus className="h-3 w-3" />
                <span>{isAddingSupplier ? 'Cancel' : '+ New Vendor'}</span>
              </button>
            </div>

            {isAddingSupplier ? (
              <div className="flex items-center space-x-1.5 animate-in fade-in duration-100">
                <input
                  id="input-new-supplier-name"
                  type="text"
                  autoFocus
                  value={newSupplierInput}
                  onChange={(e) => setNewSupplierInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSupplier(); } }}
                  placeholder="e.g. Apex Beads & Findings, Preciosa..."
                  className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900"
                />
                <button
                  type="button"
                  id="btn-save-new-supplier"
                  onClick={handleCreateSupplier}
                  className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                id="select-material-supplier"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 font-bold text-xs"
              >
                {suppliersList.map(sup => (
                  <option key={sup} value={sup}>{sup}</option>
                ))}
              </select>
            )}
          </div>

          {/* SECTION: Stock Quantities & Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            
            {/* Current Stock */}
            <div>
              <label className="block font-bold text-slate-900 mb-1">Current Stock *</label>
              <input
                id="input-material-stock"
                type="number"
                min="0"
                step="any"
                required
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold text-xs"
              />
            </div>

            {/* Measurement Unit */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-900 flex items-center space-x-1">
                  <Scale className="h-3 w-3 text-blue-600" />
                  <span>Unit *</span>
                </label>
                <button
                  type="button"
                  id="btn-toggle-add-unit"
                  onClick={() => setIsAddingUnit(!isAddingUnit)}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  {isAddingUnit ? 'Cancel' : '+ New'}
                </button>
              </div>

              {isAddingUnit ? (
                <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                  <input
                    id="input-new-unit-name"
                    type="text"
                    autoFocus
                    value={newUnitInput}
                    onChange={(e) => setNewUnitInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateUnit(); } }}
                    placeholder="e.g. gross, pcs..."
                    className="flex-1 px-2 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none text-slate-900"
                  />
                  <button
                    type="button"
                    id="btn-save-new-unit"
                    onClick={handleCreateUnit}
                    className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  id="select-material-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-bold text-xs"
                >
                  {unitsList.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Min Threshold Buffer */}
            <div>
              <label className="block font-bold text-slate-900 mb-1">Safety Buffer *</label>
              <input
                id="input-material-threshold"
                type="number"
                min="0"
                step="any"
                required
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold text-xs"
              />
            </div>

            {/* Unit Cost */}
            <div>
              <label className="block font-bold text-slate-900 mb-1">
                Unit Cost (₹ per {unit || 'unit'}) *
              </label>
              <input
                id="input-material-cost"
                type="number"
                min="0"
                step="any"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold text-xs"
              />
              <span className="text-[10px] text-slate-500 block mt-0.5 font-mono">
                ₹{unitCost || 0} / {unit || 'unit'}
              </span>
            </div>

            {/* Consumption Burn Rate */}
            <div className="col-span-2 sm:col-span-2">
              <label className="block font-bold text-slate-900 mb-1">Est. Machine Burn Rate ({unit}/hr)</label>
              <input
                id="input-material-burn-rate"
                type="number"
                min="0"
                step="any"
                value={consumptionRatePerHour}
                onChange={(e) => setConsumptionRatePerHour(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-mono font-bold text-xs"
              />
            </div>

          </div>

          {/* SECTION: Storage Rack & Lot/Batch Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            
            {/* Storage Rack / Bin */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-600" />
                  <span>Storage Rack / Bin *</span>
                </label>
                <button
                  type="button"
                  id="btn-toggle-add-location"
                  onClick={() => setIsAddingLocation(!isAddingLocation)}
                  className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center space-x-0.5 hover:underline"
                >
                  <Plus className="h-3 w-3" />
                  <span>{isAddingLocation ? 'Cancel' : '+ New Bin'}</span>
                </button>
              </div>

              {isAddingLocation ? (
                <div className="flex items-center space-x-1.5 animate-in fade-in duration-100">
                  <input
                    id="input-new-location-name"
                    type="text"
                    autoFocus
                    value={newLocationInput}
                    onChange={(e) => setNewLocationInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLocation(); } }}
                    placeholder="e.g. Bead Drawer #3, Rack C-04..."
                    className="flex-1 px-2.5 py-1.5 bg-white border border-amber-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/30 text-slate-900"
                  />
                  <button
                    type="button"
                    id="btn-save-new-location"
                    onClick={handleCreateLocation}
                    className="px-2.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 transition-colors shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <select
                  id="select-material-location"
                  value={locationBin}
                  onChange={(e) => setLocationBin(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-bold text-xs"
                >
                  {locationsList.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Lot / Batch Number */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="font-bold text-slate-900 flex items-center space-x-1.5">
                  <Hash className="h-3.5 w-3.5 text-purple-600" />
                  <span>Lot / Batch Number *</span>
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    id="btn-autogen-lot"
                    onClick={handleAutoGenerateLot}
                    className="text-[11px] font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-0.5 hover:underline"
                    title="Generate new formatted lot code"
                  >
                    <Sparkles className="h-3 w-3" />
                    <span>Auto-Gen</span>
                  </button>
                  <button
                    type="button"
                    id="btn-toggle-add-lot"
                    onClick={() => setIsAddingLot(!isAddingLot)}
                    className="text-[11px] font-bold text-slate-600 hover:text-slate-800 flex items-center space-x-0.5 hover:underline"
                  >
                    <Plus className="h-3 w-3" />
                    <span>{isAddingLot ? 'Cancel' : '+ New Lot'}</span>
                  </button>
                </div>
              </div>

              {isAddingLot ? (
                <div className="flex items-center space-x-1.5 animate-in fade-in duration-100">
                  <input
                    id="input-new-lot-name"
                    type="text"
                    autoFocus
                    value={newLotInput}
                    onChange={(e) => setNewLotInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLot(); } }}
                    placeholder="e.g. LOT-BEA-2026-99"
                    className="flex-1 px-2.5 py-1.5 bg-white border border-purple-400 rounded-lg text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/30 text-slate-900"
                  />
                  <button
                    type="button"
                    id="btn-save-new-lot"
                    onClick={handleCreateLot}
                    className="px-2.5 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700 transition-colors shrink-0"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <input
                  id="input-material-lot"
                  type="text"
                  required
                  value={lotNumber}
                  onChange={(e) => setLotNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-slate-900 font-mono font-bold text-xs"
                  placeholder="LOT-XXX-2026-00"
                />
              )}
            </div>

          </div>

          {/* Unified Financial Ledger Sync (for New Materials) */}
          {!editingMaterial && (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-950 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Unified Financial Ledger Sync</span>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={recordInFinance}
                    onChange={(e) => setRecordInFinance(e.target.checked)}
                    className="h-3.5 w-3.5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span>Record initial batch in Finance automatically</span>
                </label>
              </div>

              {recordInFinance && (
                <div className="space-y-2 pt-1 text-xs border-t border-emerald-200/60 animate-in fade-in">
                  <div className="flex items-center justify-between text-[11px] bg-white/70 px-2.5 py-1.5 rounded-lg border border-emerald-200">
                    <span className="text-emerald-900 font-medium">Initial Batch Financial Valuation:</span>
                    <span className="font-mono font-bold text-emerald-950 text-xs">
                      ₹{(currentStock * (unitCost || 0)).toLocaleString('en-IN')} ({currentStock.toLocaleString()} {unit} @ ₹{unitCost})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Finance Accounting Entry</label>
                      <select
                        value={financeType}
                        onChange={(e) => setFinanceType(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="supplier_payable">📋 Supplier Accounts Payable (Credit/Due)</option>
                        <option value="paid_expense">💳 Paid Upfront (Debit Operating Expense)</option>
                      </select>
                    </div>

                    {financeType === 'supplier_payable' && (
                      <div>
                        <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Payment Due Date</label>
                        <input
                          type="date"
                          value={financeDueDate}
                          onChange={(e) => setFinanceDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-emerald-800">
                    ✓ Prevents double entry: automatically records stock, lot number, and procurement costs simultaneously into Finance &amp; Google Sheets.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Delete confirmation banner (when deleting from edit modal) */}
          {isConfirmingDelete && editingMaterial && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
              <div className="text-red-800 font-semibold">
                Are you sure you want to permanently delete <strong className="font-bold text-red-950">{editingMaterial.name}</strong>?
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-2.5 py-1 text-slate-600 bg-white border border-slate-200 rounded-md font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  id="btn-confirm-delete-inside-modal"
                  onClick={handleDeleteConfirm}
                  className="px-3 py-1 text-white bg-red-600 rounded-md font-bold hover:bg-red-700 flex items-center space-x-1 shadow-xs"
                >
                  <Trash2 className="h-3 w-3" />
                  <span>Yes, Delete</span>
                </button>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-5">
            {editingMaterial && onDeleteMaterial ? (
              <button
                type="button"
                id="btn-trigger-delete-in-modal"
                onClick={() => setIsConfirmingDelete(true)}
                className="px-3 py-2 text-xs font-bold text-red-600 hover:text-red-800 hover:bg-red-50 border border-red-200 rounded-lg transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Delete Material</span>
              </button>
            ) : <div />}

            <div className="flex items-center space-x-2">
              <button
                id="btn-cancel-add-material"
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-submit-add-material"
                type="submit"
                className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors flex items-center space-x-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{editingMaterial ? 'Update Material' : 'Save to Inventory'}</span>
              </button>
            </div>
          </div>

        </form>

      </div>

      {/* Category Manager & Clutter Cleaner Sub-Modal */}
      <CategoryManagerModal
        isOpen={isCategoryManagerOpen}
        onClose={() => setIsCategoryManagerOpen(false)}
        materials={materials}
        onCategoriesUpdated={handleCategoriesManagerUpdated}
      />
    </div>
  );
};
