import React, { useState, useMemo } from 'react';
import { 
  WorkflowItem, 
  WorkflowStageId, 
  IndividualPieceUnit,
  OrderSlip
} from '../types';
import { 
  WORKFLOW_STAGES, 
  getOrGenerateIndividualPieces, 
  updateIndividualPieceStage, 
  batchMoveIndividualPieces,
  getNextStage,
  getPreviousStage
} from '../utils/workflowData';
import { 
  Wrench, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  ArrowLeft, 
  Layers, 
  Search, 
  Filter, 
  Tag, 
  RotateCcw, 
  CheckCheck, 
  Split, 
  ListOrdered, 
  History, 
  Palette, 
  Scissors, 
  AlertCircle,
  HelpCircle,
  Clock,
  ShieldAlert,
  SlidersHorizontal,
  ChevronDown,
  FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface IndividualPieceTrackerProps {
  items: WorkflowItem[];
  orderSlips?: OrderSlip[];
  onUpdateItem: (item: WorkflowItem) => void;
}

const COMMON_DEFECT_REASONS = [
  'Missed needle stitch / Jump stitch',
  'Thread pull / Thread breakage',
  'Sequin / Dori / Zari breakage',
  'Border pattern misalignment',
  'Fabric snag / Small tear near kali',
  'Oil / Machine grease stain',
  'Tension loose loop',
  'Custom / Other Alteration'
];

export const IndividualPieceTracker: React.FC<IndividualPieceTrackerProps> = ({
  items,
  orderSlips = [],
  onUpdateItem
}) => {
  // Selected Lot / Job filter & Party Slip filter
  const [selectedSlipFilter, setSelectedSlipFilter] = useState<string>('all');
  const [selectedLotId, setSelectedLotId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPieceIds, setSelectedPieceIds] = useState<Set<string>>(new Set());
  const [trackerDisplayMode, setTrackerDisplayMode] = useState<'grid' | 'columns'>('grid');
  const [lastActionToast, setLastActionToast] = useState<string | null>(null);

  // Defect Modal State for Altering Routing
  const [isDefectModalOpen, setIsDefectModalOpen] = useState(false);
  const [defectTargetPiece, setDefectTargetPiece] = useState<{ item: WorkflowItem; piece: IndividualPieceUnit } | null>(null);
  const [defectReason, setDefectReason] = useState(COMMON_DEFECT_REASONS[0]);
  const [customDefectNote, setCustomDefectNote] = useState('');
  const [batchDefectMode, setBatchDefectMode] = useState(false);

  // Helper to check if an item/piece matches the selected Party Order Slip
  const itemMatchesSlip = (item: WorkflowItem, slipId: string) => {
    if (slipId === 'all') return true;
    const targetSlip = orderSlips.find(s => s.id === slipId);
    if (!targetSlip) return true;

    if (item.orderSlipId && item.orderSlipId === slipId) return true;

    const itJob = (item.jobNo || item.lotNumber || '').trim().toLowerCase();
    const slipJob = (targetSlip.jobNo || '').trim().toLowerCase();
    const itParty = (item.partyName || item.partyOrClientName || '').trim().toLowerCase();
    const slipParty = (targetSlip.partyName || '').trim().toLowerCase();

    if (slipJob && itJob && (itJob === slipJob || itJob.includes(slipJob) || slipJob.includes(itJob))) {
      if (!slipParty || !itParty || itParty === slipParty || itParty.includes(slipParty) || slipParty.includes(itParty)) {
        return true;
      }
    }

    if (targetSlip.chalanNo && item.chalanNumber && targetSlip.chalanNo.trim().toLowerCase() === item.chalanNumber.trim().toLowerCase()) {
      return true;
    }

    return false;
  };

  // Selected Lot Object
  const currentItem = useMemo(() => {
    if (selectedLotId === 'all') return null;
    return items.find(it => it.id === selectedLotId) || null;
  }, [items, selectedLotId]);

  // Aggregate all individual pieces across items (or for the selected item / slip)
  const allPiecesWithParent = useMemo(() => {
    const list: Array<{ item: WorkflowItem; piece: IndividualPieceUnit }> = [];
    let sourceItems = currentItem ? [currentItem] : items;

    if (selectedSlipFilter !== 'all') {
      sourceItems = sourceItems.filter(it => itemMatchesSlip(it, selectedSlipFilter));
    }

    sourceItems.forEach(item => {
      const pieces = getOrGenerateIndividualPieces(item);
      pieces.forEach(p => {
        list.push({ item, piece: p });
      });
    });
    return list;
  }, [items, currentItem, selectedSlipFilter, orderSlips]);

  // Filtered Pieces
  const filteredPieces = useMemo(() => {
    return allPiecesWithParent.filter(({ item, piece }) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTag = piece.pieceTag.toLowerCase().includes(q);
        const matchNum = String(piece.pieceNumber).includes(q);
        const matchLot = (item.lotNumber || '').toLowerCase().includes(q);
        const matchJob = (item.jobNo || '').toLowerCase().includes(q);
        const matchParty = (piece.partyName || item.partyName || '').toLowerCase().includes(q);
        const matchFabric = (piece.fabricType || item.fabricType || '').toLowerCase().includes(q);
        const matchColor = (piece.fabricColor || item.fabricColor || '').toLowerCase().includes(q);
        const matchDefect = (piece.defectReason || '').toLowerCase().includes(q);
        if (!matchTag && !matchNum && !matchLot && !matchJob && !matchParty && !matchFabric && !matchColor && !matchDefect) {
          return false;
        }
      }

      // Stage filter
      if (stageFilter !== 'all' && piece.currentStage !== stageFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'needs_alter' && piece.currentStage !== 'altering' && piece.status !== 'needs_alter') {
          return false;
        }
        if (statusFilter === 'good' && (piece.currentStage === 'altering' || piece.status === 'needs_alter')) {
          return false;
        }
        if (statusFilter === 'completed' && piece.currentStage !== 'prepare_dispatch') {
          return false;
        }
      }

      return true;
    });
  }, [allPiecesWithParent, searchQuery, stageFilter, statusFilter]);

  // Key KPI stats
  const stats = useMemo(() => {
    const total = allPiecesWithParent.length;
    const inAltering = allPiecesWithParent.filter(p => p.piece.currentStage === 'altering' || p.piece.status === 'needs_alter').length;
    const inEmbroidery = allPiecesWithParent.filter(p => p.piece.currentStage === 'embroidery').length;
    const completed = allPiecesWithParent.filter(p => p.piece.currentStage === 'prepare_dispatch').length;
    const goodInProduction = total - inAltering - completed;

    return { total, inAltering, inEmbroidery, completed, goodInProduction };
  }, [allPiecesWithParent]);

  // Handle single piece stage transfer
  const handleMoveSinglePiece = (
    item: WorkflowItem,
    piece: IndividualPieceUnit,
    targetStage: WorkflowStageId,
    status: 'good' | 'needs_alter' | 'in_rework' | 'repaired' | 'rejected' | 'completed' = 'good',
    reason?: string
  ) => {
    const updated = updateIndividualPieceStage(item, piece.id, targetStage, status, reason);
    onUpdateItem(updated);

    const stDef = WORKFLOW_STAGES.find(s => s.id === targetStage);
    const pName = piece.partyName || item.partyName || 'Party';
    const jNo = piece.jobNo || item.jobNo || item.lotNumber || '—';

    if (targetStage === 'prepare_dispatch') {
      confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
      setLastActionToast(`✅ Piece #${piece.pieceNumber} moved to Ready for Dispatch & synced with Party Order Slip (${pName}, Job: ${jNo})`);
    } else if (targetStage === 'altering') {
      setLastActionToast(`⚠️ Piece #${piece.pieceNumber} routed to Altering (${reason || 'Rework'}) & recorded`);
    } else {
      setLastActionToast(`🔄 Piece #${piece.pieceNumber} advanced to ${stDef?.shortName || targetStage}`);
    }
    setTimeout(() => setLastActionToast(null), 4000);
  };

  // Open Alteration Dialog for a specific piece
  const handleOpenDefectDialog = (item: WorkflowItem, piece: IndividualPieceUnit) => {
    setDefectTargetPiece({ item, piece });
    setBatchDefectMode(false);
    setDefectReason(COMMON_DEFECT_REASONS[0]);
    setCustomDefectNote('');
    setIsDefectModalOpen(true);
  };

  // Confirm sending piece(s) to Altering
  const handleConfirmSendToAltering = () => {
    const finalReason = customDefectNote.trim() 
      ? `${defectReason}: ${customDefectNote.trim()}`
      : defectReason;

    if (batchDefectMode) {
      // Group selected pieces by parent item
      const itemToPieceIds: Record<string, string[]> = {};
      selectedPieceIds.forEach(pieceId => {
        const found = allPiecesWithParent.find(p => p.piece.id === pieceId);
        if (found) {
          if (!itemToPieceIds[found.item.id]) {
            itemToPieceIds[found.item.id] = [];
          }
          itemToPieceIds[found.item.id].push(pieceId);
        }
      });

      Object.entries(itemToPieceIds).forEach(([itemId, pIds]) => {
        const item = items.find(it => it.id === itemId);
        if (item) {
          const updated = batchMoveIndividualPieces(item, pIds, 'altering', 'needs_alter', finalReason);
          onUpdateItem(updated);
        }
      });

      setLastActionToast(`⚠️ ${selectedPieceIds.size} pieces routed to Altering for rework`);
      setTimeout(() => setLastActionToast(null), 4000);
      setSelectedPieceIds(new Set());
    } else if (defectTargetPiece) {
      handleMoveSinglePiece(
        defectTargetPiece.item,
        defectTargetPiece.piece,
        'altering',
        'needs_alter',
        finalReason
      );
    }

    setIsDefectModalOpen(false);
    setDefectTargetPiece(null);
  };

  // Batch move selected pieces to next stage (e.g. advance 19 fine pieces)
  const handleBatchAdvance = () => {
    if (selectedPieceIds.size === 0) return;

    // Group selected pieces by parent item
    const itemToPieceMap: Record<string, IndividualPieceUnit[]> = {};
    selectedPieceIds.forEach(pieceId => {
      const found = allPiecesWithParent.find(p => p.piece.id === pieceId);
      if (found) {
        if (!itemToPieceMap[found.item.id]) {
          itemToPieceMap[found.item.id] = [];
        }
        itemToPieceMap[found.item.id].push(found.piece);
      }
    });

    Object.entries(itemToPieceMap).forEach(([itemId, pieces]) => {
      const item = items.find(it => it.id === itemId);
      if (!item) return;

      let currentUpdatedItem = item;
      pieces.forEach(p => {
        const next = getNextStage(p.currentStage);
        if (next) {
          currentUpdatedItem = updateIndividualPieceStage(
            currentUpdatedItem,
            p.id,
            next,
            next === 'prepare_dispatch' ? 'completed' : 'good'
          );
        }
      });
      onUpdateItem(currentUpdatedItem);
    });

    setSelectedPieceIds(new Set());
    confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
  };

  // Batch move to a specific stage
  const handleBatchMoveToSpecificStage = (targetStage: WorkflowStageId) => {
    if (selectedPieceIds.size === 0) return;

    const itemToPieceIds: Record<string, string[]> = {};
    selectedPieceIds.forEach(pieceId => {
      const found = allPiecesWithParent.find(p => p.piece.id === pieceId);
      if (found) {
        if (!itemToPieceIds[found.item.id]) {
          itemToPieceIds[found.item.id] = [];
        }
        itemToPieceIds[found.item.id].push(pieceId);
      }
    });

    Object.entries(itemToPieceIds).forEach(([itemId, pIds]) => {
      const item = items.find(it => it.id === itemId);
      if (item) {
        const updated = batchMoveIndividualPieces(
          item,
          pIds,
          targetStage,
          targetStage === 'altering' ? 'needs_alter' : targetStage === 'prepare_dispatch' ? 'completed' : 'good'
        );
        onUpdateItem(updated);
      }
    });

    setSelectedPieceIds(new Set());
  };

  // Toggle selection
  const togglePieceSelection = (pieceId: string) => {
    const next = new Set(selectedPieceIds);
    if (next.has(pieceId)) {
      next.delete(pieceId);
    } else {
      next.add(pieceId);
    }
    setSelectedPieceIds(next);
  };

  const handleSelectAllVisible = () => {
    if (selectedPieceIds.size === filteredPieces.length) {
      setSelectedPieceIds(new Set());
    } else {
      setSelectedPieceIds(new Set(filteredPieces.map(p => p.piece.id)));
    }
  };

  const handleSelectOnlyAltering = () => {
    const alterIds = filteredPieces
      .filter(p => p.piece.currentStage === 'altering' || p.piece.status === 'needs_alter')
      .map(p => p.piece.id);
    setSelectedPieceIds(new Set(alterIds));
  };

  const handleSelectOnlyGoodInEmbroidery = () => {
    const embIds = filteredPieces
      .filter(p => p.piece.currentStage === 'embroidery' && p.piece.status !== 'needs_alter')
      .map(p => p.piece.id);
    setSelectedPieceIds(new Set(embIds));
  };

  return (
    <div id="individual-piece-tracker-root" className="space-y-6">
      
      {/* Top Banner & Context */}
      <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 bg-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 rounded-xl bg-slate-900 text-white shadow-xs shrink-0">
              <Split className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight text-slate-900">
                  Individual Piece &amp; Unit Tracker
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-mono font-bold uppercase">
                  Unit-Level Breakdown
                </span>
                <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-mono font-bold uppercase">
                  Rework &amp; Alteration Routing
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Track each single piece independently. E.g. If 19 of 20 pieces are fine in Embroidery and 1 needs altering, route piece #20 to Altering while advancing the other 19!
              </p>
            </div>
          </div>

          {/* View Mode Toggle (Grid vs Columns) */}
          <div className="flex items-center space-x-1.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/70">
            <button
              type="button"
              onClick={() => setTrackerDisplayMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                trackerDisplayMode === 'grid'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Unit Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setTrackerDisplayMode('columns')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                trackerDisplayMode === 'columns'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>10-Stage Columns</span>
            </button>
          </div>
        </div>

        {/* Live Piece Stats Banner */}
        <div className="grid grid-cols-2 sm:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/50 text-center text-xs">
          <div className="p-3.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">Total Units Tracked</span>
            <span className="text-base font-black text-slate-900 font-mono mt-0.5">{stats.total} Pcs</span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">In Embroidery</span>
            <span className="text-base font-black text-slate-800 font-mono mt-0.5">{stats.inEmbroidery} Pcs</span>
          </div>

          <div className="p-3.5 bg-amber-50/50">
            <span className="text-[10px] text-amber-800 font-bold uppercase block flex items-center justify-center space-x-1">
              <AlertTriangle className="h-3 w-3 text-amber-600" />
              <span>In Altering / Rework</span>
            </span>
            <span className="text-base font-black text-amber-900 font-mono mt-0.5">
              {stats.inAltering} {stats.inAltering === 1 ? 'Pc' : 'Pcs'}
            </span>
          </div>

          <div className="p-3.5">
            <span className="text-[10px] text-slate-500 font-semibold uppercase block">In Standard Flow</span>
            <span className="text-base font-black text-slate-900 font-mono mt-0.5">{stats.goodInProduction} Pcs</span>
          </div>

          <div className="p-3.5 bg-emerald-50/50">
            <span className="text-[10px] text-emerald-800 font-bold uppercase block flex items-center justify-center space-x-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" />
              <span>Ready &bull; Slip Synced</span>
            </span>
            <span className="text-base font-black text-emerald-900 font-mono mt-0.5">{stats.completed} Pcs</span>
          </div>
        </div>
      </div>

      {/* Action Toast Banner */}
      {lastActionToast && (
        <div className="p-3 bg-slate-900 text-white rounded-xl shadow-md border border-slate-800 flex items-center justify-between text-xs animate-in slide-in-from-top duration-200">
          <div className="flex items-center space-x-2 font-medium">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0" />
            <span>{lastActionToast}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setLastActionToast(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter & Lot Selector Controls - Clean Non-Overlapping Grid */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          
          {/* Party Slip Selector */}
          <div>
            <label htmlFor="slip-filter-select" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Party Slip:
            </label>
            <select
              id="slip-filter-select"
              value={selectedSlipFilter}
              onChange={(e) => {
                setSelectedSlipFilter(e.target.value);
                setSelectedLotId('all');
                setSelectedPieceIds(new Set());
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none transition-colors"
            >
              <option value="all">All Party Slips ({orderSlips.length})</option>
              {orderSlips.map(s => (
                <option key={s.id} value={s.id}>
                  {s.partyName} (Job: {s.jobNo})
                </option>
              ))}
            </select>
          </div>

          {/* Job / Lot Selector */}
          <div>
            <label htmlFor="lot-filter-select" className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Job / Lot:
            </label>
            <select
              id="lot-filter-select"
              value={selectedLotId}
              onChange={(e) => {
                setSelectedLotId(e.target.value);
                setSelectedPieceIds(new Set());
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none transition-colors"
            >
              <option value="all">All Active Lots ({items.length})</option>
              {items.map(it => (
                <option key={it.id} value={it.id}>
                  {it.partyName || it.partyOrClientName || 'Client'} &bull; Job: {it.jobNo || it.lotNumber} &bull; {it.fabricType}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Search Piece:
            </label>
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Tag, #1, defect..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Stage Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Stage:
            </label>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none transition-colors"
            >
              <option value="all">All 10 Stages</option>
              {WORKFLOW_STAGES.map(st => (
                <option key={st.id} value={st.id}>{st.stepNumber}. {st.shortName}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Quality Status:
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-slate-400 focus:outline-none transition-colors"
            >
              <option value="all">All Quality States</option>
              <option value="good">Fine / Standard</option>
              <option value="needs_alter">In Alteration</option>
              <option value="completed">Ready / Completed</option>
            </select>
          </div>

        </div>

        {/* Batch Action Toolbar */}
        <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          
          {/* Quick Selection Shortcuts */}
          <div className="flex items-center space-x-2 flex-wrap gap-1">
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
            >
              {selectedPieceIds.size === filteredPieces.length ? 'Deselect All' : `Select All (${filteredPieces.length})`}
            </button>
            <button
              type="button"
              onClick={handleSelectOnlyGoodInEmbroidery}
              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-semibold transition-colors border border-purple-200"
            >
              Select All Fine in Embroidery
            </button>
            <button
              type="button"
              onClick={handleSelectOnlyAltering}
              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold transition-colors border border-rose-200"
            >
              Select Altering ({stats.inAltering})
            </button>
          </div>

          {/* Batch Action Buttons */}
          {selectedPieceIds.size > 0 && (
            <div className="flex items-center space-x-2 flex-wrap gap-1 bg-blue-50/90 p-1.5 rounded-xl border border-blue-200">
              <span className="text-xs font-bold text-blue-950 px-2 font-mono">
                {selectedPieceIds.size} Selected
              </span>

              {/* Advance Next */}
              <button
                type="button"
                onClick={handleBatchAdvance}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1 transition-all"
              >
                <span>Advance to Next Stage</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>

              {/* Send Selected to Altering */}
              <button
                type="button"
                onClick={() => {
                  setBatchDefectMode(true);
                  setDefectTargetPiece(null);
                  setDefectReason(COMMON_DEFECT_REASONS[0]);
                  setCustomDefectNote('');
                  setIsDefectModalOpen(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-xs flex items-center space-x-1 transition-all"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Send to Altering</span>
              </button>

              {/* Move to specific stage dropdown */}
              <div className="relative inline-block">
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleBatchMoveToSpecificStage(e.target.value as WorkflowStageId);
                      e.target.value = '';
                    }
                  }}
                  defaultValue=""
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-white text-xs font-bold cursor-pointer hover:bg-slate-700 transition-colors"
                >
                  <option value="" disabled>Move to stage...</option>
                  {WORKFLOW_STAGES.map(st => (
                    <option key={st.id} value={st.id}>&rarr; {st.name}</option>
                  ))}
                </select>
              </div>

              {/* Clear selection */}
              <button
                type="button"
                onClick={() => setSelectedPieceIds(new Set())}
                className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            </div>
          )}

        </div>
      </div>

      {/* VIEW 1: UNIT CARDS GRID */}
      {trackerDisplayMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPieces.map(({ item, piece }) => {
            const isSelected = selectedPieceIds.has(piece.id);
            const isAltering = piece.currentStage === 'altering' || piece.status === 'needs_alter';
            const stageDef = WORKFLOW_STAGES.find(s => s.id === piece.currentStage) || WORKFLOW_STAGES[0];
            const nextStageId = getNextStage(piece.currentStage);
            const nextStageDef = nextStageId ? WORKFLOW_STAGES.find(s => s.id === nextStageId) : null;

            return (
              <div
                key={piece.id}
                id={`piece-card-${piece.id}`}
                className={`rounded-2xl border transition-all p-4 relative flex flex-col justify-between ${
                  isSelected 
                    ? 'ring-2 ring-blue-600 bg-blue-50/40 border-blue-300' 
                    : isAltering
                    ? 'bg-rose-50/50 border-rose-300 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Card Top: Checkbox, Piece Number & Status */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePieceSelection(piece.id)}
                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <div className="flex items-center space-x-1.5">
                        <span className="text-sm font-black font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-300">
                          #{piece.pieceNumber}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-600 truncate max-w-[120px]">
                          {piece.pieceTag}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    {isAltering ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white flex items-center space-x-1 shadow-xs animate-pulse">
                        <Wrench className="h-2.5 w-2.5" />
                        <span>Altering</span>
                      </span>
                    ) : piece.currentStage === 'prepare_dispatch' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white flex items-center space-x-1">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        <span>Ready</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Pass / OK
                      </span>
                    )}
                  </div>

                  {/* Party & Fabric Info */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="font-semibold truncate">{piece.partyName}</span>
                      <span className="font-mono text-slate-500">Job: {piece.jobNo}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-800">{piece.fabricType}</span>
                      <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: piece.colorHex || '#3b82f6' }}
                        />
                        <span>{piece.fabricColor}</span>
                      </span>
                    </div>
                  </div>

                  {/* Current Stage Pill */}
                  <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase">Current Stage</div>
                    <div className="flex items-center space-x-1.5 mt-0.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-extrabold ${stageDef.color.badge}`}>
                        {stageDef.name}
                      </span>
                    </div>

                    {/* Defect Callout if in Altering */}
                    {isAltering && piece.defectReason && (
                      <div className="mt-2 p-1.5 rounded-lg bg-rose-100/90 border border-rose-300 text-rose-950 text-[11px] font-medium flex items-start space-x-1.5">
                        <AlertCircle className="h-3.5 w-3.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Defect Note:</span> {piece.defectReason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col space-y-2">
                  
                  {/* Primary Context Action Button */}
                  {isAltering ? (
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        onClick={() => handleMoveSinglePiece(item, piece, 'folding', 'repaired', 'Alteration fixed')}
                        className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-xs transition-colors"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        <span>Fixed &rarr; Folding</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveSinglePiece(item, piece, 'embroidery', 'good', 'Sent back to embroidery')}
                        className="py-1.5 px-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold text-xs transition-colors"
                        title="Return to Embroidery"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      {/* Send to Altering Button */}
                      <button
                        type="button"
                        onClick={() => handleOpenDefectDialog(item, piece)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold text-xs flex items-center justify-center space-x-1 border border-rose-300 transition-colors"
                        title="Found defect on this piece? Send to Altering"
                      >
                        <Wrench className="h-3.5 w-3.5 text-rose-600" />
                        <span>Needs Altering</span>
                      </button>

                      {/* Advance Stage Button */}
                      {nextStageDef && (
                        <button
                          type="button"
                          onClick={() => handleMoveSinglePiece(
                            item, 
                            piece, 
                            nextStageId!, 
                            nextStageId === 'prepare_dispatch' ? 'completed' : 'good'
                          )}
                          className="flex-1 py-1.5 px-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-xs transition-colors"
                          title={`Advance to ${nextStageDef.shortName}`}
                        >
                          <span className="truncate">&rarr; {nextStageDef.shortName}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Stage Selector Dropdown */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Move to:</span>
                    <select
                      value={piece.currentStage}
                      onChange={(e) => handleMoveSinglePiece(
                        item, 
                        piece, 
                        e.target.value as WorkflowStageId, 
                        e.target.value === 'altering' ? 'needs_alter' : e.target.value === 'prepare_dispatch' ? 'completed' : 'good'
                      )}
                      className="px-2 py-0.5 rounded border border-slate-300 bg-white text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      {WORKFLOW_STAGES.map(st => (
                        <option key={st.id} value={st.id}>{st.stepNumber}. {st.shortName}</option>
                      ))}
                    </select>
                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: 10-STAGE COLUMNS / SWIMLANES */}
      {trackerDisplayMode === 'columns' && (
        <div className="overflow-x-auto pb-6">
          <div className="flex space-x-4 min-w-[1400px]">
            {WORKFLOW_STAGES.map(stage => {
              const piecesInStage = filteredPieces.filter(p => p.piece.currentStage === stage.id);
              const isAlteringColumn = stage.id === 'altering';

              return (
                <div
                  key={stage.id}
                  className={`w-72 rounded-2xl border flex flex-col shrink-0 overflow-hidden ${
                    isAlteringColumn ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50/80 border-slate-200'
                  }`}
                >
                  {/* Column Header */}
                  <div className={`p-3 border-b flex items-center justify-between ${
                    isAlteringColumn ? 'bg-rose-100/90 border-rose-300 text-rose-950' : 'bg-white border-slate-200 text-slate-800'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-xs">{stage.name}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                      isAlteringColumn ? 'bg-rose-600 text-white' : 'bg-slate-200 text-slate-800'
                    }`}>
                      {piecesInStage.length}
                    </span>
                  </div>

                  {/* Pieces List in Column */}
                  <div className="p-3 space-y-2.5 flex-1 max-h-[600px] overflow-y-auto">
                    {piecesInStage.length === 0 ? (
                      <div className="text-center py-8 text-xs text-slate-400">
                        No pieces in this stage
                      </div>
                    ) : (
                      piecesInStage.map(({ item, piece }) => {
                        const isSelected = selectedPieceIds.has(piece.id);

                        return (
                          <div
                            key={piece.id}
                            className={`p-2.5 rounded-xl border bg-white shadow-xs transition-all ${
                              isSelected ? 'ring-2 ring-blue-500 border-blue-300' : 'border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => togglePieceSelection(piece.id)}
                                  className="h-3.5 w-3.5 rounded text-blue-600"
                                />
                                <span className="text-xs font-black font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-300">
                                  #{piece.pieceNumber}
                                </span>
                                <span className="text-[11px] font-bold text-slate-800 truncate max-w-[90px]">
                                  {piece.fabricType}
                                </span>
                              </div>

                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20"
                                style={{ backgroundColor: piece.colorHex || '#3b82f6' }}
                                title={piece.fabricColor}
                              />
                            </div>

                            <div className="mt-1.5 text-[11px] text-slate-500 flex items-center justify-between">
                              <span className="truncate">{piece.partyName}</span>
                              <span className="font-mono text-[10px]">Job: {piece.jobNo}</span>
                            </div>

                            {/* Defect note if altering */}
                            {isAlteringColumn && piece.defectReason && (
                              <div className="mt-1.5 p-1 rounded bg-rose-100 text-[10px] text-rose-900 font-medium">
                                ⚠️ {piece.defectReason}
                              </div>
                            )}

                            {/* Quick Action buttons */}
                            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                              {stage.id !== 'altering' ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenDefectDialog(item, piece)}
                                  className="px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold border border-rose-200"
                                >
                                  Alter
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleMoveSinglePiece(item, piece, 'folding', 'repaired', 'Alteration fixed')}
                                  className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold"
                                >
                                  Fixed &rarr;
                                </button>
                              )}

                              {getNextStage(stage.id) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = getNextStage(stage.id);
                                    if (next) handleMoveSinglePiece(item, piece, next, next === 'prepare_dispatch' ? 'completed' : 'good');
                                  }}
                                  className="px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold"
                                >
                                  Next &rarr;
                                </button>
                              )}
                            </div>

                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* DEFECT & ALTERATION ROUTING MODAL */}
      {isDefectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700">
                <Wrench className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {batchDefectMode ? `Send ${selectedPieceIds.size} Pieces to Altering` : `Send Piece #${defectTargetPiece?.piece.pieceNumber} to Altering`}
                </h3>
                <p className="text-xs text-slate-500">
                  Select defect reason &amp; route to Stage 8 (Altering Process)
                </p>
              </div>
            </div>

            {/* Context piece info if single */}
            {!batchDefectMode && defectTargetPiece && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Piece Tag:</span>
                  <span className="font-mono font-bold text-slate-800">{defectTargetPiece.piece.pieceTag}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party &amp; Job:</span>
                  <span className="font-semibold text-slate-800">{defectTargetPiece.piece.partyName} (Job: {defectTargetPiece.piece.jobNo})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fabric &amp; Color:</span>
                  <span className="font-semibold text-slate-800">{defectTargetPiece.piece.fabricType} - {defectTargetPiece.piece.fabricColor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stage:</span>
                  <span className="font-bold text-purple-700">{defectTargetPiece.piece.currentStage}</span>
                </div>
              </div>
            )}

            {/* Defect Reasons List */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Select Defect Reason:
              </label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {COMMON_DEFECT_REASONS.map(reason => (
                  <label
                    key={reason}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      defectReason === reason 
                        ? 'bg-rose-50 border-rose-400 text-rose-950 font-bold' 
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="defectReasonRadio"
                      checked={defectReason === reason}
                      onChange={() => setDefectReason(reason)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Notes / Specific Defect Details */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Additional Notes / Location on Fabric (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g. Flare border left corner missing 4 zari stitches..."
                value={customDefectNote}
                onChange={(e) => setCustomDefectNote(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsDefectModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSendToAltering}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/30 transition-all flex items-center space-x-1.5"
              >
                <Wrench className="h-4 w-4" />
                <span>Confirm &amp; Route to Altering</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
