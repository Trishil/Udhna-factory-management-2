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
  StockTransaction
} from '../types';
import { INITIAL_MATERIALS } from '../data/initialData';

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

export interface CloudFinanceData {
  employees: EmployeeRecord[];
  electricityRecords: ElectricityUsageRecord[];
  expenses: OperationalExpense[];
  partyInvoices: PartyInvoice[];
  supplierPayables: SupplierPayable[];
  transactions: StockTransaction[];
}

// Local synchronized memory caches
let memoryWorkflow: WorkflowItem[] = [];
let memorySlips: OrderSlip[] = [];
let memoryMaterials: RawMaterial[] = [];
let memoryDispatches: DispatchOrder[] = [];
let memoryFinance: CloudFinanceData = {
  employees: [],
  electricityRecords: [],
  expenses: [],
  partyInvoices: [],
  supplierPayables: [],
  transactions: []
};

// Ensure Firebase Auth is ready before any operation
let authPromise: Promise<any> | null = null;
export function ensureAuthReady(): Promise<any> {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authPromise) {
    authPromise = new Promise((resolve) => {
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      });
      signInAnonymously(auth).catch((err) => {
        console.warn('Anonymous auth initialization note:', err);
      });
    });
  }
  return authPromise;
}

// ================= 1. WORKFLOW DESIGNS =================

export function subscribeToCloudWorkflow(
  onUpdate: (items: WorkflowItem[]) => void,
  onError?: (err: any) => void
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, WORKFLOW_COLLECTION, WORKFLOW_DOC_ID);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.items)) {
            memoryWorkflow = data.items;
            onUpdate(memoryWorkflow);
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

export async function saveCloudWorkflowItem(item: WorkflowItem): Promise<void> {
  if (!item || !item.id) return;
  await ensureAuthReady();

  // 1. Update memory
  const idx = memoryWorkflow.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    memoryWorkflow[idx] = item;
  } else {
    memoryWorkflow.unshift(item);
  }

  // 2. Save individual document
  const safeId = String(item.id).replace(/[\/\s#?]/g, '_');
  const indDocRef = doc(db, WORKFLOW_COLLECTION, safeId);
  const cleanItem = JSON.parse(JSON.stringify(item));
  setDoc(indDocRef, cleanItem, { merge: true }).catch(() => {});

  // 3. Atomically update authoritative real-time pipeline document
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, WORKFLOW_DOC_ID);
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflow)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteCloudWorkflowItem(itemId: string): Promise<void> {
  if (!itemId) return;
  await ensureAuthReady();

  // 1. Update memory
  memoryWorkflow = memoryWorkflow.filter(i => i.id !== itemId);

  // 2. Delete individual document
  const safeId = String(itemId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, WORKFLOW_COLLECTION, safeId)).catch(() => {});

  // 3. Atomically update authoritative pipeline document
  const pipelineRef = doc(db, WORKFLOW_COLLECTION, WORKFLOW_DOC_ID);
  await setDoc(pipelineRef, {
    items: JSON.parse(JSON.stringify(memoryWorkflow)),
    updatedAt: new Date().toISOString()
  });
}

// ================= 2. MASTER ORDER SLIPS =================

