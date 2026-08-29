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
  getDocFromServer,
  getDocs
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
import { WorkflowItem, OrderSlip, RawMaterial, DispatchOrder, WorkflowStageId } from '../types';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Anonymous Auth so Firestore and Cloud Storage permissions work seamlessly
export const auth = getAuth(app);
signInAnonymously(auth).catch((err) => {
  console.warn('Website Firebase anonymous auth notice:', err);
});

// Initialize Firestore with optional explicit databaseId
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

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
      const hasValidCustomPhoto = Boolean(
        item.designImage && 
        item.designImage.startsWith('http') && 
        !item.designImage.includes('unsplash.com') && 
        item.photos && 
        item.photos.length > 0 &&
        item.photos.some(p => p.url && p.url.startsWith('http'))
      );

      // If item already has a valid cloud photo URL, keep it
      if (hasValidCustomPhoto) {
        return item;
      }

      // Look in design_photos/{lotNumber}, design_photos/{id}, and design_photos/{jobNo} FIRST
      const candidates = [item.lotNumber, item.id, item.jobNo].filter(Boolean) as string[];
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
          caption: `Photo for ${item.lotNumber || item.designNumber}`,
          stageCapturedAt: item.currentStage,
          timestamp: item.date || new Date().toISOString()
        }));

        return {
          ...item,
          designImage: foundUrls[0],
          photos: newPhotos
        };
      }

      // If no lot-specific photos, sanitize any broken file:// URIs
      const cleanDesignImage = (item.designImage && item.designImage.startsWith('http')) ? item.designImage : undefined;
      const cleanPhotos = (item.photos || []).filter(p => p.url && p.url.startsWith('http'));

      return {
        ...item,
        designImage: cleanDesignImage,
        photos: cleanPhotos
      };
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

export function normalizeStageForWeb(rawStage: string): WorkflowStageId {
  const s = String(rawStage || '').toLowerCase().trim();
  if (s === 'patta' || s === 'stitching_patta' || s.includes('patta') || s.includes('stitching')) return 'stitching_patta';
  if (s === 'chalan' || s.includes('chalan') || s.includes('slip')) return 'chalan';
  if (s === 'inspection' || s.includes('insp-1') || (s.includes('inspection') && !s.includes('alter'))) return 'inspection';
  if (s === 'embroidery' || s.includes('embroidery')) return 'embroidery';
  if (s === 'dhaga_cutting' || s.includes('dhaga') || s.includes('cutting') || s.includes('trimming')) return 'dhaga_cutting';
  if (s === 'inspection_alter' || s.includes('insp-2') || s.includes('alter inspection')) return 'inspection_alter';
  if (s === 'altering' || s.includes('altering') || s.includes('rework')) return 'altering';
  if (s === 'folding' || s.includes('folding') || s.includes('packing')) return 'folding';
  if (s === 'prepare_dispatch' || s.includes('dispatch')) return 'prepare_dispatch';
  return 'fabric';
}

export function formatDirectImageUrl(rawUrl: string): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const url = rawUrl.trim();

  // If already Firebase Storage, Google CDN, or base64, return as is
  if (url.includes('firebasestorage.googleapis.com') || url.includes('firebasestorage.app') || url.includes('lh3.googleusercontent.com') || url.startsWith('data:image')) {
    return url;
  }

  // Convert Google Drive view URLs to direct CDN image URLs
  if (url.includes('drive.google.com')) {
    let fileId = '';
    const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch) {
      fileId = fileDMatch[1];
    } else {
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idMatch) {
        fileId = idMatch[1];
      }
    }

    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }

  return url;
}

