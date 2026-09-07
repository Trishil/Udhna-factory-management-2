import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, WORKFLOW_COLLECTION, ORDER_SLIPS_COLLECTION, INVENTORY_COLLECTION, DISPATCH_COLLECTION } from './firebaseService';
import { WorkflowItem, OrderSlip, RawMaterial, DispatchOrder } from '../types';

/**
 * PURE REAL-TIME CLOUD DATABASE ENGINE (Firebase Firestore)
 * Single Source of Truth across all computers and mobile devices.
 */

// ================= 1. WORKFLOW DESIGNS =================

export function subscribeToCloudWorkflow(
  onUpdate: (items: WorkflowItem[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, WORKFLOW_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: WorkflowItem[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data && data.id) {
          list.push({
            ...data,
            id: data.id || d.id
          });
        }
      });
      // Sort newest first or by lot number
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Cloud Workflow live subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveCloudWorkflowItem(item: WorkflowItem): Promise<void> {
  if (!item || !item.id) return;
  const safeId = String(item.id).replace(/[\/\s#?]/g, '_');
  const docRef = doc(db, WORKFLOW_COLLECTION, safeId);
  const cleanItem = JSON.parse(JSON.stringify(item));
  await setDoc(docRef, cleanItem, { merge: true });
}

export async function deleteCloudWorkflowItem(itemId: string): Promise<void> {
  if (!itemId) return;
  const safeId = String(itemId).replace(/[\/\s#?]/g, '_');
  await deleteDoc(doc(db, WORKFLOW_COLLECTION, safeId));
}

// ================= 2. MASTER ORDER SLIPS =================

export function subscribeToCloudOrderSlips(
  onUpdate: (slips: OrderSlip[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, ORDER_SLIPS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: OrderSlip[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data && (data.id || data.jobNo)) {
          list.push({
            ...data,
            id: data.id || d.id
          });
        }
      });
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Cloud Order Slips live subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveCloudOrderSlip(slip: OrderSlip): Promise<void> {
  if (!slip || (!slip.id && !slip.jobNo)) return;
  const id = slip.id || `slip-${slip.jobNo}`;
  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  const docRef = doc(db, ORDER_SLIPS_COLLECTION, safeId);
  const cleanSlip = JSON.parse(JSON.stringify({ ...slip, id }));
  await setDoc(docRef, cleanSlip, { merge: true });
}

export async function deleteCloudOrderSlip(slipId: string): Promise<void> {
  if (!slipId) return;
  const safeId = String(slipId).replace(/[\/\s#?]/g, '_');
  await deleteDoc(doc(db, ORDER_SLIPS_COLLECTION, safeId));
}

// ================= 3. INVENTORY & MATERIALS =================

export function subscribeToCloudInventory(
  onUpdate: (materials: RawMaterial[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, INVENTORY_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: RawMaterial[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data && data.name) {
          list.push({
            ...data,
            id: data.id || d.id
          });
        }
      });
      onUpdate(list);
    },
    (err) => {
      console.warn('Cloud Inventory live subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveCloudMaterial(material: RawMaterial): Promise<void> {
  if (!material) return;
  const id = material.id || material.code || `mat-${Date.now()}`;
  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  const docRef = doc(db, INVENTORY_COLLECTION, safeId);
  const cleanMat = JSON.parse(JSON.stringify({ ...material, id }));
  await setDoc(docRef, cleanMat, { merge: true });
}

export async function deleteCloudMaterial(materialId: string): Promise<void> {
  if (!materialId) return;
  const safeId = String(materialId).replace(/[\/\s#?]/g, '_');
  await deleteDoc(doc(db, INVENTORY_COLLECTION, safeId));
}

// ================= 4. DISPATCH ORDERS =================

export function subscribeToCloudDispatch(
  onUpdate: (orders: DispatchOrder[]) => void,
  onError?: (err: any) => void
) {
  const colRef = collection(db, DISPATCH_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: DispatchOrder[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as any;
        if (data && data.dispatchNumber) {
          list.push({
            ...data,
            id: data.id || d.id
          });
        }
      });
      list.sort((a, b) => (b.readyDate || '').localeCompare(a.readyDate || ''));
      onUpdate(list);
    },
    (err) => {
      console.warn('Cloud Dispatch live subscription error:', err);
      if (onError) onError(err);
    }
  );
}

export async function saveCloudDispatchOrder(order: DispatchOrder): Promise<void> {
  if (!order || !order.dispatchNumber) return;
  const id = order.id || `dsp-${order.dispatchNumber}`;
  const safeId = String(id).replace(/[\/\s#?]/g, '_');
  const docRef = doc(db, DISPATCH_COLLECTION, safeId);
  const cleanOrder = JSON.parse(JSON.stringify({ ...order, id }));
  await setDoc(docRef, cleanOrder, { merge: true });
}

export async function deleteCloudDispatchOrder(orderId: string): Promise<void> {
  if (!orderId) return;
  const safeId = String(orderId).replace(/[\/\s#?]/g, '_');
  await deleteDoc(doc(db, DISPATCH_COLLECTION, safeId));
}

// ================= 5. RESET / CLEAR ORDERS =================

export async function clearAllCloudProductionOrders(): Promise<void> {
  const cols = [WORKFLOW_COLLECTION, ORDER_SLIPS_COLLECTION, DISPATCH_COLLECTION];
  for (const colName of cols) {
    try {
      const snap = await getDocs(collection(db, colName));
      const batch = writeBatch(db);
      snap.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    } catch (e) {
      console.warn(`Error clearing collection ${colName}:`, e);
    }
  }
}
