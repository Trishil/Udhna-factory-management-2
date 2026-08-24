import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  FileText, 
  Sparkles, 
  Tag, 
  Calendar, 
  User, 
  CheckCircle2,
  Building,
  Plus,
  Trash2,
  MapPin,
  Database,
  Info,
  Hash,
  Palette,
  FolderPlus,
  FolderTree,
  GitBranch,
  RefreshCw,
  Zap,
  Scissors
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, WorkflowCustomMetadataField, OrderSlip, OrderSlipColorRow } from '../types';
import { 
  WORKFLOW_STAGES, 
  getStoredMetadataTemplateKeys, 
  recordMetadataKeysUsed, 
  getStoredFabricTypes,
  addNewFabricType,
  SUGGESTED_METADATA_KEYS 
} from '../utils/workflowData';
import { 
  generateUniqueJobNo, 
  generateUniqueChalanNo, 
  generateUniqueDesignNo, 
  generateUniqueLotNumber,
  generateUniquePieceTag
} from '../utils/idGenerator';

interface CreateWorkflowItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateItem: (item: WorkflowItem) => void;
  existingSlips?: OrderSlip[];
  existingItems?: WorkflowItem[];
  onSaveSlip?: (slip: OrderSlip, generatedItems: WorkflowItem[]) => void;
  initialMode?: 'folder' | 'branch' | 'single';
}

