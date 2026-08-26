import { RawMaterial, SyncConfig, WorkflowItem, OrderSlip, DispatchOrder, IndividualPieceUnit, WorkflowStageId, PartyInvoice, SupplierPayable, EmployeeRecord, OperationalExpense } from '../types';

export interface SheetFetchResult {
  success: boolean;
  inventory?: RawMaterial[];
  workflow?: WorkflowItem[];
  orderSlips?: OrderSlip[];
  pieces?: IndividualPieceUnit[];
  dispatchOrders?: DispatchOrder[];
  partyInvoices?: PartyInvoice[];
  supplierPayables?: SupplierPayable[];
  employees?: EmployeeRecord[];
  expenses?: OperationalExpense[];
  message: string;
  timestamp: string;
}

export function parseStageFromText(stageText: string): WorkflowStageId {
  const lower = String(stageText || '').toLowerCase();
  if (lower.includes('fabric') || lower.includes('inward') || lower.includes('1.')) return 'fabric';
  if (lower.includes('chalan') || lower.includes('slip') || lower.includes('2.')) return 'chalan';
  if (lower.includes('insp-1') || (lower.includes('inspection') && !lower.includes('alter')) || lower.includes('3.')) return 'inspection';
  if (lower.includes('patta') || lower.includes('stitching') || lower.includes('4.')) return 'stitching_patta';
  if (lower.includes('embroidery') || lower.includes('5.')) return 'embroidery';
  if (lower.includes('dhaga') || lower.includes('cutting') || lower.includes('6.')) return 'dhaga_cutting';
  if (lower.includes('insp-2') || lower.includes('alter inspection') || lower.includes('7.')) return 'inspection_alter';
  if (lower.includes('altering') || lower.includes('rework') || lower.includes('8.')) return 'altering';
  if (lower.includes('folding') || lower.includes('packing') || lower.includes('9.')) return 'folding';
  if (lower.includes('dispatch') || lower.includes('10.')) return 'prepare_dispatch';
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

export async function pushItemToGoogleSheets(config: SyncConfig, item: Partial<WorkflowItem> & Record<string, any>): Promise<void> {
  const endpoint = config.scriptUrl || `https://script.google.com/macros/s/${config.deploymentId}/exec`;
  if (!endpoint) return;
  try {
    const photoUrl = (item.designImage && item.designImage.startsWith('http'))
      ? item.designImage
      : (item.photos?.find((p: any) => p.url && p.url.startsWith('http'))?.url || '');

    const encoded = encodeURIComponent(JSON.stringify({
      lotNumber: item.lotNumber || item.jobNo,
      partyName: item.partyName || item.partyOrClientName,
      clientName: item.partyName || item.partyOrClientName,
      chalanNumber: item.chalanNumber || item.chalanNo,
      challanSlip: item.chalanNumber || item.chalanNo,
      designNumber: item.designNumber,
      designName: item.designName,
      fabricType: item.fabricType,
      fabricColor: item.fabricColor,
      quantity: item.pieces ?? item.quantity,
      currentStage: item.currentStage,
      priority: item.priority,
      isUrgent: item.priority === 'urgent' || item.priority === 'high',
      qualityStatus: item.initialInspectionResult === 'good' ? 'GOOD' : 'NEEDS_ALTERATION',
      dueDate: item.dueDate || item.date,
      photoUrl: photoUrl,
      notes: item.notes || (photoUrl ? `Photo: ${photoUrl}` : '')
    }));
    await fetch(`${endpoint}?action=update_stage&data=${encoded}`, { method: 'GET' });
  } catch (e) {
    console.warn('Google Apps Script push error:', e);
  }
}

export async function pushStockTransactionToAppsScript(
  config: SyncConfig,
  tx: any,
  material: RawMaterial
): Promise<void> {
  const endpoint = config.scriptUrl || (config.deploymentId ? `https://script.google.com/macros/s/${config.deploymentId}/exec` : null);
  if (!endpoint) return;

  const payload = {
    action: 'log_stock_transaction',
    sku: material.code || material.name,
    itemSku: material.code || material.name,
    name: material.name,
    itemName: material.name,
    category: material.category,
    type: tx.type || 'IN',
    quantity: tx.quantity || 1,
    currentStock: material.currentStock,
    unit: material.unit,
    operator: tx.operator || 'Warehouse Supervisor',
    orderRef: tx.orderRef || tx.machineOrOrderRef || '',
    notes: tx.notes || '',
    timestamp: tx.timestamp || new Date().toISOString()
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(payload));
      await fetch(`${endpoint}?action=log_stock_transaction&data=${encoded}`, { method: 'GET' });
    } catch (err) {
      console.warn('Stock transaction push error:', err);
    }
  }
}

export async function pushDispatchOrderToAppsScript(
  config: SyncConfig,
  order: DispatchOrder
): Promise<void> {
  const endpoint = config.scriptUrl || (config.deploymentId ? `https://script.google.com/macros/s/${config.deploymentId}/exec` : null);
  if (!endpoint) return;

  const payload = {
    action: 'update_dispatch',
    order,
    ...order
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(order));
      await fetch(`${endpoint}?action=update_dispatch&data=${encoded}`, { method: 'GET' });
    } catch (err) {
      console.warn('Dispatch push error:', err);
    }
  }
}

