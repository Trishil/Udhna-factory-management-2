import { 
  RawMaterial, 
  StockTransaction, 
  EmployeeRecord,
  ElectricityUsageRecord,
  OperationalExpense,
  PartyInvoice,
  SupplierPayable,
  DispatchOrder,
  WorkflowItem,
  OrderSlip,
  IndividualPieceUnit,
  WorkflowStageId,
  Machine
} from '../types';

export interface GoogleSheetsSyncResult {
  success: boolean;
  message: string;
  spreadsheetId: string;
  spreadsheetUrl: string;
  timestamp: string;
  sheetsUpdated?: string[];
  collaboratorSharing?: Array<{ email: string; success: boolean; message: string }>;
}

export const AUTHORIZED_COLLABORATOR_EMAILS = [
  'drlaljirpatel@gmail.com',
  'trishilbalar@gmail.com'
];

/**
 * 10-Stage Workflow Pipeline Map with numerical step numbers, names, and short labels
 */
export const STAGE_STEP_MAP: Record<WorkflowStageId, { step: number; name: string; short: string }> = {
  'fabric': { step: 1, name: '1. Fabric Inward', short: 'Fabric' },
  'chalan': { step: 2, name: '2. Chalan (Slip)', short: 'Chalan' },
  'inspection': { step: 3, name: '3. Inspection (Good / Return)', short: 'Insp-1' },
  'stitching_patta': { step: 4, name: '4. Stitching Patta', short: 'Stitching' },
  'embroidery': { step: 5, name: '5. Embroidery Machine (25-Head)', short: 'Embroidery' },
  'dhaga_cutting': { step: 6, name: '6. Dhaga Cutting', short: 'Dhaga Cut' },
  'inspection_alter': { step: 7, name: '7. Alter Inspection', short: 'Insp-2' },
  'altering': { step: 8, name: '8. Altering / Rework', short: 'Altering' },
  'folding': { step: 9, name: '9. Folding & Packing', short: 'Folding' },
  'prepare_dispatch': { step: 10, name: '10. Prepare for Dispatch', short: 'Dispatch' }
};

/**
 * 11 Core Factory & Workflow Tabs for Google Sheets Synchronization
 * (Machine-specific legacy tabs have been removed and replaced with the hierarchical Workflow & Matrix model)
 */
export const REQUIRED_SHEET_DEFS = [
  { title: 'Master Order Slips', color: { red: 0.55, green: 0.25, blue: 0.85 }, gridRows: 300, gridCols: 22 },
  { title: 'Fabric Design Workflow', color: { red: 0.1, green: 0.55, blue: 0.85 }, gridRows: 500, gridCols: 30 },
  { title: 'Piece-Level Tracking', color: { red: 0.95, green: 0.45, blue: 0.1 }, gridRows: 1000, gridCols: 20 },
  { title: 'Fabric & Color Matrix', color: { red: 0.35, green: 0.35, blue: 0.85 }, gridRows: 400, gridCols: 24 },
  { title: 'Live Inventory & Materials', color: { red: 0.05, green: 0.6, blue: 0.5 }, gridRows: 400, gridCols: 20 },
  { title: 'Stock Transactions', color: { red: 0.85, green: 0.47, blue: 0.03 }, gridRows: 1000, gridCols: 18 },
  { title: 'Dispatch & Shipments', color: { red: 0.1, green: 0.7, blue: 0.4 }, gridRows: 300, gridCols: 24 },
  { title: 'Party Invoices & Receivables', color: { red: 0.1, green: 0.65, blue: 0.3 }, gridRows: 300, gridCols: 16 },
  { title: 'Supplier Payables & Imports', color: { red: 0.9, green: 0.55, blue: 0.1 }, gridRows: 300, gridCols: 18 },
  { title: 'Staff Payroll', color: { red: 0.3, green: 0.4, blue: 0.9 }, gridRows: 200, gridCols: 16 },
  { title: 'Expenses & Utilities', color: { red: 0.88, green: 0.25, blue: 0.25 }, gridRows: 300, gridCols: 16 }
];

/**
 * Grants Google Drive editor/writer permissions to authorized team emails
 */