export const CreateWorkflowItemModal: React.FC<CreateWorkflowItemModalProps> = ({
  isOpen,
  onClose,
  onCreateItem,
  existingSlips = [],
  existingItems = [],
  onSaveSlip,
  initialMode = 'single'
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Creator Mode:
  // 'folder': Create Parent Master Order Slip Folder + Child Branches
  // 'branch': Branch New Fabric Design under an Existing Job Folder
  // 'single': Quick Single Fabric Design with Auto-Generated Parent Job & Challan Folder tags
  const [activeTab, setActiveTab] = useState<'single' | 'branch' | 'folder'>(initialMode);

  // Auto-generate fresh unique numbers on open
  const [jobNo, setJobNo] = useState('');
  const [chalanNumber, setChalanNumber] = useState('');
  const [designNumber, setDesignNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');

  const [partyName, setPartyName] = useState('');
  const [designName, setDesignName] = useState('');
  const [entryDate, setEntryDate] = useState(todayStr);
  const [pieces, setPieces] = useState<number>(100);
  const [fabricColor, setFabricColor] = useState('');
  const [fabricType, setFabricType] = useState('Kali');
  const [newFabricTypeInput, setNewFabricTypeInput] = useState('');
  const [showAddFabricInput, setShowAddFabricInput] = useState(false);
  const [fabricTypeList, setFabricTypeList] = useState<string[]>(() => getStoredFabricTypes());

  const [unit, setUnit] = useState<'pieces' | 'meters' | 'rolls' | 'sets' | 'sarees' | 'suits'>('pieces');
  const [initialStage, setInitialStage] = useState<WorkflowStageId>('fabric');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 5 * 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [assignedOperator, setAssignedOperator] = useState('Floor In-charge');
  const [notes, setNotes] = useState('');

  // Selected parent folder for 'branch' mode
  const [selectedParentSlipId, setSelectedParentSlipId] = useState<string>('');

  // Multi-branch state for 'folder' mode (creating an Order Slip master folder with child branches)
  const [slipFabricColumns, setSlipFabricColumns] = useState<string[]>(['Kali', 'Kurti', 'Lace', 'Dupatta']);
  const [newFabricColInput, setNewFabricColInput] = useState<string>('');

  const [slipColorRows, setSlipColorRows] = useState<OrderSlipColorRow[]>([
    {
      id: 'row-1',
      colorName: 'Royal Blue',
      colorHex: '#2563eb',
      designNumber: '',
      fabricQuantities: { 'Kali': 100, 'Kurti': 50 },
      notes: ''
    }
  ]);

  // Persistent Custom Metadata Fields
  const [customFields, setCustomFields] = useState<WorkflowCustomMetadataField[]>(() => {
    const templateKeys = getStoredMetadataTemplateKeys();
    if (templateKeys && templateKeys.length > 0) {
      return templateKeys.map(k => ({ key: k, value: '' }));
    }
    return [
      { key: 'Storage Location', value: '' },
      { key: 'Rack / Shelf #', value: '' }
    ];
  });

  // Re-generate unique numbers when opening modal
  useEffect(() => {
    if (isOpen) {
      const uJob = generateUniqueJobNo(existingSlips, existingItems);
      const uChallan = generateUniqueChalanNo(existingSlips, existingItems);
      const uDesign = generateUniqueDesignNo(existingItems);
      const uLot = generateUniqueLotNumber(uJob, fabricType, existingItems);

      setJobNo(uJob);
      setChalanNumber(uChallan);
      setDesignNumber(uDesign);
      setLotNumber(uLot);

      if (existingSlips.length > 0 && !selectedParentSlipId) {
        setSelectedParentSlipId(existingSlips[0].id);
      }
    }
  }, [isOpen, existingSlips, existingItems]);

  // When selected parent changes in 'branch' mode, auto-inherit parent details
  useEffect(() => {
    if (activeTab === 'branch' && selectedParentSlipId) {
      const parent = existingSlips.find(s => s.id === selectedParentSlipId);
      if (parent) {
        setJobNo(parent.jobNo || parent.id);
        setPartyName(parent.partyName || '');
        setChalanNumber(parent.chalanNo || '');
        setEntryDate(parent.date || todayStr);
        setLotNumber(generateUniqueLotNumber(parent.jobNo || parent.id, fabricType, existingItems));
      }
    }
  }, [selectedParentSlipId, activeTab, existingSlips, existingItems, fabricType, todayStr]);

  if (!isOpen) return null;

  const handleRegenerateJobNo = () => {
    setJobNo(generateUniqueJobNo(existingSlips, existingItems));
  };

  const handleRegenerateChalanNo = () => {
    setChalanNumber(generateUniqueChalanNo(existingSlips, existingItems));
  };

  const handleRegenerateDesignNo = () => {
    setDesignNumber(generateUniqueDesignNo(existingItems));
  };

  const handleAddNewFabricType = () => {
    if (!newFabricTypeInput.trim()) return;
    const updated = addNewFabricType(newFabricTypeInput.trim());
    setFabricTypeList(updated);
    setFabricType(newFabricTypeInput.trim());
    setNewFabricTypeInput('');
    setShowAddFabricInput(false);
  };

  const handleAddCustomField = (presetKey?: string) => {
    const keyToUse = presetKey || '';
    setCustomFields(prev => [...prev, { key: keyToUse, value: '' }]);
  };

  const handleRemoveCustomField = (index: number) => {
    setCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    setCustomFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  // Submission for Single or Branch item
  const handleSubmitSingleOrBranch = (e: React.FormEvent) => {
    e.preventDefault();

    if (!designNumber.trim()) {
      alert('Please provide a Design Number (D.no)');
      return;
    }

    if (!partyName.trim()) {
      alert('Please provide a Party / Client Name');
      return;
    }

    const validCustomMetadata = customFields
      .map(f => ({ key: f.key.trim(), value: f.value.trim() }))
      .filter(f => f.key.length > 0 && f.value.length > 0);

    const usedKeys = customFields.map(f => f.key.trim()).filter(Boolean);
    if (usedKeys.length > 0) {
      recordMetadataKeysUsed(usedKeys);
    }

    const stageDef = WORKFLOW_STAGES.find(s => s.id === initialStage) || WORKFLOW_STAGES[0];
    const pcsValue = Math.max(1, Math.round(Number(pieces) || 1));
    const effectiveJobNo = jobNo.trim() || generateUniqueJobNo(existingSlips, existingItems);
    const effectiveLotNo = lotNumber.trim() || generateUniqueLotNumber(effectiveJobNo, fabricType, existingItems);

    // Generate individual piece units for tracking
    const individualPieces = Array.from({ length: Math.min(pcsValue, 100) }, (_, i) => {
      const pNum = i + 1;
      return {
        id: `piece-${effectiveJobNo}-${fabricType}-${pNum}`,
        parentLotId: effectiveLotNo,
        pieceNumber: pNum,
        pieceTag: generateUniquePieceTag(effectiveJobNo, fabricType, pNum),
        lotNumber: effectiveLotNo,
        jobNo: effectiveJobNo,
        designNumber: designNumber.trim(),
        fabricType: fabricType.trim() || 'Kali',
        fabricColor: fabricColor.trim() || 'Default',
        partyName: partyName.trim(),
        currentStage: initialStage,
        status: 'good' as const,
        lastUpdated: new Date().toISOString()
      };
    });

    const newItem: WorkflowItem = {
      id: `wf-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      designNumber: designNumber.trim(),
      designName: designName.trim() || undefined,
      lotNumber: effectiveLotNo,
      jobNo: effectiveJobNo,
      partyOrClientName: partyName.trim(),
      partyName: partyName.trim(),
      date: entryDate,
      createdDate: entryDate,
      chalanNumber: chalanNumber.trim() || undefined,
      pieces: pcsValue,
      quantity: pcsValue,
      fabricType: fabricType.trim() || 'Kali',
      fabricColor: fabricColor.trim() || undefined,
      notes: notes.trim() || undefined,
      unit,
      currentStage: initialStage,
      priority,
      assignedOperator: assignedOperator.trim() || undefined,
      customMetadata: validCustomMetadata.length > 0 ? validCustomMetadata : undefined,
      dueDate: dueDate || undefined,
      individualPieces,
      tags: [
        `Job: ${effectiveJobNo}`,
        chalanNumber.trim() ? `Challan: ${chalanNumber.trim()}` : '',
        `Party: ${partyName.trim()}`,
        `Fabric: ${fabricType.trim()}`
      ].filter(Boolean),
      stageHistory: [
        {
          stageId: initialStage,
          stageName: stageDef.name,
          enteredAt: new Date().toISOString(),
          operatorName: assignedOperator.trim() || 'Floor In-charge',
          notes: notes.trim() ? `Initial entry: ${notes.trim()}` : `Created in ${stageDef.shortName}`
        }
      ]
    };

    onCreateItem(newItem);
    onClose();
  };

  // Submission for Folder Mode (Master Order Slip with multiple fabric branches)
  const handleSubmitFolderMode = (e: React.FormEvent) => {
    e.preventDefault();

    if (!partyName.trim()) {
      alert('Please provide a Party / Client Name for the Master Order Folder');
      return;
    }

    const effectiveJobNo = jobNo.trim() || generateUniqueJobNo(existingSlips, existingItems);
    const effectiveChallanNo = chalanNumber.trim() || generateUniqueChalanNo(existingSlips, existingItems);

    // Calculate total pieces from all color rows
    let totalSlipPcs = 0;
    const generatedWorkflowItems: WorkflowItem[] = [];

    slipColorRows.forEach((row, rIdx) => {
      const rowDesign = row.designNumber?.trim() || designNumber.trim() || `DSG-${100 + rIdx}`;
      Object.entries(row.fabricQuantities || {}).forEach(([fabType, qty]) => {
        const numQty = Number(qty) || 0;
        if (numQty > 0) {
          totalSlipPcs += numQty;
          const branchLotNo = `LOT-${effectiveJobNo.replace('JOB-', '')}-${fabType.slice(0, 3).toUpperCase()}-${rIdx + 1}`;

          const indPieces = Array.from({ length: Math.min(numQty, 50) }, (_, pIdx) => ({
            id: `pc-${effectiveJobNo}-${fabType}-${rIdx + 1}-${pIdx + 1}`,
            parentLotId: branchLotNo,
            pieceNumber: pIdx + 1,
            pieceTag: generateUniquePieceTag(effectiveJobNo, fabType, pIdx + 1),
            lotNumber: branchLotNo,
            jobNo: effectiveJobNo,
            designNumber: rowDesign,
            fabricType: fabType,
            fabricColor: row.colorName || 'Default',
            partyName: partyName.trim(),
            currentStage: initialStage,
            status: 'good' as const,
            lastUpdated: new Date().toISOString()
          }));

          const item: WorkflowItem = {
            id: `wf-slip-${effectiveJobNo}-${fabType}-${rIdx}-${Date.now()}`,
            designNumber: rowDesign,
            lotNumber: branchLotNo,
            jobNo: effectiveJobNo,
            partyOrClientName: partyName.trim(),
            partyName: partyName.trim(),
            date: entryDate,
            createdDate: entryDate,
            chalanNumber: effectiveChallanNo,
            pieces: numQty,
            quantity: numQty,
            fabricType: fabType,
            fabricColor: row.colorName,
            notes: row.notes || notes.trim() || undefined,
            unit: 'pieces',
            currentStage: initialStage,
            priority,
            assignedOperator,
            dueDate,
            individualPieces: indPieces,
            tags: [`Job: ${effectiveJobNo}`, `Challan: ${effectiveChallanNo}`, `Party: ${partyName.trim()}`],
            stageHistory: [
              {
                stageId: initialStage,
                stageName: WORKFLOW_STAGES.find(s => s.id === initialStage)?.name || '1. Fabric',
                enteredAt: new Date().toISOString(),
                operatorName: assignedOperator,
                notes: `Master Slip Folder Job created: ${effectiveJobNo}`
              }
            ]
          };

          generatedWorkflowItems.push(item);
        }
      });
    });

    if (generatedWorkflowItems.length === 0) {
      // Fallback to standard item if no sub-quantities entered
      const fallbackPcs = Math.max(1, pieces);
      totalSlipPcs = fallbackPcs;
      const fallbackItem: WorkflowItem = {
        id: `wf-slip-${effectiveJobNo}-${Date.now()}`,
        designNumber: designNumber.trim() || 'DSG-101',
        lotNumber: `LOT-${effectiveJobNo}`,
        jobNo: effectiveJobNo,
        partyOrClientName: partyName.trim(),
        partyName: partyName.trim(),
        date: entryDate,
        createdDate: entryDate,
        chalanNumber: effectiveChallanNo,
        pieces: fallbackPcs,
        quantity: fallbackPcs,
        fabricType: fabricType || 'Kali',
        fabricColor: fabricColor || 'Royal Blue',
        unit: 'pieces',
        currentStage: initialStage,
        priority,
        assignedOperator,
        dueDate,
        stageHistory: [
          {
            stageId: initialStage,
            stageName: WORKFLOW_STAGES.find(s => s.id === initialStage)?.name || '1. Fabric',
            enteredAt: new Date().toISOString(),
            operatorName: assignedOperator,
            notes: `Master Slip Folder Job created: ${effectiveJobNo}`
          }
        ]
      };
      generatedWorkflowItems.push(fallbackItem);
    }

    const newSlip: OrderSlip = {
      id: `slip-${effectiveJobNo.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now()}`,
      jobNo: effectiveJobNo,
      date: entryDate,
      partyName: partyName.trim(),
      chalanNo: effectiveChallanNo,
      fabricColumns: slipFabricColumns,
      colorRows: slipColorRows,
      totalPcs: totalSlipPcs,
      calculationNotes: notes.trim() || undefined,
      createdAt: new Date().toISOString()
    };

    if (onSaveSlip) {
      onSaveSlip(newSlip, generatedWorkflowItems);
    } else {
      generatedWorkflowItems.forEach(it => onCreateItem(it));
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/65 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto">
        
        {/* Modal Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/30">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide flex items-center space-x-2">
                <span>Unified Order &amp; Fabric Design Manager</span>
              </h2>
              <p className="text-xs text-slate-300">
                Folder (Parent Order Slip) &amp; Sub-Folder (Fabric Design Branches) hierarchy with unique auto-numbering
              </p>
            </div>
          </div>

          <button
            id="btn-close-unified-create"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Folder vs Sub-Folder Branch vs Quick Single) */}
        <div className="bg-slate-100/90 p-2 border-b border-slate-200 grid grid-cols-3 gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('folder')}
            className={`py-2.5 px-3 rounded-xl font-extrabold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'folder'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.01]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <FolderPlus className="h-4 w-4" />
            <span className="truncate">1. New Master Order Folder</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('branch')}
            className={`py-2.5 px-3 rounded-xl font-extrabold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'branch'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 scale-[1.01]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <GitBranch className="h-4 w-4" />
            <span className="truncate">2. Add Branch to Existing Job</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('single')}
            className={`py-2.5 px-3 rounded-xl font-extrabold flex items-center justify-center space-x-2 transition-all ${
              activeTab === 'single'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 scale-[1.01]'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Zap className="h-4 w-4" />
            <span className="truncate">3. Quick Single Design</span>
          </button>
        </div>

        {/* Modal Body / Forms */}
        <div className="p-5 sm:p-6 max-h-[76vh] overflow-y-auto space-y-5">
          
          {/* Active Mode Banner & Explanation */}
          {activeTab === 'folder' && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-2.5">
              <FolderPlus className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold">Parent Order Master Folder (S V ART Slip):</span> Creates the master job umbrella containing a unique Job No., Inward Challan No., and Party Name. Multiple fabric component branches (Kali, Kurti, Lass, Dupatta) will be grouped under this single master job folder and synced to Google Sheets.
              </div>
            </div>
          )}

          {activeTab === 'branch' && (
            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start space-x-2.5">
              <GitBranch className="h-4 w-4 text-blue-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold">Sub-Folder Fabric Branch:</span> Branch off an existing Job Folder. It automatically inherits the parent Job No., Challan No., and Party Name, creating a synchronized child fabric branch item with a unique Lot No.
              </div>
            </div>
          )}

          {activeTab === 'single' && (
            <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 flex items-start space-x-2.5">
              <Zap className="h-4 w-4 text-indigo-700 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold">Quick Single Fabric Design:</span> Fast entry with automatic generation of unique Job No., Challan No., Design No., and Piece Tags.
              </div>
            </div>
          )}

          {/* Form Content */}
          <form 
            onSubmit={activeTab === 'folder' ? handleSubmitFolderMode : handleSubmitSingleOrBranch} 
            className="space-y-4"
          >
            
            {/* If Branch mode: Select Parent Folder first */}
            {activeTab === 'branch' && (
              <div className="p-4 rounded-xl bg-slate-50 border border-blue-200 space-y-2">
                <label className="block text-xs font-black uppercase text-blue-900 flex items-center space-x-1.5">
                  <FolderTree className="h-4 w-4 text-blue-600" />
                  <span>Select Parent Job Folder (Master Order Slip) *</span>
                </label>
                {existingSlips.length > 0 ? (
                  <select
                    id="select-parent-slip"
                    value={selectedParentSlipId}
                    onChange={(e) => setSelectedParentSlipId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                  >
                    {existingSlips.map(slip => (
                      <option key={slip.id} value={slip.id}>
                        📁 Job: {slip.jobNo || slip.id} • Party: {slip.partyName} • Chalan: {slip.chalanNo || 'N/A'} • {slip.totalPcs} pcs ({slip.date})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-slate-500 italic p-2 bg-white rounded-lg border border-slate-200">
                    No order slips found yet. A new parent Job Folder will be initialized automatically.
                  </div>
                )}
              </div>
            )}

            {/* Folder / Master Job Info Grid */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <FolderTree className="h-3.5 w-3.5 text-slate-500" />
                  <span>Parent Order Folder Identification &amp; Unique Tags</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Unique Auto-Numbers</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Job No. */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">3) Job No. *</label>
                    <button
                      type="button"
                      onClick={handleRegenerateJobNo}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-0.5"
                      title="Roll New Unique Job No."
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>New #</span>
                    </button>
                  </div>
                  <input
                    id="input-wf-job-no"
                    type="text"
                    required
                    value={jobNo}
                    onChange={(e) => {
                      setJobNo(e.target.value);
                      setLotNumber(e.target.value);
                    }}
                    placeholder="e.g. JOB-2026-001"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 5) Chalan No. */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">5) Chalan No. (Ch. NO.)</label>
                    <button
                      type="button"
                      onClick={handleRegenerateChalanNo}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-0.5"
                      title="Roll New Unique Challan No."
                    >
                      <RefreshCw className="h-2.5 w-2.5" />
                      <span>New #</span>
                    </button>
                  </div>
                  <input
                    id="input-wf-chalan-no"
                    type="text"
                    value={chalanNumber}
                    onChange={(e) => setChalanNumber(e.target.value)}
                    placeholder="e.g. CH-2026-101"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* 4) Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">4) Date *</label>
                  <input
                    id="input-wf-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

              </div>

              {/* 2) Party Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">2) Party / Client Name *</label>
                <input
                  id="input-wf-party"
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Vandana Silk, Ambika Mills, Jaishri, BL. FASHION"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

            </div>

            {/* Sub-Folder / Fabric Branch Details */}
            {activeTab !== 'folder' ? (
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <GitBranch className="h-3.5 w-3.5 text-blue-600" />
                    <span>Fabric Branch &amp; Design Specifications</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">Child Design Branch</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* 8) Design no. (D.no) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">8) Design No. (D.no) *</label>
                      <button
                        type="button"
                        onClick={handleRegenerateDesignNo}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-0.5"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>New D.no</span>
                      </button>
                    </div>
                    <input
                      id="input-wf-design-no"
                      type="text"
                      required
                      value={designNumber}
                      onChange={(e) => setDesignNumber(e.target.value)}
                      placeholder="e.g. DSG-115 / D.no 104"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* 10) Type of Fabric */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-800">10) Fabric Type *</label>
                      <button
                        type="button"
                        onClick={() => setShowAddFabricInput(prev => !prev)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-0.5"
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>Custom</span>
                      </button>
                    </div>

                    {showAddFabricInput ? (
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={newFabricTypeInput}
                          onChange={(e) => setNewFabricTypeInput(e.target.value)}
                          placeholder="e.g. Saree Pallu"
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-blue-400 rounded-lg text-xs font-bold text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={handleAddNewFabricType}
                          className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                        >
                          Add
                        </button>
                      </div>
                    ) : (
                      <select
                        id="select-wf-fabric-type"
                        value={fabricType}
                        onChange={(e) => setFabricType(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {fabricTypeList.map(ft => (
                          <option key={ft} value={ft}>{ft}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* 1) Color */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">1) Fabric Color</label>
                    <input
                      id="input-wf-color"
                      type="text"
                      value={fabricColor}
                      onChange={(e) => setFabricColor(e.target.value)}
                      placeholder="e.g. Royal Blue / Maroon / Mustard"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* 6) Pieces */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">6) Total Pieces (Pcs) *</label>
                    <input
                      id="input-wf-pieces"
                      type="number"
                      min={1}
                      required
                      value={pieces}
                      onChange={(e) => setPieces(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Initial Manufacturing Stage */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Initial Stage</label>
                    <select
                      id="select-wf-stage"
                      value={initialStage}
                      onChange={(e) => setInitialStage(e.target.value as WorkflowStageId)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {WORKFLOW_STAGES.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">Priority</label>
                    <select
                      id="select-wf-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">🔥 Urgent Priority</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                </div>

              </div>
            ) : (
              /* Folder Master Slip Branch Matrix Creator */
              <div className="p-4 rounded-xl bg-white border border-amber-200 space-y-4 shadow-2xs">
                
                {/* 1. Matrix Header & Action */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-amber-100">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                    <FolderTree className="h-3.5 w-3.5 text-amber-600" />
                    <span>Fabric Component Branches Matrix (Under Master Job Folder)</span>
                  </span>
                  
                  <button
                    type="button"
                    onClick={() => setSlipColorRows(prev => [
                      ...prev,
                      {
                        id: `row-${Date.now()}`,
                        colorName: 'New Colorway',
                        colorHex: '#9333ea',
                        designNumber: designNumber,
                        fabricQuantities: slipFabricColumns.reduce((acc, col) => ({ ...acc, [col]: 0 }), {}),
                        notes: ''
                      }
                    ])}
                    className="text-xs font-bold text-amber-800 hover:text-amber-950 flex items-center space-x-1 px-2.5 py-1 bg-amber-100 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Color Branch</span>
                  </button>
                </div>

                {/* 2. Fabric Component Columns Manager */}
                <div className="p-2.5 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                      Fabric Component Columns (e.g. Kali, Kurti, Dupatta):
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {slipFabricColumns.map((col) => (
                      <span 
                        key={col} 
                        className="inline-flex items-center space-x-1 px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-xs font-bold text-amber-950 shadow-2xs"
                      >
                        <span>{col}</span>
                        {slipFabricColumns.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSlipFabricColumns(prev => prev.filter(c => c !== col));
                              setSlipColorRows(prev => prev.map(r => {
                                const newQuantities = { ...r.fabricQuantities };
                                delete newQuantities[col];
                                return { ...r, fabricQuantities: newQuantities };
                              }));
                            }}
                            className="text-slate-400 hover:text-rose-600 rounded p-0.5 ml-1"
                            title={`Remove ${col} column`}
                          >
                            ×
                          </button>
                        )}
                      </span>
                    ))}

                    {/* Add Column Input */}
                    <div className="flex items-center space-x-1">
                      <input
                        type="text"
                        value={newFabricColInput}
                        onChange={(e) => setNewFabricColInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = newFabricColInput.trim();
                            if (val && !slipFabricColumns.includes(val)) {
                              setSlipFabricColumns(prev => [...prev, val]);
                              setNewFabricColInput('');
                            }
                          }
                        }}
                        placeholder="Add component (e.g. Blouse)..."
                        className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400 w-44 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const val = newFabricColInput.trim();
                          if (val && !slipFabricColumns.includes(val)) {
                            setSlipFabricColumns(prev => [...prev, val]);
                            setNewFabricColInput('');
                          }
                        }}
                        className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        + Add Column
                      </button>
                    </div>
                  </div>
                </div>

                {/* 3. Color Rows */}
                <div className="space-y-3">
                  {slipColorRows.map((row, idx) => (
                    <div key={row.id} className="p-3 bg-amber-50/40 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 flex-1">
                          <span className="text-xs font-black text-amber-950 font-mono">#{idx + 1}</span>

                          {/* Interactive Hue & Saturation Color Picker */}
                          <input
                            type="color"
                            value={row.colorHex || '#2563eb'}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlipColorRows(prev => prev.map((r, i) => i === idx ? { ...r, colorHex: val } : r));
                            }}
                            className="h-8 w-8 rounded-lg border border-slate-300 cursor-pointer p-0.5 shrink-0 bg-white"
                            title="Click to open Color Picker (Hue & Saturation)"
                          />

                          <input
                            type="text"
                            value={row.colorName}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlipColorRows(prev => prev.map((r, i) => i === idx ? { ...r, colorName: val } : r));
                            }}
                            placeholder="Color Name (e.g. Royal Blue)"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 w-44"
                          />
                          <input
                            type="text"
                            value={row.designNumber || designNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSlipColorRows(prev => prev.map((r, i) => i === idx ? { ...r, designNumber: val } : r));
                            }}
                            placeholder="D.No (e.g. 104)"
                            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 w-32"
                          />
                        </div>

                        {slipColorRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setSlipColorRows(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete this color row"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {/* Fabric Types Quantities for this color */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {slipFabricColumns.map(fab => {
                          const currentQty = row.fabricQuantities?.[fab] ?? 0;
                          return (
                            <div key={fab} className="flex items-center justify-between p-1.5 bg-white rounded-lg border border-slate-200 text-xs">
                              <span className="font-semibold text-slate-700 truncate mr-1">{fab}:</span>
                              <input
                                type="number"
                                min={0}
                                value={currentQty}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setSlipColorRows(prev => prev.map((r, i) => {
                                    if (i !== idx) return r;
                                    return {
                                      ...r,
                                      fabricQuantities: {
                                        ...r.fabricQuantities,
                                        [fab]: val
                                      }
                                    };
                                  }));
                                }}
                                className="w-16 px-1.5 py-0.5 bg-slate-50 border border-slate-300 rounded text-right font-mono font-bold text-slate-900"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 9) Notes & Instructions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">9) Note of Any Kind / Production Instructions</label>
              <textarea
                id="input-wf-notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. High zari density on border; double stitch patta; rush client delivery by Friday..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Submit & Action Buttons */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                id="btn-submit-unified-create"
                type="submit"
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white shadow-lg transition-all flex items-center space-x-2 ${
                  activeTab === 'folder'
                    ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
                    : activeTab === 'branch'
                    ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                }`}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {activeTab === 'folder'
                    ? 'Create Master Order Folder & All Branches'
                    : activeTab === 'branch'
                    ? 'Add Branch to Master Job Folder'
                    : 'Create Fabric Design & Job'}
                </span>
              </button>
            </div>

          </form>

        </div>

      </div>
    </div>
  );
};