export async function pushMaterialToAppsScript(
  config: SyncConfig,
  material: RawMaterial
): Promise<void> {
  const endpoint = config.scriptUrl || (config.deploymentId ? `https://script.google.com/macros/s/${config.deploymentId}/exec` : null);
  if (!endpoint) return;

  const payload = {
    action: 'save_material',
    material,
    ...material
  };

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    try {
      const encoded = encodeURIComponent(JSON.stringify(material));
      await fetch(`${endpoint}?action=save_material&data=${encoded}`, { method: 'GET' });
    } catch (err) {
      console.warn('Material push error:', err);
    }
  }
}

export async function pushDeleteMaterialToAppsScript(
  config: SyncConfig,
  materialIdOrSku: string
): Promise<void> {
  const endpoint = config.scriptUrl || (config.deploymentId ? `https://script.google.com/macros/s/${config.deploymentId}/exec` : null);
  if (!endpoint) return;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete_material', id: materialIdOrSku, sku: materialIdOrSku })
    });
  } catch (e) {
    try {
      await fetch(`${endpoint}?action=delete_material&id=${encodeURIComponent(materialIdOrSku)}`, { method: 'GET' });
    } catch (err) {}
  }
}

export function mergeMaterials(localMaterials: RawMaterial[], incomingSheetMaterials: RawMaterial[]): RawMaterial[] {
  if (!incomingSheetMaterials || incomingSheetMaterials.length === 0) {
    return localMaterials;
  }

  const map = new Map<string, RawMaterial>();

  // 1. First add incoming sheet materials
  incomingSheetMaterials.forEach(m => {
    const key = (m.code || m.id || m.name).toLowerCase().trim().replace(/^mat-/, '');
    map.set(key, m);
  });

  // 2. Preserve any local material that hasn't appeared in sheet yet or was modified recently
  localMaterials.forEach(localM => {
    const key = (localM.code || localM.id || localM.name).toLowerCase().trim().replace(/^mat-/, '');
    if (!map.has(key)) {
      map.set(key, localM);
    } else {
      const incomingM = map.get(key)!;
      const localTime = new Date(localM.lastUpdated || 0).getTime();
      const incomingTime = new Date(incomingM.lastUpdated || 0).getTime();
      if (localTime > incomingTime && localTime > Date.now() - 120000) {
        map.set(key, { ...incomingM, ...localM });
      }
    }
  });

  return Array.from(map.values());
}

