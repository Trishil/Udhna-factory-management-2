import { 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, WORKFLOW_COLLECTION, ORDER_SLIPS_COLLECTION, INVENTORY_COLLECTION, DISPATCH_COLLECTION } from './firebaseService';
import { 
  WorkflowItem, 
  OrderSlip, 
  RawMaterial, 
  DispatchOrder,
  EmployeeRecord,
  ElectricityUsageRecord,
  OperationalExpense,
  PartyInvoice,
  SupplierPayable,
  StockTransaction,
  CompanyWorkspace,
  Machine
} from '../types';
import { INITIAL_MATERIALS, INITIAL_MACHINES } from '../data/initialData';
import { generateWorkflowItemsFromSlip } from '../utils/workflowData';
import { TRISHARTH_WORKSPACE, getStoredWorkspaces, saveCustomWorkspace } from './googleAuth';

/**
 * PURE REAL-TIME CLOUD DATABASE ENGINE (Firebase Firestore)
 * 
 * Uses authoritative document snapshot listeners ('active_pipeline', 'active_slips', 'active_finance', etc.)
 * which are guaranteed full read/write permissions by Firestore security rules.
 * Propagates sub-second updates across all computers, incognito windows, and mobile devices.
 */

// Authoritative pipeline document keys
const WORKFLOW_DOC_ID = 'active_pipeline';
const ORDER_SLIPS_DOC_ID = 'active_slips';
const INVENTORY_DOC_ID = 'active_inventory';
const DISPATCH_DOC_ID = 'active_dispatches';
export const MACHINES_DOC_ID = 'active_machines';
export const FINANCE_COLLECTION = ORDER_SLIPS_COLLECTION;
export const FINANCE_DOC_ID = 'active_finance';
export const FACTORIES_REGISTRY_DOC_ID = 'active_factories';

export const DEFAULT_FACTORY_CODE = 'TRISHARTH-HQ';

export function getFactoryDocId(baseKey: string, factoryCode?: string): string {
  let clean = (factoryCode || '').trim().toUpperCase();
  if (!clean || clean === 'TRISHARTH-HQ' || clean === 'TRISHARTH' || clean === 'DEFAULT') {
    return baseKey;
  }
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetNorm = norm(clean);
  if (targetNorm === 'ATH1' || clean === 'ATH-001' || clean === 'ATH001' || clean === 'ATH-01' || clean === 'ATH01') {
    clean = 'ATH-01';
  }
  const safeCode = clean.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `factory_${safeCode}_${baseKey}`;
}

export function mirrorAtharvaDoc(col: string, docId: string, data: any) {
  if (docId.includes('ath_01_') || docId.includes('ath_001_')) {
    const mirrorId = docId.includes('ath_01_')
      ? docId.replace('ath_01_', 'ath_001_')
      : docId.replace('ath_001_', 'ath_01_');
    const mirrorRef = doc(db, col, mirrorId);
    setDoc(mirrorRef, data, { merge: true }).catch(() => {});
  }
}

export async function fetchCloudFactories(): Promise<CompanyWorkspace[]> {
  try {
    await ensureAuthReady();
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, FACTORIES_REGISTRY_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.factories) && data.factories.length > 0) {
        return data.factories;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch factories from Firestore:', e);
  }
  return getStoredWorkspaces();
}

export function subscribeToCloudFactories(callback: (factories: CompanyWorkspace[]) => void): () => void {
  let isCancelled = false;
  let unsub: (() => void) | null = null;
  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, FACTORIES_REGISTRY_DOC_ID);
    unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data?.factories) && data.factories.length > 0) {
          callback(data.factories);
          return;
        }
      }
      callback(getStoredWorkspaces());
    }, (err) => {
      console.warn('Factories snapshot error:', err);
      callback(getStoredWorkspaces());
    });
  }).catch(() => {
    callback(getStoredWorkspaces());
  });

  return () => {
    isCancelled = true;
    if (unsub) unsub();
  };
}

export function normalizeEmployeeRecord(emp: any): EmployeeRecord {
  const baseSalary = Number(emp.baseSalary ?? emp.salary ?? 0);
  const netPayable = Number(emp.netPayable ?? baseSalary);
  return {
    ...emp,
    baseSalary: isNaN(baseSalary) ? 0 : baseSalary,
    netPayable: isNaN(netPayable) ? 0 : netPayable,
    salaryType: emp.salaryType || 'monthly',
    paymentStatus: emp.paymentStatus || 'paid',
    paymentMethod: emp.paymentMethod || 'bank_transfer',
    role: emp.role || 'Staff',
    department: emp.department || 'Production',
    employeeId: emp.employeeId || emp.employeeCode || emp.id || 'TR-001',
    name: emp.name || 'Unnamed Employee'
  };
}

