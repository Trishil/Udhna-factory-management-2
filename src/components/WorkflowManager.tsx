import React, { useState, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Layers, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  PackageCheck, 
  FileText, 
  Tag, 
  Printer, 
  Download, 
  RefreshCw,
  MoreVertical,
  Scissors,
  CheckSquare,
  Wrench,
  Package,
  Scroll,
  ScissorsLineDashed,
  ShieldAlert,
  Flame,
  MapPin,
  Database,
  Camera,
  Smartphone,
  ImageIcon,
  Grid,
  SlidersHorizontal,
  Table,
  Eye,
  Edit,
  Trash2,
  Split,
  FolderTree,
  FolderPlus,
  GitBranch,
  Users,
  Share2
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, OrderSlip } from '../types';
import { 
  WORKFLOW_STAGES, 
  getNextStage, 
  getPreviousStage, 
  getStoredOrderSlips, 
  saveStoredOrderSlips, 
  getItemStageBreakdown,
  getOrderSlipCompletedPieces,
  getOrderSlipStageDistribution,
  INITIAL_WORKFLOW_ITEMS
} from '../utils/workflowData';
import { WorkflowItemModal } from './WorkflowItemModal';
import { CreateWorkflowItemModal } from './CreateWorkflowItemModal';
import { DesignPhotoModal } from './DesignPhotoModal';
import { FabricColorStageMatrix } from './FabricColorStageMatrix';
import { IndividualPieceTracker } from './IndividualPieceTracker';
import { OrderSlipModal } from './OrderSlipModal';
import { normalizeStageForWeb, formatDirectImageUrl } from '../services/firebaseService';

interface WorkflowManagerProps {
  items: WorkflowItem[];
  onUpdateStage: (itemId: string, newStage: WorkflowStageId, notes?: string, qualityStatus?: 'good' | 'bad_return' | 'needs_alter' | 'passed') => void;
  onCreateItem: (item: WorkflowItem) => void;
  onUpdateItem: (item: WorkflowItem) => void;
  onDeleteItem: (itemId: string) => void;
  onHandoverToDispatch?: (item: WorkflowItem) => void;
  onTriggerSync?: () => void;
  orderSlips?: OrderSlip[];
  onSaveOrderSlip?: (slip: OrderSlip, generatedItems: WorkflowItem[]) => void;
}

