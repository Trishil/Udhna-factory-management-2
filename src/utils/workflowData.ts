import { WorkflowItem, WorkflowStageId, OrderSlip, OrderSlipColorRow, IndividualPieceUnit } from '../types';

export interface StageDefinition {
  id: WorkflowStageId;
  stepNumber: number;
  name: string;
  shortName: string;
  description: string;
  color: {
    bg: string;
    border: string;
    text: string;
    badge: string;
    headerBg: string;
  };
  iconName: string;
  isInspectionPoint?: boolean;
}

export const WORKFLOW_STAGES: StageDefinition[] = [
  {
    id: 'fabric',
    stepNumber: 1,
    name: '1. Fabric',
    shortName: 'Fabric Inward',
    description: 'Raw fabric roll inward, lot number generated & quality check of grey fabric',
    color: {
      bg: 'bg-slate-50',
      border: 'border-slate-300',
      text: 'text-slate-800',
      badge: 'bg-slate-200 text-slate-800',
      headerBg: 'bg-slate-100'
    },
    iconName: 'Scroll'
  },
  {
    id: 'chalan',
    stepNumber: 2,
    name: '2. Chalan (Slip)',
    shortName: 'Chalan Slip',
    description: 'Production job card & delivery challan slip issued with design specs',
    color: {
      bg: 'bg-blue-50/60',
      border: 'border-blue-200',
      text: 'text-blue-900',
      badge: 'bg-blue-100 text-blue-800',
      headerBg: 'bg-blue-100/70'
    },
    iconName: 'FileText'
  },
  {
    id: 'inspection',
    stepNumber: 3,
    name: '3. Inspection (Good / Return)',
    shortName: 'Fabric Inspection',
    description: 'Initial quality check — Accept (Good) to proceed or Return (Bad) to vendor',
    color: {
      bg: 'bg-amber-50/60',
      border: 'border-amber-300',
      text: 'text-amber-950',
      badge: 'bg-amber-100 text-amber-900',
      headerBg: 'bg-amber-100/70'
    },
    iconName: 'CheckSquare',
    isInspectionPoint: true
  },
  {
    id: 'stitching_patta',
    stepNumber: 4,
    name: '4. Stitching Patta',
    shortName: 'Patta Stitching',
    description: 'Stitching border / patta attachment for framing on embroidery machine',
    color: {
      bg: 'bg-cyan-50/60',
      border: 'border-cyan-200',
      text: 'text-cyan-900',
      badge: 'bg-cyan-100 text-cyan-800',
      headerBg: 'bg-cyan-100/70'
    },
    iconName: 'Scissors'
  },
  {
    id: 'embroidery',
    stepNumber: 5,
    name: '5. Embroidery',
    shortName: 'Embroidery Work',
    description: 'Design machine processing (Zari, Cording, Sequin, Thread stitching)',
    color: {
      bg: 'bg-purple-50/60',
      border: 'border-purple-200',
      text: 'text-purple-900',
      badge: 'bg-purple-100 text-purple-800',
      headerBg: 'bg-purple-100/70'
    },
    iconName: 'Sparkles'
  },
  {
    id: 'dhaga_cutting',
    stepNumber: 6,
    name: '6. Dhaga Cutting',
    shortName: 'Dhaga Cutting',
    description: 'Trimming jump threads, thread clips and manual cleanup',
    color: {
      bg: 'bg-orange-50/60',
      border: 'border-orange-200',
      text: 'text-orange-900',
      badge: 'bg-orange-100 text-orange-800',
      headerBg: 'bg-orange-100/70'
    },
    iconName: 'ScissorsLineDashed'
  },
  {
    id: 'inspection_alter',
    stepNumber: 7,
    name: '7. Inspection for Alter',
    shortName: 'Alter Inspection',
    description: 'Post-embroidery checking — Pass to Folding or route to Altering Process',
    color: {
      bg: 'bg-yellow-50/60',
      border: 'border-yellow-300',
      text: 'text-yellow-950',
      badge: 'bg-yellow-100 text-yellow-900',
      headerBg: 'bg-yellow-100/70'
    },
    iconName: 'ShieldAlert',
    isInspectionPoint: true
  },
  {
    id: 'altering',
    stepNumber: 8,
    name: '8. Altering Process',
    shortName: 'Altering / Rework',
    description: 'Manual repair of missed stitches, thread breakage, sequin re-fix',
    color: {
      bg: 'bg-rose-50/60',
      border: 'border-rose-300',
      text: 'text-rose-950',
      badge: 'bg-rose-100 text-rose-900',
      headerBg: 'bg-rose-100/70'
    },
    iconName: 'Wrench'
  },
  {
    id: 'folding',
    stepNumber: 9,
    name: '9. Folding',
    shortName: 'Folding & Press',
    description: 'Ironing, neat folding, tag placement & poly wrapping',
    color: {
      bg: 'bg-teal-50/60',
      border: 'border-teal-200',
      text: 'text-teal-900',
      badge: 'bg-teal-100 text-teal-800',
      headerBg: 'bg-teal-100/70'
    },
    iconName: 'Layers'
  },
  {
    id: 'prepare_dispatch',
    stepNumber: 10,
    name: '10. Prepare for Dispatch',
    shortName: 'Ready for Dispatch',
    description: 'Master carton packing, bundle numbering & handover to logistics',
    color: {
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-300',
      text: 'text-emerald-950',
      badge: 'bg-emerald-100 text-emerald-900 font-bold',
      headerBg: 'bg-emerald-100/80'
    },
    iconName: 'PackageCheck'
  }
];

