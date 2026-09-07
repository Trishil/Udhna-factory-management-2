import * as XLSX from 'xlsx';
import { WorkflowItem, OrderSlip, RawMaterial, DispatchOrder, IndividualPieceUnit } from '../types';

export interface ExportDataPayload {
  workflowItems: WorkflowItem[];
  orderSlips: OrderSlip[];
  materials?: RawMaterial[];
  dispatchOrders?: DispatchOrder[];
  pieces?: IndividualPieceUnit[];
  companyName?: string;
}

/**
 * Generates and downloads a multi-sheet Excel (.xlsx) file containing all live factory data
 */
export function exportFactoryDataToExcel({
  workflowItems,
  orderSlips,
  materials = [],
  dispatchOrders = [],
  pieces = [],
  companyName = 'Trisharth'
}: ExportDataPayload) {
  const wb = XLSX.utils.book_new();

  // 1. Sheet: Fabric Design Workflow
  const workflowRows = workflowItems.map(item => ({
    'Job / Lot No': item.lotNumber || item.jobNo || '',
    'Party Name': item.partyName || item.partyOrClientName || '',
    'Chalan No': item.chalanNumber || (item as any).challanSlip || '',
    'Design No': item.designNumber || '',
    'Design Name': item.designName || '',
    'Fabric Type': item.fabricType || '',
    'Fabric Color': item.fabricColor || '',
    'Total Pcs': item.pieces || item.quantity || 0,
    'Current Stage': item.currentStage || 'fabric',
    'Stage Name': item.stageHistory?.[item.stageHistory.length - 1]?.stageName || item.currentStage,
    'Quality Status': item.initialInspectionResult || 'good',
    'Priority': item.priority || 'normal',
    'Due Date': item.dueDate || '',
    'Assigned Operator': item.assignedOperator || '',
    'Delivery Chalan': item.deliveryChalanNumber || '',
    'Bill No': item.billNumber || '',
    'Notes': item.notes || ''
  }));
  const wsWorkflow = XLSX.utils.json_to_sheet(workflowRows.length > 0 ? workflowRows : [{ 'Notice': 'No active workflow items' }]);
  XLSX.utils.book_append_sheet(wb, wsWorkflow, 'Workflow Pipeline');

  // 2. Sheet: Master Order Slips
  const slipRows = orderSlips.map(slip => ({
    'Job No': slip.jobNo || '',
    'Party Name': slip.partyName || '',
    'Chalan No': slip.chalanNo || '',
    'Date': slip.date || '',
    'Total Ordered Pcs': slip.totalPcs || 0,
    'Fabric Columns': Array.isArray(slip.fabricColumns) ? slip.fabricColumns.join(', ') : '',
    'Colorways Count': slip.colorRows?.length || 0,
    'Delivery Chalan': slip.deliveryChalanNo || '',
    'Delivery Date': slip.deliveryDate || '',
    'Bill No': slip.billNo || '',
    'Completed Pcs': slip.piecesCompleted || 0,
    'Inward Challan Notes': slip.inwardChallanNotes || '',
    'Order Calculation Notes': slip.calculationNotes || '',
    'Created At': slip.createdAt || ''
  }));
  const wsSlips = XLSX.utils.json_to_sheet(slipRows.length > 0 ? slipRows : [{ 'Notice': 'No order slips created' }]);
  XLSX.utils.book_append_sheet(wb, wsSlips, 'Master Order Slips');

  // 3. Sheet: Fabric & Color Breakdown Matrix
  const matrixRows: any[] = [];
  orderSlips.forEach(slip => {
    (slip.colorRows || []).forEach((row, rIdx) => {
      (slip.fabricColumns || []).forEach(col => {
        const qty = Number(row.fabricQuantities?.[col]) || 0;
        if (qty > 0) {
          matrixRows.push({
            'Job No': slip.jobNo,
            'Party Name': slip.partyName,
            'Chalan No': slip.chalanNo,
            'Color Name': row.colorName,
            'Design No': row.designNumber || 'DSG-101',
            'Fabric Component': col,
            'Pieces': qty,
            'Row Index': rIdx + 1
          });
        }
      });
    });
  });
  const wsMatrix = XLSX.utils.json_to_sheet(matrixRows.length > 0 ? matrixRows : [{ 'Notice': 'No matrix breakdown data' }]);
  XLSX.utils.book_append_sheet(wb, wsMatrix, 'Color & Component Matrix');

  // 4. Sheet: Live Inventory & Stock
  const inventoryRows = materials.map(m => ({
    'SKU / Code': m.code || m.id,
    'Material Name': m.name,
    'Category': m.category || 'Fabric',
    'Current Stock': m.currentStock || 0,
    'Unit': m.unit || 'meters',
    'Cost Per Unit (INR)': m.unitCost || 0,
    'Total Valuation (INR)': (m.currentStock || 0) * (m.unitCost || 0),
    'Min Alert Threshold': m.minThreshold || 50,
    'Location Bin': m.locationBin || 'A-01',
    'Supplier': m.supplier || 'Surat Market',
    'Last Updated': m.lastUpdated || ''
  }));
  const wsInventory = XLSX.utils.json_to_sheet(inventoryRows.length > 0 ? inventoryRows : [{ 'Notice': 'No materials in stock' }]);
  XLSX.utils.book_append_sheet(wb, wsInventory, 'Live Inventory');

  // 5. Sheet: Dispatch Logistics
  const dispatchRows = dispatchOrders.map(d => ({
    'Dispatch No': d.dispatchNumber,
    'Order No': d.orderNumber,
    'Party Name': d.partyName,
    'Product': d.productName,
    'Quantity': d.quantity,
    'Unit': d.unit,
    'Unit Price': d.unitPrice,
    'Subtotal': d.subtotal,
    'Tax Amount': d.taxAmount,
    'Total Invoice': d.totalInvoiceAmount,
    'Amount Paid': d.amountPaid,
    'Balance Due': d.balanceDue,
    'Payment Status': d.paymentStatus,
    'Status': d.status,
    'Ready Date': d.readyDate,
    'Dispatched Date': d.dispatchedDate || '',
    'Transporter': d.transporterName || '',
    'Tracking No': d.trackingNumber || '',
    'Delivery Address': d.deliveryAddress || ''
  }));
  const wsDispatch = XLSX.utils.json_to_sheet(dispatchRows.length > 0 ? dispatchRows : [{ 'Notice': 'No dispatch orders' }]);
  XLSX.utils.book_append_sheet(wb, wsDispatch, 'Dispatch Logistics');

  // Generate File Name with Date
  const dateStr = new Date().toISOString().split('T')[0];
  const safeComp = companyName.replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `${safeComp}_Factory_ERP_Export_${dateStr}.xlsx`;

  // Write and trigger download in browser
  XLSX.writeFile(wb, filename);
}