export function mapFirestoreDocToWorkflowItem(data: any, docId: string): WorkflowItem {
  const currentStage = normalizeStageForWeb(data.currentStage || data.stage);
  const lotNumber = data.lotNumber || data.jobNo || `LOT-${docId.slice(-4)}`;
  const partyName = data.partyOrClientName || data.partyName || data.clientName || 'Direct Client';
  const designNumber = data.designNumber || `DSG-100`;
  const quantity = Number(data.quantity) || Number(data.pieces) || 50;

  const photos = Array.isArray(data.photos) ? data.photos.map((p: any) => ({
    id: p.id || `photo-${Date.now()}`,
    url: formatDirectImageUrl(p.url || ''),
    storagePath: p.storagePath || '',
    caption: p.caption || '',
    stageCapturedAt: normalizeStageForWeb(p.stageCapturedAt || currentStage),
    capturedBy: p.capturedBy || 'Operator',
    timestamp: p.timestamp || new Date().toISOString(),
    deviceSource: p.deviceSource || 'android_app',
    metadata: p.metadata || {}
  })) : [];

  const stageHistory = Array.isArray(data.stageHistory || data.history) ? (data.stageHistory || data.history).map((h: any) => ({
    stageId: normalizeStageForWeb(h.stageId || h.toStage || h.stage || currentStage),
    stageName: h.stageName || h.displayName || currentStage,
    enteredAt: h.enteredAt || h.timestamp || new Date().toISOString(),
    operatorName: h.operatorName || h.operator || 'Floor Lead',
    notes: h.notes || h.note || '',
    qualityStatus: h.qualityStatus
  })) : [];

  const cleanPhotos = photos.filter((p: any) => p && p.url && String(p.url).startsWith('http'));
  const rawDesignImg = formatDirectImageUrl(data.designImage || '');
  const cleanDesignImg = (rawDesignImg && rawDesignImg.startsWith('http')) ? rawDesignImg : (cleanPhotos[0]?.url || undefined);

  return {
    id: data.id || docId,
    lotNumber,
    jobNo: data.jobNo || lotNumber,
    designNumber,
    designName: data.designName || 'Textile Design',
    fabricType: data.fabricType || 'Silk Georgette',
    fabricColor: data.fabricColor || 'Natural',
    quantity,
    pieces: quantity,
    unit: data.unit || 'sarees',
    partyOrClientName: partyName,
    partyName,
    chalanNumber: data.chalanNumber || data.challanSlip || 'CHL-2026',
    date: data.date || data.createdDate || new Date().toISOString().split('T')[0],
    createdDate: data.createdDate || data.date || new Date().toISOString().split('T')[0],
    dueDate: data.dueDate,
    currentStage,
    priority: (data.priority === 'urgent' || data.isUrgent) ? 'urgent' : (data.priority === 'high' ? 'high' : 'normal'),
    initialInspectionResult: data.initialInspectionResult || 'good',
    alterInspectionResult: data.alterInspectionResult || (data.qualityStatus === 'NEEDS_ALTERATION' ? 'needs_alter' : 'passed'),
    alterationReason: data.alterationReason,
    assignedOperator: data.assignedOperator || 'Floor Lead',
    designImage: cleanDesignImg,
    photos: cleanPhotos,
    customMetadata: Array.isArray(data.customMetadata) ? data.customMetadata : [],
    stageHistory,
    isReturned: data.isReturned || false,
    isDispatched: data.isDispatched || false,
    lastSyncedWithFirebase: data.lastSyncedWithFirebase || new Date().toISOString()
  };
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
        const data = docSnap.data();
        if (data) {
          items.push(mapFirestoreDocToWorkflowItem(data, docSnap.id));
        }
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
 * Wipes all existing order slips and workflow designs from Firestore
 * (Used when starting fresh or clearing all orders)
 */
export async function clearAllFirestoreOrders(): Promise<void> {
  try {
    const slipSnap = await getDocs(collection(db, ORDER_SLIPS_COLLECTION));
    const deleteSlipPromises = slipSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteSlipPromises);

    const designSnap = await getDocs(collection(db, WORKFLOW_COLLECTION));
    const deleteDesignPromises = designSnap.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deleteDesignPromises);
  } catch (error) {
    console.warn('Error clearing Firestore orders:', error);
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

export const COMPANY_CONFIG_COLLECTION = 'factory_company_config';
export const ACTIVE_SPREADSHEET_DOC = 'active_spreadsheet';

export interface CompanySpreadsheetConfig {
  sheetId: string;
  sheetUrl: string;
  scriptUrl?: string;
  deploymentId?: string;
  ownerEmail?: string;
  title?: string;
  companyName?: string;
  updatedAt?: string;
}

/**
 * Save Active Company Spreadsheet configuration globally to Firestore
 */
export async function saveCompanySpreadsheetConfig(config: CompanySpreadsheetConfig): Promise<void> {
  try {
    const docRef = doc(db, COMPANY_CONFIG_COLLECTION, ACTIVE_SPREADSHEET_DOC);
    await setDoc(docRef, {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedAtServer: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${COMPANY_CONFIG_COLLECTION}/${ACTIVE_SPREADSHEET_DOC}`);
  }
}

/**
 * Subscribe to Active Company Spreadsheet configuration globally from Firestore
 */
export function subscribeToCompanySpreadsheetConfig(
  onUpdate: (config: CompanySpreadsheetConfig) => void,
  onError?: (error: Error) => void
) {
  const docRef = doc(db, COMPANY_CONFIG_COLLECTION, ACTIVE_SPREADSHEET_DOC);
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data() as CompanySpreadsheetConfig);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, `${COMPANY_CONFIG_COLLECTION}/${ACTIVE_SPREADSHEET_DOC}`);
      if (onError) onError(err);
    }
  );
}