export const INITIAL_WORKFLOW_ITEMS: WorkflowItem[] = [];

export const DEFAULT_ORDER_SLIPS: OrderSlip[] = [];

const LOCAL_STORAGE_WORKFLOW_KEY = 'factory_fabric_workflow_items_v1';
export const LOCAL_STORAGE_METADATA_TEMPLATE_KEY = 'factory_workflow_metadata_template_keys_v1';
export const LOCAL_STORAGE_FABRIC_TYPES_KEY = 'factory_workflow_fabric_types_v1';
export const LOCAL_STORAGE_ORDER_SLIPS_KEY = 'factory_order_slips_v1';

// Initial / Standard Fabric Types specified by factory workflow
export const DEFAULT_FABRIC_TYPES = [
  'Kali',
  'Kurti',
  'Lass',
  'Dupatta',
  'Blouse front',
  'Blouse Back',
  'Lace',
  'Odhani',
  'Suit',
  'Silk Georgette (60gm)',
  'Cotton Cambric 60s',
  'Organza Pure',
  'Micro Velvet 9000',
  'Japan Satin'
];

export function getStoredOrderSlips(): OrderSlip[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_ORDER_SLIPS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored order slips:', e);
  }
  return DEFAULT_ORDER_SLIPS;
}

/**
 * Finds all WorkflowItems that belong or match an OrderSlip
 */
export function getOrderSlipMatchingItems(slip: OrderSlip, items: WorkflowItem[]): WorkflowItem[] {
  if (!slip || !items || !Array.isArray(items)) return [];
  
  const slipJob = (slip.jobNo || '').trim().toLowerCase();
  const slipParty = (slip.partyName || '').trim().toLowerCase();
  const slipChalan = (slip.chalanNo || '').trim().toLowerCase();

  return items.filter(it => {
    // 1. Direct ID reference
    if (it.orderSlipId && it.orderSlipId === slip.id) return true;

    const itJob = (it.jobNo || it.lotNumber || '').trim().toLowerCase();
    const itParty = (it.partyName || it.partyOrClientName || '').trim().toLowerCase();
    const itChalan = (it.chalanNumber || '').trim().toLowerCase();

    // 2. Exact Job & Party match
    if (slipJob && itJob && (itJob === slipJob || itJob.includes(slipJob) || slipJob.includes(itJob))) {
      if (!slipParty || !itParty || itParty === slipParty || itParty.includes(slipParty) || slipParty.includes(itParty)) {
        return true;
      }
    }

    // 3. Exact Chalan match
    if (slipChalan && itChalan && slipChalan === itChalan) {
      return true;
    }

    return false;
  });
}

