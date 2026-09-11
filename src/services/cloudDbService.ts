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
  CompanyWorkspace
} from '../types';
import { INITIAL_MATERIALS } from '../data/initialData';
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
export const FINANCE_COLLECTION = ORDER_SLIPS_COLLECTION;
export const FINANCE_DOC_ID = 'active_finance';
export const FACTORIES_REGISTRY_DOC_ID = 'active_factories';

export const DEFAULT_FACTORY_CODE = 'TRISHARTH-HQ';

export function getFactoryDocId(baseKey: string, factoryCode?: string): string {
  const clean = (factoryCode || '').trim().toUpperCase();
  if (!clean || clean === 'TRISHARTH-HQ' || clean === 'TRISHARTH' || clean === 'DEFAULT') {
    return baseKey;
  }
  const safeCode = clean.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `factory_${safeCode}_${baseKey}`;
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
const memoryWorkflowMap: Record<string, WorkflowItem[]> = {};
const memorySlipsMap: Record<string, OrderSlip[]> = {};
const memoryMaterialsMap: Record<string, RawMaterial[]> = {};
const memoryDispatchesMap: Record<string, DispatchOrder[]> = {};
const memoryFinanceMap: Record<string, CloudFinanceData> = {};

function getFactoryKey(code?: string): string {
  return (code || DEFAULT_FACTORY_CODE).trim().toUpperCase();
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
  if (!item || !item.id) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Update memory
  const idx = memoryWorkflowMap[fKey].findIndex(i => i.id === item.id);
  if (idx >= 0) {
    memoryWorkflowMap[fKey][idx] = item;
  } else {
    memoryWorkflowMap[fKey].unshift(item);
  }

  // 2. Save individual document
  const safeId = String(item.id).replace(/[\/\s#?]/g, '_');
  const indDocRef = doc(db, WORKFLOW_COLLECTION, safeId);
  const cleanItem = JSON.parse(JSON.stringify(item));
  setDoc(indDocRef, cleanItem, { merge: true }).catch(() => {});

  // 3. Atomically update authoritative real-time pipeline document
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteCloudWorkflowItem(itemId: string, factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!itemId) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  if (!memoryWorkflowMap[fKey]) memoryWorkflowMap[fKey] = [];

  // 1. Update memory
  memoryWorkflowMap[fKey] = memoryWorkflowMap[fKey].filter(i => i.id !== itemId);

  // 2. Delete individual document
  const safeId = String(itemId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, WORKFLOW_COLLECTION, safeId)).catch(() => {});

  // 3. Atomically update authoritative pipeline document
  const docId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, docId);
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  });
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
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  });
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
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflowMap[fKey])),
    updatedAt: new Date().toISOString()
  });
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
  await setDoc(slipsRef, {
    slips: JSON.parse(JSON.stringify(memorySlipsMap[fKey])),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
  await setDoc(slipsRef, {
    slips: JSON.parse(JSON.stringify(memorySlipsMap[fKey])),
    updatedAt: new Date().toISOString()
  });
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
          }
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
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(memoryMaterialsMap[fKey])),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(memoryMaterialsMap[fKey])),
    updatedAt: new Date().toISOString()
  });
}

export async function saveCloudMaterials(materials: RawMaterial[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(materials)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  memoryMaterialsMap[fKey] = materials;
  const docId = getFactoryDocId(INVENTORY_DOC_ID, factoryCode);
  const invRef = doc(db, INVENTORY_COLLECTION, docId);
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(materials)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(memoryDispatchesMap[fKey])),
    updatedAt: new Date().toISOString()
  }, { merge: true });
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
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(memoryDispatchesMap[fKey])),
    updatedAt: new Date().toISOString()
  });
}

export async function saveCloudDispatchOrders(orders: DispatchOrder[], factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  if (!Array.isArray(orders)) return;
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  memoryDispatchesMap[fKey] = orders;
  const docId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);
  const dspRef = doc(db, DISPATCH_COLLECTION, docId);
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(orders)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ================= 5. FINANCE & ACCOUNTS =================

