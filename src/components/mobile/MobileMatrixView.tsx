import React, { useState, useMemo, useRef } from 'react';
import { 
  Table, 
  Layers, 
  Search, 
  Plus, 
  ArrowRight, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  SlidersHorizontal,
  LayoutGrid,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, OrderSlip } from '../../types';
import { WORKFLOW_STAGES, getItemStageBreakdown, getNextStage } from '../../utils/workflowData';

interface MobileMatrixViewProps {
  items: WorkflowItem[];
  orderSlips: OrderSlip[];
  onUpdateStage: (itemId: string, newStage: WorkflowStageId, notes?: string) => void;
  onUpdateItem: (item: WorkflowItem) => void;
  onOpenNewSlip: () => void;
  onOpenItemModal: (item: WorkflowItem) => void;
}

export const MobileMatrixView: React.FC<MobileMatrixViewProps> = ({
  items,
  orderSlips,
  onUpdateStage,
  onUpdateItem,
  onOpenNewSlip,
  onOpenItemModal
}) => {
  const [viewFormat, setViewFormat] = useState<'cards' | 'table'>('cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [selectedFabric, setSelectedFabric] = useState<string>('all');
  
  // Piece Breakdown Modal state
  const [editingItem, setEditingItem] = useState<WorkflowItem | null>(null);
  const [tempDistribution, setTempDistribution] = useState<Record<WorkflowStageId, number>>({
    fabric: 0,
    chalan: 0,
    inspection: 0,
    stitching_patta: 0,
    embroidery: 0,
    dhaga_cutting: 0,
    inspection_alter: 0,
    altering: 0,
    folding: 0,
    prepare_dispatch: 0
  });

  // Extract unique parties & fabrics
  const uniqueParties = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      const p = i.partyOrClientName || i.partyName;
      if (p) set.add(p);
    });
    return Array.from(set);
  }, [items]);

  const uniqueFabrics = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.fabricType) set.add(i.fabricType);
    });
    return Array.from(set);
  }, [items]);

  // Enriched items with stage piece breakdowns
  const enrichedItems = useMemo(() => {
    return items.map(item => {
      const totalPcs = item.pieces ?? item.quantity ?? 0;
      const stageDistribution = getItemStageBreakdown(item);
      const completedPcs = stageDistribution.prepare_dispatch || 0;
      const remainingPcs = Math.max(0, totalPcs - completedPcs);
      const percent = totalPcs > 0 ? Math.min(100, Math.round((completedPcs / totalPcs) * 100)) : 0;

      return {
        ...item,
        totalPcs,
        completedPcs,
        remainingPcs,
        percent,
        stageDistribution
      };
    });
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (item.partyOrClientName || item.partyName || '').toLowerCase().includes(q) ||
        (item.lotNumber || '').toLowerCase().includes(q) ||
        (item.jobNo || '').toLowerCase().includes(q) ||
        (item.designNumber || '').toLowerCase().includes(q) ||
        (item.fabricType || '').toLowerCase().includes(q) ||
        (item.fabricColor || '').toLowerCase().includes(q);

      const party = item.partyOrClientName || item.partyName || '';
      const matchesParty = selectedParty === 'all' || party === selectedParty;
      const matchesFabric = selectedFabric === 'all' || item.fabricType === selectedFabric;

      return matchesSearch && matchesParty && matchesFabric;
    });
  }, [enrichedItems, searchQuery, selectedParty, selectedFabric]);

  // Metrics
  const totalOrdered = enrichedItems.reduce((acc, i) => acc + i.totalPcs, 0);
  const totalCompleted = enrichedItems.reduce((acc, i) => acc + i.completedPcs, 0);
  const totalRemaining = enrichedItems.reduce((acc, i) => acc + i.remainingPcs, 0);

  // Quick Advance 1 Step
  const handleQuickAdvance = (item: typeof enrichedItems[0]) => {
    const nextStage = getNextStage(item.currentStage);
    if (nextStage) {
      onUpdateStage(item.id, nextStage, 'Advanced via Mobile Matrix');
    }
  };

  // Open Edit Breakdown Modal
  const handleOpenEditBreakdown = (item: typeof enrichedItems[0]) => {
    setEditingItem(item);
    setTempDistribution({ ...item.stageDistribution });
  };

  // Save Breakdown
  const handleSaveBreakdown = () => {
    if (!editingItem) return;

    const newCompleted = tempDistribution.prepare_dispatch || 0;
    
    // Find active stage
    let activeStage: WorkflowStageId = 'prepare_dispatch';
    for (let i = WORKFLOW_STAGES.length - 1; i >= 0; i--) {
      const sId = WORKFLOW_STAGES[i].id;
      if ((tempDistribution[sId] || 0) > 0 && sId !== 'prepare_dispatch') {
        activeStage = sId;
        break;
      }
    }

    const updated: WorkflowItem = {
      ...editingItem,
      currentStage: newCompleted >= (editingItem.pieces ?? editingItem.quantity) ? 'prepare_dispatch' : activeStage,
      piecesCompleted: newCompleted,
      stagePieceBreakdown: tempDistribution
    };

    onUpdateItem(updated);
    setEditingItem(null);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Metrics Cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Pcs</span>
          <span className="text-base font-black font-mono text-slate-900 mt-0.5 block">{totalOrdered}</span>
        </div>
        <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-emerald-800 block">Completed</span>
          <span className="text-base font-black font-mono text-emerald-900 mt-0.5 block">{totalCompleted}</span>
        </div>
        <div className="bg-amber-50/60 p-3 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">In Pipeline</span>
          <span className="text-base font-black font-mono text-amber-900 mt-0.5 block">{totalRemaining}</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search party, color, fabric, D.No..."
              className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {/* View Format Switcher: Cards vs Table */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setViewFormat('cards')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewFormat === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('table')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewFormat === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Wide Table View"
            >
              <Table className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {uniqueParties.length > 0 && (
            <select
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shrink-0"
            >
              <option value="all">All Parties</option>
              {uniqueParties.map(p => (
                <option key={p} value={p}>Party: {p}</option>
              ))}
            </select>
          )}

          {uniqueFabrics.length > 0 && (
            <select
              value={selectedFabric}
              onChange={(e) => setSelectedFabric(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-2.5 py-1 text-slate-700 font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none shrink-0"
            >
              <option value="all">All Fabrics</option>
              {uniqueFabrics.map(f => (
                <option key={f} value={f}>Fabric: {f}</option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={onOpenNewSlip}
            className="ml-auto px-2.5 py-1 bg-slate-900 text-white rounded-xl font-bold flex items-center space-x-1 shrink-0 shadow-xs text-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Slip</span>
          </button>
        </div>
      </div>

      {/* MATRIX CARDS FORMAT (Mobile Touch-Friendly) */}
      {viewFormat === 'cards' && (
        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <Layers className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No matrix rows match filter</p>
              <p className="text-xs text-slate-400">Create order slips or clear search filters above.</p>
            </div>
          ) : (
            filteredItems.map(item => {
              const swatchColor = item.colorSwatchHex || '#64748b';
              const nextStage = getNextStage(item.currentStage);
              const nextStageDef = nextStage ? WORKFLOW_STAGES.find(s => s.id === nextStage) : null;
              
              // Extract stages with > 0 pieces
              const activeStagesWithCount = WORKFLOW_STAGES.filter(s => (item.stageDistribution[s.id] || 0) > 0);

              return (
                <div
                  key={item.id}
                  onClick={() => onOpenItemModal(item)}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 cursor-pointer hover:border-slate-300 transition-all active:scale-[0.99]"
                >
                  {/* Top: Color Swatch + Fabric + Party */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span 
                        className="w-4 h-4 rounded-full border border-slate-300 shadow-2xs shrink-0"
                        style={{ backgroundColor: swatchColor }}
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-black text-slate-900 text-sm">{item.fabricColor || 'Color'}</span>
                          <span className="text-slate-300">•</span>
                          <span className="font-bold text-slate-700 text-xs">{item.fabricType}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-medium">
                          {item.partyOrClientName || item.partyName} {item.jobNo ? `• Job: ${item.jobNo}` : ''}
                        </p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                      {item.designNumber}
                    </span>
                  </div>

                  {/* Quantities Row */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Total</span>
                      <span className="font-black text-slate-900 font-mono text-sm">{item.totalPcs} pcs</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Completed</span>
                      <span className="font-bold text-emerald-700 font-mono text-sm">{item.completedPcs} pcs</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">Remaining</span>
                      <span className="font-bold text-amber-700 font-mono text-sm">{item.remainingPcs} pcs</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                      <span>Fulfillment</span>
                      <span>{item.percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-300"
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>

                  {/* 10-Stage Piece Distribution Badges */}
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Piece Location in 10 Stages:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activeStagesWithCount.length === 0 ? (
                        <span className="text-[11px] text-slate-400 italic">No pieces assigned</span>
                      ) : (
                        activeStagesWithCount.map(st => {
                          const count = item.stageDistribution[st.id] || 0;
                          return (
                            <span 
                              key={st.id}
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${st.color.badge}`}
                            >
                              <span>{st.shortName}:</span>
                              <span className="font-mono font-black">{count} pcs</span>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center space-x-2 pt-1 border-t border-slate-100">
                    {nextStageDef && item.remainingPcs > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuickAdvance(item);
                        }}
                        className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <span>Advance to {nextStageDef.shortName}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditBreakdown(item);
                      }}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold border border-slate-200 flex items-center space-x-1"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Move Pieces</span>
                    </button>
                  </div>

                </div>
              );
            })
          )}
        </div>
      )}

      {/* WIDE TABLE FORMAT (Horizontal Touch Scroll with Sticky Column) */}
      {viewFormat === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Swipe horizontally to view all 10 stages:</span>
            <span className="text-slate-400 font-mono text-[11px]">{filteredItems.length} rows</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 uppercase text-[10px]">
                  <th className="py-2.5 px-3 sticky left-0 z-20 bg-slate-100 border-r border-slate-200 min-w-[130px]">
                    Color &amp; Fabric
                  </th>
                  <th className="py-2.5 px-3 min-w-[110px]">Party &amp; Job</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[60px]">Total</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[70px] bg-emerald-50 text-emerald-900">Done</th>
                  <th className="py-2.5 px-2.5 text-center min-w-[70px] bg-amber-50 text-amber-900">Rem.</th>
                  {WORKFLOW_STAGES.map(st => (
                    <th key={st.id} className="py-2.5 px-2 text-center min-w-[65px]">
                      {st.shortName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => {
                  const swatchColor = item.colorSwatchHex || '#64748b';
                  return (
                    <tr 
                      key={item.id}
                      onClick={() => onOpenItemModal(item)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {/* Sticky Color + Fabric */}
                      <td className="py-2.5 px-3 sticky left-0 z-10 bg-white border-r border-slate-200 font-medium">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-3 h-3 rounded-full border border-slate-300 shrink-0" 
                            style={{ backgroundColor: swatchColor }}
                          />
                          <span className="font-bold text-slate-900">{item.fabricColor || 'Color'}</span>
                          <span className="text-[11px] text-slate-500">({item.fabricType})</span>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-slate-700">
                        <div className="font-semibold text-slate-900">{item.partyOrClientName || item.partyName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{item.designNumber}</div>
                      </td>

                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-slate-900">
                        {item.totalPcs}
                      </td>

                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                        {item.completedPcs}
                      </td>

                      <td className="py-2.5 px-2.5 text-center font-mono font-bold text-amber-700 bg-amber-50/40">
                        {item.remainingPcs}
                      </td>

                      {/* 10 Stage Columns */}
                      {WORKFLOW_STAGES.map(st => {
                        const count = item.stageDistribution[st.id] || 0;
                        return (
                          <td 
                            key={st.id} 
                            className={`py-2.5 px-2 text-center font-mono text-xs ${
                              count > 0 ? 'font-black text-slate-900 bg-slate-50' : 'text-slate-300'
                            }`}
                          >
                            {count > 0 ? count : '—'}
                          </td>
                        );
                      })}

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* EDIT PIECE BREAKDOWN MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border border-slate-200 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-sm">Move Pieces Between Stages</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingItem.partyOrClientName || editingItem.partyName} • {editingItem.fabricColor} ({editingItem.fabricType})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700 pb-1 border-b border-slate-100">
                <span>Production Stage (1-10)</span>
                <span>Piece Count</span>
              </div>
              {WORKFLOW_STAGES.map(st => (
                <div key={st.id} className="flex items-center justify-between py-1">
                  <span className="text-xs text-slate-700 font-medium">{st.name}</span>
                  <input
                    type="number"
                    min="0"
                    value={tempDistribution[st.id] ?? 0}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setTempDistribution(prev => ({
                        ...prev,
                        [st.id]: val
                      }));
                    }}
                    className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-mono font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBreakdown}
                className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Save Pieces</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