/**
 * Calculates live completed pieces count for an OrderSlip from individual pieces and workflow items
 */
export function getOrderSlipCompletedPieces(slip: OrderSlip, items: WorkflowItem[]): number {
  if (!slip) return 0;
  const matching = getOrderSlipMatchingItems(slip, items);
  
  if (matching.length === 0) {
    return slip.piecesCompleted || 0;
  }

  let completedCount = 0;
  matching.forEach(it => {
    if (it.individualPieces && Array.isArray(it.individualPieces) && it.individualPieces.length > 0) {
      const doneInPieceTracker = it.individualPieces.filter(p => 
        p.currentStage === 'prepare_dispatch' || p.status === 'completed'
      ).length;
      completedCount += doneInPieceTracker;
    } else if (it.stagePieceBreakdown && typeof it.stagePieceBreakdown.prepare_dispatch === 'number') {
      completedCount += it.stagePieceBreakdown.prepare_dispatch;
    } else if (it.currentStage === 'prepare_dispatch') {
      completedCount += (it.pieces ?? it.quantity ?? 0);
    } else {
      completedCount += (it.piecesCompleted || 0);
    }
  });

  return completedCount;
}

/**
 * Calculates live distribution across all 10 workflow stages for an OrderSlip
 */
export function getOrderSlipStageDistribution(slip: OrderSlip, items: WorkflowItem[]): Record<WorkflowStageId, number> {
  const distribution: Record<WorkflowStageId, number> = {
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

  if (!slip) return distribution;
  const matching = getOrderSlipMatchingItems(slip, items);

  if (matching.length === 0) {
    const completed = slip.piecesCompleted || 0;
    const remaining = Math.max(0, (slip.totalPcs || 0) - completed);
    distribution.prepare_dispatch = completed;
    distribution.embroidery = remaining;
    return distribution;
  }

  matching.forEach(it => {
    if (it.individualPieces && Array.isArray(it.individualPieces) && it.individualPieces.length > 0) {
      it.individualPieces.forEach(p => {
        if (p.currentStage in distribution) {
          distribution[p.currentStage] += 1;
        }
      });
    } else {
      const breakdown = getItemStageBreakdown(it);
      WORKFLOW_STAGES.forEach(s => {
        distribution[s.id] += (breakdown[s.id] || 0);
      });
    }
  });

  return distribution;
}

/**
 * Calculates completion and stage distribution for a single colorway row in an OrderSlip
 */
export function getOrderSlipColorRowBreakdown(
  slip: OrderSlip,
  colorRow: OrderSlipColorRow,
  items: WorkflowItem[]
): {
  totalOrdered: number;
  completed: number;
  inAltering: number;
  inProduction: number;
  stageBreakdown: Record<WorkflowStageId, number>;
} {
  const totalOrdered = Object.values(colorRow.fabricQuantities || {}).reduce<number>(
    (sum, q) => sum + (Number(q) || 0),
    0
  );

  const stageBreakdown: Record<WorkflowStageId, number> = {
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

  const matching = getOrderSlipMatchingItems(slip, items);
  const colorMatching = matching.filter(it => {
    const rowName = (colorRow.colorName || '').toLowerCase().trim();
    const itColor = (it.fabricColor || '').toLowerCase().trim();
    if (itColor && rowName && (itColor === rowName || rowName.includes(itColor) || itColor.includes(rowName))) {
      return true;
    }
    if (colorRow.colorHex && it.colorSwatchHex && colorRow.colorHex.toLowerCase() === it.colorSwatchHex.toLowerCase()) {
      return true;
    }
    if (colorRow.designNumber && it.designNumber && colorRow.designNumber.toLowerCase().trim() === it.designNumber.toLowerCase().trim()) {
      return true;
    }
    return false;
  });

  if (colorMatching.length === 0) {
    return {
      totalOrdered,
      completed: 0,
      inAltering: 0,
      inProduction: totalOrdered,
      stageBreakdown
    };
  }

  let completed = 0;
  let inAltering = 0;

  colorMatching.forEach(it => {
    if (it.individualPieces && Array.isArray(it.individualPieces) && it.individualPieces.length > 0) {
      it.individualPieces.forEach(p => {
        if (p.currentStage in stageBreakdown) {
          stageBreakdown[p.currentStage] += 1;
        }
        if (p.currentStage === 'prepare_dispatch' || p.status === 'completed') {
          completed++;
        } else if (p.currentStage === 'altering' || p.status === 'needs_alter') {
          inAltering++;
        }
      });
    } else {
      const brk = getItemStageBreakdown(it);
      WORKFLOW_STAGES.forEach(s => {
        stageBreakdown[s.id] += (brk[s.id] || 0);
      });
      completed += (brk.prepare_dispatch || 0);
      inAltering += (brk.altering || 0);
    }
  });

  const inProduction = Math.max(0, totalOrdered - completed - inAltering);

  return {
    totalOrdered,
    completed,
    inAltering,
    inProduction,
    stageBreakdown
  };
}

/**
 * Synchronizes all OrderSlips with live WorkflowItems & Piece data
 */
export function syncOrderSlipsWithWorkflowItems(slips: OrderSlip[], items: WorkflowItem[]): OrderSlip[] {
  if (!slips || !Array.isArray(slips)) return [];

  return slips.map(slip => {
    const liveCompleted = getOrderSlipCompletedPieces(slip, items);
    const totalPcs = slip.totalPcs || slip.colorRows.reduce((sum, r) => 
      sum + Object.values(r.fabricQuantities || {}).reduce<number>((a, b) => a + (Number(b) || 0), 0), 0
    );

    const isFullyDone = liveCompleted >= totalPcs && totalPcs > 0;

    return {
      ...slip,
      piecesCompleted: liveCompleted,
      totalPcs,
      status: isFullyDone ? 'completed' : 'in_progress',
      updatedAt: new Date().toISOString()
    };
  });
}

export function saveStoredOrderSlips(slips: OrderSlip[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_ORDER_SLIPS_KEY, JSON.stringify(slips));
  } catch (e) {
    console.error('Error saving order slips:', e);
  }
}

/**
 * Calculates stage-by-stage distribution of pieces for an item
 */
export function getItemStageBreakdown(item: WorkflowItem): Record<WorkflowStageId, number> {
  const result: Record<WorkflowStageId, number> = {
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

  const totalPieces = item.pieces ?? item.quantity;

  if (item.stagePieceBreakdown && Object.keys(item.stagePieceBreakdown).length > 0) {
    let sumAssigned = 0;
    for (const [sKey, count] of Object.entries(item.stagePieceBreakdown)) {
      if (sKey in result && typeof count === 'number') {
        result[sKey as WorkflowStageId] = Math.max(0, count);
        sumAssigned += count;
      }
    }
    // If not all accounted for, place difference in currentStage
    if (sumAssigned < totalPieces) {
      result[item.currentStage] = (result[item.currentStage] || 0) + (totalPieces - sumAssigned);
    }
    return result;
  }

  // Fallback calculation:
  if (item.currentStage === 'prepare_dispatch') {
    result.prepare_dispatch = totalPieces;
  } else {
    const completed = Math.min(totalPieces, item.piecesCompleted || 0);
    const remaining = Math.max(0, totalPieces - completed);
    result.prepare_dispatch = completed;
    result[item.currentStage] = remaining;
  }

  return result;
}

export function getStoredFabricTypes(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FABRIC_TYPES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return Array.from(new Set([...DEFAULT_FABRIC_TYPES, ...parsed]));
      }
    }
  } catch (e) {
    console.error('Error loading stored fabric types:', e);
  }
  return DEFAULT_FABRIC_TYPES;
}

