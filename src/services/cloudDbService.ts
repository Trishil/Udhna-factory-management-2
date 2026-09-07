import { 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  getDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth, WORKFLOW_COLLECTION, ORDER_SLIPS_COLLECTION, INVENTORY_COLLECTION, DISPATCH_COLLECTION } from './firebaseService';
import { WorkflowItem, OrderSlip, RawMaterial, DispatchOrder } from '../types';

/**
 * PURE REAL-TIME CLOUD DATABASE ENGINE (Firebase Firestore)
 * 
 * Uses authoritative document snapshot listeners ('active_pipeline', 'active_slips', etc.)
 * which are guaranteed full read/write permissions by Firestore security rules.
 * Propagates sub-second updates across all computers, incognito windows, and mobile devices.
 */

// Authoritative pipeline document keys
const WORKFLOW_DOC_ID = 'active_pipeline';
const ORDER_SLIPS_DOC_ID = 'active_slips';
const INVENTORY_DOC_ID = 'active_inventory';
const DISPATCH_DOC_ID = 'active_dispatches';

// Local synchronized memory caches
let memoryWorkflow: WorkflowItem[] = [];
let memorySlips: OrderSlip[] = [];
let memoryMaterials: RawMaterial[] = [];
let memoryDispatches: DispatchOrder[] = [];

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

// ================= 5. RESET / CLEAR ORDERS =================

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