export function subscribeToCloudFinance(
  onUpdate: (data: Partial<CloudFinanceData>) => void,
  onError?: (err: any) => void,
  factoryCode: string = DEFAULT_FACTORY_CODE
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;
  const fKey = getFactoryKey(factoryCode);
  const docId = getFactoryDocId(FINANCE_DOC_ID, factoryCode);

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
            const currentFin = memoryFinanceMap[fKey] || getInitialFinanceData();
            if (Array.isArray(data.employees)) currentFin.employees = data.employees;
            if (Array.isArray(data.electricityRecords)) currentFin.electricityRecords = data.electricityRecords;
            if (Array.isArray(data.expenses)) currentFin.expenses = data.expenses;
            if (Array.isArray(data.partyInvoices)) currentFin.partyInvoices = data.partyInvoices;
            if (Array.isArray(data.supplierPayables)) currentFin.supplierPayables = data.supplierPayables;
            if (Array.isArray(data.transactions)) currentFin.transactions = data.transactions;
            memoryFinanceMap[fKey] = currentFin;

            onUpdate({
              employees: Array.isArray(data.employees) ? data.employees : undefined,
              electricityRecords: Array.isArray(data.electricityRecords) ? data.electricityRecords : undefined,
              expenses: Array.isArray(data.expenses) ? data.expenses : undefined,
              partyInvoices: Array.isArray(data.partyInvoices) ? data.partyInvoices : undefined,
              supplierPayables: Array.isArray(data.supplierPayables) ? data.supplierPayables : undefined,
              transactions: Array.isArray(data.transactions) ? data.transactions : undefined,
            });
          }
        } else {
          // If active_finance is not yet in Firestore, seed it
          const finRef = doc(db, FINANCE_COLLECTION, docId);
          setDoc(finRef, {
            employees: [],
            electricityRecords: [],
            expenses: [],
            partyInvoices: [],
            supplierPayables: [],
            transactions: [],
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
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
  const fKey = getFactoryKey(factoryCode);
  if (!memoryFinanceMap[fKey]) memoryFinanceMap[fKey] = getInitialFinanceData();

  memoryFinanceMap[fKey] = {
    ...memoryFinanceMap[fKey],
    ...data
  };
  const docId = getFactoryDocId(FINANCE_DOC_ID, factoryCode);
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
}

export async function clearAllCloudFinance(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);
  memoryFinanceMap[fKey] = getInitialFinanceData();
  const docId = getFactoryDocId(FINANCE_DOC_ID, factoryCode);
  const finRef = doc(db, FINANCE_COLLECTION, docId);
  await setDoc(finRef, {
    ...memoryFinanceMap[fKey],
    updatedAt: new Date().toISOString()
  });
}

// ================= 6. RESET / CLEAR ORDERS =================

export async function clearAllCloudProductionOrders(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<void> {
  await ensureAuthReady();
  const fKey = getFactoryKey(factoryCode);

  memoryWorkflowMap[fKey] = [];
  memorySlipsMap[fKey] = [];
  memoryDispatchesMap[fKey] = [];

  const wfDocId = getFactoryDocId(WORKFLOW_DOC_ID, factoryCode);
  const slipsDocId = getFactoryDocId(ORDER_SLIPS_DOC_ID, factoryCode);
  const dspDocId = getFactoryDocId(DISPATCH_DOC_ID, factoryCode);

  const wfRef = doc(db, WORKFLOW_COLLECTION, wfDocId);
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, slipsDocId);
  const dspRef = doc(db, DISPATCH_COLLECTION, dspDocId);

  await Promise.all([
    setDoc(wfRef, { items: [], updatedAt: new Date().toISOString() }),
    setDoc(slipsRef, { slips: [], updatedAt: new Date().toISOString() }),
    setDoc(dspRef, { orders: [], updatedAt: new Date().toISOString() })
  ]);
}

export async function fetchCloudFinanceEmployees(factoryCode: string = DEFAULT_FACTORY_CODE): Promise<EmployeeRecord[]> {
  try {
    await ensureAuthReady();
    const docId = getFactoryDocId(FINANCE_DOC_ID, factoryCode);
    const finRef = doc(db, FINANCE_COLLECTION, docId);
    const snap = await getDoc(finRef);
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data?.employees) && data.employees.length > 0) {
        return data.employees;
      }
    }
  } catch (e) {
    console.warn(`Failed to fetch finance employees for ${factoryCode} from Firestore:`, e);
  }
  try {
    const saved = localStorage.getItem('factory_employees');
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
