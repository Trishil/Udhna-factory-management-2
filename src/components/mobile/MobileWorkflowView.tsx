import React, { useState, useMemo } from 'react';
import { 
  Workflow, 
  Layers, 
  Search, 
  Plus, 
  ChevronRight, 
  ArrowRight, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Truck, 
  SlidersHorizontal,
  ChevronDown,
  Edit,
  Trash2,
  Share2,
  Eye,
  Check
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, OrderSlip } from '../../types';
import { WORKFLOW_STAGES, getOrderSlipCompletedPieces, getOrderSlipStageDistribution } from '../../utils/workflowData';
import { MobileMatrixView } from './MobileMatrixView';
import { OrderSlipModal } from '../OrderSlipModal';
import { WorkflowItemModal } from '../WorkflowItemModal';

interface MobileWorkflowViewProps {
  items: WorkflowItem[];
  orderSlips: OrderSlip[];
  onUpdateStage: (
    itemId: string, 
    newStage: WorkflowStageId, 
    notes?: string, 
    qualityStatus?: 'good' | 'bad_return' | 'needs_alter' | 'passed'
  ) => void;
  onUpdateItem: (item: WorkflowItem) => void;
  onDeleteItem: (id: string) => void;
  onHandoverToDispatch: (workflowItem: WorkflowItem) => void;
  onSaveOrderSlip?: (slip: OrderSlip, generatedItems: WorkflowItem[]) => void;
  onOpenNewSlip?: () => void;
  onEditSlip?: (slip: OrderSlip) => void;
  onDeleteSlip?: (slipId: string, jobNo?: string) => void;
  onOpenItemModal?: (item: WorkflowItem) => void;
}