export async function saveCloudFactory(newFactory: CompanyWorkspace): Promise<CompanyWorkspace[]> {
  await ensureAuthReady();
  const currentFactories = await fetchCloudFactories();
  const existingIdx = currentFactories.findIndex(f => 
    f.id === newFactory.id || f.code.toUpperCase() === newFactory.code.toUpperCase()
  );
  let updatedList: CompanyWorkspace[];
  if (existingIdx >= 0) {
    updatedList = currentFactories.map((f, i) => i === existingIdx ? newFactory : f);
  } else {
    updatedList = [...currentFactories, newFactory];
  }

  if (!updatedList.some(f => f.code.toUpperCase() === 'TRISHARTH-HQ')) {
    updatedList.unshift(TRISHARTH_WORKSPACE);
  }

  const docRef = doc(db, ORDER_SLIPS_COLLECTION, FACTORIES_REGISTRY_DOC_ID);
  await setDoc(docRef, {
    factories: updatedList,
    updatedAt: new Date().toISOString()
  }, { merge: true });

  saveCustomWorkspace(newFactory);

  // Auto-provision isolated Firestore documents for this client factory if not HQ
  const fCode = newFactory.code.trim().toUpperCase();
  if (fCode !== 'TRISHARTH-HQ') {
    const ownerEmp: EmployeeRecord = {
      id: `emp-owner-${fCode.toLowerCase()}`,
      employeeId: `${fCode}-OWNER`,
      name: newFactory.ownerName || 'Factory Owner',
      role: 'Factory Owner / Director',
      department: 'Administration',
      googleEmail: newFactory.ownerEmail || '',
      loginPassword: newFactory.ownerPassword || 'admin@123',
      salaryType: 'monthly',
      baseSalary: 0,
      netPayable: 0,
      paymentStatus: 'paid',
      paymentMethod: 'bank_transfer',
      webAccess: true,
      mobileAccess: true,
      financialAccess: true,
      noAppAccess: false,
    };

    const initialMachines: Machine[] = [
      { id: `M-01-${fCode}`, name: 'Machine 01', model: 'Single Head 12-Needle', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 12, lastMaintenance: new Date().toISOString().split('T')[0] },
      { id: `M-02-${fCode}`, name: 'Machine 02', model: 'Multi-Head 15-Needle', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 15, lastMaintenance: new Date().toISOString().split('T')[0] },
      { id: `M-03-${fCode}`, name: 'Machine 03', model: 'High Speed Embroidery', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 20, lastMaintenance: new Date().toISOString().split('T')[0] },
      { id: `M-04-${fCode}`, name: 'Machine 04', model: 'Standard Flatbed', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 10, lastMaintenance: new Date().toISOString().split('T')[0] },
    ];

    const finDocId = getFactoryDocId(FINANCE_DOC_ID, fCode);
    const pipeDocId = getFactoryDocId(WORKFLOW_DOC_ID, fCode);
    const slipsDocId = getFactoryDocId(ORDER_SLIPS_DOC_ID, fCode);
    const invDocId = getFactoryDocId(INVENTORY_DOC_ID, fCode);
    const dspDocId = getFactoryDocId(DISPATCH_DOC_ID, fCode);
    const machDocId = getFactoryDocId(MACHINES_DOC_ID, fCode);

    setDoc(doc(db, FINANCE_COLLECTION, finDocId), {
      employees: [ownerEmp],
      electricityRecords: [],
      expenses: [],
      partyInvoices: [],
      supplierPayables: [],
      transactions: [],
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    setDoc(doc(db, WORKFLOW_COLLECTION, pipeDocId), {
      items: [],
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    setDoc(doc(db, ORDER_SLIPS_COLLECTION, slipsDocId), {
      slips: [],
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    setDoc(doc(db, INVENTORY_COLLECTION, invDocId), {
      materials: [],
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    setDoc(doc(db, DISPATCH_COLLECTION, dspDocId), {
      orders: [],
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    setDoc(doc(db, ORDER_SLIPS_COLLECTION, machDocId), {
      machines: initialMachines,
      updatedAt: new Date().toISOString()
    }, { merge: true }).catch(() => {});

    memoryFinanceMap[fCode] = {
      employees: [ownerEmp],
      electricityRecords: [],
      expenses: [],
      partyInvoices: [],
      supplierPayables: [],
      transactions: []
    };
    memoryWorkflowMap[fCode] = [];
    memorySlipsMap[fCode] = [];
    memoryMaterialsMap[fCode] = [];
    memoryDispatchesMap[fCode] = [];
    memoryMachinesMap[fCode] = initialMachines;
  }

  return updatedList;
}

export async function toggleFactoryPauseStatus(
  factoryCode: string, 
  paused: boolean, 
  reason: string = 'Pending subscription / licensing fees'
): Promise<CompanyWorkspace[]> {
  const cleanCode = factoryCode.trim().toUpperCase();
  if (cleanCode === 'TRISHARTH-HQ' || cleanCode === 'TRISHARTH' || cleanCode === 'DEFAULT') {
    throw new Error('Flagship primary factory cannot be suspended.');
  }

  const currentFactories = await fetchCloudFactories();
  const updatedList = currentFactories.map(f => {
    if (f.code.toUpperCase() === cleanCode) {
      const updated: CompanyWorkspace = {
        ...f,
        dataEntryPaused: paused,
        planStatus: (paused ? 'suspended' : 'active') as 'suspended' | 'active',
        updatedAt: new Date().toISOString()
      };
      if (paused && reason) {
        updated.suspensionReason = reason;
      } else {
        delete updated.suspensionReason;
      }
      return updated;
    }
    return f;
  });

  try {
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, FACTORIES_REGISTRY_DOC_ID);
    const sanitizedFactories = JSON.parse(JSON.stringify(updatedList));
    await setDoc(docRef, {
      factories: sanitizedFactories,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Failed to update factory pause status in Firestore:', e);
  }

  return updatedList;
}

export async function deleteCloudFactory(factoryCode: string): Promise<CompanyWorkspace[]> {
  const cleanCode = factoryCode.trim().toUpperCase();
  if (cleanCode === 'TRISHARTH-HQ' || cleanCode === 'TRISHARTH' || cleanCode === 'DEFAULT') {
    throw new Error('Flagship primary plant (Trisharth) cannot be deleted.');
  }

  // 1. Wipe all 6 dedicated Firestore documents for this client factory
  const finDocId = getFactoryDocId(FINANCE_DOC_ID, cleanCode);
  const pipeDocId = getFactoryDocId(WORKFLOW_DOC_ID, cleanCode);
  const slipsDocId = getFactoryDocId(ORDER_SLIPS_DOC_ID, cleanCode);
  const invDocId = getFactoryDocId(INVENTORY_DOC_ID, cleanCode);
  const dspDocId = getFactoryDocId(DISPATCH_DOC_ID, cleanCode);
  const machDocId = getFactoryDocId(MACHINES_DOC_ID, cleanCode);

  await Promise.allSettled([
    deleteDoc(doc(db, FINANCE_COLLECTION, finDocId)),
    deleteDoc(doc(db, WORKFLOW_COLLECTION, pipeDocId)),
    deleteDoc(doc(db, ORDER_SLIPS_COLLECTION, slipsDocId)),
    deleteDoc(doc(db, INVENTORY_COLLECTION, invDocId)),
    deleteDoc(doc(db, DISPATCH_COLLECTION, dspDocId)),
    deleteDoc(doc(db, ORDER_SLIPS_COLLECTION, machDocId))
  ]);

  // 2. Remove factory from active_factories registry
  const currentFactories = await fetchCloudFactories();
  const updatedList = currentFactories.filter(f => f.code.toUpperCase() !== cleanCode);

  try {
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, FACTORIES_REGISTRY_DOC_ID);
    const sanitizedFactories = JSON.parse(JSON.stringify(updatedList));
    await setDoc(docRef, {
      factories: sanitizedFactories,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.warn('Failed to remove factory from registry in Firestore:', e);
  }

  // 3. Wipe memory caches
  delete memoryWorkflowMap[cleanCode];
  delete memorySlipsMap[cleanCode];
  delete memoryMaterialsMap[cleanCode];
  delete memoryDispatchesMap[cleanCode];
  delete memoryFinanceMap[cleanCode];
  delete memoryMachinesMap[cleanCode];

  // 4. Wipe localStorage keys
  try {
    localStorage.removeItem(`factory_materials_${cleanCode}`);
    localStorage.removeItem(`factory_dispatch_orders_${cleanCode}`);
    localStorage.removeItem(`factory_machines_${cleanCode}`);
    localStorage.removeItem(`factory_employees_${cleanCode}`);
    localStorage.removeItem(`factory_expenses_${cleanCode}`);
    localStorage.removeItem(`factory_transactions_${cleanCode}`);
  } catch (_) {}

  return updatedList;
}

export interface CloudFinanceData {
  employees: EmployeeRecord[];
  electricityRecords: ElectricityUsageRecord[];
  expenses: OperationalExpense[];
  partyInvoices: PartyInvoice[];
  supplierPayables: SupplierPayable[];
  transactions: StockTransaction[];
}

// Local synchronized memory caches per factory
export const memoryWorkflowMap: Record<string, WorkflowItem[]> = {};
export const memorySlipsMap: Record<string, OrderSlip[]> = {};
export const memoryMaterialsMap: Record<string, RawMaterial[]> = {};
export const memoryDispatchesMap: Record<string, DispatchOrder[]> = {};
export const memoryFinanceMap: Record<string, CloudFinanceData> = {};
export const memoryMachinesMap: Record<string, Machine[]> = {};

function getFactoryKey(code?: string): string {
  let clean = (code || DEFAULT_FACTORY_CODE).trim().toUpperCase();
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  if (norm(clean) === 'ATH1' || clean === 'ATH-001' || clean === 'ATH001' || clean === 'ATH-01') {
    return 'ATH-01';
  }
  return clean;
}

function getInitialFinanceData(): CloudFinanceData {
  return {
    employees: [],
    electricityRecords: [],
    expenses: [],
    partyInvoices: [],
    supplierPayables: [],
    transactions: []
  };
}

// Ready gate: ensures anonymous authentication completes before any Firestore request
let authReady = false;
let authPromise: Promise<void> | null = null;

export function ensureAuthReady(): Promise<void> {
  if (authReady) return Promise.resolve();
  if (authPromise) return authPromise;

  authPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        authReady = true;
        resolve();
      } else {
        signInAnonymously(auth)
          .then(() => {
            authReady = true;
            resolve();
          })
          .catch((err) => {
            console.warn('Anonymous auth initialization notice:', err?.message || err);
            // Even if sign-in fails, allow attempts
            authReady = true;
            resolve();
          });
      }
    });
  });

  return authPromise;
}

// ================= 1. WORKFLOW DESIGNS =================

export function subscribeToCloudWorkflow(
  onUpdate: (items: WorkflowItem[]) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, WORKFLOW_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.items)) {
            memoryWorkflowMap[fKey] = data.items;
            const slips = memorySlipsMap[fKey] || [];
            // Self-healing: if pipeline has 0 items but active slips exist, auto-generate items from slips
            if (memoryWorkflowMap[fKey].length === 0 && slips.length > 0) {
              const healedItems: WorkflowItem[] = [];
              slips.forEach(s => {
                const its = generateWorkflowItemsFromSlip(s);
                healedItems.push(...its);
              });
              if (healedItems.length > 0) {
                memoryWorkflowMap[fKey] = healedItems;
                saveCloudWorkflowItems(healedItems, factoryCode).catch(() => {});
              }
            }
            onUpdate(memoryWorkflowMap[fKey]);
            return;
          }
        }
        if (fKey !== 'TRISHARTH-HQ') {
          memoryWorkflowMap[fKey] = [];
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Cloud Workflow snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudWorkflowItem(item: WorkflowItem, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!item || (!item.id && !item.designNumber)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  const id = item.id || `wf-${Date.now()}`;
  const itemWithId = { ...item, id };

  // 1. Update memory
  const idx = memoryWorkflowMap[fKey].findIndex(i => i.id === id);
  if (idx >= 0) {
    memoryWorkflowMap[fKey][idx] = itemWithId;
  } else {
    memoryWorkflowMap[fKey].unshift(itemWithId);
  }

  // 2. Save individual document
  const safeId = String(item.id).replace(/[\/\s#?]/g, '_');
  const indDocRef = doc(db, WORKFLOW_COLLECTION, safeId);
  const cleanItem = JSON.parse(JSON.stringify(item));
  setDoc(indDocRef, cleanItem, { merge: true }).catch(() => {});

  // 3. Atomically update authoritative real-time pipeline document
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  const payload = {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(pipelineRef, payload, { merge: true });
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, docId, payload);
}

export async function saveCloudWorkflowItems(items: WorkflowItem[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Update memory in bulk
  items.forEach(item => {
    const idx = memoryWorkflowMap[fKey].findIndex(i => i.id === item.id);
    if (idx >= 0) {
      memoryWorkflowMap[fKey][idx] = item;
    } else {
      memoryWorkflowMap[fKey].unshift(item);
    }
  });

  // 2. Atomically update authoritative real-time pipeline document in a SINGLE write
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  const payload = {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(pipelineRef, payload, { merge: true });
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, docId, payload);
}

export async function deleteCloudWorkflowItem(itemId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!itemId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Remove from memory
  memoryWorkflowMap[fKey] = memoryWorkflowMap[fKey].filter(i => i.id !== itemId);

  // 2. Delete individual document
  const safeId = String(itemId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, WORKFLOW_COLLECTION, safeId)).catch(() => {});

  // 3. Atomically update authoritative pipeline document
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  const payload = {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(pipelineRef, payload, { merge: true });
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, docId, payload);
}

export async function deleteCloudWorkflowItemsBySlipId(slipId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!slipId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Update memory
  memoryWorkflowMap[fKey] = memoryWorkflowMap[fKey].filter(i => i.orderSlipId !== slipId);

  // 2. Atomically update authoritative pipeline document in a SINGLE write
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  const payload = {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(pipelineRef, payload);
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, docId, payload);
}

export async function replaceCloudWorkflowItemsForSlip(slipId: string, newItems: WorkflowItem[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!slipId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Remove all old items for this slip from memory
  const otherItems = memoryWorkflowMap[fKey].filter(i => i.orderSlipId !== slipId);
  memoryWorkflowMap[fKey] = [...newItems, ...otherItems];

  // 2. Save individual new item documents
  newItems.forEach(item => {
    const safeId = String(item.id).replace(/[\/\s#?]/g, '_');
    const indDocRef = doc(db, WORKFLOW_COLLECTION, safeId);
    setDoc(indDocRef, JSON.parse(JSON.stringify(item)), { merge: true }).catch(() => {});
  });

  // 3. Atomically update authoritative pipeline document in a SINGLE write
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  const payload = {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(pipelineRef, payload);
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, docId, payload);
}

// ================= 2. MASTER ORDER SLIPS =================

export function subscribeToCloudOrderSlips(
  onUpdate: (slips: OrderSlip[]) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(ORDER_SLIPS_DOC_ID, factoryCode);

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.slips)) {
            memorySlipsMap[fKey] = data.slips;
            const wf = memoryWorkflowMap[fKey] || [];
            // Self-healing: if slips exist but workflow items are 0, heal workflow items
            if (memorySlipsMap[fKey].length > 0 && wf.length === 0) {
              const healedItems: WorkflowItem[] = [];
              memorySlipsMap[fKey].forEach(s => {
                const its = generateWorkflowItemsFromSlip(s);
                healedItems.push(...its);
              });
              if (healedItems.length > 0) {
                memoryWorkflowMap[fKey] = healedItems;
                saveCloudWorkflowItems(healedItems, factoryCode).catch(() => {});
              }
            }
            onUpdate(memorySlipsMap[fKey]);
            return;
          }
        }
        if (fKey !== 'TRISHARTH-HQ') {
          memorySlipsMap[fKey] = [];
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Cloud Order Slips snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudOrderSlip(slip: OrderSlip, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!slip || (!slip.id && !slip.jobNo)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memorySlipsMap[fKey]) memorySlipsMap[fKey] = [];

  const id = slip.id || `slip-${Date.now()}`;
  const slipWithId = { ...slip, id };

  // 1. Update memory strictly by slip ID
  const idx = memorySlipsMap[fKey].findIndex(s => s.id === id);
  if (idx >= 0) {
    memorySlipsMap[fKey][idx] = slipWithId;
  } else {
    memorySlipsMap[fKey].unshift(slipWithId);
  }

  // 2. Save individual document
  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  const indDocRef = doc(db, ORDER_SLIPS_COLLECTION, safeId);
  const cleanSlip = JSON.parse(JSON.stringify(slipWithId));
  setDoc(indDocRef, cleanSlip, { merge: true }).catch(() => {});

  // 3. Atomically update authoritative slips document
  const docId = getFactoryDocId(ORDER_SLIPS_DOC_ID, factoryCode);
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, docId);
  const payload = {
    slips: JSON.parse(JSON.stringify(memorySlipsMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(slipsRef, payload, { merge: true });
  mirrorAtharvaDoc(ORDER_SLIPS_COLLECTION, docId, payload);
}

export async function deleteCloudOrderSlip(slipId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!slipId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memorySlipsMap[fKey]) memorySlipsMap[fKey] = [];

  // 1. Update memory strictly by slip ID
  memorySlipsMap[fKey] = memorySlipsMap[fKey].filter(s => s.id !== slipId);

  // 2. Delete individual document
  const safeId = String(slipId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, ORDER_SLIPS_COLLECTION, safeId)).catch(() => {});

  // 3. Atomically update authoritative slips document
  const docId = getFactoryDocId(ORDER_SLIPS_DOC_ID, factoryCode);
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, docId);
  const payload = {
    slips: JSON.parse(JSON.stringify(memorySlipsMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(slipsRef, payload);
  mirrorAtharvaDoc(ORDER_SLIPS_COLLECTION, docId, payload);
}

// ================= 3. INVENTORY & MATERIALS =================

export function subscribeToCloudInventory(
  onUpdate: (materials: RawMaterial[]) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(INVENTORY_DOC_ID, factoryCode);

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, INVENTORY_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.materials)) {
            memoryMaterialsMap[fKey] = data.materials;
            onUpdate(memoryMaterialsMap[fKey]);
            return;
          }
        } else {
          // If active_inventory is not yet in Firestore, seed it if HQ
          if (fKey === 'TRISHARTH-HQ') {
            const invRef = doc(db, INVENTORY_COLLECTION, docId);
            setDoc(invRef, {
              materials: JSON.parse(JSON.stringify(INITIAL_MATERIALS)),
              updatedAt: new Date().toISOString()
            }, { merge: true }).catch(() => {});
            memoryMaterialsMap[fKey] = INITIAL_MATERIALS;
            onUpdate(INITIAL_MATERIALS);
            return;
          }
        }
        if (fKey !== 'TRISHARTH-HQ') {
          memoryMaterialsMap[fKey] = [];
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Cloud Inventory snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudMaterial(material: RawMaterial, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!material) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryMaterialsMap[fKey]) memoryMaterialsMap[fKey] = [];

  const id = material.id || material.code || `mat-${Date.now()}`;
  const matWithId = { ...material, id };

  const idx = memoryMaterialsMap[fKey].findIndex(m => m.id === id);
  if (idx >= 0) {
    memoryMaterialsMap[fKey][idx] = matWithId;
  } else {
    memoryMaterialsMap[fKey].unshift(matWithId);
  }

  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  setDoc(doc(db, INVENTORY_COLLECTION, safeId), JSON.parse(JSON.stringify(matWithId)), { merge: true }).catch(() => {});

  const docId = getFactoryDocId(INVENTORY_DOC_ID, factoryCode);
  const invRef = doc(db, INVENTORY_COLLECTION, docId);
  const payload = {
    materials: JSON.parse(JSON.stringify(memoryMaterialsMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(invRef, payload, { merge: true });
  mirrorAtharvaDoc(INVENTORY_COLLECTION, docId, payload);
}

export async function deleteCloudMaterial(materialId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!materialId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryMaterialsMap[fKey]) memoryMaterialsMap[fKey] = [];

  memoryMaterialsMap[fKey] = memoryMaterialsMap[fKey].filter(m => m.id !== materialId);
  const safeId = String(materialId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, INVENTORY_COLLECTION, safeId)).catch(() => {});

  const docId = getFactoryDocId(INVENTORY_DOC_ID, factoryCode);
  const invRef = doc(db, INVENTORY_COLLECTION, docId);
  const payload = {
    materials: JSON.parse(JSON.stringify(memoryMaterialsMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(invRef, payload);
  mirrorAtharvaDoc(INVENTORY_COLLECTION, docId, payload);
}

export async function saveCloudMaterials(materials: RawMaterial[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(materials)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  memoryMaterialsMap[fKey] = materials;
  const docId = getFactoryDocId(INVENTORY_DOC_ID, factoryCode);
  const invRef = doc(db, INVENTORY_COLLECTION, docId);
  const payload = {
    materials: JSON.parse(JSON.stringify(materials)),
    updatedAt: new Date().toISOString()
  };
  await setDoc(invRef, payload, { merge: true });
  mirrorAtharvaDoc(INVENTORY_COLLECTION, docId, payload);
}

// ================= 4. DISPATCH ORDERS =================

export function subscribeToCloudDispatch(
  onUpdate: (orders: DispatchOrder[]) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, DISPATCH_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.orders)) {
            memoryDispatchesMap[fKey] = data.orders;
            onUpdate(memoryDispatchesMap[fKey]);
            return;
          }
        }
        if (fKey !== 'TRISHARTH-HQ') {
          memoryDispatchesMap[fKey] = [];
          onUpdate([]);
        }
      },
      (err) => {
        console.warn('Cloud Dispatch snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudDispatchOrder(order: DispatchOrder, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!order || !order.dispatchNumber) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryDispatchesMap[fKey]) memoryDispatchesMap[fKey] = [];

  const id = order.id || `dsp-${order.dispatchNumber}`;
  const orderWithId = { ...order, id };

  const idx = memoryDispatchesMap[fKey].findIndex(d => d.id === id || d.dispatchNumber === order.dispatchNumber);
  if (idx >= 0) {
    memoryDispatchesMap[fKey][idx] = orderWithId;
  } else {
    memoryDispatchesMap[fKey].unshift(orderWithId);
  }

  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  setDoc(doc(db, DISPATCH_COLLECTION, safeId), JSON.parse(JSON.stringify(orderWithId)), { merge: true }).catch(() => {});

  const docId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);
  const dspRef = doc(db, DISPATCH_COLLECTION, docId);
  const payload = {
    orders: JSON.parse(JSON.stringify(memoryDispatchesMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(dspRef, payload, { merge: true });
  mirrorAtharvaDoc(DISPATCH_COLLECTION, docId, payload);
}

export async function deleteCloudDispatchOrder(orderId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!orderId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryDispatchesMap[fKey]) memoryDispatchesMap[fKey] = [];

  memoryDispatchesMap[fKey] = memoryDispatchesMap[fKey].filter(d => d.id !== orderId && d.dispatchNumber !== orderId);
  const safeId = String(orderId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, DISPATCH_COLLECTION, safeId)).catch(() => {});

  const docId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);
  const dspRef = doc(db, DISPATCH_COLLECTION, docId);
  const payload = {
    orders: JSON.parse(JSON.stringify(memoryDispatchesMap[fKey])),
    updatedAt: new Date().toISOString()
  };
  await setDoc(dspRef, payload);
  mirrorAtharvaDoc(DISPATCH_COLLECTION, docId, payload);
}

export async function saveCloudDispatchOrders(orders: DispatchOrder[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(orders)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  memoryDispatchesMap[fKey] = orders;
  const docId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);
  const dspRef = doc(db, DISPATCH_COLLECTION, docId);
  const payload = {
    orders: JSON.parse(JSON.stringify(orders)),
    updatedAt: new Date().toISOString()
  };
  await setDoc(dspRef, payload, { merge: true });
  mirrorAtharvaDoc(DISPATCH_COLLECTION, docId, payload);
}

// ================= 5. FINANCE & ACCOUNTS =================

export function subscribeToCloudFinance(
  onUpdate: (data: Partial<CloudFinanceData>) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
  const fKey = getFactoryKey(targetCode);
  const docId = getFactoryDocId(FINANCE_DOC_ID, targetCode);

  if (!memoryFinanceMap[fKey]) {
    memoryFinanceMap[fKey] = getInitialFinanceData();
  }

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, FINANCE_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (data) {
            let emps = Array.isArray(data.employees) ? data.employees.map(normalizeEmployeeRecord) : [];
            // If Atharva has 0 employees in this document, check mirror before accepting 0
            if (emps.length === 0 && (docId.includes('ath_01_') || docId.includes('ath_001_'))) {
              const mirrorId = docId.includes('ath_01_') ? docId.replace('ath_01_', 'ath_001_') : docId.replace('ath_001_', 'ath_01_');
              getDoc(doc(db, FINANCE_COLLECTION, mirrorId)).then(mSnap => {
                if (mSnap.exists()) {
                  const mData = mSnap.data();
                  if (Array.isArray(mData?.employees) && mData.employees.length > 0) {
                    const recoveredEmps = mData.employees.map(normalizeEmployeeRecord);
                    onUpdate({ employees: recoveredEmps });
                    setDoc(docRef, { employees: recoveredEmps, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
                  }
                }
              }).catch(() => {});
            }

            const currentFin = memoryFinanceMap[fKey] || getInitialFinanceData();
            if (Array.isArray(data.employees) && emps.length > 0) {
              currentFin.employees = emps;
            }
            if (Array.isArray(data.electricityRecords)) currentFin.electricityRecords = data.electricityRecords;
            if (Array.isArray(data.expenses)) currentFin.expenses = data.expenses;
            if (Array.isArray(data.partyInvoices)) currentFin.partyInvoices = data.partyInvoices;
            if (Array.isArray(data.supplierPayables)) currentFin.supplierPayables = data.supplierPayables;
            if (Array.isArray(data.transactions)) currentFin.transactions = data.transactions;
            memoryFinanceMap[fKey] = currentFin;

            onUpdate({
              employees: emps,
              electricityRecords: Array.isArray(data.electricityRecords) ? data.electricityRecords : [],
              expenses: Array.isArray(data.expenses) ? data.expenses : [],
              partyInvoices: Array.isArray(data.partyInvoices) ? data.partyInvoices : [],
              supplierPayables: Array.isArray(data.supplierPayables) ? data.supplierPayables : [],
              transactions: Array.isArray(data.transactions) ? data.transactions : [],
            });
          }
        } else {
          // If active_finance is not yet in Firestore, check mirror doc first
          if (docId.includes('ath_01_') || docId.includes('ath_001_')) {
            const mirrorId = docId.includes('ath_01_') ? docId.replace('ath_01_', 'ath_001_') : docId.replace('ath_001_', 'ath_01_');
            getDoc(doc(db, FINANCE_COLLECTION, mirrorId)).then(mSnap => {
              if (mSnap.exists()) {
                const mData = mSnap.data() as any;
                if (mData && Array.isArray(mData.employees) && mData.employees.length > 0) {
                  setDoc(docRef, { ...mData, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
                  onUpdate(mData);
                  return;
                }
              }
              const emptyFin: CloudFinanceData = {
                employees: [],
                electricityRecords: [],
                expenses: [],
                partyInvoices: [],
                supplierPayables: [],
                transactions: [],
              };
              setDoc(docRef, { ...emptyFin, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
              memoryFinanceMap[fKey] = emptyFin;
              onUpdate(emptyFin);
            }).catch(() => {});
            return;
          }

          const emptyFin: CloudFinanceData = {
            employees: [],
            electricityRecords: [],
            expenses: [],
            partyInvoices: [],
            supplierPayables: [],
            transactions: [],
          };
          const finRef = doc(db, FINANCE_COLLECTION, docId);
          setDoc(finRef, {
            ...emptyFin,
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
          memoryFinanceMap[fKey] = emptyFin;
          onUpdate(emptyFin);
        }
      },
      (err) => {
        console.warn('Cloud Finance snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudFinance(data: Partial<CloudFinanceData>, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  await ensureAuthReady();
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
  const fKey = getFactoryKey(targetCode);
  if (!memoryFinanceMap[fKey]) memoryFinanceMap[fKey] = getInitialFinanceData();

  memoryFinanceMap[fKey] = {
    ...memoryFinanceMap[fKey],
    ...data
  };
  const docId = getFactoryDocId(FINANCE_DOC_ID, targetCode);
  const finRef = doc(db, FINANCE_COLLECTION, docId);
  const cleanData: any = {
    updatedAt: new Date().toISOString()
  };
  if (data.employees !== undefined) cleanData.employees = JSON.parse(JSON.stringify(data.employees));
  if (data.electricityRecords !== undefined) cleanData.electricityRecords = JSON.parse(JSON.stringify(data.electricityRecords));
  if (data.expenses !== undefined) cleanData.expenses = JSON.parse(JSON.stringify(data.expenses));
  if (data.partyInvoices !== undefined) cleanData.partyInvoices = JSON.parse(JSON.stringify(data.partyInvoices));
  if (data.supplierPayables !== undefined) cleanData.supplierPayables = JSON.parse(JSON.stringify(data.supplierPayables));
  if (data.transactions !== undefined) cleanData.transactions = JSON.parse(JSON.stringify(data.transactions));

  await setDoc(finRef, cleanData, { merge: true });
  mirrorAtharvaDoc(FINANCE_COLLECTION, docId, cleanData);
}

export async function clearAllCloudFinance(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  await ensureAuthReady();
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
  const fKey = getFactoryKey(targetCode);
  memoryFinanceMap[fKey] = getInitialFinanceData();
  const docId = getFactoryDocId(FINANCE_DOC_ID, targetCode);
  const finRef = doc(db, FINANCE_COLLECTION, docId);
  const payload = {
    ...memoryFinanceMap[fKey],
    updatedAt: new Date().toISOString()
  };
  await setDoc(finRef, payload);
  mirrorAtharvaDoc(FINANCE_COLLECTION, docId, payload);
}

// ================= 6. RESET / CLEAR ORDERS =================

export async function clearAllCloudProductionOrders(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  await ensureAuthReady();
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
  const fKey = getFactoryKey(targetCode);

  memoryWorkflowMap[fKey] = [];
  memorySlipsMap[fKey] = [];
  memoryDispatchesMap[fKey] = [];

  const wfDocId = getFactoryDocId(WORKFLOW_DOC_ID, targetCode);
  const slipsDocId = getFactoryDocId(ORDER_SLIPS_DOC_ID, targetCode);
  const dspDocId = getFactoryDocId(DISPATCH_DOC_ID, targetCode);

  const wfRef = doc(db, WORKFLOW_COLLECTION, wfDocId);
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, slipsDocId);
  const dspRef = doc(db, DISPATCH_COLLECTION, dspDocId);

  const wfPayload = { items: [], updatedAt: new Date().toISOString() };
  const slipsPayload = { slips: [], updatedAt: new Date().toISOString() };
  const dspPayload = { orders: [], updatedAt: new Date().toISOString() };

  await Promise.all([
    setDoc(wfRef, wfPayload),
    setDoc(slipsRef, slipsPayload),
    setDoc(dspRef, dspPayload)
  ]);
  mirrorAtharvaDoc(WORKFLOW_COLLECTION, wfDocId, wfPayload);
  mirrorAtharvaDoc(ORDER_SLIPS_COLLECTION, slipsDocId, slipsPayload);
  mirrorAtharvaDoc(DISPATCH_COLLECTION, dspDocId, dspPayload);
}

export async function fetchCloudFinanceEmployees(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<EmployeeRecord[]> {
  try {
    await ensureAuthReady();
    const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
    const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
    const docId = getFactoryDocId(FINANCE_DOC_ID, targetCode);
    const finRef = doc(db, FINANCE_COLLECTION, docId);
    const snap = await getDoc(finRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.employees) && data.employees.length > 0) {
        return data.employees;
      }
    }
    // Check mirror document for Atharva
    if (docId.includes('ath_01_') || docId.includes('ath_001_')) {
      const mirrorId = docId.includes('ath_01_') ? docId.replace('ath_01_', 'ath_001_') : docId.replace('ath_001_', 'ath_01_');
      const mSnap = await getDoc(doc(db, FINANCE_COLLECTION, mirrorId));
      if (mSnap.exists()) {
        const mData = mSnap.data();
        if (Array.isArray(mData?.employees) && mData.employees.length > 0) {
          return mData.employees;
        }
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch finance employees for ${factoryCode} from Firestore:`, e);
  }
  try {
    const fKey = getFactoryKey(factoryCode);
    const saved = localStorage.getItem(`factory_employees_${fKey}`) || 
                  (fKey === 'ATH-01' ? localStorage.getItem('factory_employees_ATH-001') : null) ||
                  (fKey === 'TRISHARTH-HQ' ? localStorage.getItem('factory_employees') : null);
    if (saved) return JSON.parse(saved);
  } catch {}
  return [];
}

/**
 * Searches across all registered factories for employee accounts (used for universal Google OAuth & credentials login)
 */
export async function fetchAllCloudEmployees(): Promise<{ employee: EmployeeRecord; factory: CompanyWorkspace }[]> {
  const allResults: { employee: EmployeeRecord; factory: CompanyWorkspace }[] = [];
  try {
    await ensureAuthReady();
    const factories = await fetchCloudFactories();
    for (const f of factories) {
      try {
        const docId = getFactoryDocId(FINANCE_DOC_ID, f.code);
        const finRef = doc(db, FINANCE_COLLECTION, docId);
        const snap = await getDoc(finRef);
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data?.employees)) {
            data.employees.forEach((emp: EmployeeRecord) => {
              allResults.push({ employee: emp, factory: f });
            });
          }
        }
      } catch (err) {
        console.warn(`Error fetching employees for factory ${f.code}:`, err);
      }
    }
  } catch (e) {
    console.warn('Failed to fetch all cloud employees:', e);
  }

  // If none found in Firestore, check local storage fallback
  if (allResults.length === 0) {
    try {
      const saved = localStorage.getItem('factory_employees');
      if (saved) {
        const emps: EmployeeRecord[] = JSON.parse(saved);
        emps.forEach(emp => {
          allResults.push({ employee: emp, factory: TRISHARTH_WORKSPACE });
        });
      }
    } catch {}
  }

  return allResults;
}

// ================= 7. MACHINES FLEET =================

export function subscribeToCloudMachines(
  onUpdate: (machines: Machine[]) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(MACHINES_DOC_ID, factoryCode);

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, docId);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.machines)) {
            memoryMachinesMap[fKey] = data.machines;
            onUpdate(memoryMachinesMap[fKey]);
            return;
          }
        }
        // Seed machines if not exists
        const defaultMachs: Machine[] = fKey === 'TRISHARTH-HQ'
          ? INITIAL_MACHINES
          : [
              { id: `M-01-${fKey}`, name: 'Machine 01', model: 'Single Head 12-Needle', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 12, lastMaintenance: new Date().toISOString().split('T')[0] },
              { id: `M-02-${fKey}`, name: 'Machine 02', model: 'Multi-Head 15-Needle', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 15, lastMaintenance: new Date().toISOString().split('T')[0] },
              { id: `M-03-${fKey}`, name: 'Machine 03', model: 'High Speed Embroidery', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 20, lastMaintenance: new Date().toISOString().split('T')[0] },
              { id: `M-04-${fKey}`, name: 'Machine 04', model: 'Standard Flatbed', status: 'idle', rpm: 0, maxRpm: 1200, outputCount: 0, targetCount: 100, operator: 'Unassigned', temperatureCelsius: 25, uptimeHours: 0, efficiencyPercent: 100, feedLinesCount: 10, lastMaintenance: new Date().toISOString().split('T')[0] },
            ];

        setDoc(docRef, {
          machines: JSON.parse(JSON.stringify(defaultMachs)),
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(() => {});

        memoryMachinesMap[fKey] = defaultMachs;
        onUpdate(defaultMachs);
      },
      (err) => {
        console.warn('Cloud Machines snapshot listener error:', err);
        if (onError) onError(err);
      }
    );
  });

  return () => {
    isCancelled = true;
    if (unsubListener) unsubListener();
  };
}

export async function saveCloudMachines(machines: Machine[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(machines)) return;
  await ensureAuthReady();
  const norm = (c: string) => (c || '').replace(/[^A-Z0-9]/g, '').replace(/0+([0-9]+)/, '$1');
  const targetCode = (norm(factoryCode) === 'ATH1' || factoryCode === 'ATH-001' || factoryCode === 'ATH001') ? 'ATH-01' : factoryCode;
  const fKey = getFactoryKey(targetCode);
  memoryMachinesMap[fKey] = machines;
  const docId = getFactoryDocId(MACHINES_DOC_ID, targetCode);
  const docRef = doc(db, ORDER_SLIPS_COLLECTION, docId);
  const payload = {
    machines: JSON.parse(JSON.stringify(machines)),
    updatedAt: new Date().toISOString()
  };
  await setDoc(docRef, payload, { merge: true });
  mirrorAtharvaDoc(ORDER_SLIPS_COLLECTION, docId, payload);
}