export function saveStoredFabricTypes(types: string[]): void {
  try {
    const clean = Array.from(new Set(types.map(t => t.trim()).filter(Boolean)));
    localStorage.setItem(LOCAL_STORAGE_FABRIC_TYPES_KEY, JSON.stringify(clean));
  } catch (e) {
    console.error('Error saving fabric types:', e);
  }
}

export function addNewFabricType(newType: string): string[] {
  const current = getStoredFabricTypes();
  const trimmed = newType.trim();
  if (trimmed && !current.includes(trimmed)) {
    const updated = [...current, trimmed];
    saveStoredFabricTypes(updated);
    return updated;
  }
  return current;
}

// Default suggested / popular metadata keys for textile and factory production
export const SUGGESTED_METADATA_KEYS = [
  'Storage Location',
  'Rack / Shelf #',
  'Bin Number',
  'Roll Barcode / SKU',
  'Stitch Density',
  'Dye Bath Lot #',
  'Roll Diameter (cm)',
  'Pattern Repeat (cm)',
  'Machine Stitch Count',
  'Carton Box #'
];

export const DEFAULT_PERSISTENT_METADATA_KEYS = [
  'Storage Location',
  'Rack / Shelf #'
];

export function getStoredMetadataTemplateKeys(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_METADATA_TEMPLATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored metadata template keys:', e);
  }
  return DEFAULT_PERSISTENT_METADATA_KEYS;
}