export function subscribeToCloudOrderSlips(
  onUpdate: (slips: OrderSlip[]) => void,
  onError?: (err: any) => void
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, ORDER_SLIPS_DOC_ID);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.slips)) {
            memorySlips = data.slips;
            onUpdate(memorySlips);
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

export async function saveCloudOrderSlip(slip: OrderSlip): Promise<void> {
  if (!slip || (!slip.id && !slip.jobNo)) return;
  await ensureAuthReady();

  const id = slip.id || `slip-${slip.jobNo}`;
  const slipWithId = { ...slip, id };

  // 1. Update memory
  const idx = memorySlips.findIndex(s => s.id === id || s.jobNo === slip.jobNo);
  if (idx >= 0) {
    memorySlips[idx] = slipWithId;
  } else {
    memorySlips.unshift(slipWithId);
  }

  // 2. Save individual document
  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  const indDocRef = doc(db, ORDER_SLIPS_COLLECTION, safeId);
  const cleanSlip = JSON.parse(JSON.stringify(slipWithId));
  setDoc(indDocRef, cleanSlip, { merge: true }).catch(() => {});

  // 3. Atomically update authoritative slips document
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, ORDER_SLIPS_DOC_ID);
  await setDoc(slipsRef, {
    slips: JSON.parse(JSON.stringify(memorySlips)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteCloudOrderSlip(slipId: string): Promise<void> {
  if (!slipId) return;
  await ensureAuthReady();

  // 1. Update memory
  memorySlips = memorySlips.filter(s => s.id !== slipId && s.jobNo !== slipId);

  // 2. Delete individual document
  const safeId = String(slipId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, ORDER_SLIPS_COLLECTION, safeId)).catch(() => {});

  // 3. Atomically update authoritative slips document
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, ORDER_SLIPS_DOC_ID);
  await setDoc(slipsRef, {
    slips: JSON.parse(JSON.stringify(memorySlips)),
    updatedAt: new Date().toISOString()
  });
}

// ================= 3. INVENTORY & MATERIALS =================

export function subscribeToCloudInventory(
  onUpdate: (materials: RawMaterial[]) => void,
  onError?: (err: any) => void
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, INVENTORY_COLLECTION, INVENTORY_DOC_ID);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.materials)) {
            memoryMaterials = data.materials;
            onUpdate(memoryMaterials);
            return;
          }
        } else {
          // If active_inventory is not yet in Firestore, seed it with INITIAL_MATERIALS
          const invRef = doc(db, INVENTORY_COLLECTION, INVENTORY_DOC_ID);
          setDoc(invRef, {
            materials: JSON.parse(JSON.stringify(INITIAL_MATERIALS)),
            updatedAt: new Date().toISOString()
          }, { merge: true }).catch(() => {});
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

export async function saveCloudMaterial(material: RawMaterial): Promise<void> {
  if (!material) return;
  await ensureAuthReady();

  const id = material.id || material.code || `mat-${Date.now()}`;
  const matWithId = { ...material, id };

  const idx = memoryMaterials.findIndex(m => m.id === id);
  if (idx >= 0) {
    memoryMaterials[idx] = matWithId;
  } else {
    memoryMaterials.unshift(matWithId);
  }

  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  setDoc(doc(db, INVENTORY_COLLECTION, safeId), JSON.parse(JSON.stringify(matWithId)), { merge: true }).catch(() => {});

  const invRef = doc(db, INVENTORY_COLLECTION, INVENTORY_DOC_ID);
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(memoryMaterials)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteCloudMaterial(materialId: string): Promise<void> {
  if (!materialId) return;
  await ensureAuthReady();

  memoryMaterials = memoryMaterials.filter(m => m.id !== materialId);
  const safeId = String(materialId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, INVENTORY_COLLECTION, safeId)).catch(() => {});

  const invRef = doc(db, INVENTORY_COLLECTION, INVENTORY_DOC_ID);
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(memoryMaterials)),
    updatedAt: new Date().toISOString()
  });
}

