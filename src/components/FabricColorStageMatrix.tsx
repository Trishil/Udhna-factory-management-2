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
  ChevronDown
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, OrderSlip } from '../types';
import { WORKFLOW_STAGES, getItemStageBreakdown, getNextStage } from '../utils/workflowData';

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
    items.forEach(it => {
      const p = it.partyOrClientName || it.partyName;
      if (p) parties.add(p);
    });
    orderSlips.forEach(s => {
      if (s.partyName) parties.add(s.partyName);
    });
    return Array.from(parties);
  }, [items, orderSlips]);

  const uniqueJobNos = useMemo(() => {
    const jobs = new Set<string>();
    items.forEach(it => {
      if (it.jobNo) jobs.add(it.jobNo);
      else if (it.lotNumber) jobs.add(it.lotNumber);
    });
    orderSlips.forEach(s => {
      if (s.jobNo) jobs.add(s.jobNo);
    });
    return Array.from(jobs);
  }, [items, orderSlips]);

  const uniqueFabricTypes = useMemo(() => {
    const fTypes = new Set<string>();
    items.forEach(it => {
      if (it.fabricType) fTypes.add(it.fabricType);
    });
    return Array.from(fTypes);
  }, [items]);

  // Enhanced Items with Stage Breakdowns
  const enrichedItems = useMemo(() => {
    return items.map(item => {
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
  }, [items]);

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
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-2xl p-6 border border-slate-700/60 shadow-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-slate-700/60">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/20 ring-1 ring-white/10">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Fabric Type &amp; Color Live Stage Tracker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold font-mono">
                  Piece-Level Accuracy
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Live visibility of completed vs. remaining pieces categorized by fabric type, color swatch, design number &amp; 10 production stages.
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5 w-full lg:w-auto">
            <button
              id="btn-matrix-new-slip"
              type="button"
              onClick={onOpenCreateSlipModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Order Slip (S V ART Format)</span>
            </button>
          </div>
        </div>

        {/* Aggregate KPI Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-5">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Total Pieces Ordered</div>
            <div className="text-2xl font-black text-white mt-1 font-mono">
              {metrics.totalOrdered.toLocaleString()} <span className="text-xs text-slate-400 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Across {filteredItems.length} color/fabric batches
            </div>
          </div>

          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-medium text-emerald-300 uppercase tracking-wider">Completed (Dispatch Ready)</div>
            <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
              {metrics.totalCompleted.toLocaleString()} <span className="text-xs text-emerald-300/80 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-emerald-300/80 mt-0.5 flex items-center space-x-1">
              <CheckCircle2 className="h-3 w-3 inline" />
              <span>{metrics.completionRate}% of total order finished</span>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-medium text-amber-300 uppercase tracking-wider">Remaining in Production</div>
            <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
              {metrics.totalRemaining.toLocaleString()} <span className="text-xs text-amber-300/80 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-amber-300/80 mt-0.5 flex items-center space-x-1">
              <Clock className="h-3 w-3 inline" />
              <span>Active across 9 work stages</span>
            </div>
          </div>

          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 backdrop-blur-xs">
            <div className="text-[11px] font-medium text-rose-300 uppercase tracking-wider">Altering / In Rework</div>
            <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
              {((metrics.stagePieceSums.altering || 0) + (metrics.stagePieceSums.inspection_alter || 0)).toLocaleString()} <span className="text-xs text-rose-300/80 font-normal">pcs</span>
            </div>
            <div className="text-[11px] text-rose-300/80 mt-0.5 flex items-center space-x-1">
              <AlertTriangle className="h-3 w-3 inline" />
              <span>Requires alteration touchup</span>
            </div>
          </div>
        </div>

        {/* Live Stage Counts Strip */}
        <div className="mt-4 pt-4 border-t border-slate-700/50">
          <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
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
                  className={`p-2 rounded-lg border text-center cursor-pointer transition-all ${
                    selectedStageFilter === s.id 
                      ? 'bg-blue-600 text-white border-blue-400 ring-2 ring-blue-400/50 shadow-md' 
                      : pcsCount > 0
                        ? isFinished
                          ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-200 hover:bg-emerald-900/60'
                          : s.id === 'altering'
                            ? 'bg-rose-950/60 border-rose-500/30 text-rose-200 hover:bg-rose-900/60'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-700/80'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
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

      {/* Main Fabric & Color Stage Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-700" />
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              Production Matrix: Pieces Completed vs. Remaining by Stage
            </h3>
          </div>
          <div className="flex items-center space-x-3">
            <div className="text-xs text-slate-500 font-medium hidden sm:block">
              Showing <strong className="text-slate-800">{filteredItems.length}</strong> color &amp; fabric lots
            </div>
            <div className="flex items-center space-x-1 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={() => matrixScrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-2xs transition-colors"
                title="Scroll Table Left"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => matrixScrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 shadow-2xs transition-colors"
                title="Scroll Table Right"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div ref={matrixScrollRef} className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-3 min-w-[140px]">1) Color / Shade</th>
                <th className="py-3 px-3 min-w-[130px]">10) Fabric Type</th>
                <th className="py-3 px-3 min-w-[130px]">2) Party &amp; 3) Job</th>
                <th className="py-3 px-3 min-w-[110px]">8) D.No</th>
                <th className="py-3 px-3 text-center min-w-[80px]">6) Total Pcs</th>
                <th className="py-3 px-3 text-center min-w-[90px] bg-emerald-50 text-emerald-900">
                  13) Completed
                </th>
                <th className="py-3 px-3 text-center min-w-[90px] bg-amber-50 text-amber-900">
                  Remaining
                </th>
                <th className="py-3 px-3 min-w-[320px]">
                  Remaining Pieces in What Stage (1-10)?
                </th>
                <th className="py-3 px-3 text-center min-w-[100px]">Progress</th>
                <th className="py-3 px-3 text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Layers className="h-10 w-10 text-slate-300 mx-auto" />
                      <p className="text-sm font-bold text-slate-700">No fabric color batches match your filter</p>
                      <p className="text-xs text-slate-400">Try changing or clearing your search and filters above.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const partyStr = item.partyOrClientName || item.partyName || 'N/A';
                  const jobStr = item.jobNo || item.lotNumber;
                  const swatchColor = item.colorSwatchHex || '#64748b';

                  return (
                    <tr 
                      key={item.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Color */}
                      <td className="py-3 px-3 font-medium text-slate-900">
                        <div className="flex items-center space-x-2">
                          <span 
                            className="h-4 w-4 rounded-full border border-slate-300 shadow-xs shrink-0" 
                            style={{ backgroundColor: swatchColor }}
                            title={item.fabricColor || 'Color'}
                          />
                          <span className="font-bold truncate max-w-[120px]" title={item.fabricColor}>
                            {item.fabricColor || 'N/A'}
                          </span>
                        </div>
                      </td>

                      {/* Fabric Type */}
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-blue-800 font-bold text-[11px]">
                          {item.fabricType}
                        </span>
                      </td>

                      {/* Party & Job No */}
                      <td className="py-3 px-3 text-slate-800">
                        <div className="font-bold truncate max-w-[130px]" title={partyStr}>
                          {partyStr}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Job: {jobStr}
                        </div>
                      </td>

                      {/* Design No */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {item.designNumber}
                      </td>

                      {/* Total Pcs */}
                      <td className="py-3 px-3 text-center font-mono font-black text-slate-900 text-sm">
                        {item.totalPcs}
                      </td>

                      {/* Completed Pcs */}
                      <td className="py-3 px-3 text-center font-mono font-black text-emerald-700 bg-emerald-50/50 text-sm">
                        {item.completedPcs}
                        {item.completedPcs === item.totalPcs && (
                          <span className="block text-[9px] text-emerald-600 font-sans font-bold">100% DONE</span>
                        )}
                      </td>

                      {/* Remaining Pcs */}
                      <td className="py-3 px-3 text-center font-mono font-black text-amber-700 bg-amber-50/50 text-sm">
                        {item.remainingPcs}
                        {item.remainingPcs === 0 ? (
                          <span className="block text-[9px] text-emerald-600 font-sans font-bold">ALL DONE</span>
                        ) : (
                          <span className="block text-[9px] text-amber-600 font-sans font-bold">IN PROCESS</span>
                        )}
                      </td>

                      {/* Remaining in What Stage? */}
                      <td className="py-3 px-3">
                        {item.remainingPcs === 0 ? (
                          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>10. Ready for Dispatch ({item.totalPcs} pcs)</span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5 items-center">
                            {item.remainingStagesWithCounts.map(({ stage, count }) => (
                              <span 
                                key={stage.id}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-bold border flex items-center space-x-1 shadow-xs ${
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
                                <span className="font-mono font-black bg-white/80 px-1 rounded-xs">
                                  {count} pcs
                                </span>
                                <span className="truncate max-w-[120px]">
                                  in {stage.shortName}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3 text-center">
                        <div className="w-full max-w-[80px] mx-auto space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-700">
                            <span>{item.percentComplete}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-300 ${
                                item.percentComplete === 100 
                                  ? 'bg-emerald-500' 
                                  : item.percentComplete >= 50 
                                    ? 'bg-blue-500' 
                                    : 'bg-amber-500'
                              }`}
                              style={{ width: `${item.percentComplete}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {item.remainingPcs > 0 && (
                            <button
                              type="button"
                              onClick={() => handleQuickAdvanceNextStage(item)}
                              title="Advance all remaining pieces to next stage"
                              className="px-2 py-1 text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-xs flex items-center space-x-1"
                            >
                              <span>Next</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditBreakdown(item)}
                            title="Distribute pieces across stages"
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <SlidersHorizontal className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onOpenItemModal(item)}
                            title="View full job slip & details"
                            className="p-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
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