export function saveStoredMetadataTemplateKeys(keys: string[]): void {
  try {
    // Filter unique, trimmed non-empty keys
    const cleanKeys = Array.from(new Set(keys.map(k => k.trim()).filter(Boolean)));
    localStorage.setItem(LOCAL_STORAGE_METADATA_TEMPLATE_KEY, JSON.stringify(cleanKeys));
  } catch (e) {
    console.error('Error saving metadata template keys:', e);
  }
}

/**
 * When a user adds/saves any custom metadata keys on any design,
 * this helper automatically merges new keys into persistent template keys
 * so they are immediately available and persistent for future designs!
 */
export function recordMetadataKeysUsed(keys: string[]): void {
  try {
    const existing = getStoredMetadataTemplateKeys();
    const cleanNew = keys.map(k => k.trim()).filter(Boolean);
    const merged = Array.from(new Set([...existing, ...cleanNew]));
    saveStoredMetadataTemplateKeys(merged);
  } catch (e) {
    console.error('Error recording metadata keys:', e);
  }
}

export function getStoredWorkflowItems(): WorkflowItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_WORKFLOW_KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored workflow items:', e);
  }
  return INITIAL_WORKFLOW_ITEMS;
}

export function saveStoredWorkflowItems(items: WorkflowItem[]): void {
  try {
    if (Array.isArray(items)) {
      localStorage.setItem(LOCAL_STORAGE_WORKFLOW_KEY, JSON.stringify(items));
    }
  } catch (e) {
    console.error('Error saving workflow items:', e);
  }
}

