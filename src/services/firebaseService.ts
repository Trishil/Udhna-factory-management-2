import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  uploadString,
  listAll
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { WorkflowItem, OrderSlip, RawMaterial, DispatchOrder } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Anonymous Auth so Firestore and Cloud Storage permissions work seamlessly
export const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  console.warn('Website Firebase anonymous auth notice:', err);
});

// Initialize Firestore with explicit databaseId
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);

// Initialize Firebase Storage
export const storage = getStorage(app);

export const WORKFLOW_COLLECTION = 'workflow_designs';
export const ORDER_SLIPS_COLLECTION = 'order_slips';
export const INVENTORY_COLLECTION = 'inventory_materials';
export const DISPATCH_COLLECTION = 'dispatch_orders';
export const MACHINES_COLLECTION = 'factory_machines';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  return errInfo;
}

/**
 * Validate connection to Firestore
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore client is currently offline or connecting...');
    }
    return false;
  }
}

/**
 * Upload an image file or base64 data URL to Firebase Storage
 * and return the public download URL
 */
export async function uploadDesignImage(
  designIdOrLot: string, 
  fileOrBase64: File | Blob | string,
  fileName?: string
): Promise<{ downloadUrl: string; storagePath: string }> {
  const timestamp = Date.now();
  const safeName = (fileName || `img_${timestamp}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `design_photos/${designIdOrLot}/${timestamp}_${safeName}`;
  const storageRef = ref(storage, storagePath);

  if (typeof fileOrBase64 === 'string') {
    const uploadResult = await uploadString(storageRef, fileOrBase64, 'data_url');
    const downloadUrl = await getDownloadURL(uploadResult.ref);
    return { downloadUrl, storagePath };
  } else {
    const snapshot = await uploadBytesResumable(storageRef, fileOrBase64, {
      contentType: fileOrBase64.type || 'image/jpeg',
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, storagePath };
  }
}

/**
 * Fetch all photos inside design_photos/{designNumber} and design_photos/{lotNumber} from Firebase Cloud Storage
 */
export async function fetchPhotosForDesign(designNumberOrLot: string): Promise<string[]> {
  try {
    if (!designNumberOrLot) return [];
    const cleanKey = designNumberOrLot.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folderRef = ref(storage, `design_photos/${cleanKey}`);
    const res = await listAll(folderRef);
    const urls: string[] = [];
    for (const itemRef of res.items) {
      const url = await getDownloadURL(itemRef);
      urls.push(url);
    }
    return urls;
  } catch (e) {
    return [];
  }
}

/**
 * Automatically find and link photos from Firebase Storage folders (e.g. design_photos/DSG-104/) to workflow items
 */
export async function attachStoragePhotosToWorkflowItems(items: WorkflowItem[]): Promise<WorkflowItem[]> {
  const updatedItems = await Promise.all(
    items.map(async (item) => {
      // If item already has a custom photo, keep it
      if (item.designImage && !item.designImage.includes('unsplash.com') && item.photos && item.photos.length > 0) {
        return item;
      }

      // Look in design_photos/{designNumber} and design_photos/{lotNumber}
      const candidates = [item.designNumber, item.lotNumber, item.jobNo].filter(Boolean) as string[];
      let foundUrls: string[] = [];
      for (const key of candidates) {
        const urls = await fetchPhotosForDesign(key);
        if (urls.length > 0) {
          foundUrls = urls;
          break;
        }
      }

      if (foundUrls.length > 0) {
        const newPhotos = foundUrls.map((u, i) => ({
          id: `storage-photo-${item.id}-${i}`,
          url: u,
          caption: `Photo for ${item.designNumber || item.lotNumber}`,
          stageCapturedAt: item.currentStage,
          timestamp: item.date || new Date().toISOString()
        }));

        return {
          ...item,
          designImage: foundUrls[0],
          photos: newPhotos
        };
      }

      return item;
    })
  );

  return updatedItems;
}

/**
 * Save or update a workflow design item in Firestore (Bidirectional sync with Android)
 */
export async function saveDesignToFirestore(item: WorkflowItem): Promise<void> {
  try {
    const docRef = doc(db, WORKFLOW_COLLECTION, item.id);
    const cleanItem = JSON.parse(JSON.stringify(item));
    await setDoc(docRef, {
      ...cleanItem,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${WORKFLOW_COLLECTION}/${item.id}`);
  }
}

