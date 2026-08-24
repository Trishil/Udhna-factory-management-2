import { RawMaterial, SupplierPayable, OrderSlip, WorkflowItem } from '../types';

/**
 * Generates a clean, unique sequential Material ID (e.g. MAT-1001, MAT-1002)
 */
export function generateUniqueMaterialId(existingMaterials: RawMaterial[] = []): string {
  const numericIds = existingMaterials
    .map(m => {
      const match = m.id.match(/^mat-(\d+)$/i) || m.id.match(/^MAT-(\d+)$/i);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n): n is number => n !== null && !isNaN(n) && n < 100000); // Filter out timestamp IDs

  const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 1000;
  const nextNum = Math.max(1001, maxId + 1);
  return `MAT-${nextNum}`;
}

/**
 * Generates a unique Job Number (Folder / Parent Master Job No., e.g. JOB-2026-042 or 06/05)
 */
export function generateUniqueJobNo(existingSlips: OrderSlip[] = [], existingItems: WorkflowItem[] = []): string {
  const currentYear = new Date().getFullYear();
  const allJobStrings = new Set<string>();

  existingSlips.forEach(s => {
    if (s.jobNo) allJobStrings.add(s.jobNo.trim());
  });
  existingItems.forEach(i => {
    if (i.jobNo) allJobStrings.add(i.jobNo.trim());
  });

  // Check for sequential numbers in format JOB-YYYY-XXX or JOB-XXX
  let maxSeq = 0;
  allJobStrings.forEach(jobStr => {
    const match = jobStr.match(/JOB-(\d{4})-(\d+)/i) || jobStr.match(/JOB-(\d+)/i);
    if (match) {
      const num = parseInt(match[match.length - 1], 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = Math.max(existingSlips.length + existingItems.length + 1, maxSeq + 1);
  const formattedSeq = String(nextSeq).padStart(3, '0');
  const candidate = `JOB-${currentYear}-${formattedSeq}`;

  if (!allJobStrings.has(candidate)) {
    return candidate;
  }

  // Fallback with timestamp hash if collision
  return `JOB-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Generates a unique Inward Challan Number (e.g. CH-2026-101, CH-227)
 */
export function generateUniqueChalanNo(existingSlips: OrderSlip[] = [], existingItems: WorkflowItem[] = []): string {
  const currentYear = new Date().getFullYear();
  const allChallans = new Set<string>();

  existingSlips.forEach(s => {
    if (s.chalanNo) allChallans.add(s.chalanNo.trim());
  });
  existingItems.forEach(i => {
    if (i.chalanNumber) allChallans.add(i.chalanNumber.trim());
  });

  let maxNum = 200;
  allChallans.forEach(chStr => {
    const match = chStr.match(/CH-(\d{4})-(\d+)/i) || chStr.match(/CH-(\d+)/i) || chStr.match(/^(\d+)$/);
    if (match) {
      const num = parseInt(match[match.length - 1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });

  const nextNum = maxNum + 1;
  const candidate = `CH-${currentYear}-${nextNum}`;
  if (!allChallans.has(candidate)) {
    return candidate;
  }

  return `CH-${currentYear}-${Math.floor(100 + Math.random() * 900)}`;
}

/**
 * Generates a unique Design Number (e.g. DSG-115 or D.No 32)
 */
export function generateUniqueDesignNo(existingItems: WorkflowItem[] = []): string {
  let maxDNo = 100;
  existingItems.forEach(it => {
    const match = it.designNumber.match(/DSG-(\d+)/i) || it.designNumber.match(/D\.?\s*No\.?\s*(\d+)/i);
    if (match) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxDNo) {
        maxDNo = num;
      }
    }
  });

  return `DSG-${maxDNo + 1}`;
}

/**
 * Generates a unique Lot Number for a fabric branch under a master job (e.g. LOT-9045 or LOT-JOB042-01)
 */
export function generateUniqueLotNumber(jobNo?: string, fabricType?: string, existingItems: WorkflowItem[] = []): string {
  const randNum = Math.floor(1000 + Math.random() * 9000);
  if (jobNo && jobNo.startsWith('JOB-')) {
    const jobSuffix = jobNo.replace(/^JOB-/, '');
    const cleanFabric = (fabricType || 'FAB').slice(0, 4).toUpperCase();
    const candidate = `LOT-${jobSuffix}-${cleanFabric}`;
    const exists = existingItems.some(i => i.lotNumber === candidate);
    if (!exists) return candidate;
  }
  return `LOT-${randNum}`;
}

/**
 * Generates a clean unique piece tag (e.g. JOB-06/05-KALI-P01)
 */
export function generateUniquePieceTag(jobNo: string, fabricType: string, pieceNum: number): string {
  const cleanJob = (jobNo || 'JOB-01').replace(/[^a-zA-Z0-9/-]/g, '').toUpperCase();
  const cleanFab = (fabricType || 'FAB').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
  const padNum = String(pieceNum).padStart(2, '0');
  return `${cleanJob}-${cleanFab}-P${padNum}`;
}

/**
 * Generates a unique Batch / Purchase Lot ID (e.g. BATCH-20260822-8412)
 */
export function generateUniqueBatchId(prefix = 'BATCH'): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${yyyy}${mm}${dd}-${rand}`;
}

/**
 * Generates a unique Purchase Order / Supplier Payable Code (e.g. PO-IMP-8801)
 */
export function generateUniquePOCode(existingPayables: SupplierPayable[] = []): string {
  const nextNum = 8800 + existingPayables.length + 1;
  return `PO-IMP-${nextNum}`;
}

/**
 * Generates a unique Transaction ID (e.g. TX-9412)
 */
export function generateUniqueTransactionId(type: string = 'tx'): string {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `TX-${Date.now().toString().slice(-4)}${rand}`;
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  matchType: 'exact_code' | 'exact_name' | 'similar_name' | null;
  matchedMaterial: RawMaterial | null;
  reason: string | null;
}

/**
 * Detects if a material with the same SKU Code or similar name/specs already exists
 * to prevent double entry between Production, Inventory, and Finance tabs.
 */
export function checkMaterialDuplicate(
  name: string,
  code: string | undefined,
  category: string,
  existingMaterials: RawMaterial[],
  excludeMaterialId?: string
): DuplicateCheckResult {
  const cleanName = (name || '').trim().toLowerCase();
  const cleanCode = (code || '').trim().toUpperCase();
  const cleanCategory = (category || '').trim().toLowerCase();

  const candidateList = excludeMaterialId
    ? existingMaterials.filter(m => m.id !== excludeMaterialId)
    : existingMaterials;

  // 1. Exact Item/SKU Code Match
  if (cleanCode) {
    const codeMatch = candidateList.find(
      m => (m.code || '').trim().toUpperCase() === cleanCode
    );
    if (codeMatch) {
      return {
        isDuplicate: true,
        matchType: 'exact_code',
        matchedMaterial: codeMatch,
        reason: `Item code "${cleanCode}" already exists as "${codeMatch.name}" (ID: ${codeMatch.id}).`
      };
    }
  }

  // 2. Exact Name Match in same category
  if (cleanName) {
    const exactNameMatch = candidateList.find(
      m => m.name.trim().toLowerCase() === cleanName && 
           m.category.trim().toLowerCase() === cleanCategory
    );
    if (exactNameMatch) {
      return {
        isDuplicate: true,
        matchType: 'exact_name',
        matchedMaterial: exactNameMatch,
        reason: `Material "${exactNameMatch.name}" already exists in ${exactNameMatch.category} with ${exactNameMatch.currentStock} ${exactNameMatch.unit} in stock (ID: ${exactNameMatch.id}).`
      };
    }

    // 3. Very similar name check
    const similarMatch = candidateList.find(m => {
      const existingClean = m.name.trim().toLowerCase();
      return (
        existingClean.length > 3 &&
        (existingClean === cleanName ||
         (existingClean.includes(cleanName) && cleanName.length > 5) ||
         (cleanName.includes(existingClean) && existingClean.length > 5))
      );
    });

    if (similarMatch) {
      return {
        isDuplicate: true,
        matchType: 'similar_name',
        matchedMaterial: similarMatch,
        reason: `Very similar item "${similarMatch.name}" found in stock (${similarMatch.currentStock} ${similarMatch.unit} available).`
      };
    }
  }

  return {
    isDuplicate: false,
    matchType: null,
    matchedMaterial: null,
    reason: null
  };
}