export async function syncWithAppsScript(config: SyncConfig): Promise<SheetFetchResult> {
  const timestamp = new Date().toISOString();
  
  if (!config.scriptUrl && !config.deploymentId) {
    return {
      success: false,
      message: 'No Google Apps Script URL or Deployment ID provided.',
      timestamp
    };
  }

  const endpoint = config.scriptUrl || `https://script.google.com/macros/s/${config.deploymentId}/exec`;

  try {
    // Attempt standard fetch to Google Apps Script endpoint
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // 1. Parse Live Inventory Materials
    const parsedInventory: RawMaterial[] = [];
    if (Array.isArray(data.inventory)) {
      data.inventory.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const name = String(row[1] || row[0] || '').trim();
        if (!name || name.toLowerCase() === 'material name' || name.toLowerCase() === 'item sku code') return; // Skip header

        const code = String(row[0] || `SKU-${idx + 1}`);
        const category = String(row[2] || 'Fabric Rolls');
        const size = String(row[3] || 'Standard');
        const colorName = String(row[4] || 'Default');
        const supplier = String(row[5] || 'Surat Textile Market');
        const stock = Number(row[6]) || 0;
        const unit = String(row[7] || 'meters').toLowerCase();
        const minThreshold = Number(row[8]) || 100;
        const locationBin = String(row[10] || `Bin ${String.fromCharCode(65 + (idx % 6))}-0${(idx % 4) + 1}`);
        const lotNumber = String(row[11] || `LOT-SH-${idx + 10}`);
        const unitCost = Number(row[12]) || 100;
        const burnRate = Number(row[14]) || 10;

        parsedInventory.push({
          id: `mat-sheet-${code.replace(/[^a-zA-Z0-9]/g, '_')}`,
          code,
          name,
          category,
          size,
          currentStock: stock,
          unit: (['meters', 'kg', 'spools', 'yards', 'rolls', 'lbs', 'pcs'].includes(unit) ? unit : 'meters') as any,
          minThreshold,
          unitCost,
          supplier,
          colorName,
          colorCode: getColorForMaterial(name),
          lotNumber,
          locationBin,
          consumptionRatePerHour: burnRate,
          lastUpdated: timestamp
        });
      });
    }

    // 2. Parse 10-Stage Workflow Pipeline Items
    const parsedWorkflow: WorkflowItem[] = [];
    if (Array.isArray(data.workflow)) {
      data.workflow.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const lotNumber = String(row[0]).trim();
        if (!lotNumber || lotNumber.toLowerCase().includes('job no')) return; // skip header

        const partyName = String(row[1] || 'Direct Client');
        const chalanNumber = String(row[2] || 'CHL-2026');
        const date = String(row[3] || new Date().toISOString().split('T')[0]);
        const designNumber = String(row[4] || `DSG-${100 + idx}`);
        const designName = String(row[5] || 'Fabric Lot');
        const fabricType = String(row[6] || 'Silk Georgette');
        const fabricColor = String(row[7] || 'Natural');
        const quantity = Number(row[8]) || 50;
        const currentStage = parseStageFromText(String(row[9] || 'fabric'));
        const priorityRaw = String(row[14] || 'normal').toLowerCase();
        const priority: WorkflowItem['priority'] = priorityRaw.includes('urgent') ? 'urgent' : priorityRaw.includes('high') ? 'high' : 'normal';
        const dueDate = String(row[15] || date);
        const initialInspection = String(row[16] || 'good') as any;
        const alterResult = String(row[17] || 'pending') as any;
        const alterReason = String(row[18] || '');
        const assignedOperator = String(row[19] || 'Floor Lead');
        const deliveryChalan = String(row[20] || '');
        const deliveryDate = String(row[21] || '');
        const billNo = String(row[22] || '');
        const piecesCompleted = Number(row[23]) || 0;
        const firmName = String(row[24] || 'Udhna Textile');
        const notesRaw = String(row[25] || '');
        let photoUrl = '';
        let cleanNotes = notesRaw;
        if (notesRaw.includes('http://') || notesRaw.includes('https://')) {
          const match = notesRaw.match(/(https?:\/\/[^\s|]+)/);
          if (match) {
            photoUrl = formatDirectImageUrl(match[1]);
            cleanNotes = notesRaw.replace(/\|?\s*Photo:\s*https?:\/\/[^\s|]+/gi, '').trim();
          }
        }

        const photosList = photoUrl ? [{
          id: `photo-${lotNumber}`,
          url: photoUrl,
          caption: 'QC Floor Photo',
          stageCapturedAt: currentStage,
          capturedBy: assignedOperator,
          timestamp: date
        }] : [];

        parsedWorkflow.push({
          id: `wf-sheet-${lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
          lotNumber,
          jobNo: lotNumber,
          partyName,
          partyOrClientName: partyName,
          chalanNumber,
          date,
          createdDate: date,
          dueDate,
          designNumber,
          designName,
          fabricType,
          fabricColor,
          quantity,
          pieces: quantity,
          unit: 'sarees',
          currentStage,
          priority,
          initialInspectionResult: initialInspection,
          alterInspectionResult: alterResult,
          alterationReason: alterReason,
          assignedOperator,
          deliveryChalanNumber: deliveryChalan,
          dateOfDelivery: deliveryDate,
          billNumber: billNo,
          piecesCompleted,
          firmName,
          notes: cleanNotes,
          designImage: photoUrl || undefined,
          photos: photosList,
          stageHistory: [],
          lastSyncedWithFirebase: timestamp
        });
      });
    }

    // 3. Parse Master Order Slips
    const parsedOrderSlips: OrderSlip[] = [];
    if (Array.isArray(data.orderSlips)) {
      data.orderSlips.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const jobNo = String(row[0]).trim();
        if (!jobNo || jobNo.toLowerCase().includes('job no')) return;

        const partyName = String(row[1] || 'Direct Client');
        const chalanNo = String(row[2] || 'CHL-2026');
        const date = String(row[3] || new Date().toISOString().split('T')[0]);
        const totalPcs = Number(row[4]) || 45;
        const fabricCols = String(row[5] || 'Kali, Dupatta, Blouse Front').split(',').map(s => s.trim());
        const inwardNotes = String(row[8] || '');
        const calcNotes = String(row[9] || '');
        const firmName = String(row[14] || 'Udhna Textile');

        parsedOrderSlips.push({
          id: `slip-${jobNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
          jobNo,
          partyName,
          chalanNo,
          date,
          totalPcs,
          fabricColumns: fabricCols,
          colorRows: [
            {
              id: `cr-${idx + 1}`,
              colorName: 'Standard',
              fabricQuantities: { [fabricCols[0] || 'Kali']: totalPcs }
            }
          ],
          inwardChallanNotes: inwardNotes,
          calculationNotes: calcNotes,
          firmName,
          piecesCompleted: 0,
          createdAt: date,
        });
      });
    }

    // 4. Parse Piece-Level Tracking
    const parsedPieces: IndividualPieceUnit[] = [];
    if (Array.isArray(data.pieces)) {
      data.pieces.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const pieceTag = String(row[0]).trim();
        if (!pieceTag || pieceTag.toLowerCase().includes('piece tag')) return;

        const jobNo = String(row[1] || 'LOT-9000');
        const lotNumber = String(row[2] || jobNo);
        const pieceNumber = Number(row[3]) || idx + 1;
        const designNumber = String(row[4] || 'DSG-100');
        const fabricType = String(row[5] || 'Silk Georgette');
        const fabricColor = String(row[6] || 'Natural');
        const partyName = String(row[7] || 'Client');
        const currentStage = parseStageFromText(String(row[8] || 'fabric'));
        const statusRaw = String(row[10] || 'good').toLowerCase();
        const status = statusRaw.includes('alter') ? 'needs_alter' : statusRaw.includes('reject') ? 'rejected' : 'good';
        const defectReason = String(row[11] || '');
        const alterNotes = String(row[12] || '');
        const assignedOperator = String(row[13] || 'Operator');

        parsedPieces.push({
          id: `pc-${pieceTag.replace(/[^a-zA-Z0-9]/g, '_')}`,
          parentLotId: `wf-sheet-${lotNumber.replace(/[^a-zA-Z0-9]/g, '_')}`,
          lotNumber,
          jobNo,
          pieceNumber,
          pieceTag,
          partyName,
          designNumber,
          fabricType,
          fabricColor,
          currentStage,
          status,
          defectReason,
          alterNotes,
          assignedOperator,
          lastUpdated: timestamp
        });
      });
    }

    // 5. Parse Dispatch & Shipments
    const parsedDispatch: DispatchOrder[] = [];
    if (Array.isArray(data.dispatch)) {
      data.dispatch.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const dspNo = String(row[0]).trim();
        if (!dspNo || dspNo.toLowerCase().includes('dispatch')) return;

        const partyName = String(row[1] || 'Direct Buyer');
        const statusRaw = String(row[2] || 'ready_to_dispatch').toLowerCase().replace(/\s+/g, '_');
        const status = (['ready_to_dispatch', 'in_transit', 'dispatched', 'delivered', 'cancelled'].includes(statusRaw) ? statusRaw : 'ready_to_dispatch') as any;
        const productName = String(row[3] || 'Finished Goods');
        const quantity = Number(row[4]) || 1;
        const unit = String(row[5] || 'sarees');
        const unitPrice = Number(row[6]) || 0;
        const subtotal = Number(row[7]) || (quantity * unitPrice);
        const taxAmount = Number(row[8]) || Math.round(subtotal * 0.05);
        const totalInvoice = Number(row[9]) || (subtotal + taxAmount);
        const transporterName = String(row[13] || '');
        const trackingNumber = String(row[14] || '');
        const readyDate = String(row[15] || new Date().toISOString().split('T')[0]);
        const dispatchedDate = String(row[16] || '');
        const invoiceNumber = String(row[17] || '');
        const deliveryAddress = String(row[18] || '');

        parsedDispatch.push({
          id: `dsp-${dspNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
          dispatchNumber: dspNo,
          orderNumber: `PO-${100 + idx}`,
          partyName,
          productName,
          itemCode: `DSG-${100 + idx}`,
          quantity,
          unit,
          unitPrice,
          subtotal,
          taxPercent: 5,
          taxAmount,
          totalInvoiceAmount: totalInvoice,
          totalAmount: totalInvoice,
          status,
          readyDate,
          dispatchedDate: dispatchedDate || undefined,
          transporterName: transporterName || undefined,
          trackingNumber: trackingNumber || undefined,
          deliveryAddress: deliveryAddress || undefined,
        });
      });
    }

    // 6. Parse Party Invoices & Receivables
    const parsedPartyInvoices: PartyInvoice[] = [];
    if (Array.isArray(data.partyInvoices)) {
      data.partyInvoices.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const invNo = String(row[0]).trim();
        if (!invNo || invNo.toLowerCase().includes('invoice')) return;

        const partyName = String(row[1] || 'Direct Client');
        const invDate = String(row[2] || new Date().toISOString().split('T')[0]);
        const total = Number(row[3]) || 0;
        const paid = Number(row[4]) || 0;
        const balance = Number(row[5]) || (total - paid);
        const statusRaw = String(row[6] || 'unpaid').toLowerCase();
        const status = (['paid', 'partial', 'unpaid', 'overdue'].includes(statusRaw) ? statusRaw : (paid >= total ? 'paid' : paid > 0 ? 'partial' : 'unpaid')) as any;
        const dueDate = String(row[7] || invDate);

        parsedPartyInvoices.push({
          id: `inv-${invNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
          invoiceNumber: invNo,
          partyName,
          orderDescription: 'Textile Fabric Order Consignment',
          issueDate: invDate,
          dueDate,
          totalAmount: total,
          amountReceived: paid,
          balanceDue: balance,
          status,
          paymentHistory: paid > 0 ? [{
            id: `pay-${idx + 1}`,
            date: invDate,
            amount: paid,
            paymentMode: 'Bank Transfer',
            transactionRef: `REF-${invNo}`,
            notes: 'Advance receipt'
          }] : []
        });
      });
    }

    // 7. Parse Supplier Payables & Imports
    const parsedPayables: SupplierPayable[] = [];
    if (Array.isArray(data.supplierPayables)) {
      data.supplierPayables.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const poNo = String(row[0]).trim();
        if (!poNo || poNo.toLowerCase().includes('bill')) return;

        const supplierName = String(row[1] || 'Raw Material Supplier');
        const category = String(row[2] || 'Zari Threads');
        const totalBill = Number(row[3]) || 0;
        const paid = Number(row[4]) || 0;
        const balance = Number(row[5]) || (totalBill - paid);
        const statusRaw = String(row[6] || 'unpaid').toLowerCase();
        const status = (['settled', 'partial', 'unpaid', 'overdue'].includes(statusRaw) ? statusRaw : (paid >= totalBill ? 'settled' : paid > 0 ? 'partial' : 'unpaid')) as any;
        const dueDate = String(row[7] || new Date().toISOString().split('T')[0]);
        const notes = String(row[8] || '');

        parsedPayables.push({
          id: `pay-${poNo.replace(/[^a-zA-Z0-9]/g, '_')}`,
          purchaseOrderCode: poNo,
          supplierName,
          materialNameOrDescription: category,
          quantityImported: 100,
          unit: 'spools',
          unitPrice: 120,
          totalBillAmount: totalBill,
          amountPaid: paid,
          balanceOwed: balance,
          purchaseDate: new Date().toISOString().split('T')[0],
          paymentDueDate: dueDate,
          status,
          notes,
          paymentHistory: paid > 0 ? [{
            id: `hist-${idx + 1}`,
            date: new Date().toISOString().split('T')[0],
            amount: paid,
            paymentMode: 'Bank Transfer',
            transactionRef: `PO-${poNo}`
          }] : []
        });
      });
    }

    // 8. Parse Staff Payroll
    const parsedEmployees: EmployeeRecord[] = [];
    if (Array.isArray(data.payroll)) {
      data.payroll.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const empId = String(row[0]).trim();
        if (!empId || empId.toLowerCase().includes('employee')) return;

        const name = String(row[1] || 'Floor Worker');
        const role = String(row[2] || 'Operator');
        const dept = (String(row[3] || 'Production') as any);
        const salary = Number(row[4]) || 20000;
        const pieceRate = Number(row[5]) || 15;
        const pcs = Number(row[6]) || 0;
        const pieceEarnings = Number(row[7]) || (pieceRate * pcs);
        const totalPayout = Number(row[8]) || (salary + pieceEarnings);

        parsedEmployees.push({
          id: `emp-${empId.replace(/[^a-zA-Z0-9]/g, '_')}`,
          employeeCode: empId,
          name,
          role,
          department: dept,
          salaryType: 'monthly',
          baseSalary: salary,
          netPayable: totalPayout,
          paymentStatus: 'pending',
          paymentMethod: 'bank_transfer',
        });
      });
    }

    // 9. Parse Expenses & Utilities
    const parsedExpenses: OperationalExpense[] = [];
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach((row: any[], idx: number) => {
        if (!row || row.length === 0 || !row[0]) return;
        const expId = String(row[0]).trim();
        if (!expId || expId.toLowerCase().includes('expense')) return;

        const date = String(row[1] || new Date().toISOString().split('T')[0]);
        const cat = String(row[2] || 'electricity').toLowerCase().replace(/\s+/g, '_') as any;
        const desc = String(row[3] || 'Factory Expense');
        const amount = Number(row[4]) || 0;
        const mode = String(row[5] || 'bank_transfer').toLowerCase().replace(/\s+/g, '_') as any;
        const paidBy = String(row[6] || 'Manager');
        const receipt = String(row[7] || '');

        parsedExpenses.push({
          id: `exp-${expId.replace(/[^a-zA-Z0-9]/g, '_')}`,
          expenseCode: expId,
          date,
          category: cat,
          title: desc,
          amount,
          vendorOrPayee: paidBy,
          paymentMethod: mode,
          paymentStatus: 'paid',
          receiptInvoiceNo: receipt,
          recordedBy: paidBy
        });
      });
    }

    return {
      success: true,
      inventory: parsedInventory.length > 0 ? parsedInventory : undefined,
      workflow: parsedWorkflow.length > 0 ? parsedWorkflow : undefined,
      orderSlips: parsedOrderSlips.length > 0 ? parsedOrderSlips : undefined,
      pieces: parsedPieces.length > 0 ? parsedPieces : undefined,
      dispatchOrders: parsedDispatch.length > 0 ? parsedDispatch : undefined,
      partyInvoices: parsedPartyInvoices.length > 0 ? parsedPartyInvoices : undefined,
      supplierPayables: parsedPayables.length > 0 ? parsedPayables : undefined,
      employees: parsedEmployees.length > 0 ? parsedEmployees : undefined,
      expenses: parsedExpenses.length > 0 ? parsedExpenses : undefined,
      message: `Successfully synchronized from Google Apps Script (${parsedWorkflow.length} lots, ${parsedInventory.length} materials, ${parsedDispatch.length} dispatch orders, ${parsedPartyInvoices.length} invoices).`,
      timestamp
    };
  } catch (error: any) {
    return {
      success: false,
      message: `Google Sheets sync error: ${error.message || 'Network error'}`,
      timestamp
    };
  }
}