/**
 * Delete a workflow design item from Firestore
 */
export async function deleteDesignFromFirestore(itemId: string): Promise<void> {
  try {
    const docRef = doc(db, WORKFLOW_COLLECTION, itemId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${WORKFLOW_COLLECTION}/${itemId}`);
  }
}

/**
 * Subscribe to real-time updates of workflow designs from Firestore
 */
export function subscribeToDesigns(
  onUpdate: (items: WorkflowItem[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, WORKFLOW_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: WorkflowItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WorkflowItem;
        items.push(data);
      });
      onUpdate(items);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, WORKFLOW_COLLECTION);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update a Party Order Slip in Firestore
 */
export async function saveOrderSlipToFirestore(slip: OrderSlip): Promise<void> {
  try {
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, slip.id);
    const cleanSlip = JSON.parse(JSON.stringify(slip));
    await setDoc(docRef, {
      ...cleanSlip,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${ORDER_SLIPS_COLLECTION}/${slip.id}`);
  }
}

/**
 * Delete a Party Order Slip from Firestore
 */
export async function deleteOrderSlipFromFirestore(slipId: string): Promise<void> {
  try {
    const docRef = doc(db, ORDER_SLIPS_COLLECTION, slipId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${ORDER_SLIPS_COLLECTION}/${slipId}`);
  }
}

/**
 * Subscribe to real-time updates of Party Order Slips from Firestore
 */
export function subscribeToOrderSlips(
  onUpdate: (slips: OrderSlip[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, ORDER_SLIPS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const slips: OrderSlip[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as OrderSlip;
        slips.push(data);
      });
      onUpdate(slips);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, ORDER_SLIPS_COLLECTION);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update Raw Material SKU in Firestore (Live Inventory stock sync)
 */
export async function saveMaterialToFirestore(material: RawMaterial): Promise<void> {
  try {
    const docRef = doc(db, INVENTORY_COLLECTION, material.id);
    const cleanMat = JSON.parse(JSON.stringify(material));
    await setDoc(docRef, {
      ...cleanMat,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${INVENTORY_COLLECTION}/${material.id}`);
  }
}

/**
 * Delete Raw Material SKU from Firestore
 */
export async function deleteMaterialFromFirestore(materialId: string): Promise<void> {
  try {
    const docRef = doc(db, INVENTORY_COLLECTION, materialId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${INVENTORY_COLLECTION}/${materialId}`);
  }
}

/**
 * Subscribe to live Raw Material stock changes from Firestore
 */
export function subscribeToMaterials(
  onUpdate: (materials: RawMaterial[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, INVENTORY_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const materials: RawMaterial[] = [];
      snapshot.forEach((docSnap) => {
        materials.push(docSnap.data() as RawMaterial);
      });
      onUpdate(materials);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, INVENTORY_COLLECTION);
      if (onError) onError(err);
    }
  );
}

/**
 * Save or update Dispatch Order in Firestore
 */
export async function saveDispatchOrderToFirestore(dispatch: DispatchOrder): Promise<void> {
  try {
    const docRef = doc(db, DISPATCH_COLLECTION, dispatch.id);
    const cleanDispatch = JSON.parse(JSON.stringify(dispatch));
    await setDoc(docRef, {
      ...cleanDispatch,
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${DISPATCH_COLLECTION}/${dispatch.id}`);
  }
}

/**
 * Delete Dispatch Order from Firestore
 */
export async function deleteDispatchOrderFromFirestore(dispatchId: string): Promise<void> {
  try {
    const docRef = doc(db, DISPATCH_COLLECTION, dispatchId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${DISPATCH_COLLECTION}/${dispatchId}`);
  }
}

/**
 * Subscribe to live Dispatch Orders from Firestore
 */
export function subscribeToDispatchOrders(
  onUpdate: (dispatches: DispatchOrder[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, DISPATCH_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const dispatches: DispatchOrder[] = [];
      snapshot.forEach((docSnap) => {
        dispatches.push(docSnap.data() as DispatchOrder);
      });
      onUpdate(dispatches);
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, DISPATCH_COLLECTION);
      if (onError) onError(err);
    }
  );
}