export function mergeWorkflowItems(current: WorkflowItem[], incoming: WorkflowItem[]): WorkflowItem[] {
  if (!incoming || incoming.length === 0) return current || [];

  const currentMap = new Map<string, WorkflowItem>();
  for (const item of (current || [])) {
    const key = (item.lotNumber || item.jobNo || item.id || '').trim().toLowerCase();
    if (key) currentMap.set(key, item);
  }

  const seenKeys = new Set<string>();
  const mergedList: WorkflowItem[] = [];

  for (const sheetItem of incoming) {
    const key = (sheetItem.lotNumber || sheetItem.jobNo || sheetItem.id || '').trim().toLowerCase();
    seenKeys.add(key);

    if (currentMap.has(key)) {
      const existing = currentMap.get(key)!;
      const validExistingPhotos = (existing.photos || []).filter(p => p.url && p.url.startsWith('http'));
      const validSheetPhotos = (sheetItem.photos || []).filter(p => p.url && p.url.startsWith('http'));
      const validExistingImage = (existing.designImage && existing.designImage.startsWith('http') && !existing.designImage.includes('unsplash.com')) ? existing.designImage : undefined;
      const validSheetImage = (sheetItem.designImage && sheetItem.designImage.startsWith('http') && !sheetItem.designImage.includes('unsplash.com')) ? sheetItem.designImage : undefined;

      const allPhotosMap = new Map<string, any>();
      for (const p of [...validExistingPhotos, ...validSheetPhotos]) {
        if (p.url) allPhotosMap.set(p.url, p);
      }
      const combinedPhotos = Array.from(allPhotosMap.values());
      const chosenImage = validSheetImage || validExistingImage || combinedPhotos[0]?.url || undefined;

      mergedList.push({
        ...sheetItem,
        photos: combinedPhotos,
        designImage: chosenImage,
        stageHistory: (sheetItem.stageHistory && sheetItem.stageHistory.length >= (existing.stageHistory?.length || 0))
          ? sheetItem.stageHistory
          : (existing.stageHistory || sheetItem.stageHistory || []),
        lastSyncedWithFirebase: new Date().toISOString()
      });
    } else {
      mergedList.push(sheetItem);
    }
  }

  // Preserve any local/Firestore item created recently that hasn't appeared in the Google Sheet fetch yet
  for (const item of (current || [])) {
    const key = (item.lotNumber || item.jobNo || item.id || '').trim().toLowerCase();
    if (key && !seenKeys.has(key)) {
      mergedList.push(item);
    }
  }

  return mergedList;
}

export function mergeOrderSlips(current: OrderSlip[], incoming: OrderSlip[]): OrderSlip[] {
  const map = new Map<string, OrderSlip>();
  for (const slip of incoming) {
    const key = (slip.jobNo || slip.id || '').trim().toLowerCase();
    if (key) map.set(key, slip);
  }
  for (const slip of current) {
    const key = (slip.jobNo || slip.id || '').trim().toLowerCase();
    if (key && !map.has(key)) {
      map.set(key, slip);
    }
  }
  return Array.from(map.values());
}

export function getNextStage(currentStage: WorkflowStageId): WorkflowStageId | null {
  const stageOrder: WorkflowStageId[] = [
    'fabric',
    'chalan',
    'inspection',
    'stitching_patta',
    'embroidery',
    'dhaga_cutting',
    'inspection_alter',
    'altering',
    'folding',
    'prepare_dispatch'
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex >= 0 && currentIndex < stageOrder.length - 1) {
    return stageOrder[currentIndex + 1];
  }
  return null;
}

export function getPreviousStage(currentStage: WorkflowStageId): WorkflowStageId | null {
  const stageOrder: WorkflowStageId[] = [
    'fabric',
    'chalan',
    'inspection',
    'stitching_patta',
    'embroidery',
    'dhaga_cutting',
    'inspection_alter',
    'altering',
    'folding',
    'prepare_dispatch'
  ];

  const currentIndex = stageOrder.indexOf(currentStage);
  if (currentIndex > 0) {
    return stageOrder[currentIndex - 1];
  }
  return null;
}

/**
 * Derives or initializes the exact array of IndividualPieceUnits for a given WorkflowItem.
 * Handles cases like: 20 pieces total, 19 in Embroidery, 1 in Altering (Rework).
 */