export const WorkflowManager: React.FC<WorkflowManagerProps> = ({
  items,
  onUpdateStage,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onHandoverToDispatch,
  onTriggerSync,
  orderSlips: propOrderSlips,
  onSaveOrderSlip: propOnSaveOrderSlip
}) => {
  // View mode tab: Matrix breakdown vs Individual Piece Tracker vs Kanban vs Party Slips
  const [viewMode, setViewMode] = useState<'matrix' | 'pieces' | 'kanban' | 'slips'>('matrix');

  // Local Order Slips state fallback
  const [localOrderSlips, setLocalOrderSlips] = useState<OrderSlip[]>(() => {
    return propOrderSlips || getStoredOrderSlips();
  });

  const currentOrderSlips = propOrderSlips || localOrderSlips;

  const [isOrderSlipModalOpen, setIsOrderSlipModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<OrderSlip | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedQualityFilter, setSelectedQualityFilter] = useState<string>('all');

  // Active modal states
  const [selectedItemForModal, setSelectedItemForModal] = useState<WorkflowItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [photoModalItem, setPhotoModalItem] = useState<WorkflowItem | null>(null);

  // Drag and Drop state
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<WorkflowStageId | null>(null);

  // Horizontal scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -340, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 340, behavior: 'smooth' });
    }
  };

  const effectiveItems = useMemo(() => {
    return (items && items.length > 0) ? items : INITIAL_WORKFLOW_ITEMS;
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return effectiveItems.filter(item => {
      if (!item) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q || (
        String(item.designNumber || '').toLowerCase().includes(q) ||
        String(item.designName || '').toLowerCase().includes(q) ||
        String(item.lotNumber || item.jobNo || item.id || '').toLowerCase().includes(q) ||
        String(item.chalanNumber || '').toLowerCase().includes(q) ||
        String(item.fabricType || '').toLowerCase().includes(q) ||
        String(item.fabricColor || '').toLowerCase().includes(q) ||
        String(item.partyOrClientName || item.partyName || '').toLowerCase().includes(q) ||
        String(item.assignedOperator || '').toLowerCase().includes(q) ||
        (Array.isArray(item.tags) && item.tags.some(t => String(t || '').toLowerCase().includes(q))) ||
        (Array.isArray(item.customMetadata) && item.customMetadata.some(m => 
          String(m.key || '').toLowerCase().includes(q) || String(m.value || '').toLowerCase().includes(q)
        ))
      );

      const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
      const itemStageNorm = normalizeStageForWeb(item.currentStage);
      const matchesStage = selectedStageFilter === 'all' || itemStageNorm === selectedStageFilter;
      
      let matchesQuality = true;
      if (selectedQualityFilter === 'good') {
        matchesQuality = item.initialInspectionResult === 'good' || item.alterInspectionResult === 'passed';
      } else if (selectedQualityFilter === 'alter') {
        matchesQuality = itemStageNorm === 'altering' || item.alterInspectionResult === 'needs_alter';
      } else if (selectedQualityFilter === 'return') {
        matchesQuality = item.initialInspectionResult === 'bad_return' || item.isReturned === true;
      }

      return matchesSearch && matchesPriority && matchesStage && matchesQuality;
    });
  }, [effectiveItems, searchQuery, selectedPriority, selectedStageFilter, selectedQualityFilter]);

  // Overall Statistics
  const totalItems = effectiveItems.length;
  const totalVolume = effectiveItems.reduce((acc, it) => acc + (it.quantity || 0), 0);
  const urgentCount = effectiveItems.filter(it => it.priority === 'urgent').length;
  const inEmbroideryCount = effectiveItems.filter(it => normalizeStageForWeb(it.currentStage) === 'embroidery').length;
  const alteringCount = effectiveItems.filter(it => normalizeStageForWeb(it.currentStage) === 'altering' || it.alterInspectionResult === 'needs_alter').length;
  const readyDispatchCount = effectiveItems.filter(it => normalizeStageForWeb(it.currentStage) === 'prepare_dispatch').length;

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingItemId(itemId);
  };

  const handleDragOver = (e: React.DragEvent, stageId: WorkflowStageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, stageId: WorkflowStageId) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverStageId === stageId) {
      setDragOverStageId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStageId: WorkflowStageId) => {
    e.preventDefault();
    setDragOverStageId(null);
    const droppedItemId = e.dataTransfer.getData('text/plain') || draggingItemId;
    setDraggingItemId(null);

    if (droppedItemId) {
      const targetItem = items.find(it => it.id === droppedItemId);
      if (targetItem && targetItem.currentStage !== targetStageId) {
        onUpdateStage(droppedItemId, targetStageId, `Moved via workflow drag-and-drop to ${targetStageId}`);
      }
    }
  };

  const handleDragEnd = () => {
    setDraggingItemId(null);
    setDragOverStageId(null);
  };

  // Helper to render icon for stage
  const renderStageIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case 'Scroll': return <Scroll className={className} />;
      case 'FileText': return <FileText className={className} />;
      case 'CheckSquare': return <CheckSquare className={className} />;
      case 'Scissors': return <Scissors className={className} />;
      case 'Sparkles': return <Sparkles className={className} />;
      case 'ScissorsLineDashed': return <ScissorsLineDashed className={className} />;
      case 'ShieldAlert': return <ShieldAlert className={className} />;
      case 'Wrench': return <Wrench className={className} />;
      case 'Layers': return <Layers className={className} />;
      case 'PackageCheck': return <PackageCheck className={className} />;
      default: return <Layers className={className} />;
    }
  };

  // Export pipeline report
  const handleExportCSV = () => {
    const headers = ['Lot No', 'Design No', 'Design Name', 'Chalan No', 'Fabric Type', 'Color', 'Quantity', 'Unit', 'Current Stage', 'Priority', 'Party', 'Due Date'];
    const rows = items.map(it => [
      it.lotNumber,
      it.designNumber,
      it.designName || '',
      it.chalanNumber || '',
      it.fabricType,
      it.fabricColor || '',
      it.quantity,
      it.unit,
      it.currentStage,
      it.priority,
      it.partyOrClientName || '',
      it.dueDate || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fabric_workflow_pipeline_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveSlip = (slip: OrderSlip, generatedItems: WorkflowItem[]) => {
    if (propOnSaveOrderSlip) {
      propOnSaveOrderSlip(slip, generatedItems);
    } else {
      const existingIdx = localOrderSlips.findIndex(s => s.id === slip.id);
      let updatedSlips: OrderSlip[];
      if (existingIdx >= 0) {
        updatedSlips = localOrderSlips.map(s => s.id === slip.id ? slip : s);
      } else {
        updatedSlips = [slip, ...localOrderSlips];
      }
      setLocalOrderSlips(updatedSlips);
      saveStoredOrderSlips(updatedSlips);

      // Add newly generated items if not present
      generatedItems.forEach(it => {
        const exists = items.some(existing => existing.id === it.id);
        if (!exists) {
          onCreateItem(it);
        } else {
          onUpdateItem(it);
        }
      });
    }
  };

  const handleOpenSlipEdit = (slip: OrderSlip) => {
    setEditingSlip(slip);
    setIsOrderSlipModalOpen(true);
  };

  const handleOpenNewSlip = () => {
    setEditingSlip(null);
    setIsOrderSlipModalOpen(true);
  };

  return (
    <div id="workflow-manager-root" className="space-y-6">
      
      {/* Top View Mode Navigation & Actions Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-3 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="bg-slate-100/80 p-1 rounded-xl flex items-center flex-wrap gap-1 w-full md:w-auto border border-slate-200/60">
          <button
            id="viewmode-btn-matrix"
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              viewMode === 'matrix'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Table className="h-4 w-4" />
            <span>Fabric &amp; Color Matrix</span>
            <span className={`px-1.5 py-0.2 rounded text-[10px] ${viewMode === 'matrix' ? 'bg-slate-100 text-slate-700' : 'bg-slate-200/70 text-slate-600'}`}>
              Breakdown
            </span>
          </button>

          <button
            id="viewmode-btn-pieces"
            type="button"
            onClick={() => setViewMode('pieces')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              viewMode === 'pieces'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Split className="h-4 w-4" />
            <span>Individual Piece Tracker</span>
          </button>

          <button
            id="viewmode-btn-kanban"
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              viewMode === 'kanban'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <Grid className="h-4 w-4" />
            <span>10-Stage Kanban</span>
          </button>

          <button
            id="viewmode-btn-slips"
            type="button"
            onClick={() => setViewMode('slips')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-2 ${
              viewMode === 'slips'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Party Order Slips ({currentOrderSlips.length})</span>
          </button>
        </div>

        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
          {/* Unified Add Button with Folder & Branching */}
          <button
            id="btn-unified-new-order-branch"
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-all"
            title="Create Master Order Folder (Order Slip) or Branch New Fabric Design"
          >
            <FolderTree className="h-4 w-4 text-slate-300" />
            <span>+ New Order &amp; Design</span>
          </button>

          {/* Sync with Google Sheets Button */}
          {onTriggerSync && (
            <button
              id="btn-sync-workflow-sheets"
              type="button"
              onClick={onTriggerSync}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 transition-all shadow-2xs"
              title="Sync All Workflow Designs to Google Sheets"
            >
              <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
              <span>Sync Sheets</span>
            </button>
          )}

          <button
            id="btn-export-wf-csv"
            type="button"
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold transition-colors shadow-2xs"
            title="Export CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: FABRIC TYPE & COLOR STAGE MATRIX */}
      {viewMode === 'matrix' && (
        <FabricColorStageMatrix
          items={items}
          orderSlips={currentOrderSlips}
          onUpdateStage={onUpdateStage}
          onUpdateItem={onUpdateItem}
          onOpenCreateSlipModal={handleOpenNewSlip}
          onOpenItemModal={(item) => setSelectedItemForModal(item)}
        />
      )}

      {/* VIEW 2: INDIVIDUAL PIECE TRACKER (UNIT BREAKDOWN & ALTERATION ROUTING) */}
      {viewMode === 'pieces' && (
        <IndividualPieceTracker
          items={effectiveItems}
          orderSlips={currentOrderSlips}
          onUpdateItem={onUpdateItem}
        />
      )}

      {/* VIEW 2: PARTY ORDER SLIPS (S V ART FORMAT) */}
      {viewMode === 'slips' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center space-x-2">
                  <span>Party Order Slips (Physical Grid Cards)</span>
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-xs font-serif font-bold">
                    श्री ૧૫
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Complete order sheets with job calculations, fabric types (Kali, Kurti, Lass, Dupatta, etc.), multi-color piece allocations, and delivery challans.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewSlip}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Create New Order Slip</span>
              </button>
            </div>

            {/* Slips Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
              {currentOrderSlips.map(slip => {
                const totalCalculated = (slip.colorRows || []).reduce((acc, row) => {
                  return acc + Object.values(row.fabricQuantities || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                }, 0);
                // Compute live completed pieces from individual piece units
                const completed = getOrderSlipCompletedPieces(slip, items);
                const percent = totalCalculated > 0 ? Math.min(100, Math.round((completed / totalCalculated) * 100)) : 0;
                const stageDist = getOrderSlipStageDistribution(slip, items);

                return (
                  <div 
                    key={slip.id}
                    className="bg-amber-50/30 rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden flex flex-col justify-between hover:border-slate-400 transition-all"
                  >
                    {/* Header */}
                    <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-400 font-serif font-bold text-sm">श्री ૧૫</span>
                        <span className="font-serif font-bold text-sm tracking-wide uppercase">{slip.firmName || 'S V ART & CREATION'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                          Job: {slip.jobNo}
                        </span>
                        {percent === 100 && (
                          <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full flex items-center space-x-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            <span>100% Ready</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 flex-1 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Party Name</span>
                          <span className="font-black text-slate-900 text-sm truncate block">{slip.partyName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Chalan No.</span>
                          <span className="font-bold font-mono text-slate-800 text-sm">{slip.chalanNo || '—'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Date</span>
                          <span className="font-bold text-slate-800">{slip.date}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Pcs</span>
                          <span className="font-black font-mono text-blue-700 text-sm">{totalCalculated} pcs</span>
                        </div>
                      </div>

                      {/* Fabric Components and Colors Summary */}
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                          <span>Fabric Components ({slip.fabricColumns.length}):</span>
                          <span className="text-slate-500">{slip.colorRows.length} Colorways</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {slip.fabricColumns.map(col => (
                            <span key={col} className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md font-bold text-[10px]">
                              {col}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Color Swatches Strip */}
                      <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                        {slip.colorRows.map((row, idx) => (
                          <div 
                            key={row.id || idx}
                            className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-white border border-slate-200 shadow-2xs shrink-0 text-[10px] font-semibold text-slate-700"
                            title={`${row.colorName} - D.No: ${row.designNumber}`}
                          >
                            <span className="h-3 w-3 rounded-full border border-slate-300" style={{ backgroundColor: row.colorHex || '#3b82f6' }} />
                            <span className="truncate max-w-[80px]">{row.colorName}</span>
                          </div>
                        ))}
                      </div>

                      {/* Live Piece Distribution Badge */}
                      <div className="p-2.5 bg-slate-100/70 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] flex-wrap gap-1.5">
                        <span className="font-bold text-slate-700 flex items-center space-x-1">
                          <Split className="h-3.5 w-3.5 text-blue-600" />
                          <span>Live Piece Status:</span>
                        </span>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-bold font-mono text-[10px] border border-emerald-300">
                            ✅ {completed} Completed
                          </span>
                          {stageDist.altering > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-900 font-bold font-mono text-[10px] border border-rose-300 animate-pulse">
                              ⚠️ {stageDist.altering} in Altering
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 font-bold font-mono text-[10px] border border-blue-300">
                            🧵 {totalCalculated - completed - stageDist.altering} in Production
                          </span>
                        </div>
                      </div>

                      {/* Delivery & Completion status */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">Fulfillment Progress (Live Piece Sync):</span>
                          <span className="font-mono font-bold text-slate-900">{completed} / {totalCalculated} pcs ({percent}%)</span>
                        </div>
                        <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all ${percent === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                          <span>Del. Chalan: <strong>{slip.deliveryChalanNo || '—'}</strong></span>
                          <span>Bill No: <strong>{slip.billNo || '—'}</strong></span>
                        </div>
                      </div>

                      {/* Calculation Preview */}
                      {slip.calculationNotes && (
                        <div className="p-2 bg-slate-100/80 rounded-lg text-[10px] font-mono text-slate-700 truncate">
                          {slip.calculationNotes}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => {
                          setViewMode('pieces');
                        }}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                      >
                        <Split className="h-3.5 w-3.5" />
                        <span>Track Individual Pieces ({totalCalculated})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenSlipEdit(slip)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs flex items-center space-x-1.5 transition-colors shadow-xs"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Slip Sheet</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: 10-STAGE KANBAN BOARD */}
      {viewMode === 'kanban' && (
        <div className="space-y-6">
          {/* Header & Metric Banner */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        
        <div className="p-5 bg-white text-slate-900 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-slate-900 text-white shadow-xs shrink-0">
              <Layers className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">
                  Fabric Design Stage Workflow
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold uppercase">
                  10 Stages Kanban
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Drag-and-drop production tracking with mobile photo capture &amp; custom metadata synchronization
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end">
            <button
              id="btn-add-fabric-job"
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center space-x-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
            >
              <Plus className="h-4 w-4 text-slate-300" />
              <span>+ New Order &amp; Design</span>
            </button>
          </div>
        </div>

        {/* Pipeline Summary KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/50 text-xs">
          <div className="p-3.5 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Total in Pipeline</span>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">{totalItems} Jobs</p>
            </div>
          </div>

          <div className="p-3.5 flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <Sparkles className="h-4 w-4 text-slate-700" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">In Embroidery</span>
              <p className="text-base font-black text-slate-900 font-mono mt-0.5">{inEmbroideryCount} Active</p>
            </div>
          </div>

          <div className="p-3.5 flex items-center space-x-3">
            <div className={`p-2 rounded-xl ${urgentCount > 0 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-500'}`}>
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Urgent Priority</span>
              <p className={`text-base font-black font-mono mt-0.5 ${urgentCount > 0 ? 'text-rose-700' : 'text-slate-900'}`}>
                {urgentCount} Lots
              </p>
            </div>
          </div>

          <div className="p-3.5 flex items-center space-x-3 bg-amber-50/40">
            <div className="p-2 rounded-xl bg-amber-100/80 text-amber-800">
              <Wrench className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-800">Altering / Rework</span>
              <p className="text-base font-black font-mono mt-0.5 text-amber-900">
                {alteringCount} Items
              </p>
            </div>
          </div>

          <div className="p-3.5 flex items-center space-x-3 bg-emerald-50/40">
            <div className="p-2 rounded-xl bg-emerald-100/80 text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800">Ready for Dispatch</span>
              <p className="text-base font-black font-mono mt-0.5 text-emerald-900">
                {readyDispatchCount} Lots
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 bg-white border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="input-search-workflow"
              type="text"
              placeholder="Search design #, lot, slip, fabric, tags, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            
            {/* Stage Filter */}
            <select
              id="select-filter-stage"
              value={selectedStageFilter}
              onChange={(e) => setSelectedStageFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All 10 Stages</option>
              {WORKFLOW_STAGES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            {/* Quality Filter */}
            <select
              id="select-filter-quality"
              value={selectedQualityFilter}
              onChange={(e) => setSelectedQualityFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Quality States</option>
              <option value="good">Accepted (Good / Passed)</option>
              <option value="alter">Altering Required</option>
              <option value="return">Returned (Defective)</option>
            </select>

            {/* Priority Filter */}
            <select
              id="select-filter-priority"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">🔥 Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>

            {/* Scroll Navigation Arrows for Kanban */}
            <div className="hidden lg:flex items-center space-x-1 pl-2 border-l border-slate-200">
              <button
                id="btn-scroll-left"
                type="button"
                onClick={scrollLeft}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
                title="Scroll Left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                id="btn-scroll-right"
                type="button"
                onClick={scrollRight}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-2xs transition-colors"
                title="Scroll Right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

          </div>

        </div>

      </div>

      {/* Drag & Drop Hint Banner */}
      <div className="flex items-center justify-between px-4 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900">
        <div className="flex items-center space-x-2">
          <span className="p-1 rounded bg-blue-600 text-white font-mono text-[10px] font-black">
            DRAG &amp; DROP
          </span>
          <span className="font-medium">
            Drag any fabric design card into another column stage to update manufacturing status. Click camera icon to attach live photo.
          </span>
        </div>
        <span className="font-mono font-bold text-blue-800 hidden sm:inline">
          {filteredItems.length} of {effectiveItems.length} designs shown
        </span>
      </div>

      {/* 10-Stage Kanban Board Container */}
      <div 
        ref={scrollContainerRef}
        className="flex space-x-4 overflow-x-auto pb-6 pt-1 select-none scrollbar-thin scrollbar-thumb-slate-300"
        style={{ minHeight: '620px' }}
      >
        {WORKFLOW_STAGES.map((stage) => {
          const stageItems = filteredItems.filter(it => normalizeStageForWeb(it.currentStage) === stage.id);
          const isOver = dragOverStageId === stage.id;
          const stageTotalUnits = stageItems.reduce((acc, it) => acc + it.quantity, 0);

          return (
            <div
              key={stage.id}
              id={`column-stage-${stage.id}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={(e) => handleDragLeave(e, stage.id)}
              onDrop={(e) => handleDrop(e, stage.id)}
              className={`flex-shrink-0 w-80 flex flex-col rounded-2xl border transition-all duration-150 ${
                isOver 
                  ? 'bg-blue-100/60 border-blue-500 ring-2 ring-blue-400 shadow-md scale-[1.01]' 
                  : `${stage.color.bg} ${stage.color.border} shadow-2xs`
              }`}
            >
              {/* Column Header */}
              <div className={`p-3.5 border-b ${stage.color.border} rounded-t-2xl ${stage.color.headerBg} flex items-start justify-between`}>
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className={`p-1 rounded-md bg-white text-slate-800 shadow-2xs`}>
                      {renderStageIcon(stage.iconName, "h-3.5 w-3.5")}
                    </span>
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">
                      {stage.name}
                    </h3>
                  </div>
                  <p className="text-[10px] text-slate-600 line-clamp-1">
                    {stage.description}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${stage.color.badge}`}>
                    {stageItems.length}
                  </span>
                  {stageTotalUnits > 0 && (
                    <span className="text-[9px] font-mono font-bold text-slate-500">
                      {(stageTotalUnits || 0).toLocaleString()} units
                    </span>
                  )}
                </div>
              </div>

              {/* Stage Drop Area & Card List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3 min-h-[480px]">
                
                {stageItems.length === 0 ? (
                  <div className={`h-44 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center transition-colors ${
                    isOver ? 'border-blue-400 bg-blue-50/50' : 'border-slate-300/80 bg-white/40'
                  }`}>
                    {renderStageIcon(stage.iconName, "h-6 w-6 text-slate-400 mb-1 opacity-60")}
                    <span className="text-[11px] font-bold text-slate-500">No designs in this stage</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Drop here to move</span>
                  </div>
                ) : (
                  stageItems.map((item) => {
                    const isDragging = draggingItemId === item.id;
                    const nextStageId = getNextStage(item.currentStage);
                    const prevStageId = getPreviousStage(item.currentStage);

                    return (
                      <div
                        key={item.id}
                        id={`card-workflow-${item.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedItemForModal(item)}
                        className={`bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing hover:border-blue-500 group relative ${
                          isDragging ? 'ring-2 ring-blue-500 scale-[0.98] shadow-lg border-blue-500' : ''
                        }`}
                      >
                        {/* Design Image Thumbnail Banner if photo exists */}
                        {item.designImage && item.designImage.startsWith('http') && (
                          <div className="relative rounded-lg overflow-hidden mb-2.5 bg-slate-900 border border-slate-200 aspect-video max-h-32 flex items-center justify-center">
                            <img
                              src={formatDirectImageUrl(item.designImage)}
                              alt={item.designNumber}
                              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                              onError={(e) => {
                                (e.currentTarget.parentElement as HTMLElement)?.style.setProperty('display', 'none');
                              }}
                            />
                            <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-slate-900/80 text-white font-mono text-[9px] font-bold backdrop-blur-xs flex items-center space-x-1">
                              <Camera className="h-2.5 w-2.5 text-blue-400" />
                              <span>{item.photos?.length || 1} photo</span>
                            </div>
                          </div>
                        )}

                        {/* Parent Folder & Branch Tags Banner */}
                        <div className="mb-2 p-1.5 rounded-lg bg-slate-50 border border-slate-200/80 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold text-amber-900 flex items-center space-x-1 truncate max-w-[150px]" title={`Job Folder: ${item.jobNo || item.lotNumber}`}>
                              <FolderTree className="h-3 w-3 text-amber-600 flex-shrink-0" />
                              <span className="truncate">{item.jobNo || item.lotNumber}</span>
                            </span>
                            {item.chalanNumber && (
                              <span className="font-mono text-[9px] font-bold text-blue-700 bg-blue-50 px-1 py-0.2 rounded border border-blue-200">
                                Ch: {item.chalanNumber}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-slate-600 border-t border-slate-200/60 pt-0.5">
                            <span className="flex items-center space-x-1 font-semibold text-blue-900 truncate">
                              <GitBranch className="h-2.5 w-2.5 text-blue-600 flex-shrink-0" />
                              <span className="truncate">{item.fabricType}</span>
                            </span>
                            {item.fabricColor && (
                              <span className="font-medium text-slate-700 truncate max-w-[100px]">
                                {item.fabricColor}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Header Tags */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <div className="flex items-center space-x-1.5 overflow-hidden">
                            <span className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200">
                              {item.lotNumber}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1">
                            {/* Fast Photo Add Trigger Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoModalItem(item);
                              }}
                              className="p-1 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                              title="Click / Upload Design Photo"
                            >
                              <Camera className="h-3.5 w-3.5" />
                            </button>

                            {/* Priority Badge */}
                            {item.priority === 'urgent' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-600 text-white animate-pulse">
                                URGENT
                              </span>
                            ) : item.priority === 'high' ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                High
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Design Number & Title */}
                        <div className="mb-2">
                          <h4 className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors flex items-center justify-between">
                            <span>{item.designNumber}</span>
                            <span className="text-xs font-mono font-extrabold text-blue-700">
                              {(item.quantity ?? item.pieces ?? 0).toLocaleString()} {item.unit || 'pcs'}
                            </span>
                          </h4>
                          {item.designName && (
                            <p className="text-[11px] font-semibold text-slate-600 line-clamp-1">
                              {item.designName}
                            </p>
                          )}
                        </div>

                        {/* Fabric & Client Details */}
                        <div className="bg-slate-50/80 rounded-lg p-2 border border-slate-100 space-y-1 mb-2.5 text-[11px]">
                          <div className="flex items-center justify-between text-slate-700 font-medium">
                            <span className="text-slate-500 font-normal">Fabric:</span>
                            <span className="font-bold truncate max-w-[170px]">{item.fabricType}</span>
                          </div>
                          {item.fabricColor && (
                            <div className="flex items-center justify-between text-slate-700">
                              <span className="text-slate-500 font-normal">Color:</span>
                              <span className="font-semibold text-slate-800">{item.fabricColor}</span>
                            </div>
                          )}
                          {item.partyOrClientName && (
                            <div className="flex items-center justify-between text-slate-700">
                              <span className="text-slate-500 font-normal">Client:</span>
                              <span className="font-semibold text-slate-800 truncate max-w-[150px]">{item.partyOrClientName}</span>
                            </div>
                          )}

                          {/* Custom Metadata & Storage Location Tags */}
                          {item.customMetadata && item.customMetadata.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/60 space-y-1">
                              {item.customMetadata.slice(0, 2).map((meta, mIdx) => {
                                const isLocation = /storage|location|rack|shelf|bin|warehouse/i.test(meta.key);
                                return (
                                  <div 
                                    key={`card-meta-${mIdx}`} 
                                    className={`flex items-center space-x-1 text-[10px] px-1.5 py-0.5 rounded font-semibold truncate ${
                                      isLocation 
                                        ? 'bg-blue-100/70 text-blue-900 border border-blue-200/80' 
                                        : 'bg-white text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    {isLocation ? (
                                      <MapPin className="h-2.5 w-2.5 text-blue-600 flex-shrink-0" />
                                    ) : (
                                      <Tag className="h-2.5 w-2.5 text-slate-400 flex-shrink-0" />
                                    )}
                                    <span className="text-slate-500 font-normal">{meta.key}:</span>
                                    <span className="font-bold truncate">{meta.value}</span>
                                  </div>
                                );
                              })}
                              {item.customMetadata.length > 2 && (
                                <span className="text-[9px] text-slate-400 font-medium pl-0.5">
                                  +{item.customMetadata.length - 2} more attributes
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Stage Specific Badges */}
                        {item.currentStage === 'inspection' && item.initialInspectionResult === 'good' && (
                          <div className="mb-2 px-2 py-1 bg-emerald-50 border border-emerald-200 rounded text-[10px] font-bold text-emerald-800 flex items-center space-x-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Fabric Quality Accepted (Good)</span>
                          </div>
                        )}

                        {item.currentStage === 'inspection_alter' && item.alterInspectionResult === 'needs_alter' && (
                          <div className="mb-2 px-2 py-1 bg-rose-50 border border-rose-200 rounded text-[10px] font-bold text-rose-800 flex items-center space-x-1">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            <span>Flagged for Alteration</span>
                          </div>
                        )}

                        {item.currentStage === 'altering' && (
                          <div className="mb-2 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-[10px] font-bold text-yellow-900 flex items-center space-x-1">
                            <Wrench className="h-3 w-3 text-yellow-700" />
                            <span>Reworking defects in stitch/sequin</span>
                          </div>
                        )}

                        {item.currentStage === 'prepare_dispatch' && (
                          <div className="mb-2 px-2 py-1 bg-emerald-50 border border-emerald-300 rounded text-[10px] font-extrabold text-emerald-900 flex items-center space-x-1">
                            <PackageCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Folded &amp; Ready for Dispatch</span>
                          </div>
                        )}

                        {/* Footer & Quick Shift Buttons */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]" onClick={(e) => e.stopPropagation()}>
                          
                          {/* Prev Stage Action */}
                          {prevStageId ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStage(item.id, prevStageId, 'Moved back one stage')}
                              className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                              title={`Rollback to ${prevStageId}`}
                            >
                              <ArrowLeft className="h-3.5 w-3.5" />
                            </button>
                          ) : (
                            <div className="w-5" />
                          )}

                          {/* Center Supervisor / Due Date */}
                          <div className="text-[10px] text-slate-500 font-mono text-center truncate max-w-[130px]">
                            {item.dueDate ? `Due: ${item.dueDate}` : item.assignedOperator || 'Floor A'}
                          </div>

                          {/* Next Stage Action */}
                          {nextStageId ? (
                            <button
                              type="button"
                              onClick={() => onUpdateStage(item.id, nextStageId, `Advanced to ${nextStageId}`)}
                              className="flex items-center space-x-1 px-2 py-1 rounded bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white font-bold text-[10px] transition-all"
                              title={`Advance to ${nextStageId}`}
                            >
                              <span>Next</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                              DONE
                            </span>
                          )}
                        </div>

                      </div>
                    );
                  })
                )}

              </div>

              {/* Column Footer: Quick Add In Stage */}
              <div className="p-2 border-t border-slate-200/60 bg-white/50 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full py-1.5 rounded-lg text-[11px] font-bold text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors flex items-center justify-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Design</span>
                </button>
              </div>

            </div>
          );
        })}
      </div>
      </div>
      )}

      {/* Floating Fixed Left and Right Scroll Navigation Arrows for Kanban */}
      {viewMode === 'kanban' && (
        <>
          {/* Floating Left Arrow (Fixed in viewport at vertical middle) */}
          <div className="fixed left-3 md:left-[calc(260px+12px)] top-1/2 -translate-y-1/2 z-40 pointer-events-auto">
            <button
              id="btn-floating-scroll-left"
              type="button"
              onClick={scrollLeft}
              className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-2xl border border-slate-700/80 hover:scale-110 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Scroll Left (Previous Manufacturing Stages)"
            >
              <ChevronLeft className="h-6 w-6 text-white group-hover:-translate-x-0.5 transition-transform" />
              <span className="sr-only">Scroll Left</span>
            </button>
          </div>

          {/* Floating Right Arrow (Fixed in viewport at vertical middle) */}
          <div className="fixed right-3 md:right-5 top-1/2 -translate-y-1/2 z-40 pointer-events-auto">
            <button
              id="btn-floating-scroll-right"
              type="button"
              onClick={scrollRight}
              className="w-12 h-12 rounded-full bg-slate-900/90 hover:bg-slate-900 text-white shadow-2xl border border-slate-700/80 hover:scale-110 active:scale-95 transition-all backdrop-blur-md flex items-center justify-center group cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
              title="Scroll Right (Next Manufacturing Stages)"
            >
              <ChevronRight className="h-6 w-6 text-white group-hover:translate-x-0.5 transition-transform" />
              <span className="sr-only">Scroll Right</span>
            </button>
          </div>

          {/* Floating Quick Dock for Stage Jump */}
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-semibold">
            <button
              type="button"
              onClick={scrollLeft}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Scroll Left"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-300 font-bold px-1 hidden sm:inline">
              10-Stage Pipeline
            </span>
            <div className="flex items-center space-x-1">
              {WORKFLOW_STAGES.map((stg) => (
                <button
                  key={stg.id}
                  type="button"
                  onClick={() => {
                    const el = document.getElementById(`column-stage-${stg.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white transition-colors"
                  title={`Jump to ${stg.name}`}
                >
                  {stg.stepNumber}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={scrollRight}
              className="p-1 rounded-full hover:bg-slate-800 text-slate-300 hover:text-white"
              title="Scroll Right"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* Item Detail & Edit Modal */}
      <WorkflowItemModal
        item={selectedItemForModal}
        isOpen={Boolean(selectedItemForModal)}
        onClose={() => setSelectedItemForModal(null)}
        onUpdateStage={(itemId, newStage, notes, qc) => {
          onUpdateStage(itemId, newStage, notes, qc);
          const updated = items.find(i => i.id === itemId);
          if (updated) {
            setSelectedItemForModal({ ...updated, currentStage: newStage });
          }
        }}
        onUpdateItem={(updated) => {
          onUpdateItem(updated);
          setSelectedItemForModal(updated);
        }}
        onDeleteItem={onDeleteItem}
        onHandoverToDispatch={onHandoverToDispatch}
      />

      {/* Create New Workflow Job Modal with Folder & Branching */}
      <CreateWorkflowItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateItem={onCreateItem}
        existingSlips={currentOrderSlips}
        existingItems={items}
        onSaveSlip={handleSaveSlip}
      />

      {/* S V ART & CREATION Party Order Slip Modal */}
      <OrderSlipModal
        isOpen={isOrderSlipModalOpen}
        onClose={() => {
          setIsOrderSlipModalOpen(false);
          setEditingSlip(null);
        }}
        onSaveSlip={handleSaveSlip}
        existingSlip={editingSlip}
        items={items}
      />

      {/* Design Photo Capture & Metadata Modal */}
      <DesignPhotoModal
        item={photoModalItem}
        isOpen={Boolean(photoModalItem)}
        onClose={() => setPhotoModalItem(null)}
        onUpdateItem={(updated) => {
          onUpdateItem(updated);
          setPhotoModalItem(null);
        }}
      />

    </div>
  );
};