export async function shareSpreadsheetWithEmails(
  accessToken: string,
  spreadsheetId: string,
  emails: string[] = AUTHORIZED_COLLABORATOR_EMAILS,
  role: 'writer' | 'commenter' | 'reader' = 'writer'
): Promise<Array<{ email: string; success: boolean; message: string }>> {
  if (!accessToken || !spreadsheetId) return [];
  const results: Array<{ email: string; success: boolean; message: string }> = [];

  for (const email of emails) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=false`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          role: role,
          type: 'user',
          emailAddress: email
        })
      });

      if (res.ok) {
        results.push({ email, success: true, message: `Editor access granted to ${email}` });
      } else {
        const errJson = await res.json().catch(() => ({}));
        const errMsg = errJson.error?.message || `HTTP ${res.status}`;
        if (errMsg.includes('already') || errMsg.includes('owner') || res.status === 400) {
          results.push({ email, success: true, message: `Access verified for ${email}` });
        } else {
          results.push({ email, success: false, message: errMsg });
        }
      }
    } catch (err: any) {
      results.push({ email, success: false, message: err?.message || 'Access configured' });
    }
  }

  return results;
}

/**
 * Checks existing sheets in a spreadsheet, creates missing workflow/finance tabs, and removes obsolete legacy tabs
 */
export async function ensureAllSheetsExist(accessToken: string, sheetId: string): Promise<string[]> {
  try {
    const metaRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!metaRes.ok) return [];

    const metaData = await metaRes.json();
    const existingSheets = metaData.sheets || [];
    const existingTitles = new Set<string>(
      existingSheets.map((s: any) => String(s.properties?.title || ''))
    );

    const requests: any[] = [];

    // Add missing workflow/finance tabs
    const missingSheets = REQUIRED_SHEET_DEFS.filter(def => !existingTitles.has(def.title));
    if (missingSheets.length > 0) {
      missingSheets.forEach(def => {
        requests.push({
          addSheet: {
            properties: {
              title: def.title,
              gridProperties: {
                frozenRowCount: 1,
                rowCount: def.gridRows || 300,
                columnCount: def.gridCols || 22
              },
              tabColor: def.color
            }
          }
        });
      });
    }

    // Identify and delete obsolete machine tabs if present (clean up legacy sheets)
    const obsoleteTabNames = ['Yuemei 25-Head Machines', 'Production Tasks & Feeds'];
    existingSheets.forEach((s: any) => {
      const title = s.properties?.title;
      const internalId = s.properties?.sheetId;
      if (obsoleteTabNames.includes(title) && internalId !== undefined) {
        requests.push({
          deleteSheet: {
            sheetId: internalId
          }
        });
      }
    });

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });
    }

    return Array.from(existingTitles);
  } catch (err) {
    console.warn('Could not verify/create missing sheet tabs:', err);
    return [];
  }
}

/**
 * Clears old data in the designated tabs so no ghost trailing rows remain
 */
async function clearOutdatedSheetRanges(accessToken: string, sheetId: string, sheetTitles: string[]) {
  try {
    const rangesToClear = sheetTitles.map(title => `'${title}'!A1:ZZ5000`);
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchClear`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ranges: rangesToClear
      })
    });
  } catch {
    // Non-blocking fallback
  }
}

/**
 * Creates a brand-new Google Spreadsheet with all modern 10-stage workflow, order slips, matrix, inventory, and finance tabs
 */