export function getOrGenerateIndividualPieces(item: WorkflowItem): IndividualPieceUnit[] {
  const totalPieces = Math.max(1, Math.round(Number(item.pieces || item.quantity || 1)));

  // If already generated and length matches, return existing
  if (item.individualPieces && Array.isArray(item.individualPieces) && item.individualPieces.length === totalPieces) {
    return item.individualPieces;
  }

  // Otherwise generate based on stagePieceBreakdown or currentStage
  const pieces: IndividualPieceUnit[] = [];
  const breakdown = item.stagePieceBreakdown || { [item.currentStage]: totalPieces };
  
  const stageOrder: WorkflowStageId[] = [
    'fabric',
    'chalan',
    'inspection',
    'stitching_patta',
    'embroidery',
    'dhaga_cutting',
    'inspection_alter',
    'altering',
    'folding',
    'prepare_dispatch'
  ];

  let pieceCounter = 1;

  for (const stage of stageOrder) {
    const stageCount = Math.round(Number(breakdown[stage]) || 0);
    for (let i = 0; i < stageCount && pieceCounter <= totalPieces; i++) {
      const isAltering = stage === 'altering';
      const isInspection = stage === 'inspection' || stage === 'inspection_alter';
      const isComplete = stage === 'prepare_dispatch';

      pieces.push({
        id: `${item.id}_p_${pieceCounter}`,
        parentLotId: item.id,
        lotNumber: item.lotNumber,
        jobNo: item.jobNo || item.lotNumber,
        pieceNumber: pieceCounter,
        pieceTag: `${item.jobNo || item.lotNumber}-${(item.fabricType || 'PC').slice(0, 4).toUpperCase()}-#${String(pieceCounter).padStart(2, '0')}`,
        partyName: item.partyName || item.partyOrClientName || 'Standard Client',
        designNumber: item.designNumber,
        fabricType: item.fabricType,
        fabricColor: item.fabricColor || 'Default',
        colorHex: item.colorSwatchHex || '#3b82f6',
        currentStage: stage,
        status: isAltering ? 'needs_alter' : isComplete ? 'completed' : isInspection ? 'needs_alter' : 'good',
        defectReason: isAltering ? (item.alterationReason || 'Defect: Stitching/Thread Issue (Sent to Altering)') : undefined,
        lastUpdated: new Date().toISOString(),
        history: [
          {
            stage: stage,
            status: isAltering ? 'Sent to Altering' : 'In Production',
            timestamp: new Date().toISOString(),
            note: isAltering ? 'Flagged during quality check' : 'Initial batch entry'
          }
        ]
      });
      pieceCounter++;
    }
  }

  // Fill any remaining pieces up to totalPieces
  while (pieceCounter <= totalPieces) {
    pieces.push({
      id: `${item.id}_p_${pieceCounter}`,
      parentLotId: item.id,
      lotNumber: item.lotNumber,
      jobNo: item.jobNo || item.lotNumber,
      pieceNumber: pieceCounter,
      pieceTag: `${item.jobNo || item.lotNumber}-${(item.fabricType || 'PC').slice(0, 4).toUpperCase()}-#${String(pieceCounter).padStart(2, '0')}`,
      partyName: item.partyName || item.partyOrClientName || 'Standard Client',
      designNumber: item.designNumber,
      fabricType: item.fabricType,
      fabricColor: item.fabricColor || 'Default',
      colorHex: item.colorSwatchHex || '#3b82f6',
      currentStage: item.currentStage,
      status: item.currentStage === 'altering' ? 'needs_alter' : 'good',
      lastUpdated: new Date().toISOString(),
      history: [
        {
          stage: item.currentStage,
          status: 'In Production',
          timestamp: new Date().toISOString()
        }
      ]
    });
    pieceCounter++;
  }

  return pieces;
}

/**
 * Updates a single piece's stage (e.g. piece #20 moved from Embroidery to Altering),
 * updates its status/defect reason, recalculates the parent item's stagePieceBreakdown,
 * and returns the updated WorkflowItem.
 */
