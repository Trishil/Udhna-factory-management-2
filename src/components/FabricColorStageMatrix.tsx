import React, { useState, useMemo, useRef } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Layers, 
  Search, 
  Filter, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  FileText, 
  Printer, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit,
  Plus,
  Scissors,
  CheckSquare,
  Wrench,
  PackageCheck,
  ChevronDown,
  Building,
  ChevronUp
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, OrderSlip } from '../types';
import { 
  WORKFLOW_STAGES, 
  getItemStageBreakdown, 
  getNextStage,
  INITIAL_WORKFLOW_ITEMS,
  DEFAULT_ORDER_SLIPS 
} from '../utils/workflowData';

interface FabricColorStageMatrixProps {
  items: WorkflowItem[];
  orderSlips: OrderSlip[];
  onUpdateStage: (itemId: string, newStage: WorkflowStageId, notes?: string) => void;
  onUpdateItem: (item: WorkflowItem) => void;
  onOpenCreateSlipModal: () => void;
  onOpenItemModal: (item: WorkflowItem) => void;
}

export const FabricColorStageMatrix: React.FC<FabricColorStageMatrixProps> = ({
  items,
  orderSlips,
  onUpdateStage,
  onUpdateItem,
  onOpenCreateSlipModal,
  onOpenItemModal
}) => {
  const matrixScrollRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParty, setSelectedParty] = useState<string>('all');
  const [selectedJobNo, setSelectedJobNo] = useState<string>('all');
  const [selectedFabricType, setSelectedFabricType] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');
  const [completionFilter, setCompletionFilter] = useState<'all' | 'remaining' | 'completed' | 'altering'>('all');

  const effectiveItems = useMemo(() => {
    return items || [];
  }, [items]);

  const effectiveSlips = useMemo(() => {
    return orderSlips || [];
  }, [orderSlips]);

  // Move pieces / Stage update modal state
  const [editingItemBreakdown, setEditingItemBreakdown] = useState<WorkflowItem | null>(null);
  const [tempBreakdown, setTempBreakdown] = useState<Record<WorkflowStageId, number>>({
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

  // Unique Parties and Job Nos
  const uniqueParties = useMemo(() => {
    const parties = new Set<string>();
    effectiveItems.forEach(it => {
      const p = it.partyOrClientName || it.partyName;
      if (p) parties.add(p);
    });
    effectiveSlips.forEach(s => {
      if (s.partyName) parties.add(s.partyName);
    });
    return Array.from(parties);
  }, [effectiveItems, effectiveSlips]);

  const uniqueJobNos = useMemo(() => {
    const jobs = new Set<string>();
    effectiveItems.forEach(it => {
      if (it.jobNo) jobs.add(it.jobNo);
      else if (it.lotNumber) jobs.add(it.lotNumber);
    });
    effectiveSlips.forEach(s => {
      if (s.jobNo) jobs.add(s.jobNo);
    });
    return Array.from(jobs);
  }, [effectiveItems, effectiveSlips]);

  const uniqueFabricTypes = useMemo(() => {
    const fTypes = new Set<string>();
    effectiveItems.forEach(it => {
      if (it.fabricType) fTypes.add(it.fabricType);
    });
    return Array.from(fTypes);
  }, [effectiveItems]);

  // Enhanced Items with Stage Breakdowns
  const enrichedItems = useMemo(() => {
    return effectiveItems.map(item => {
      const totalPcs = item.pieces ?? item.quantity;
      const stageDistribution = getItemStageBreakdown(item);
      const completedPcs = stageDistribution.prepare_dispatch || 0;
      const remainingPcs = Math.max(0, totalPcs - completedPcs);
      const percentComplete = totalPcs > 0 ? Math.round((completedPcs / totalPcs) * 100) : 0;
      
      // Determine active remaining stages
      const remainingStagesWithCounts = WORKFLOW_STAGES
        .filter(s => s.id !== 'prepare_dispatch' && (stageDistribution[s.id] || 0) > 0)
        .map(s => ({
          stage: s,
          count: stageDistribution[s.id] || 0
        }));

      return {
        ...item,
        totalPcs,
        stageDistribution,
        completedPcs,
        remainingPcs,
        percentComplete,
        remainingStagesWithCounts
      };
    });
  }, [effectiveItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return enrichedItems.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const party = item.partyOrClientName || item.partyName || '';
      const job = item.jobNo || item.lotNumber || '';
      const dNo = item.designNumber || '';
      const fType = item.fabricType || '';
      const color = item.fabricColor || '';

      const matchesSearch = !q || (
        party.toLowerCase().includes(q) ||
        job.toLowerCase().includes(q) ||
        dNo.toLowerCase().includes(q) ||
        fType.toLowerCase().includes(q) ||
        color.toLowerCase().includes(q) ||
        (item.chalanNumber && item.chalanNumber.toLowerCase().includes(q))
      );

      const matchesParty = selectedParty === 'all' || party === selectedParty;
      const matchesJob = selectedJobNo === 'all' || job === selectedJobNo;
      const matchesFabric = selectedFabricType === 'all' || fType === selectedFabricType;

      let matchesStage = true;
      if (selectedStageFilter !== 'all') {
        const countInStage = item.stageDistribution[selectedStageFilter as WorkflowStageId] || 0;
        matchesStage = countInStage > 0;
      }

      let matchesCompletion = true;
      if (completionFilter === 'remaining') {
        matchesCompletion = item.remainingPcs > 0;
      } else if (completionFilter === 'completed') {
        matchesCompletion = item.completedPcs >= item.totalPcs;
      } else if (completionFilter === 'altering') {
        matchesCompletion = (item.stageDistribution.altering || 0) > 0 || (item.stageDistribution.inspection_alter || 0) > 0;
      }

      return matchesSearch && matchesParty && matchesJob && matchesFabric && matchesStage && matchesCompletion;
    });
  }, [enrichedItems, searchQuery, selectedParty, selectedJobNo, selectedFabricType, selectedStageFilter, completionFilter]);

  // Summary Metrics across all filtered items
  const metrics = useMemo(() => {
    let totalOrdered = 0;
    let totalCompleted = 0;
    let totalRemaining = 0;
    const stagePieceSums: Record<WorkflowStageId, number> = {
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
    };

    filteredItems.forEach(item => {
      totalOrdered += item.totalPcs;
      totalCompleted += item.completedPcs;
      totalRemaining += item.remainingPcs;
      
      WORKFLOW_STAGES.forEach(s => {
        stagePieceSums[s.id] += (item.stageDistribution[s.id] || 0);
      });
    });

    const completionRate = totalOrdered > 0 ? Math.round((totalCompleted / totalOrdered) * 100) : 0;

    return {
      totalOrdered,
      totalCompleted,
      totalRemaining,
      completionRate,
      stagePieceSums
    };
  }, [filteredItems]);

  // Section tabs: All Sections vs Yet to Complete vs Completed
  const [activeSectionTab, setActiveSectionTab] = useState<'all' | 'yet_to_complete' | 'completed'>('all');
  const [collapsedParties, setCollapsedParties] = useState<Record<string, boolean>>({});

  const togglePartyCollapse = (partyKey: string) => {
    setCollapsedParties(prev => ({
      ...prev,
      [partyKey]: !prev[partyKey]
    }));
  };

  // Group filtered items into two main sections: Yet to Complete vs Completed, and group Party-wise
  const { yetToCompleteParties, completedParties, totalYetToCompletePcs, totalCompletedPcsAll, pendingCount, doneCount } = useMemo(() => {
    const pendingItems = filteredItems.filter(it => it.remainingPcs > 0);
    const doneItems = filteredItems.filter(it => it.remainingPcs === 0 || it.completedPcs >= it.totalPcs);

    // Group pending by Party
    const pendingMap: Record<string, typeof filteredItems> = {};
    pendingItems.forEach(it => {
      const p = (it.partyOrClientName || it.partyName || 'Direct Client / Unassigned').trim();
      if (!pendingMap[p]) pendingMap[p] = [];
      pendingMap[p].push(it);
    });

    // Group completed by Party
    const doneMap: Record<string, typeof filteredItems> = {};
    doneItems.forEach(it => {
      const p = (it.partyOrClientName || it.partyName || 'Direct Client / Unassigned').trim();
      if (!doneMap[p]) doneMap[p] = [];
      doneMap[p].push(it);
    });

    const pendingPartyList = Object.entries(pendingMap).map(([partyName, partyItems]) => {
      const totalOrdered = partyItems.reduce((acc, it) => acc + it.totalPcs, 0);
      const totalDone = partyItems.reduce((acc, it) => acc + it.completedPcs, 0);
      const totalRemaining = partyItems.reduce((acc, it) => acc + it.remainingPcs, 0);
      return {
        partyName,
        items: partyItems,
        totalOrdered,
        totalDone,
        totalRemaining
      };
    });

    const donePartyList = Object.entries(doneMap).map(([partyName, partyItems]) => {
      const totalOrdered = partyItems.reduce((acc, it) => acc + it.totalPcs, 0);
      const totalDone = partyItems.reduce((acc, it) => acc + it.completedPcs, 0);
      return {
        partyName,
        items: partyItems,
        totalOrdered,
        totalDone
      };
    });

    const totalYetToCompletePcs = pendingItems.reduce((acc, it) => acc + it.remainingPcs, 0);
    const totalCompletedPcsAll = doneItems.reduce((acc, it) => acc + it.completedPcs, 0);

    return {
      yetToCompleteParties: pendingPartyList,
      completedParties: donePartyList,
      totalYetToCompletePcs,
      totalCompletedPcsAll,
      pendingCount: pendingItems.length,
      doneCount: doneItems.length
    };
  }, [filteredItems]);

  const handleOpenEditBreakdown = (item: typeof enrichedItems[0]) => {
    setEditingItemBreakdown(item);
    setTempBreakdown({ ...item.stageDistribution });
  };

  const handleSaveBreakdown = () => {
    if (!editingItemBreakdown) return;
    
    // Calculate new completed pieces
    const newCompleted = tempBreakdown.prepare_dispatch || 0;
    
    // Find highest non-zero stage for primary currentStage
    let activeStage: WorkflowStageId = 'prepare_dispatch';
    for (let i = WORKFLOW_STAGES.length - 1; i >= 0; i--) {
      const sId = WORKFLOW_STAGES[i].id;
      if ((tempBreakdown[sId] || 0) > 0 && sId !== 'prepare_dispatch') {
        activeStage = sId;
        break;
      }
    }

    const updatedItem: WorkflowItem = {
      ...editingItemBreakdown,
      currentStage: newCompleted >= (editingItemBreakdown.pieces ?? editingItemBreakdown.quantity) ? 'prepare_dispatch' : activeStage,
      piecesCompleted: newCompleted,
      stagePieceBreakdown: tempBreakdown
    };

    onUpdateItem(updatedItem);
    setEditingItemBreakdown(null);
  };

  const handleQuickAdvanceNextStage = (item: typeof enrichedItems[0]) => {
    const nextStage = getNextStage(item.currentStage);
    if (!nextStage) return;

    const currentDist = { ...item.stageDistribution };
    const remainingInCurrent = currentDist[item.currentStage] || item.remainingPcs || 0;

    if (remainingInCurrent > 0) {
      currentDist[item.currentStage] = Math.max(0, (currentDist[item.currentStage] || 0) - remainingInCurrent);
      currentDist[nextStage] = (currentDist[nextStage] || 0) + remainingInCurrent;
    }

    const newCompleted = currentDist.prepare_dispatch || 0;

    const updated: WorkflowItem = {
      ...item,
      currentStage: nextStage,
      piecesCompleted: newCompleted,
      stagePieceBreakdown: currentDist
    };

    onUpdateItem(updated);
  };

  return (
    <div id="fabric-color-stage-matrix-root" className="space-y-6">
      
      {/* Top Banner & Primary Stats */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-slate-900 rounded-xl text-white shadow-xs shrink-0">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Fabric Type &amp; Color Live Stage Tracker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold font-mono">
                  Piece-Level Accuracy
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live visibility of completed vs. remaining pieces categorized by fabric type, color swatch, design number &amp; 10 production stages.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              id="btn-matrix-new-slip"
              type="button"
              onClick={onOpenCreateSlipModal}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Party Order Slip</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5">
          <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Pieces Ordered</div>
            <div className="text-2xl font-black text-slate-900 mt-1 font-mono">
              {metrics.totalOrdered.toLocaleString()} <span className="text-xs text-slate-500 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Across {filteredItems.length} color/fabric batches
            </div>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Completed (Dispatch Ready)</div>
            <div className="text-2xl font-black text-emerald-900 mt-1 font-mono">
              {metrics.totalCompleted.toLocaleString()} <span className="text-xs text-emerald-700 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-emerald-700 mt-0.5 flex items-center space-x-1 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 inline text-emerald-600" />
              <span>{metrics.completionRate}% of total order finished</span>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">Remaining in Production</div>
            <div className="text-2xl font-black text-amber-900 mt-1 font-mono">
              {metrics.totalRemaining.toLocaleString()} <span className="text-xs text-amber-700 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-amber-700 mt-0.5 flex items-center space-x-1 font-medium">
              <Clock className="h-3.5 w-3.5 inline text-amber-600" />
              <span>Active across 9 work stages</span>
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-4">
            <div className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider">Altering / In Rework</div>
            <div className="text-2xl font-black text-rose-900 mt-1 font-mono">
              {((metrics.stagePieceSums.altering || 0) + (metrics.stagePieceSums.inspection_alter || 0)).toLocaleString()} <span className="text-xs text-rose-700 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-rose-700 mt-0.5 flex items-center space-x-1 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 inline text-rose-600" />
              <span>Requires alteration touchup</span>
            </div>
          </div>
        </div>

        {/* Live Stage Counts Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-semibold text-slate-700 mb-2.5 flex items-center justify-between">
            <span>Live Pieces Remaining By Stage:</span>
            <span className="text-[11px] text-slate-400 font-mono">10-Stage Pipeline Breakdown</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {WORKFLOW_STAGES.map(s => {
              const pcsCount = metrics.stagePieceSums[s.id] || 0;
              const isFinished = s.id === 'prepare_dispatch';
              return (
                <div 
                  key={s.id}
                  onClick={() => setSelectedStageFilter(selectedStageFilter === s.id ? 'all' : s.id)}
                  className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                    selectedStageFilter === s.id 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs' 
                      : pcsCount > 0
                        ? isFinished
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                          : s.id === 'altering'
                            ? 'bg-rose-50 border-rose-200 text-rose-900 hover:bg-rose-100'
                            : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                        : 'bg-white border-slate-100 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] font-bold uppercase truncate" title={s.name}>
                    {s.stepNumber}. {s.shortName}
                  </div>
                  <div className="text-sm font-black font-mono mt-0.5">
                    {pcsCount} <span className="text-[10px] font-normal">pcs</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-center">
          
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              id="input-matrix-search"
              type="text"
              placeholder="Search Party, Job No, D.No, Fabric, Color..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
            />
          </div>

          {/* Party Filter */}
          <div>
            <select
              id="select-matrix-party"
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Parties</option>
              {uniqueParties.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Job No Filter */}
          <div>
            <select
              id="select-matrix-jobno"
              value={selectedJobNo}
              onChange={(e) => setSelectedJobNo(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Job Nos</option>
              {uniqueJobNos.map(j => (
                <option key={j} value={j}>{j}</option>
              ))}
            </select>
          </div>

          {/* Fabric Type Filter */}
          <div>
            <select
              id="select-matrix-fabric"
              value={selectedFabricType}
              onChange={(e) => setSelectedFabricType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Fabric Types</option>
              {uniqueFabricTypes.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              id="select-matrix-status"
              value={completionFilter}
              onChange={(e) => setCompletionFilter(e.target.value as any)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="remaining">In-Progress (Remaining Pcs)</option>
              <option value="completed">100% Completed</option>
              <option value="altering">In Alteration / Inspection</option>
            </select>
          </div>
        </div>

        {/* Quick Active Filter Badges */}
        {(selectedParty !== 'all' || selectedJobNo !== 'all' || selectedFabricType !== 'all' || selectedStageFilter !== 'all' || completionFilter !== 'all' || searchQuery) && (
          <div className="flex items-center flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-semibold text-[11px]">Active Filters:</span>
            {selectedParty !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-medium text-[11px] border border-blue-200 flex items-center space-x-1">
                <span>Party: {selectedParty}</span>
                <button type="button" onClick={() => setSelectedParty('all')} className="hover:text-blue-900 font-bold ml-1">×</button>
              </span>
            )}
            {selectedJobNo !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium text-[11px] border border-indigo-200 flex items-center space-x-1">
                <span>Job: {selectedJobNo}</span>
                <button type="button" onClick={() => setSelectedJobNo('all')} className="hover:text-indigo-900 font-bold ml-1">×</button>
              </span>
            )}
            {selectedFabricType !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 font-medium text-[11px] border border-cyan-200 flex items-center space-x-1">
                <span>Fabric: {selectedFabricType}</span>
                <button type="button" onClick={() => setSelectedFabricType('all')} className="hover:text-cyan-900 font-bold ml-1">×</button>
              </span>
            )}
            {selectedStageFilter !== 'all' && (
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-medium text-[11px] border border-amber-200 flex items-center space-x-1">
                <span>Stage: {WORKFLOW_STAGES.find(s => s.id === selectedStageFilter)?.name || selectedStageFilter}</span>
                <button type="button" onClick={() => setSelectedStageFilter('all')} className="hover:text-amber-950 font-bold ml-1">×</button>
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedParty('all');
                setSelectedJobNo('all');
                setSelectedFabricType('all');
                setSelectedStageFilter('all');
                setCompletionFilter('all');
                setSearchQuery('');
              }}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-bold underline ml-auto"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* TWO SECTIONS: PARTY-WISE YET TO COMPLETE & COMPLETED */}
      <div className="space-y-6">
        
        {/* Section Navigation Tabs & Action Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center flex-wrap gap-1.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveSectionTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeSectionTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <Building className="h-3.5 w-3.5" />
              <span>All Sections (Party-Wise)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSectionTab('yet_to_complete')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeSectionTab === 'yet_to_complete'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>1. Yet to Complete</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSectionTab === 'yet_to_complete' ? 'bg-amber-700 text-white' : 'bg-amber-200 text-amber-900'
              }`}>
                {totalYetToCompletePcs} pcs
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSectionTab('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                activeSectionTab === 'completed'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100/60'
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>2. Completed</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeSectionTab === 'completed' ? 'bg-emerald-700 text-white' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {totalCompletedPcsAll} pcs
              </span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium ml-auto">
            <span>Parties: <strong className="text-slate-800">{uniqueParties.length}</strong></span>
            <span>•</span>
            <span>Active Lots: <strong className="text-slate-800">{filteredItems.length}</strong></span>
          </div>
        </div>

        {/* SECTION 1: YET TO COMPLETE (IN-PROGRESS PRODUCTION — PARTY WISE) */}
        {(activeSectionTab === 'all' || activeSectionTab === 'yet_to_complete') && (
          <div className="space-y-4">
            {/* Section Header */}
            <div className="p-4 bg-gradient-to-r from-amber-500/10 via-amber-50 to-white rounded-2xl border-2 border-amber-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500 text-white shadow-xs">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black tracking-wide text-amber-950 uppercase">
                      Section 1: Yet To Complete (In-Progress Production — Party Wise)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-bold font-mono text-[10px]">
                      {pendingCount} Batches Pending
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 mt-0.5">
                    Live stage locations of all remaining pieces that need to be finished before dispatch.
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-950 font-mono font-black text-sm">
                Total Pending: {totalYetToCompletePcs.toLocaleString()} Pcs
              </div>
            </div>

            {/* Party-wise Pending Cards */}
            {yetToCompleteParties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto" />
                <div className="font-bold text-sm text-slate-800">All Caught Up! Zero Pieces Yet To Complete</div>
                <p className="text-xs text-slate-400">Every batch in this filter has been 100% completed.</p>
              </div>
            ) : (
              yetToCompleteParties.map(partyGroup => {
                const isCollapsed = !!collapsedParties[`pending_${partyGroup.partyName}`];
                const partyCompletionRate = partyGroup.totalOrdered > 0 
                  ? Math.round((partyGroup.totalDone / partyGroup.totalOrdered) * 100) 
                  : 0;

                return (
                  <div 
                    key={partyGroup.partyName}
                    className="bg-white rounded-2xl border border-slate-300 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Party Header Bar */}
                    <div 
                      onClick={() => togglePartyCollapse(`pending_${partyGroup.partyName}`)}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/80 border-b border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-slate-900 text-white shadow-2xs">
                          <Building className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Party:</span>
                            <h4 className="text-sm font-black text-slate-900">
                              {partyGroup.partyName}
                            </h4>
                            <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
                              {partyGroup.items.length} lots
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-2">
                            <span>Ordered: <strong>{partyGroup.totalOrdered} pcs</strong></span>
                            <span>•</span>
                            <span>Completed: <strong className="text-emerald-700">{partyGroup.totalDone} pcs</strong></span>
                            <span>•</span>
                            <span>Yet To Complete: <strong className="text-amber-700">{partyGroup.totalRemaining} pcs</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-bold text-slate-700">{partyCompletionRate}%</span>
                          <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all" 
                              style={{ width: `${partyCompletionRate}%` }}
                            />
                          </div>
                        </div>
                        <div className="p-1 rounded-md text-slate-400 hover:text-slate-700">
                          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Party Pending Lots Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3 min-w-[130px]">Color / Swatch</th>
                              <th className="py-2.5 px-3 min-w-[110px]">Fabric Type</th>
                              <th className="py-2.5 px-3 min-w-[90px]">Job No</th>
                              <th className="py-2.5 px-3 min-w-[100px]">8) D.No</th>
                              <th className="py-2.5 px-3 text-center min-w-[70px]">Ordered</th>
                              <th className="py-2.5 px-3 text-center min-w-[80px] bg-emerald-50/70 text-emerald-900">Done</th>
                              <th className="py-2.5 px-3 text-center min-w-[95px] bg-amber-50 text-amber-950 font-black">
                                Yet To Complete
                              </th>
                              <th className="py-2.5 px-3 min-w-[280px]">
                                What Stage Are Pending Pieces In? (1-10)
                              </th>
                              <th className="py-2.5 px-3 text-center min-w-[80px]">Progress</th>
                              <th className="py-2.5 px-3 text-right min-w-[110px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {partyGroup.items.map(item => {
                              const jobStr = item.jobNo || item.lotNumber;
                              const swatchColor = item.colorSwatchHex || '#64748b';

                              return (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    <div className="flex items-center space-x-2">
                                      <span 
                                        className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0" 
                                        style={{ backgroundColor: swatchColor }}
                                      />
                                      <span className="font-bold truncate max-w-[110px]" title={item.fabricColor}>
                                        {item.fabricColor || 'N/A'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[10px]">
                                      {item.fabricType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                    {jobStr}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {item.designNumber}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                    {item.totalPcs}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-700 bg-emerald-50/40">
                                    {item.completedPcs}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-amber-700 bg-amber-50 text-sm">
                                    {item.remainingPcs}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                      {item.remainingStagesWithCounts.map(({ stage, count }) => (
                                        <span 
                                          key={stage.id}
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 shadow-2xs ${
                                            stage.id === 'altering'
                                              ? 'bg-rose-100 text-rose-900 border-rose-300'
                                              : stage.id === 'embroidery'
                                                ? 'bg-purple-100 text-purple-900 border-purple-300'
                                                : stage.id === 'dhaga_cutting'
                                                  ? 'bg-orange-100 text-orange-900 border-orange-300'
                                                  : stage.id === 'stitching_patta'
                                                    ? 'bg-cyan-100 text-cyan-900 border-cyan-300'
                                                    : 'bg-slate-100 text-slate-800 border-slate-300'
                                          }`}
                                        >
                                          <span className="font-mono font-black bg-white/90 px-1 rounded-xs">
                                            {count} pcs
                                          </span>
                                          <span>in {stage.shortName}</span>
                                        </span>
                                      ))}
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3 text-center">
                                    <span className="text-[10px] font-mono font-bold text-slate-700">
                                      {item.percentComplete}%
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                      <button
                                        type="button"
                                        onClick={() => handleQuickAdvanceNextStage(item)}
                                        title="Advance remaining pieces to next stage"
                                        className="px-2 py-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-2xs flex items-center space-x-1"
                                      >
                                        <span>Next</span>
                                        <ArrowRight className="h-2.5 w-2.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditBreakdown(item)}
                                        title="Distribute pieces across stages"
                                        className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                      >
                                        <SlidersHorizontal className="h-3 w-3" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => onOpenItemModal(item)}
                                        title="View job details"
                                        className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-slate-50 border-t-2 border-slate-300 font-black text-slate-800 text-[11px]">
                              <td colSpan={4} className="py-2 px-3 text-right text-slate-500 uppercase">
                                Subtotal ({partyGroup.partyName}):
                              </td>
                              <td className="py-2 px-3 text-center font-mono">
                                {partyGroup.totalOrdered}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-emerald-700">
                                {partyGroup.totalDone}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-amber-800 bg-amber-100/80 text-sm">
                                {partyGroup.totalRemaining} pcs
                              </td>
                              <td colSpan={3} className="py-2 px-3 text-slate-400 text-xs font-normal">
                                {partyGroup.items.length} lots pending completion
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* SECTION 2: COMPLETED (100% READY FOR DISPATCH — PARTY WISE) */}
        {(activeSectionTab === 'all' || activeSectionTab === 'completed') && (
          <div className="space-y-4 pt-2">
            {/* Section Header */}
            <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-emerald-50 to-white rounded-2xl border-2 border-emerald-300/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-black tracking-wide text-emerald-950 uppercase">
                      Section 2: Completed Orders (100% Ready For Dispatch — Party Wise)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold font-mono text-[10px]">
                      {doneCount} Batches Finished
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Finished orders where all pieces have completed the pipeline and are ready for delivery challans &amp; billing.
                  </p>
                </div>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-950 font-mono font-black text-sm">
                Total Ready: {totalCompletedPcsAll.toLocaleString()} Pcs
              </div>
            </div>

            {/* Party-wise Completed Cards */}
            {completedParties.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 space-y-2">
                <Clock className="h-10 w-10 text-amber-400 mx-auto" />
                <div className="font-bold text-sm text-slate-800">No 100% Completed Batches Yet</div>
                <p className="text-xs text-slate-400">Once lots complete all 10 stages and reach Prepare Dispatch, they will appear here party-wise.</p>
              </div>
            ) : (
              completedParties.map(partyGroup => {
                const isCollapsed = !!collapsedParties[`completed_${partyGroup.partyName}`];

                return (
                  <div 
                    key={partyGroup.partyName}
                    className="bg-white rounded-2xl border border-emerald-200 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Party Header Bar */}
                    <div 
                      onClick={() => togglePartyCollapse(`completed_${partyGroup.partyName}`)}
                      className="p-3.5 bg-emerald-50/60 hover:bg-emerald-50 border-b border-emerald-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 cursor-pointer select-none transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-lg bg-emerald-700 text-white shadow-2xs">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">Party:</span>
                            <h4 className="text-sm font-black text-emerald-950">
                              {partyGroup.partyName}
                            </h4>
                            <span className="px-2 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold font-mono">
                              100% DONE
                            </span>
                          </div>
                          <div className="text-[11px] text-emerald-700 mt-0.5">
                            {partyGroup.items.length} completed lots &bull; Total finished pieces: <strong>{partyGroup.totalDone} pcs</strong>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end">
                        <div className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 font-mono font-bold text-xs border border-emerald-300">
                          ✅ {partyGroup.totalDone} Pcs Ready
                        </div>
                        <div className="p-1 rounded-md text-emerald-700 hover:text-emerald-900">
                          {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Party Completed Lots Table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-emerald-50/40 text-emerald-900 font-bold border-b border-emerald-200 uppercase tracking-wider text-[10px]">
                              <th className="py-2.5 px-3 min-w-[130px]">Color / Swatch</th>
                              <th className="py-2.5 px-3 min-w-[110px]">Fabric Type</th>
                              <th className="py-2.5 px-3 min-w-[90px]">Job No</th>
                              <th className="py-2.5 px-3 min-w-[100px]">8) D.No</th>
                              <th className="py-2.5 px-3 text-center min-w-[80px]">Total Ordered</th>
                              <th className="py-2.5 px-3 text-center min-w-[90px] bg-emerald-100/70 text-emerald-950 font-black">
                                Completed Pcs
                              </th>
                              <th className="py-2.5 px-3 min-w-[200px]">Current Status</th>
                              <th className="py-2.5 px-3 text-center min-w-[120px]">Challan / Bill</th>
                              <th className="py-2.5 px-3 text-right min-w-[80px]">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-emerald-100">
                            {partyGroup.items.map(item => {
                              const jobStr = item.jobNo || item.lotNumber;
                              const swatchColor = item.colorSwatchHex || '#64748b';

                              return (
                                <tr key={item.id} className="hover:bg-emerald-50/30 transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-slate-900">
                                    <div className="flex items-center space-x-2">
                                      <span 
                                        className="h-3.5 w-3.5 rounded-full border border-slate-300 shadow-2xs shrink-0" 
                                        style={{ backgroundColor: swatchColor }}
                                      />
                                      <span className="font-bold truncate max-w-[110px]" title={item.fabricColor}>
                                        {item.fabricColor || 'N/A'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-[10px]">
                                      {item.fabricType}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                                    {jobStr}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {item.designNumber}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                                    {item.totalPcs}
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono font-black text-emerald-800 bg-emerald-100/60 text-sm">
                                    {item.completedPcs}
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200">
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      <span>10. Ready for Dispatch ({item.totalPcs} pcs)</span>
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-600">
                                    {item.deliveryChalanNumber || item.deliveryChalanNo ? (
                                      <span>Ch: {item.deliveryChalanNumber || item.deliveryChalanNo}</span>
                                    ) : item.billNumber || item.billNo ? (
                                      <span>Bill: {item.billNumber || item.billNo}</span>
                                    ) : (
                                      <span className="text-slate-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => onOpenItemModal(item)}
                                      title="View job details"
                                      className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="bg-emerald-50/70 border-t-2 border-emerald-200 font-black text-emerald-950 text-[11px]">
                              <td colSpan={4} className="py-2 px-3 text-right text-emerald-700 uppercase">
                                Subtotal ({partyGroup.partyName}):
                              </td>
                              <td className="py-2 px-3 text-center font-mono">
                                {partyGroup.totalOrdered}
                              </td>
                              <td className="py-2 px-3 text-center font-mono text-emerald-900 bg-emerald-200/80 text-sm">
                                {partyGroup.totalDone} pcs
                              </td>
                              <td colSpan={3} className="py-2 px-3 text-emerald-700 text-xs font-semibold">
                                ✅ 100% Finished ({partyGroup.items.length} lots)
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

      </div>


      {/* Piece Distribution Modal: Update what stage remaining pieces are in */}
      {editingItemBreakdown && (
        <div 
          id="modal-piece-distribution"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden">
            <div className="p-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">
                  Update Stage Distribution for {editingItemBreakdown.fabricType} ({editingItemBreakdown.fabricColor})
                </h3>
                <p className="text-xs text-slate-300">
                  Party: {editingItemBreakdown.partyOrClientName || editingItemBreakdown.partyName} | Job No: {editingItemBreakdown.jobNo || editingItemBreakdown.lotNumber} | D.No: {editingItemBreakdown.designNumber}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-400 block font-mono">Total Pieces</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {editingItemBreakdown.pieces ?? editingItemBreakdown.quantity} pcs
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 flex items-start space-x-2">
                <Layers className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Piece Stage Allocator:</strong> Enter how many pieces are currently physically in each of the 10 production stages. Completed pieces placed in Stage 10 (Dispatch) are counted as finished!
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORKFLOW_STAGES.map(stage => {
                  const val = tempBreakdown[stage.id] || 0;
                  const isFinal = stage.id === 'prepare_dispatch';

                  return (
                    <div 
                      key={stage.id}
                      className={`p-3 rounded-xl border flex items-center justify-between ${
                        isFinal ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900">
                          {stage.stepNumber}. {stage.shortName}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {isFinal ? 'Ready for Dispatch / Finished' : stage.description.slice(0, 32) + '...'}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <input
                          type="number"
                          min={0}
                          max={editingItemBreakdown.pieces ?? editingItemBreakdown.quantity}
                          value={val}
                          onChange={(e) => {
                            const newCount = Math.max(0, parseInt(e.target.value) || 0);
                            setTempBreakdown(prev => ({
                              ...prev,
                              [stage.id]: newCount
                            }));
                          }}
                          className="w-20 px-2 py-1.5 text-right font-mono font-bold text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-xs font-semibold text-slate-500">pcs</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total allocation balance check */}
              {(() => {
                const sum = Object.values(tempBreakdown).reduce<number>((a, b) => a + (Number(b) || 0), 0);
                const total = editingItemBreakdown.pieces ?? editingItemBreakdown.quantity;
                const diff = total - sum;

                return (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    diff === 0 
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                      : 'bg-amber-100 text-amber-950 border-amber-300'
                  }`}>
                    <span>
                      {diff === 0 ? '✓ All pieces perfectly accounted for' : `⚠️ Warning: ${Math.abs(diff)} pcs ${diff > 0 ? 'unassigned' : 'over-allocated'}`}
                    </span>
                    <span className="font-mono">
                      Sum: {sum} / {total} pcs
                    </span>
                  </div>
                );
              })()}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setEditingItemBreakdown(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBreakdown}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md flex items-center space-x-1.5"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Save Stage Piece Counts</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