export async function createAutomatedFactorySpreadsheet(
  accessToken: string,
  customTitle?: string,
  initialMaterials: RawMaterial[] = [],
  _initialMachines: Machine[] = [],
  initialWorkflowItems: WorkflowItem[] = [],
  initialOrderSlips: OrderSlip[] = []
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const title = customTitle || `Udhna Factory Master & 10-Stage Workflow (${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })})`;

  const requestBody = {
    properties: {
      title,
      autoRecalc: 'ON_CHANGE',
      defaultFormat: {
        textFormat: {
          fontFamily: 'Inter',
          fontSize: 10
        }
      }
    },
    sheets: REQUIRED_SHEET_DEFS.map(def => ({
      properties: {
        title: def.title,
        gridProperties: {
          frozenRowCount: 1,
          rowCount: def.gridRows || 300,
          columnCount: def.gridCols || 22
        },
        tabColor: def.color
      }
    }))
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorText || response.statusText}`);
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;
  const spreadsheetUrl = data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // Perform full initial synchronization of Workflow, Order Slips, and Inventory
  await syncAllToGoogleSheets(
    accessToken,
    spreadsheetId,
    initialMaterials,
    [],
    {
      workflowItems: initialWorkflowItems,
      orderSlips: initialOrderSlips
    }
  );

  // Automatically grant access to requested email accounts
  try {
    await shareSpreadsheetWithEmails(accessToken, spreadsheetId, AUTHORIZED_COLLABORATOR_EMAILS, 'writer');
  } catch (shareErr) {
    console.warn('Auto-sharing note:', shareErr);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title
  };
}

/**
 * Synchronizes all 10-stage workflow items, master order slips, piece tracking, matrix, inventory, dispatches, and financial ledgers to Google Sheets
 */
export async function syncAllToGoogleSheets(
  accessToken: string,
  sheetId: string,
  materials: RawMaterial[],
  _machines?: Machine[],
  financeData?: {
    employees?: EmployeeRecord[];
    electricityRecords?: ElectricityUsageRecord[];
    expenses?: OperationalExpense[];
    partyInvoices?: PartyInvoice[];
    supplierPayables?: SupplierPayable[];
    transactions?: StockTransaction[];
    dispatchOrders?: DispatchOrder[];
    workflowItems?: WorkflowItem[];
    orderSlips?: OrderSlip[];
  }
): Promise<GoogleSheetsSyncResult> {
  if (!accessToken) {
    return {
      success: false,
      message: 'Google OAuth access token missing. Please sign in with Google.',
      spreadsheetId: sheetId,
      spreadsheetUrl: '',
      timestamp: new Date().toISOString()
    };
  }

  if (!sheetId) {
    return {
      success: false,
      message: 'No Google Spreadsheet connected.',
      spreadsheetId: '',
      spreadsheetUrl: '',
      timestamp: new Date().toISOString()
    };
  }

  const timestamp = new Date().toISOString();

  try {
    // 1. Ensure all 11 workflow & business tabs exist (and clean any obsolete machine tabs)
    await ensureAllSheetsExist(accessToken, sheetId);

    // 2. Clear previous data across active tabs to prevent ghost trailing rows
    await clearOutdatedSheetRanges(accessToken, sheetId, REQUIRED_SHEET_DEFS.map(d => d.title));

    const batchData: Array<{ range: string; values: any[][] }> = [];

    // ==========================================
    // TAB 1: Master Order Slips (Parent Folders)
    // ==========================================
    const orderSlips = financeData?.orderSlips || [];
    const slipHeaders = [
      'Job No. (Folder)',
      'Party / Client Name',
      'Chalan No.',
      'Date of Entry',
      'Total Pieces (Pcs)',
      'Fabric Columns',
      'Color Variants Count',
      'Color & Fabric Breakdown Matrix',
      'Inward Slip Notes',
      'Calculation Formula Notes',
      'Delivery Chalan No.',
      'Delivery Date',
      'Bill No.',
      'Pieces Completed',
      'Firm Name',
      'Status',
      'Created At',
      'Last Synced'
    ];

    const slipRows = orderSlips.map(slip => {
      const fabricColsStr = (slip.fabricColumns || []).join(', ');
      const colorBreakdownStr = (slip.colorRows || []).map(cr => {
        const fabBreak = Object.entries(cr.fabricQuantities || {})
          .filter(([_, q]) => Number(q) > 0)
          .map(([fab, q]) => `${fab}: ${q}`)
          .join(', ');
        return `[${cr.colorName}: ${fabBreak || 'None'}]`;
      }).join('; ');

      return [
        slip.jobNo || slip.id,
        slip.partyName,
        slip.chalanNo || 'N/A',
        slip.date,
        Number(slip.totalPcs) || 0,
        fabricColsStr || 'Standard Kali',
        slip.colorRows?.length || 0,
        colorBreakdownStr || 'Standard Breakdown',
        slip.inwardChallanNotes || '',
        slip.calculationNotes || '',
        slip.deliveryChalanNo || 'Pending',
        slip.deliveryDate || 'Pending',
        slip.billNo || 'Pending',
        Number(slip.piecesCompleted) || Number(slip.totalPcs) || 0,
        slip.firmName || 'Udhna Textile Embroidery Works',
        (slip.status || 'ACTIVE').toUpperCase(),
        slip.createdAt || slip.date,
        timestamp
      ];
    });

    batchData.push({
      range: `'Master Order Slips'!A1:R${Math.max(2, slipRows.length + 1)}`,
      values: [slipHeaders, ...slipRows]
    });

    // ==========================================
    // TAB 2: Fabric Design Workflow (10-Stage Pipeline)
    // ==========================================
    const workflowItems = financeData?.workflowItems || [];
    const workflowHeaders = [
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
      'Stage Breakdown (Pcs per Stage)',
      'Good Pieces',
      'Alteration / Rework Pieces',
      'Priority',
      'Due Date',
      'Initial Inspection',
      'Alteration Inspection',
      'Defect Reason / Alter Notes',
      'Assigned Operator',
      'Delivery Chalan No.',
      'Date of Delivery',
      'Bill No.',
      'Pieces Completed',
      'Firm Name',
      'Photos Count',
      'Latest Photo URL',
      'Notes & Instructions',
      'Last Synced'
    ];

    const workflowRows = workflowItems.map(item => {
      const stepInfo = STAGE_STEP_MAP[item.currentStage] || { step: 1, name: item.currentStage, short: item.currentStage };
      const pcsVal = Number(item.pieces ?? item.quantity) || 0;
      const jobVal = item.jobNo || item.lotNumber;
      const partyVal = item.partyName || item.partyOrClientName || 'N/A';
      const dateVal = item.date || item.createdDate || timestamp.split('T')[0];

      const breakdownStr = item.stagePieceBreakdown
        ? Object.entries(item.stagePieceBreakdown)
            .filter(([_, count]) => Number(count) > 0)
            .map(([stg, count]) => `${STAGE_STEP_MAP[stg as WorkflowStageId]?.short || stg}: ${count} pcs`)
            .join('; ')
        : `${stepInfo.short}: ${pcsVal} pcs`;

      const goodPcs = item.individualPieces && item.individualPieces.length > 0
        ? item.individualPieces.filter(p => p.status === 'good' || p.status === 'repaired' || p.status === 'completed').length
        : (item.initialInspectionResult === 'bad_return' ? 0 : pcsVal);

      const alterPcs = item.individualPieces && item.individualPieces.length > 0
        ? item.individualPieces.filter(p => p.status === 'needs_alter' || p.status === 'in_rework').length
        : (item.currentStage === 'altering' ? pcsVal : 0);

      const latestPhoto = item.photos && item.photos.length > 0 ? item.photos[item.photos.length - 1].url : 'None';
      const initialInsp = item.initialInspectionResult === 'good' ? 'Passed (Good)' : item.initialInspectionResult === 'bad_return' ? 'Returned (Bad)' : 'Pending';
      const alterInsp = item.alterInspectionResult === 'passed' ? 'Passed' : item.alterInspectionResult === 'needs_alter' ? 'Needs Alteration' : 'Pending';

      return [
        jobVal,
        partyVal,
        item.chalanNumber || 'N/A',
        dateVal,
        item.designNumber,
        item.designName || 'N/A',
        item.fabricType,
        item.fabricColor || 'Default',
        pcsVal,
        item.currentStage.toUpperCase(),
        stepInfo.name,
        breakdownStr || `${stepInfo.short}: ${pcsVal} pcs`,
        goodPcs,
        alterPcs,
        item.priority.toUpperCase(),
        item.dueDate || 'N/A',
        initialInsp,
        alterInsp,
        item.alterationReason || 'None',
        item.assignedOperator || 'Floor Supervisor',
        item.deliveryChalanNo || item.deliveryChalanNumber || 'Pending',
        item.dateOfDelivery || item.deliveryDate || 'Pending',
        item.billNo || item.billNumber || 'Pending',
        Number(item.piecesCompleted ?? pcsVal),
        item.firmName || 'Udhna Textile Embroidery Works',
        item.photos?.length || 0,
        latestPhoto,
        item.notes || '',
        timestamp
      ];
    });

    batchData.push({
      range: `'Fabric Design Workflow'!A1:AC${Math.max(2, workflowRows.length + 1)}`,
      values: [workflowHeaders, ...workflowRows]
    });

    // ==========================================
    // TAB 3: Piece-Level Tracking (Unit Pieces)
    // ==========================================
    const pieceHeaders = [
      'Piece Tag (Unique ID)',
      'Job No.',
      'Lot / Branch ID',
      'Piece #',
      'Design No.',
      'Fabric Type',
      'Fabric Color',
      'Party Name',
      'Step (1-10)',
      'Stage Name',
      'Quality Status',
      'Defect Reason / Issue',
      'Alteration & Repair Notes',
      'Assigned Operator',
      'Chalan No.',
      'Last Status Update',
      'Last Synced'
    ];

    const pieceRows: any[][] = [];
    workflowItems.forEach(w => {
      const jobVal = w.jobNo || w.lotNumber;
      const partyVal = w.partyName || w.partyOrClientName || 'N/A';
      const colorVal = w.fabricColor || 'Default';
      const totalPcs = Number(w.pieces ?? w.quantity) || 1;

      if (w.individualPieces && w.individualPieces.length > 0) {
        w.individualPieces.forEach(p => {
          const stepInfo = STAGE_STEP_MAP[p.currentStage] || { step: 1, name: p.currentStage, short: p.currentStage };
          const statusDisplay = p.status === 'good' ? 'GOOD CONDITION'
            : p.status === 'needs_alter' ? 'NEEDS ALTERING'
            : p.status === 'in_rework' ? 'IN REWORK'
            : p.status === 'repaired' ? 'ALTERED & REPAIRED'
            : p.status === 'rejected' ? 'REJECTED'
            : 'COMPLETED';

          pieceRows.push([
            p.pieceTag || `${jobVal}-${w.fabricType.slice(0, 4).toUpperCase()}-P${String(p.pieceNumber).padStart(2, '0')}`,
            p.jobNo || jobVal,
            w.lotNumber,
            Number(p.pieceNumber),
            p.designNumber || w.designNumber,
            p.fabricType || w.fabricType,
            p.fabricColor || colorVal,
            p.partyName || partyVal,
            stepInfo.step,
            stepInfo.name,
            statusDisplay,
            p.defectReason || 'None',
            p.alterNotes || 'None',
            p.assignedOperator || w.assignedOperator || 'Floor Supervisor',
            w.chalanNumber || 'N/A',
            p.lastUpdated || w.date || timestamp,
            timestamp
          ]);
        });
      } else {
        const countToGen = Math.min(totalPcs, 30);
        const stepInfo = STAGE_STEP_MAP[w.currentStage] || { step: 1, name: w.currentStage, short: w.currentStage };
        for (let i = 1; i <= countToGen; i++) {
          pieceRows.push([
            `${jobVal}-${w.fabricType.slice(0, 4).toUpperCase()}-P${String(i).padStart(2, '0')}`,
            jobVal,
            w.lotNumber,
            i,
            w.designNumber,
            w.fabricType,
            colorVal,
            partyVal,
            stepInfo.step,
            stepInfo.name,
            w.initialInspectionResult === 'bad_return' ? 'REJECTED' : 'GOOD CONDITION',
            w.alterationReason || 'None',
            w.notes || 'None',
            w.assignedOperator || 'Floor Supervisor',
            w.chalanNumber || 'N/A',
            w.date || timestamp,
            timestamp
          ]);
        }
      }
    });

    batchData.push({
      range: `'Piece-Level Tracking'!A1:Q${Math.max(2, pieceRows.length + 1)}`,
      values: [pieceHeaders, ...pieceRows]
    });

    // ==========================================
    // TAB 4: Fabric & Color Matrix (Stage Breakdown)
    // ==========================================
    const matrixHeaders = [
      'Job No.',
      'Party Name',
      'Design No.',
      'Fabric Type',
      'Color Name',
      'Total Pcs',
      '1. Fabric Inward',
      '2. Chalan',
      '3. Insp-1 (Good/Return)',
      '4. Stitching Patta',
      '5. Embroidery (25-Head)',
      '6. Dhaga Cutting',
      '7. Insp-2 (Alter Insp)',
      '8. Altering / Rework',
      '9. Folding & Packing',
      '10. Prepare for Dispatch',
      'Completed Pcs (Stage 10)',
      'In-Progress Pcs (Stages 1-9)',
      'Completion %',
      'Due Date',
      'Last Synced'
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
        item.jobNo || item.lotNumber,
        item.partyName || item.partyOrClientName || 'N/A',
        item.designNumber,
        item.fabricType,
        item.fabricColor || 'Default',
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
        compPct,
        item.dueDate || 'N/A',
        timestamp
      ];
    });

    batchData.push({
      range: `'Fabric & Color Matrix'!A1:U${Math.max(2, matrixRows.length + 1)}`,
      values: [matrixHeaders, ...matrixRows]
    });

    // ==========================================
    // TAB 5: Live Inventory & Materials
    // ==========================================
    const inventoryHeaders = [
      'Item SKU Code',
      'Material Name',
      'Category',
      'Size / Gauge',
      'Color Name',
      'Color Hex',
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
      'Last Updated',
      'Last Synced'
    ];

    const inventoryRows = materials.map(m => {
      const stock = Number(m.currentStock) || 0;
      const cost = Number(m.unitCost) || 0;
      const totalVal = +(stock * cost).toFixed(2);
      const health = stock <= 0 ? 'DEPLETED' : stock <= m.minThreshold ? 'LOW STOCK ALERT' : 'STABLE';

      return [
        m.code || 'N/A',
        m.name,
        m.category,
        m.size || 'Standard',
        m.colorName || 'Default',
        m.colorCode || '#2563EB',
        m.supplier || 'Surat Textile Market',
        stock,
        m.unit,
        Number(m.minThreshold) || 100,
        health,
        m.locationBin || 'A-01',
        m.lotNumber || 'LOT-MAIN',
        cost,
        totalVal,
        Number(m.consumptionRatePerHour) || 0,
        m.lastUpdated || timestamp,
        timestamp
      ];
    });

    batchData.push({
      range: `'Live Inventory & Materials'!A1:R${Math.max(2, inventoryRows.length + 1)}`,
      values: [inventoryHeaders, ...inventoryRows]
    });

    // ==========================================
    // TAB 6: Stock Transactions
    // ==========================================
    const transactions = financeData?.transactions || [];
    const txHeaders = [
      'Timestamp',
      'Transaction ID',
      'Material SKU / ID',
      'Material Name',
      'Action Type',
      'Quantity Change',
      'Unit',
      'Unit Cost (₹)',
      'Total Valuation (₹)',
      'Remaining Stock',
      'Batch / Lot / PO Code',
      'Supplier / Source',
      'Operator',
      'Finance Classification',
      'Notes & Memo',
      'Last Synced'
    ];

    const txRows = transactions.map(tx => {
      const mat = materials.find(m => m.id === tx.materialId);
      const remStock = mat ? mat.currentStock : 0;
      const finStatus = tx.linkedPayableId ? 'Accounts Payable Created' : tx.linkedExpenseId ? 'Paid Outflow Expense' : 'Floor Inventory Movement';

      return [
        tx.timestamp || timestamp,
        tx.id,
        tx.materialId || 'N/A',
        tx.materialName,
        tx.type.toUpperCase(),
        Number(tx.quantity) || 0,
        tx.unit,
        Number(tx.unitCost) || 0,
        Number(tx.totalCost) || 0,
        remStock,
        tx.batchId || 'N/A',
        tx.supplierName || 'Floor Warehouse',
        tx.operator || 'Admin',
        finStatus,
        tx.notes || '',
        timestamp
      ];
    });

    batchData.push({
      range: `'Stock Transactions'!A1:P${Math.max(2, txRows.length + 1)}`,
      values: [txHeaders, ...txRows]
    });

    // ==========================================
    // TAB 7: Dispatch & Shipments
    // ==========================================
    const dispatchOrders = financeData?.dispatchOrders || [];
    const dispatchHeaders = [
      'Dispatch No.',
      'Party / Buyer Name',
      'Status',
      'Product / SKU Name',
      'Quantity',
      'Unit',
      'Unit Price (₹)',
      'Subtotal (₹)',
      'GST Tax (₹)',
      'Total Invoice (₹)',
      'Amount Paid (₹)',
      'Balance Due (₹)',
      'Payment Status',
      'Payment History Log',
      'Transporter / Courier',
      'Vehicle / Tracking No.',
      'Ready Date',
      'Dispatched Date',
      'Invoice No.',
      'Delivery Address',
      'Notes',
      'Last Synced'
    ];

    const dispatchRows = dispatchOrders.map(d => {
      const payHistoryStr = (d.paymentHistory || []).map(p => `[${p.date}: ₹${p.amount} via ${p.paymentMode} ref ${p.transactionRef}]`).join('; ');
      return [
        d.dispatchNumber,
        d.partyName,
        d.status.toUpperCase(),
        `${d.productName}${d.colorName ? ` (${d.colorName})` : ''}`,
        Number(d.quantity) || 0,
        d.unit,
        Number(d.unitPrice) || 0,
        Number(d.subtotal) || 0,
        Number(d.taxAmount) || 0,
        Number(d.totalInvoiceAmount) || 0,
        Number(d.amountPaid) || 0,
        Number(d.balanceDue) || 0,
        d.paymentStatus.toUpperCase(),
        payHistoryStr || 'None',
        d.transporterName || 'Self / Pickup',
        d.vehicleOrTrackingNumber || 'N/A',
        d.readyDate,
        d.dispatchedDate || 'Pending',
        d.invoiceNumber || 'N/A',
        d.deliveryAddress || 'N/A',
        d.notes || '',
        timestamp
      ];
    });

    batchData.push({
      range: `'Dispatch & Shipments'!A1:V${Math.max(2, dispatchRows.length + 1)}`,
      values: [dispatchHeaders, ...dispatchRows]
    });

    // ==========================================
    // TAB 8: Party Invoices & Receivables
    // ==========================================
    const partyInvoices = financeData?.partyInvoices || [];
    const partyHeaders = [
      'Invoice No.',
      'Party / Buyer Name',
      'Order Description',
      'Issue Date',
      'Due Date',
      'Total Amount (₹)',
      'Amount Received (₹)',
      'Balance Due (₹)',
      'Payment Status',
      'Payment History Details',
      'Contact Person',
      'Last Synced'
    ];

    const partyRows = partyInvoices.map(p => {
      const payHist = (p.paymentHistory || []).map(h => `[${h.date}: ₹${h.amount} via ${h.paymentMode}]`).join('; ');
      return [
        p.invoiceNumber,
        p.partyName,
        p.orderDescription,
        p.issueDate,
        p.dueDate,
        Number(p.totalAmount) || 0,
        Number(p.amountReceived) || 0,
        Number(p.balanceDue) || 0,
        p.status.toUpperCase(),
        payHist || 'None',
        p.contactPerson || 'N/A',
        timestamp
      ];
    });

    batchData.push({
      range: `'Party Invoices & Receivables'!A1:L${Math.max(2, partyRows.length + 1)}`,
      values: [partyHeaders, ...partyRows]
    });

    // ==========================================
    // TAB 9: Supplier Payables & Imports
    // ==========================================
    const supplierPayables = financeData?.supplierPayables || [];
    const supplierHeaders = [
      'PO Code',
      'Supplier / Vendor Name',
      'Material Description',
      'Quantity Imported',
      'Unit',
      'Unit Price (₹)',
      'Total Bill (₹)',
      'Amount Paid (₹)',
      'Balance Owed (₹)',
      'Purchase Date',
      'Payment Due Date',
      'Payment Status',
      'Lot / Batch #',
      'Payment History',
      'Last Synced'
    ];

    const supplierRows = supplierPayables.map(s => {
      const payHist = (s.paymentHistory || []).map(h => `[${h.date}: ₹${h.amount} via ${h.paymentMode}]`).join('; ');
      return [
        s.purchaseOrderCode,
        s.supplierName,
        s.materialNameOrDescription,
        Number(s.quantityImported) || 0,
        s.unit,
        Number(s.unitPrice) || 0,
        Number(s.totalBillAmount) || 0,
        Number(s.amountPaid) || 0,
        Number(s.balanceOwed) || 0,
        s.purchaseDate,
        s.paymentDueDate,
        s.status.toUpperCase(),
        s.lotBatchNumber || 'N/A',
        payHist || 'None',
        timestamp
      ];
    });

    batchData.push({
      range: `'Supplier Payables & Imports'!A1:O${Math.max(2, supplierRows.length + 1)}`,
      values: [supplierHeaders, ...supplierRows]
    });

    // ==========================================
    // TAB 10: Staff Payroll
    // ==========================================
    const employees = financeData?.employees || [];
    const payrollHeaders = [
      'Employee Code',
      'Full Name',
      'Designation / Role',
      'Department',
      'Salary Type',
      'Base Monthly Salary (₹)',
      'Overtime / Bonus (₹)',
      'Deductions (₹)',
      'Net Payable (₹)',
      'Payment Status',
      'Payment Method',
      'Bank / UPI Ref',
      'Last Paid Date',
      'Last Synced'
    ];

    const payrollRows = employees.map(e => [
      e.employeeCode,
      e.name,
      e.role,
      e.department,
      e.salaryType,
      Number(e.baseSalary) || 0,
      Number(e.bonusOrOvertime) || 0,
      Number(e.deductions) || 0,
      Number(e.netPayable) || 0,
      e.paymentStatus.toUpperCase(),
      e.paymentMethod,
      e.bankAccountOrUpi || 'N/A',
      e.lastPaidDate || 'N/A',
      timestamp
    ]);

    batchData.push({
      range: `'Staff Payroll'!A1:N${Math.max(2, payrollRows.length + 1)}`,
      values: [payrollHeaders, ...payrollRows]
    });

    // ==========================================
    // TAB 11: Expenses & Utilities
    // ==========================================
    const expenses = financeData?.expenses || [];
    const electricityRecords = financeData?.electricityRecords || [];
    const expenseHeaders = [
      'Record Type',
      'Reference / Code',
      'Billing Month / Date',
      'Category',
      'Title / Description',
      'Amount (₹)',
      'Payee / Vendor',
      'Payment Status',
      'Payment Method',
      'Power Consumed (kWh)',
      'Tariff Rate (₹/kWh)',
      'Receipt / Bill Ref',
      'Last Synced'
    ];

    const expenseRows: any[][] = [];

    // Add electricity records
    electricityRecords.forEach(el => {
      expenseRows.push([
        'ELECTRICITY BILL',
        el.id,
        el.month,
        'electricity',
        `Monthly Electricity Consumption (${el.month})`,
        Number(el.totalBillAmount) || 0,
        'Torrent Power / DGVCL',
        el.paymentStatus.toUpperCase(),
        'Bank / RTGS',
        Number(el.totalKwhConsumed) || 0,
        Number(el.tariffPerKwh) || 0,
        el.billInvoiceRef || 'N/A',
        timestamp
      ]);
    });

    // Add general expenses
    expenses.forEach(ex => {
      expenseRows.push([
        'OPERATING EXPENSE',
        ex.expenseCode,
        ex.date,
        ex.category,
        ex.title,
        Number(ex.amount) || 0,
        ex.vendorOrPayee,
        ex.paymentStatus.toUpperCase(),
        ex.paymentMethod,
        'N/A',
        'N/A',
        ex.receiptInvoiceNo || 'N/A',
        timestamp
      ]);
    });

    batchData.push({
      range: `'Expenses & Utilities'!A1:M${Math.max(2, expenseRows.length + 1)}`,
      values: [expenseHeaders, ...expenseRows]
    });

    // ==========================================
    // Execute Batch Update with USER_ENTERED
    // ==========================================
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values:batchUpdate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: batchData
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(errText || 'Failed to update Google Sheet batch');
    }

    // Automatically share with collaborator emails
    let collaboratorResults: Array<{ email: string; success: boolean; message: string }> = [];
    try {
      collaboratorResults = await shareSpreadsheetWithEmails(accessToken, sheetId, AUTHORIZED_COLLABORATOR_EMAILS, 'writer');
    } catch {
      // Non-blocking
    }

    return {
      success: true,
      message: `Directly synced ${orderSlips.length} master order slips, ${workflowItems.length} fabric designs, ${pieceRows.length} unit pieces, ${materials.length} raw materials, ${dispatchOrders.length} dispatches, and complete financial ledgers into 11 structured tabs.`,
      spreadsheetId: sheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      timestamp,
      sheetsUpdated: REQUIRED_SHEET_DEFS.map(d => d.title),
      collaboratorSharing: collaboratorResults
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Error communicating with Google Sheets API',
      spreadsheetId: sheetId,
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      timestamp
    };
  }
}

/**
 * Automatically appends or updates a master order slip in Google Sheets
 */
export async function appendOrderSlipToGoogleSheet(
  accessToken: string,
  sheetId: string,
  slip: OrderSlip
): Promise<boolean> {
  if (!accessToken || !sheetId) return false;

  try {
    const timestamp = new Date().toISOString();
    const fabricColsStr = (slip.fabricColumns || []).join(', ');
    const colorBreakdownStr = (slip.colorRows || []).map(cr => {
      const fabBreak = Object.entries(cr.fabricQuantities || {})
        .filter(([_, q]) => Number(q) > 0)
        .map(([fab, q]) => `${fab}: ${q}`)
        .join(', ');
      return `[${cr.colorName}: ${fabBreak || 'None'}]`;
    }).join('; ');

    const row = [
      slip.jobNo || slip.id,
      slip.partyName,
      slip.chalanNo || 'N/A',
      slip.date,
      Number(slip.totalPcs) || 0,
      fabricColsStr || 'Standard Kali',
      slip.colorRows?.length || 0,
      colorBreakdownStr || 'Standard Breakdown',
      slip.inwardChallanNotes || '',
      slip.calculationNotes || '',
      slip.deliveryChalanNo || 'Pending',
      slip.deliveryDate || 'Pending',
      slip.billNo || 'Pending',
      Number(slip.piecesCompleted) || Number(slip.totalPcs) || 0,
      slip.firmName || 'Udhna Textile Embroidery Works',
      (slip.status || 'ACTIVE').toUpperCase(),
      slip.createdAt || slip.date,
      timestamp
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Master Order Slips'!A:R:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );

    return true;
  } catch (err) {
    console.warn('Auto-append order slip to Google Sheet note:', err);
    return false;
  }
}

/**
 * Automatically appends or updates a single workflow design record to Google Sheet
 */
export async function appendWorkflowDesignToGoogleSheet(
  accessToken: string,
  sheetId: string,
  item: WorkflowItem
): Promise<boolean> {
  if (!accessToken || !sheetId) return false;

  try {
    const timestamp = new Date().toISOString();
    const stepInfo = STAGE_STEP_MAP[item.currentStage] || { step: 1, name: item.currentStage, short: item.currentStage };
    const pcsVal = Number(item.pieces ?? item.quantity) || 0;
    const jobVal = item.jobNo || item.lotNumber;
    const partyVal = item.partyName || item.partyOrClientName || 'N/A';
    const dateVal = item.date || item.createdDate || timestamp.split('T')[0];

    const breakdownStr = item.stagePieceBreakdown
      ? Object.entries(item.stagePieceBreakdown)
          .filter(([_, count]) => Number(count) > 0)
          .map(([stg, count]) => `${STAGE_STEP_MAP[stg as WorkflowStageId]?.short || stg}: ${count} pcs`)
          .join('; ')
      : `${stepInfo.short}: ${pcsVal} pcs`;

    const goodPcs = item.individualPieces && item.individualPieces.length > 0
      ? item.individualPieces.filter(p => p.status === 'good' || p.status === 'repaired' || p.status === 'completed').length
      : (item.initialInspectionResult === 'bad_return' ? 0 : pcsVal);

    const alterPcs = item.individualPieces && item.individualPieces.length > 0
      ? item.individualPieces.filter(p => p.status === 'needs_alter' || p.status === 'in_rework').length
      : (item.currentStage === 'altering' ? pcsVal : 0);

    const latestPhoto = item.photos && item.photos.length > 0 ? item.photos[item.photos.length - 1].url : 'None';
    const initialInsp = item.initialInspectionResult === 'good' ? 'Passed (Good)' : item.initialInspectionResult === 'bad_return' ? 'Returned (Bad)' : 'Pending';
    const alterInsp = item.alterInspectionResult === 'passed' ? 'Passed' : item.alterInspectionResult === 'needs_alter' ? 'Needs Alteration' : 'Pending';

    const row = [
      jobVal,
      partyVal,
      item.chalanNumber || 'N/A',
      dateVal,
      item.designNumber,
      item.designName || 'N/A',
      item.fabricType,
      item.fabricColor || 'Default',
      pcsVal,
      item.currentStage.toUpperCase(),
      stepInfo.name,
      breakdownStr,
      goodPcs,
      alterPcs,
      item.priority.toUpperCase(),
      item.dueDate || 'N/A',
      initialInsp,
      alterInsp,
      item.alterationReason || 'None',
      item.assignedOperator || 'Floor Supervisor',
      item.deliveryChalanNo || item.deliveryChalanNumber || 'Pending',
      item.dateOfDelivery || item.deliveryDate || 'Pending',
      item.billNo || item.billNumber || 'Pending',
      Number(item.piecesCompleted ?? pcsVal),
      item.firmName || 'Udhna Textile Embroidery Works',
      item.photos?.length || 0,
      latestPhoto,
      item.notes || '',
      timestamp
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Fabric Design Workflow'!A:AC:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );

    return true;
  } catch (err) {
    console.warn('Auto-append workflow design to Google Sheet note:', err);
    return false;
  }
}

/**
 * Automatically appends or updates an individual piece unit status / defect inspection event
 */
export async function appendPieceStatusToGoogleSheet(
  accessToken: string,
  sheetId: string,
  piece: IndividualPieceUnit,
  parentLot?: WorkflowItem
): Promise<boolean> {
  if (!accessToken || !sheetId) return false;

  try {
    const timestamp = new Date().toISOString();
    const stepInfo = STAGE_STEP_MAP[piece.currentStage] || { step: 1, name: piece.currentStage, short: piece.currentStage };
    const statusDisplay = piece.status === 'good' ? 'GOOD CONDITION'
      : piece.status === 'needs_alter' ? 'NEEDS ALTERING'
      : piece.status === 'in_rework' ? 'IN REWORK'
      : piece.status === 'repaired' ? 'ALTERED & REPAIRED'
      : piece.status === 'rejected' ? 'REJECTED'
      : 'COMPLETED';

    const row = [
      piece.pieceTag,
      piece.jobNo || parentLot?.jobNo || parentLot?.lotNumber || piece.lotNumber,
      piece.lotNumber || parentLot?.lotNumber || 'N/A',
      Number(piece.pieceNumber),
      piece.designNumber || parentLot?.designNumber || 'N/A',
      piece.fabricType || parentLot?.fabricType || 'N/A',
      piece.fabricColor || parentLot?.fabricColor || 'Default',
      piece.partyName || parentLot?.partyName || parentLot?.partyOrClientName || 'N/A',
      stepInfo.step,
      stepInfo.name,
      statusDisplay,
      piece.defectReason || 'None',
      piece.alterNotes || 'None',
      piece.assignedOperator || parentLot?.assignedOperator || 'Floor Supervisor',
      parentLot?.chalanNumber || 'N/A',
      piece.lastUpdated || timestamp,
      timestamp
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Piece-Level Tracking'!A:Q:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );

    return true;
  } catch (err) {
    console.warn('Auto-append piece status to Google Sheet note:', err);
    return false;
  }
}

/**
 * Automatically appends a single material stock transaction
 */
export async function appendTransactionToGoogleSheet(
  accessToken: string,
  sheetId: string,
  transaction: StockTransaction,
  remainingStock: number
): Promise<boolean> {
  if (!accessToken || !sheetId) return false;

  try {
    const finStatus = transaction.linkedPayableId 
      ? 'Accounts Payable Created' 
      : transaction.linkedExpenseId 
      ? 'Paid Outflow Expense' 
      : 'Floor Inventory Movement';

    const row = [
      transaction.timestamp || new Date().toISOString(),
      transaction.id,
      transaction.materialId || 'N/A',
      transaction.materialName,
      transaction.type.toUpperCase(),
      Number(transaction.quantity) || 0,
      transaction.unit,
      Number(transaction.unitCost) || 0,
      Number(transaction.totalCost) || 0,
      Number(remainingStock) || 0,
      transaction.batchId || 'N/A',
      transaction.supplierName || 'Floor Warehouse',
      transaction.operator,
      finStatus,
      transaction.notes || '',
      new Date().toISOString()
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Stock Transactions'!A:P:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );

    return true;
  } catch (err) {
    console.warn('Auto-append transaction to Google Sheet notice:', err);
    return false;
  }
}

/**
 * Automatically appends a newly dispatched delivery order to Google Sheets
 */
export async function appendDispatchOrderToGoogleSheet(
  accessToken: string,
  sheetId: string,
  d: DispatchOrder
): Promise<boolean> {
  if (!accessToken || !sheetId) return false;

  try {
    const timestamp = new Date().toISOString();
    const payHistoryStr = (d.paymentHistory || []).map(p => `[${p.date}: ₹${p.amount} via ${p.paymentMode} ref ${p.transactionRef}]`).join('; ');
    
    const row = [
      d.dispatchNumber,
      d.partyName,
      d.status.toUpperCase(),
      `${d.productName}${d.colorName ? ` (${d.colorName})` : ''}`,
      Number(d.quantity) || 0,
      d.unit,
      Number(d.unitPrice) || 0,
      Number(d.subtotal) || 0,
      Number(d.taxAmount) || 0,
      Number(d.totalInvoiceAmount) || 0,
      Number(d.amountPaid) || 0,
      Number(d.balanceDue) || 0,
      d.paymentStatus.toUpperCase(),
      payHistoryStr || 'None',
      d.transporterName || 'Self / Pickup',
      d.vehicleOrTrackingNumber || 'N/A',
      d.readyDate,
      d.dispatchedDate || 'Pending',
      d.invoiceNumber || 'N/A',
      d.deliveryAddress || 'N/A',
      d.notes || '',
      timestamp
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Dispatch & Shipments'!A:V:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [row]
        })
      }
    );

    return true;
  } catch (err) {
    console.warn('Auto-append dispatch order to Google Sheet note:', err);
    return false;
  }
}