export function updateIndividualPieceStage(
  item: WorkflowItem,
  pieceId: string,
  targetStage: WorkflowStageId,
  status: 'good' | 'needs_alter' | 'in_rework' | 'repaired' | 'rejected' | 'completed' = 'good',
  defectReason?: string,
  note?: string
): WorkflowItem {
  const currentPieces = getOrGenerateIndividualPieces(item);
  const now = new Date().toISOString();

  const updatedPieces = currentPieces.map(p => {
    if (p.id === pieceId) {
      const history = p.history || [];
      return {
        ...p,
        currentStage: targetStage,
        status: status,
        defectReason: defectReason !== undefined ? defectReason : (targetStage === 'altering' ? 'Defect flagged' : undefined),
        alterNotes: note || p.alterNotes,
        lastUpdated: now,
        history: [
          ...history,
          {
            stage: targetStage,
            status: status === 'needs_alter' ? `Altering: ${defectReason || 'Rework'}` : `Moved to ${targetStage}`,
            timestamp: now,
            note: note || defectReason
          }
        ]
      };
    }
    return p;
  });

  // Recalculate stage breakdown
  const newBreakdown: Partial<Record<WorkflowStageId, number>> = {};
  updatedPieces.forEach(p => {
    newBreakdown[p.currentStage] = (newBreakdown[p.currentStage] || 0) + 1;
  });

  // Calculate dominant stage
  let dominantStage: WorkflowStageId = targetStage;
  let maxCount = -1;
  Object.entries(newBreakdown).forEach(([st, cnt]) => {
    if ((cnt || 0) > maxCount) {
      maxCount = cnt || 0;
      dominantStage = st as WorkflowStageId;
    }
  });

  return {
    ...item,
    individualPieces: updatedPieces,
    stagePieceBreakdown: newBreakdown,
    currentStage: dominantStage,
    piecesCompleted: newBreakdown['prepare_dispatch'] || 0
  };
}

/**
 * Batch updates multiple pieces to a target stage (e.g. advance 19 pieces from Embroidery to Dhaga Cutting)
 */
export function batchMoveIndividualPieces(
  item: WorkflowItem,
  pieceIds: string[],
  targetStage: WorkflowStageId,
  status: 'good' | 'needs_alter' | 'in_rework' | 'repaired' | 'rejected' | 'completed' = 'good',
  defectReason?: string
): WorkflowItem {
  const currentPieces = getOrGenerateIndividualPieces(item);
  const now = new Date().toISOString();
  const idSet = new Set(pieceIds);

  const updatedPieces = currentPieces.map(p => {
    if (idSet.has(p.id)) {
      const history = p.history || [];
      return {
        ...p,
        currentStage: targetStage,
        status: status,
        defectReason: defectReason !== undefined ? defectReason : (targetStage === 'altering' ? 'Defect flagged' : undefined),
        lastUpdated: now,
        history: [
          ...history,
          {
            stage: targetStage,
            status: status === 'needs_alter' ? `Altering: ${defectReason || 'Rework'}` : `Moved to ${targetStage}`,
            timestamp: now,
            note: defectReason
          }
        ]
      };
    }
    return p;
  });

  // Recalculate stage breakdown
  const newBreakdown: Partial<Record<WorkflowStageId, number>> = {};
  updatedPieces.forEach(p => {
    newBreakdown[p.currentStage] = (newBreakdown[p.currentStage] || 0) + 1;
  });

  // Calculate dominant stage
  let dominantStage: WorkflowStageId = targetStage;
  let maxCount = -1;
  Object.entries(newBreakdown).forEach(([st, cnt]) => {
    if ((cnt || 0) > maxCount) {
      maxCount = cnt || 0;
      dominantStage = st as WorkflowStageId;
    }
  });

  return {
    ...item,
    individualPieces: updatedPieces,
    stagePieceBreakdown: newBreakdown,
    currentStage: dominantStage,
    piecesCompleted: newBreakdown['prepare_dispatch'] || 0
  };
}