export const MobileWorkflowView: React.FC<MobileWorkflowViewProps> = ({
  items,
  orderSlips,
  onUpdateStage,
  onUpdateItem,
  onDeleteItem,
  onHandoverToDispatch,
  onSaveOrderSlip,
  onOpenNewSlip,
  onEditSlip,
  onDeleteSlip,
  onOpenItemModal
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'kanban' | 'matrix' | 'slips' | 'lots'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [selectedPartyFilter, setSelectedPartyFilter] = useState<string>('all');
  const [kanbanStageFilter, setKanbanStageFilter] = useState<string>('all');
  const [advancingItemId, setAdvancingItemId] = useState<string | null>(null);

  // Modal states
  const [isOrderSlipModalOpen, setIsOrderSlipModalOpen] = useState(false);
  const [editingSlip, setEditingSlip] = useState<OrderSlip | null>(null);
  const [selectedItemForModal, setSelectedItemForModal] = useState<WorkflowItem | null>(null);

  const handleOpenNewSlip = () => {
    setEditingSlip(null);
    setIsOrderSlipModalOpen(true);
    if (onOpenNewSlip) onOpenNewSlip();
  };

  const handleOpenEditSlip = (slip: OrderSlip) => {
    setEditingSlip(slip);
    setIsOrderSlipModalOpen(true);
    if (onEditSlip) onEditSlip(slip);
  };

  const handleOpenItem = (item: WorkflowItem) => {
    setSelectedItemForModal(item);
    if (onOpenItemModal) onOpenItemModal(item);
  };

  // Extract unique parties for filtering
  const uniqueParties = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const p = i.partyOrClientName || i.partyName;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [items]);

  // Filtered items based on search and party
  const searchAndPartyFilteredItems = useMemo(() => {
    return items.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        (item.lotNumber || '').toLowerCase().includes(q) ||
        (item.partyOrClientName || item.partyName || '').toLowerCase().includes(q) ||
        (item.designNumber || '').toLowerCase().includes(q) ||
        (item.fabricType || '').toLowerCase().includes(q) ||
        (item.fabricColor || '').toLowerCase().includes(q) ||
        (item.jobNo || '').toLowerCase().includes(q);

      const party = item.partyOrClientName || item.partyName || '';
      const matchesParty = selectedPartyFilter === 'all' || party === selectedPartyFilter;

      return matchesSearch && matchesParty;
    });
  }, [items, searchQuery, selectedPartyFilter]);

  // Filtered items for Lots view
  const filteredLotsItems = useMemo(() => {
    return searchAndPartyFilteredItems.filter(item => {
      return selectedStageFilter === 'all' || item.currentStage === selectedStageFilter;
    });
  }, [searchAndPartyFilteredItems, selectedStageFilter]);

  // Stages to show in Kanban view
  const visibleKanbanStages = useMemo(() => {
    if (kanbanStageFilter === 'all') {
      return WORKFLOW_STAGES;
    }
    return WORKFLOW_STAGES.filter(s => s.id === kanbanStageFilter);
  }, [kanbanStageFilter]);

  // Helper to find stage definition
  const getStageDef = (stageId: WorkflowStageId) => {
    return WORKFLOW_STAGES.find(s => s.id === stageId) || WORKFLOW_STAGES[0];
  };

  // Helper to get next stage
  const getNextStage = (currentStageId: WorkflowStageId): WorkflowStageId | null => {
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === currentStageId);
    if (currentIndex >= 0 && currentIndex < WORKFLOW_STAGES.length - 1) {
      return WORKFLOW_STAGES[currentIndex + 1].id;
    }
    return null;
  };

  // Quick Advance 1 Step
  const handleQuickAdvance = (item: WorkflowItem) => {
    const nextStage = getNextStage(item.currentStage);
    if (nextStage) {
      onUpdateStage(item.id, nextStage, `Advanced via Mobile`);
    } else if (item.currentStage === 'prepare_dispatch') {
      onHandoverToDispatch(item);
    }
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Mobile Sub-Navigation Segmented Bar */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl shadow-inner text-xs font-bold gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('kanban')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'kanban' 
              ? 'bg-white text-slate-950 shadow-xs font-black' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          10-Stage Kanban
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('matrix')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'matrix' 
              ? 'bg-white text-slate-950 shadow-xs font-black' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Matrix
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('slips')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'slips' 
              ? 'bg-white text-slate-950 shadow-xs font-black' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Slips ({orderSlips.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('lots')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap cursor-pointer ${
            activeSubTab === 'lots' 
              ? 'bg-white text-slate-950 shadow-xs font-black' 
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Lots ({items.length})
        </button>
      </div>

      {/* SEARCH & FILTERS (Active in Kanban and Lots views) */}
      {(activeSubTab === 'kanban' || activeSubTab === 'lots') && (
        <div className="space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search party, lot, fabric, design, job..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            {/* Party filter dropdown */}
            {uniqueParties.length > 0 && (
              <select
                value={selectedPartyFilter}
                onChange={(e) => setSelectedPartyFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shrink-0"
              >
                <option value="all">All Parties</option>
                {uniqueParties.map(p => (
                  <option key={p} value={p}>Party: {p}</option>
                ))}
              </select>
            )}

            {/* Lots-specific stage filter dropdown */}
            {activeSubTab === 'lots' && (
              <select
                value={selectedStageFilter}
                onChange={(e) => setSelectedStageFilter(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shrink-0"
              >
                <option value="all">All Stages</option>
                {WORKFLOW_STAGES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={handleOpenNewSlip}
              className="ml-auto bg-slate-900 hover:bg-slate-800 text-white font-bold px-3 py-1.5 rounded-xl flex items-center space-x-1 shrink-0 shadow-xs cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Slip</span>
            </button>
          </div>

          {/* Kanban Stage Filter Pills (Horizontal scrollable) */}
          {activeSubTab === 'kanban' && (
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1.5 pt-0.5 text-xs">
              <button
                type="button"
                onClick={() => setKanbanStageFilter('all')}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 cursor-pointer ${
                  kanbanStageFilter === 'all'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                All 10 Stages ({searchAndPartyFilteredItems.length})
              </button>

              {WORKFLOW_STAGES.map((st, idx) => {
                const count = searchAndPartyFilteredItems.filter(i => i.currentStage === st.id).length;
                const isSelected = kanbanStageFilter === st.id;

                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setKanbanStageFilter(isSelected ? 'all' : st.id)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all shrink-0 flex items-center space-x-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] font-mono opacity-60">#{idx + 1}</span>
                    <span>{st.shortName}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 1: LOTS CARD LIST */}
      {activeSubTab === 'lots' && (
        <div className="space-y-3">
          {filteredLotsItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <Workflow className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No production lots found</p>
              <p className="text-xs text-slate-500">Create an Order Slip to generate production lots.</p>
              <button
                type="button"
                onClick={handleOpenNewSlip}
                className="px-4 py-2 bg-blue-600 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Order Slip</span>
              </button>
            </div>
          ) : (
            filteredLotsItems.map(item => {
              const stageDef = getStageDef(item.currentStage);
              const nextStage = getNextStage(item.currentStage);
              const nextStageDef = nextStage ? getStageDef(nextStage) : null;
              const partyName = item.partyOrClientName || item.partyName || 'Direct Client';

              return (
                <div 
                  key={item.id}
                  onClick={() => handleOpenItem(item)}
                  className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3 hover:border-slate-400 active:scale-[0.99] transition-all cursor-pointer"
                >
                  {/* Card Top: Party & Quantity */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-black text-slate-900 text-sm">
                          Party: {partyName}
                        </span>
                        {item.jobNo && (
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
                            Job: {item.jobNo}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        {item.designNumber ? `D.No: ${item.designNumber} • ` : ''}Lot: {item.lotNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono text-slate-900 block">
                        {item.quantity} <span className="text-xs font-normal text-slate-500">pcs</span>
                      </span>
                      {item.piecesCompleted > 0 && (
                        <span className="text-[10px] font-bold text-emerald-600 font-mono block">
                          {item.piecesCompleted} done
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Fabric & Color Pill Row */}
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                      {item.fabricType}
                    </span>

                    <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200">
                      {item.colorSwatchHex && (
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                          style={{ backgroundColor: item.colorSwatchHex }}
                        />
                      )}
                      <span className="truncate max-w-[150px]">{item.fabricColor}</span>
                    </span>

                    {(item.qualityStatus === 'needs_alter' || item.currentStage === 'altering') && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200">
                        Rework
                      </span>
                    )}
                  </div>

                  {/* Current Stage Indicator & Tap Hint */}
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center space-x-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Stage:</span>
                      <span className={`px-2 py-0.5 rounded-md text-xs font-black truncate ${stageDef.color.badge}`}>
                        {stageDef.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-slate-400 text-[10px]">
                      <Eye className="h-3 w-3" />
                      <span>Tap for details</span>
                    </div>
                  </div>

                  {/* EXACTLY ONE ADVANCE BUTTON */}
                  <div className="pt-1 border-t border-slate-100">
                    {nextStageDef ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdvance(item);
                        }}
                        className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <span>Advance to {nextStageDef.shortName}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onHandoverToDispatch(item);
                        }}
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5" />
                        <span>Ready for Dispatch</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: PARTY ORDER SLIPS */}
      {activeSubTab === 'slips' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Active Party Order Slips ({orderSlips.length})
            </h3>
            <button
              type="button"
              onClick={handleOpenNewSlip}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Slip</span>
            </button>
          </div>

          {orderSlips.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No order slips created</p>
              <p className="text-xs text-slate-500">Create an order slip to organize color & fabric lot matrices.</p>
            </div>
          ) : (
            orderSlips.map(slip => {
              const totalCalculated = (slip.colorRows || []).reduce((acc, row) => {
                return acc + Object.values(row.fabricQuantities || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0);
              }, 0);
              const completed = getOrderSlipCompletedPieces(slip, items);
              const percent = totalCalculated > 0 ? Math.min(100, Math.round((completed / totalCalculated) * 100)) : 0;

              return (
                <div 
                  key={slip.id}
                  className="bg-amber-50/40 rounded-2xl border-2 border-slate-300 shadow-xs overflow-hidden flex flex-col"
                >
                  {/* Slip Header */}
                  <div className="p-3 bg-slate-900 text-white flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-amber-400 font-serif font-bold text-xs">श्री ૧૫</span>
                      <span className="font-serif font-bold text-xs uppercase truncate max-w-[160px]">
                        {slip.firmName || 'TRISHARTH'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                      Job: {slip.jobNo}
                    </span>
                  </div>

                  {/* Slip Body */}
                  <div className="p-3.5 space-y-3 text-xs">
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Party Name</span>
                        <span className="font-black text-slate-900 text-sm truncate block">{slip.partyName}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Chalan No</span>
                        <span className="font-bold font-mono text-slate-800 text-sm">{slip.chalanNo || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Date</span>
                        <span className="font-semibold text-slate-800 text-xs">{slip.date}</span>
                      </div>
                      <div>
                        <span className="text-[9px] text-slate-400 uppercase font-bold block">Total Pieces</span>
                        <span className="font-black font-mono text-blue-700 text-sm">{totalCalculated} pcs</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Fulfillment Progress</span>
                        <span>{completed} / {totalCalculated} pcs ({percent}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-emerald-500 transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditSlip(slip)}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Edit Slip Sheet</span>
                      </button>

                      {onDeleteSlip && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Delete Order Slip for ${slip.partyName} (Job: ${slip.jobNo})?`)) {
                              onDeleteSlip(slip.id, slip.jobNo);
                            }
                          }}
                          className="p-2 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl border border-rose-200"
                          title="Delete Slip"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 1: 10-STAGE KANBAN BOARD */}
      {activeSubTab === 'kanban' && (
        <div className="space-y-4">
          {searchAndPartyFilteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <Workflow className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No workflow lots found</p>
              <p className="text-xs text-slate-500">Create an Order Slip to generate production lots.</p>
              <button
                type="button"
                onClick={handleOpenNewSlip}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Create Order Slip</span>
              </button>
            </div>
          ) : (
            visibleKanbanStages.map((stage, stageIndex) => {
              const stageItems = searchAndPartyFilteredItems.filter(i => i.currentStage === stage.id);
              const totalPcsInStage = stageItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

              return (
                <div 
                  key={stage.id}
                  className="bg-slate-100/70 rounded-2xl border border-slate-200/90 p-3.5 space-y-3"
                >
                  {/* Stage Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {String(stageIndex + 1).padStart(2, '0')}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${stage.color.badge}`}>
                        {stage.name}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-mono font-bold">
                      <span className="text-slate-500 text-[11px]">
                        {totalPcsInStage} pcs
                      </span>
                      <span className="bg-white text-slate-800 px-2 py-0.5 rounded-full border border-slate-200 text-[10px]">
                        {stageItems.length} {stageItems.length === 1 ? 'lot' : 'lots'}
                      </span>
                    </div>
                  </div>

                  {/* Lot Cards in this Stage */}
                  {stageItems.length === 0 ? (
                    <div className="p-4 bg-white/60 rounded-xl border border-dashed border-slate-200 text-center">
                      <p className="text-xs text-slate-400 italic">No lots in this stage</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {stageItems.map(item => {
                        const nextStage = getNextStage(item.currentStage);
                        const nextStageDef = nextStage ? getStageDef(nextStage) : null;
                        const partyName = item.partyOrClientName || item.partyName || 'Direct Client';

                        return (
                          <div 
                            key={item.id}
                            onClick={() => handleOpenItem(item)}
                            className="bg-white rounded-2xl border border-slate-200/90 p-3.5 shadow-xs space-y-3 hover:border-slate-400 active:scale-[0.99] transition-all cursor-pointer"
                          >
                            {/* Card Top: Party Name & Quantity */}
                            <div className="flex items-start justify-between">
                              <div className="min-w-0 flex-1 pr-2">
                                <div className="flex items-center space-x-1.5 flex-wrap">
                                  <span className="font-black text-slate-900 text-sm truncate">
                                    Party: {partyName}
                                  </span>
                                  {item.jobNo && (
                                    <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                                      Job: {item.jobNo}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                                  {item.designNumber ? `D.No: ${item.designNumber} • ` : ''}Lot: {item.lotNumber}
                                </p>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="text-base font-black font-mono text-slate-900 block">
                                  {item.quantity} <span className="text-xs font-normal text-slate-500">pcs</span>
                                </span>
                                {item.piecesCompleted > 0 && (
                                  <span className="text-[10px] font-bold text-emerald-600 font-mono block">
                                    {item.piecesCompleted} done
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Fabric & Color Pills */}
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                                {item.fabricType}
                              </span>

                              <span className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-slate-800 text-xs font-medium border border-slate-200">
                                {item.colorSwatchHex && (
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                                    style={{ backgroundColor: item.colorSwatchHex }}
                                  />
                                )}
                                <span className="truncate max-w-[140px]">{item.fabricColor}</span>
                              </span>

                              {(item.qualityStatus === 'needs_alter' || item.currentStage === 'altering') && (
                                <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold border border-rose-200 flex items-center space-x-1">
                                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                                  <span>Rework / Alter</span>
                                </span>
                              )}
                            </div>

                            {/* Tap for Details Hint */}
                            <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                              <span className="flex items-center space-x-1 text-slate-500 font-medium">
                                <Eye className="h-3 w-3 text-slate-400" />
                                <span>Tap card to view all details</span>
                              </span>
                              {item.notes && (
                                <span className="truncate max-w-[140px] italic text-slate-500">
                                  "{item.notes}"
                                </span>
                              )}
                            </div>

                            {/* EXACTLY ONE OPTION OF ADVANCING */}
                            <div className="pt-1 border-t border-slate-100">
                              {nextStageDef ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleQuickAdvance(item);
                                  }}
                                  className="w-full py-2.5 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer"
                                >
                                  <span>Advance to {nextStageDef.shortName}</span>
                                  <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onHandoverToDispatch(item);
                                  }}
                                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer"
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  <span>Ready for Dispatch</span>
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* VIEW 2: FIXED & RESPONSIVE MOBILE MATRIX VIEW */}
      {activeSubTab === 'matrix' && (
        <MobileMatrixView
          items={items}
          orderSlips={orderSlips}
          onUpdateStage={onUpdateStage}
          onUpdateItem={onUpdateItem}
          onOpenNewSlip={handleOpenNewSlip}
          onOpenItemModal={handleOpenItem}
        />
      )}

      {/* Order Slip Modal for Mobile */}
      {isOrderSlipModalOpen && (
        <OrderSlipModal
          isOpen={isOrderSlipModalOpen}
          onClose={() => {
            setIsOrderSlipModalOpen(false);
            setEditingSlip(null);
          }}
          onSaveSlip={(slip, genItems) => {
            if (onSaveOrderSlip) onSaveOrderSlip(slip, genItems);
            setIsOrderSlipModalOpen(false);
            setEditingSlip(null);
          }}
          existingSlip={editingSlip}
          items={items}
          onDeleteSlip={onDeleteSlip}
        />
      )}

      {/* Workflow Item Modal for Mobile */}
      {selectedItemForModal && (
        <WorkflowItemModal
          item={selectedItemForModal}
          isOpen={Boolean(selectedItemForModal)}
          onClose={() => setSelectedItemForModal(null)}
          onUpdateStage={onUpdateStage}
          onUpdateItem={(updated) => {
            onUpdateItem(updated);
            setSelectedItemForModal(updated);
          }}
          onDeleteItem={(id) => {
            onDeleteItem(id);
            setSelectedItemForModal(null);
          }}
          onHandoverToDispatch={onHandoverToDispatch}
        />
      )}

    </div>
  );
};