function getColorForMaterial(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colors = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#4F46E5'];
  return colors[hash % colors.length];
}

export function exportDataAsCsv(
  materials: RawMaterial[], 
  workflowItems: WorkflowItem[] = [],
  orderSlips: OrderSlip[] = [],
  dispatchOrders: DispatchOrder[] = []
): { 
  orderSlipsCsv: string; 
  workflowCsv: string;
  pieceTrackingCsv: string;
  matrixCsv: string;
  inventoryCsv: string;
  dispatchCsv: string;
} {
  const stageStepMap: Record<string, string> = {
    'fabric': '1. Fabric Inward',
    'chalan': '2. Chalan (Slip)',
    'inspection': '3. Inspection (Good / Return)',
    'stitching_patta': '4. Stitching Patta',
    'embroidery': '5. Embroidery Machine (25-Head)',
    'dhaga_cutting': '6. Dhaga Cutting',
    'inspection_alter': '7. Alter Inspection',
    'altering': '8. Altering / Rework',
    'folding': '9. Folding & Packing',
    'prepare_dispatch': '10. Prepare for Dispatch'
  };

  // 1. Master Order Slips CSV
  const slipHeaders = [
    'Job No. / Folder ID',
    'Party / Client Name',
    'Chalan No.',
    'Date of Entry',
    'Total Pieces (Pcs)',
    'Fabric Columns',
    'Color Variants Count',
    'Breakdown Matrix Summary',
    'Inward Notes',
    'Calculation Notes',
    'Delivery Chalan No.',
    'Delivery Date',
    'Bill No.',
    'Pieces Completed',
    'Firm Name',
    'Status'
  ];
  const slipRows = orderSlips.map(slip => {
    const fabricColsStr = (slip.fabricColumns || []).join(', ');
    const colorBreakdownStr = (slip.colorRows || []).map(cr => {
      const fabBreak = Object.entries(cr.fabricQuantities || {})
        .filter(([_, q]) => Number(q) > 0)
        .map(([fab, q]) => `${fab}: ${q}`)
        .join('; ');
      return `[${cr.colorName}: ${fabBreak || 'None'}]`;
    }).join(' | ');

    return [
      `"${(slip.jobNo || slip.id).replace(/"/g, '""')}"`,
      `"${slip.partyName.replace(/"/g, '""')}"`,
      `"${(slip.chalanNo || 'N/A').replace(/"/g, '""')}"`,
      `"${slip.date}"`,
      Number(slip.totalPcs) || 0,
      `"${fabricColsStr || 'Standard Kali'}"`,
      slip.colorRows?.length || 0,
      `"${(colorBreakdownStr || 'Standard').replace(/"/g, '""')}"`,
      `"${(slip.inwardChallanNotes || '').replace(/"/g, '""')}"`,
      `"${(slip.calculationNotes || '').replace(/"/g, '""')}"`,
      `"${(slip.deliveryChalanNo || 'Pending').replace(/"/g, '""')}"`,
      `"${(slip.deliveryDate || 'Pending').replace(/"/g, '""')}"`,
      `"${(slip.billNo || 'Pending').replace(/"/g, '""')}"`,
      Number(slip.piecesCompleted) || Number(slip.totalPcs) || 0,
      `"${(slip.firmName || 'Udhna Textile').replace(/"/g, '""')}"`,
      `"${(slip.status || 'ACTIVE').toUpperCase()}"`
    ].join(',');
  });
  const orderSlipsCsv = [slipHeaders.join(','), ...slipRows].join('\n');

  // 2. Fabric Design Workflow (10-Stage Pipeline) CSV
  const wfHeaders = [
    'Job No. (Folder)',
    'Party Name',
    'Chalan No.',
    'Date',
    'Design No. (D.no)',
    'Design Name',
    'Fabric Type (Branch)',
    'Fabric Color',
    'Total Pieces (Pcs)',
    'Current Stage',
    'Step (1-10)',
    'Stage Breakdown',
    'Good Pieces',
    'Alteration Pieces',
    'Priority',
    'Due Date',
    'Initial Inspection',
    'Alteration Result',
    'Alteration Reason',
    'Assigned Operator',
    'Delivery Chalan No.',
    'Date of Delivery',
    'Bill No.',
    'Pieces Completed',
    'Firm Name',
    'Notes'
  ];

  const wfRows = workflowItems.map(w => {
    const stepDisplay = stageStepMap[w.currentStage] || w.currentStage;
    const pcsVal = Number(w.pieces ?? w.quantity) || 0;
    const breakdownStr = w.stagePieceBreakdown 
      ? Object.entries(w.stagePieceBreakdown)
          .filter(([_, count]) => (count || 0) > 0)
          .map(([stg, count]) => `${stageStepMap[stg] || stg}: ${count} pcs`)
          .join('; ')
      : `${stepDisplay}: ${pcsVal} pcs`;

    const goodPcs = w.individualPieces 
      ? w.individualPieces.filter(p => p.status === 'good' || p.status === 'repaired' || p.status === 'completed').length 
      : (w.initialInspectionResult === 'bad_return' ? 0 : pcsVal);

    const alterPcs = w.individualPieces 
      ? w.individualPieces.filter(p => p.status === 'needs_alter' || p.status === 'in_rework').length 
      : (w.currentStage === 'altering' ? pcsVal : 0);

    return [
      `"${(w.jobNo || w.lotNumber).replace(/"/g, '""')}"`,
      `"${(w.partyName || w.partyOrClientName || 'N/A').replace(/"/g, '""')}"`,
      `"${(w.chalanNumber || 'N/A').replace(/"/g, '""')}"`,
      `"${w.date || w.createdDate || 'N/A'}"`,
      `"${w.designNumber.replace(/"/g, '""')}"`,
      `"${(w.designName || 'N/A').replace(/"/g, '""')}"`,
      `"${w.fabricType.replace(/"/g, '""')}"`,
      `"${(w.fabricColor || 'Default').replace(/"/g, '""')}"`,
      pcsVal,
      `"${w.currentStage.toUpperCase()}"`,
      `"${stepDisplay}"`,
      `"${breakdownStr.replace(/"/g, '""')}"`,
      goodPcs,
      alterPcs,
      `"${w.priority.toUpperCase()}"`,
      `"${w.dueDate || 'N/A'}"`,
      `"${w.initialInspectionResult || 'pending'}"`,
      `"${w.alterInspectionResult || 'pending'}"`,
      `"${(w.alterationReason || 'None').replace(/"/g, '""')}"`,
      `"${(w.assignedOperator || 'Floor Supervisor').replace(/"/g, '""')}"`,
      `"${(w.deliveryChalanNo || w.deliveryChalanNumber || 'Pending').replace(/"/g, '""')}"`,
      `"${(w.dateOfDelivery || w.deliveryDate || 'Pending').replace(/"/g, '""')}"`,
      `"${(w.billNo || w.billNumber || 'Pending').replace(/"/g, '""')}"`,
      w.piecesCompleted ?? pcsVal,
      `"${(w.firmName || 'Pending').replace(/"/g, '""')}"`,
      `"${(w.notes || '').replace(/"/g, '""')}"`
    ].join(',');
  });
  const workflowCsv = [wfHeaders.join(','), ...wfRows].join('\n');

  // 3. Piece-Level Tracking CSV
  const pcHeaders = [
    'Piece Tag (Unique ID)',
    'Job No.',
    'Lot / Branch ID',
    'Piece #',
    'Design No.',
    'Fabric Type',
    'Fabric Color',
    'Party Name',
    'Current Stage',
    'Stage Name',
    'Quality Status',
    'Defect Reason',
    'Alteration Notes',
    'Assigned Operator',
    'Chalan No.'
  ];

  const pcRows: string[] = [];
  workflowItems.forEach(w => {
    const jobVal = w.jobNo || w.lotNumber;
    const partyVal = w.partyName || w.partyOrClientName || 'N/A';
    const colorVal = w.fabricColor || 'Default';
    const totalPcs = Number(w.pieces ?? w.quantity) || 1;

    if (w.individualPieces && w.individualPieces.length > 0) {
      w.individualPieces.forEach(p => {
        const pieceStageDisplay = stageStepMap[p.currentStage] || p.currentStage;
        pcRows.push([
          `"${p.pieceTag.replace(/"/g, '""')}"`,
          `"${(p.jobNo || jobVal).replace(/"/g, '""')}"`,
          `"${w.lotNumber.replace(/"/g, '""')}"`,
          p.pieceNumber,
          `"${(p.designNumber || w.designNumber).replace(/"/g, '""')}"`,
          `"${(p.fabricType || w.fabricType).replace(/"/g, '""')}"`,
          `"${(p.fabricColor || colorVal).replace(/"/g, '""')}"`,
          `"${(p.partyName || partyVal).replace(/"/g, '""')}"`,
          `"${p.currentStage.toUpperCase()}"`,
          `"${pieceStageDisplay}"`,
          `"${p.status.toUpperCase()}"`,
          `"${(p.defectReason || 'None').replace(/"/g, '""')}"`,
          `"${(p.alterNotes || 'None').replace(/"/g, '""')}"`,
          `"${(p.assignedOperator || w.assignedOperator || 'Floor Supervisor').replace(/"/g, '""')}"`,
          `"${(w.chalanNumber || 'N/A').replace(/"/g, '""')}"`
        ].join(','));
      });
    } else {
      const count = Math.min(totalPcs, 25);
      for (let i = 1; i <= count; i++) {
        pcRows.push([
          `"${jobVal}-${w.fabricType.slice(0, 4).toUpperCase()}-P${String(i).padStart(2, '0')}"`,
          `"${jobVal.replace(/"/g, '""')}"`,
          `"${w.lotNumber.replace(/"/g, '""')}"`,
          i,
          `"${w.designNumber.replace(/"/g, '""')}"`,
          `"${w.fabricType.replace(/"/g, '""')}"`,
          `"${colorVal.replace(/"/g, '""')}"`,
          `"${partyVal.replace(/"/g, '""')}"`,
          `"${w.currentStage.toUpperCase()}"`,
          `"${stageStepMap[w.currentStage] || w.currentStage}"`,
          `"${w.initialInspectionResult === 'bad_return' ? 'REJECTED' : 'GOOD'}"`,
          `"${(w.alterationReason || 'None').replace(/"/g, '""')}"`,
          `"${(w.notes || 'None').replace(/"/g, '""')}"`,
          `"${(w.assignedOperator || 'Floor Supervisor').replace(/"/g, '""')}"`,
          `"${(w.chalanNumber || 'N/A').replace(/"/g, '""')}"`
        ].join(','));
      }
    }
  });
  const pieceTrackingCsv = [pcHeaders.join(','), ...pcRows].join('\n');

  // 4. Fabric & Color Matrix CSV
  const matrixHeaders = [
    'Job No.',
    'Party Name',
    'Design No.',
    'Fabric Type',
    'Color Name',
    'Total Pcs',
    '1. Fabric Inward',
    '2. Chalan',
    '3. Insp-1',
    '4. Stitching',
    '5. Embroidery',
    '6. Dhaga Cut',
    '7. Insp-2',
    '8. Altering',
    '9. Folding',
    '10. Dispatch',
    'Completed Pcs (Stage 10)',
    'In-Progress Pcs (Stages 1-9)',
    'Completion %',
    'Due Date'
  ];
  const matrixRows = workflowItems.map(item => {
    const pcs = Number(item.pieces ?? item.quantity) || 0;
    const b = item.stagePieceBreakdown || {};
    const s1 = b['fabric'] !== undefined ? b['fabric']! : (item.currentStage === 'fabric' ? pcs : 0);
    const s2 = b['chalan'] !== undefined ? b['chalan']! : (item.currentStage === 'chalan' ? pcs : 0);
    const s3 = b['inspection'] !== undefined ? b['inspection']! : (item.currentStage === 'inspection' ? pcs : 0);
    const s4 = b['stitching_patta'] !== undefined ? b['stitching_patta']! : (item.currentStage === 'stitching_patta' ? pcs : 0);
    const s5 = b['embroidery'] !== undefined ? b['embroidery']! : (item.currentStage === 'embroidery' ? pcs : 0);
    const s6 = b['dhaga_cutting'] !== undefined ? b['dhaga_cutting']! : (item.currentStage === 'dhaga_cutting' ? pcs : 0);
    const s7 = b['inspection_alter'] !== undefined ? b['inspection_alter']! : (item.currentStage === 'inspection_alter' ? pcs : 0);
    const s8 = b['altering'] !== undefined ? b['altering']! : (item.currentStage === 'altering' ? pcs : 0);
    const s9 = b['folding'] !== undefined ? b['folding']! : (item.currentStage === 'folding' ? pcs : 0);
    const s10 = b['prepare_dispatch'] !== undefined ? b['prepare_dispatch']! : (item.currentStage === 'prepare_dispatch' ? pcs : 0);

    const completed = s10;
    const inProgress = s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8 + s9;
    const compPct = pcs > 0 ? ((completed / pcs) * 100).toFixed(1) + '%' : '0%';

    return [
      `"${(item.jobNo || item.lotNumber).replace(/"/g, '""')}"`,
      `"${(item.partyName || item.partyOrClientName || 'N/A').replace(/"/g, '""')}"`,
      `"${item.designNumber.replace(/"/g, '""')}"`,
      `"${item.fabricType.replace(/"/g, '""')}"`,
      `"${(item.fabricColor || 'Default').replace(/"/g, '""')}"`,
      pcs,
      s1,
      s2,
      s3,
      s4,
      s5,
      s6,
      s7,
      s8,
      s9,
      s10,
      completed,
      inProgress,
      `"${compPct}"`,
      `"${item.dueDate || 'N/A'}"`
    ].join(',');
  });
  const matrixCsv = [matrixHeaders.join(','), ...matrixRows].join('\n');

  // 5. Live Inventory & Materials CSV
  const invHeaders = [
    'Item SKU Code',
    'Material Name',
    'Category',
    'Size / Gauge',
    'Color Name',
    'Vendor / Supplier',
    'Current Stock',
    'Unit',
    'Min Threshold',
    'Stock Health Status',
    'Location Bin',
    'Lot / Batch Number',
    'Unit Cost (₹)',
    'Total Valuation (₹)',
    'Burn Rate (units/h)',
    'Last Updated'
  ];
  const invRows = materials.map(m => {
    const stock = Number(m.currentStock) || 0;
    const cost = Number(m.unitCost) || 0;
    const totalVal = +(stock * cost).toFixed(2);
    const health = stock <= 0 ? 'DEPLETED' : stock <= m.minThreshold ? 'LOW STOCK ALERT' : 'STABLE';

    return [
      `"${(m.code || 'N/A').replace(/"/g, '""')}"`,
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.category}"`,
      `"${(m.size || 'Standard').replace(/"/g, '""')}"`,
      `"${(m.colorName || 'Default').replace(/"/g, '""')}"`,
      `"${m.supplier.replace(/"/g, '""')}"`,
      stock,
      `"${m.unit}"`,
      Number(m.minThreshold) || 100,
      `"${health}"`,
      `"${m.locationBin || 'A-01'}"`,
      `"${m.lotNumber || 'LOT-MAIN'}"`,
      cost,
      totalVal,
      Number(m.consumptionRatePerHour) || 0,
      `"${m.lastUpdated || new Date().toISOString()}"`
    ].join(',');
  });
  const inventoryCsv = [invHeaders.join(','), ...invRows].join('\n');

  // 6. Dispatch & Shipments CSV
  const dspHeaders = [
    'Dispatch No.',
    'Party / Buyer Name',
    'Status',
    'Product / SKU Name',
    'Quantity',
    'Unit',
    'Unit Price (₹)',
    'Subtotal (₹)',
    'GST Tax (5%) (₹)',
    'Total Invoice (₹)',
    'Amount Paid (₹)',
    'Balance Due (₹)',
    'Payment Status',
    'Transporter',
    'Vehicle / Tracking No.',
    'Ready Date',
    'Dispatched Date',
    'Invoice No.',
    'Delivery Address'
  ];
  const dspRows = dispatchOrders.map(d => [
    `"${d.dispatchNumber}"`,
    `"${d.partyName.replace(/"/g, '""')}"`,
    `"${d.status.toUpperCase()}"`,
    `"${d.productName.replace(/"/g, '""')}"`,
    Number(d.quantity) || 0,
    `"${d.unit}"`,
    Number(d.unitPrice) || 0,
    Number(d.subtotal) || 0,
    Number(d.taxAmount) || 0,
    Number(d.totalInvoiceAmount) || 0,
    Number(d.amountPaid) || 0,
    Number(d.balanceDue) || 0,
    `"${d.paymentStatus.toUpperCase()}"`,
    `"${(d.transporterName || 'Self').replace(/"/g, '""')}"`,
    `"${(d.vehicleOrTrackingNumber || 'N/A').replace(/"/g, '""')}"`,
    `"${d.readyDate}"`,
    `"${d.dispatchedDate || 'Pending'}"`,
    `"${(d.invoiceNumber || 'N/A').replace(/"/g, '""')}"`,
    `"${(d.deliveryAddress || 'N/A').replace(/"/g, '""')}"`
  ].join(','));
  const dispatchCsv = [dspHeaders.join(','), ...dspRows].join('\n');

  return { 
    orderSlipsCsv, 
    workflowCsv, 
    pieceTrackingCsv, 
    matrixCsv, 
    inventoryCsv, 
    dispatchCsv 
  };
}

export function generateRecommendedAppsScriptCode(sheetId: string): string {
  return `// Google Apps Script Webhook for Spreadsheet ${sheetId}
function doGet(e) {
  const ss = SpreadsheetApp.openById("${sheetId}") || SpreadsheetApp.getActiveSpreadsheet();
  return ContentService.createTextOutput(JSON.stringify({ status: "ok" })).setMimeType(ContentService.MimeType.JSON);
}`;
}