export async function saveCloudMaterials(materials: RawMaterial[]): Promise<void> {
  if (!Array.isArray(materials)) return;
  await ensureAuthReady();
  memoryMaterials = materials;
  const invRef = doc(db, INVENTORY_COLLECTION, INVENTORY_DOC_ID);
  await setDoc(invRef, {
    materials: JSON.parse(JSON.stringify(materials)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ================= 4. DISPATCH ORDERS =================

export function subscribeToCloudDispatch(
  onUpdate: (orders: DispatchOrder[]) => void,
  onError?: (err: any) => void
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, DISPATCH_COLLECTION, DISPATCH_DOC_ID);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (Array.isArray(data?.orders)) {
            memoryDispatches = data.orders;
            onUpdate(memoryDispatches);
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

export async function saveCloudDispatchOrder(order: DispatchOrder): Promise<void> {
  if (!order || !order.dispatchNumber) return;
  await ensureAuthReady();

  const id = order.id || `dsp-${order.dispatchNumber}`;
  const orderWithId = { ...order, id };

  const idx = memoryDispatches.findIndex(d => d.id === id || d.dispatchNumber === order.dispatchNumber);
  if (idx >= 0) {
    memoryDispatches[idx] = orderWithId;
  } else {
    memoryDispatches.unshift(orderWithId);
  }

  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  setDoc(doc(db, DISPATCH_COLLECTION, safeId), JSON.parse(JSON.stringify(orderWithId)), { merge: true }).catch(() => {});

  const dspRef = doc(db, DISPATCH_COLLECTION, DISPATCH_DOC_ID);
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(memoryDispatches)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

export async function deleteCloudDispatchOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  await ensureAuthReady();

  memoryDispatches = memoryDispatches.filter(d => d.id !== orderId && d.dispatchNumber !== orderId);
  const safeId = String(orderId).replace(/[\/\s#?]/g, '_');
  deleteDoc(doc(db, DISPATCH_COLLECTION, safeId)).catch(() => {});

  const dspRef = doc(db, DISPATCH_COLLECTION, DISPATCH_DOC_ID);
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(memoryDispatches)),
    updatedAt: new Date().toISOString()
  });
}

export async function saveCloudDispatchOrders(orders: DispatchOrder[]): Promise<void> {
  if (!Array.isArray(orders)) return;
  await ensureAuthReady();
  memoryDispatches = orders;
  const dspRef = doc(db, DISPATCH_COLLECTION, DISPATCH_DOC_ID);
  await setDoc(dspRef, {
    orders: JSON.parse(JSON.stringify(orders)),
    updatedAt: new Date().toISOString()
  }, { merge: true });
}

// ================= 5. FINANCE & ACCOUNTS =================

export function subscribeToCloudFinance(
  onUpdate: (data: Partial<CloudFinanceData>) => void,
  onError?: (err: any) => void
) {
  let unsubListener: (() => void) | null = null;
  let isCancelled = false;

  ensureAuthReady().then(() => {
    if (isCancelled) return;
    const docRef = doc(db, FINANCE_COLLECTION, FINANCE_DOC_ID);

    unsubListener = onSnapshot(
      docRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as any;
          if (data) {
            if (Array.isArray(data.employees)) memoryFinance.employees = data.employees;
            if (Array.isArray(data.electricityRecords)) memoryFinance.electricityRecords = data.electricityRecords;
            if (Array.isArray(data.expenses)) memoryFinance.expenses = data.expenses;
            if (Array.isArray(data.partyInvoices)) memoryFinance.partyInvoices = data.partyInvoices;
            if (Array.isArray(data.supplierPayables)) memoryFinance.supplierPayables = data.supplierPayables;
            if (Array.isArray(data.transactions)) memoryFinance.transactions = data.transactions;

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
          const finRef = doc(db, FINANCE_COLLECTION, FINANCE_DOC_ID);
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

export async function saveCloudFinance(data: Partial<CloudFinanceData>): Promise<void> {
  await ensureAuthReady();
  memoryFinance = {
    ...memoryFinance,
    ...data
  };
  const finRef = doc(db, FINANCE_COLLECTION, FINANCE_DOC_ID);
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

export async function clearAllCloudFinance(): Promise<void> {
  await ensureAuthReady();
  memoryFinance = {
    employees: [],
    electricityRecords: [],
    expenses: [],
    partyInvoices: [],
    supplierPayables: [],
    transactions: []
  };
  const finRef = doc(db, FINANCE_COLLECTION, FINANCE_DOC_ID);
  await setDoc(finRef, {
    ...memoryFinance,
    updatedAt: new Date().toISOString()
  });
}

// ================= 6. RESET / CLEAR ORDERS =================

export async function clearAllCloudProductionOrders(): Promise<void> {
  await ensureAuthReady();

  memoryWorkflow = [];
  memorySlips = [];
  memoryDispatches = [];

  const wfRef = doc(db, WORKFLOW_COLLECTION, WORKFLOW_DOC_ID);
  const slipsRef = doc(db, ORDER_SLIPS_COLLECTION, ORDER_SLIPS_DOC_ID);
  const dspRef = doc(db, DISPATCH_COLLECTION, DISPATCH_DOC_ID);

  await Promise.all([
    setDoc(wfRef, { items: [], updatedAt: new Date().toISOString() }),
    setDoc(slipsRef, { slips: [], updatedAt: new Date().toISOString() }),
    setDoc(dspRef, { orders: [], updatedAt: new Date().toISOString() })
  ]);
}
