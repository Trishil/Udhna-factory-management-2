export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'stopped';

export type MaterialCategory = string;

export interface RawMaterial {
  id: string;
  code?: string; // Item / Design / SKU Code, e.g. 'PD080 # 4mm'
  name: string;
  category: string;
  size?: string; // Size / Gauge, e.g. '1.7mm', '2mm', '3mm', '4mm', '8mm Flat'
  colorName?: string; // Named color, e.g. 'Emerald Green', 'Sapphire Blue', 'Rose Pink'
  currentStock: number;
  unit: string;
  minThreshold: number;
  unitCost: number;
  supplier: string;
  colorCode: string;
  lotNumber: string;
  locationBin: string;
  consumptionRatePerHour: number; // typical burn rate per machine
  lastUpdated: string;
}

export interface TaskMaterialInput {
  materialId: string;
  materialName?: string;
  materialCode?: string;
  materialCategory?: string;
  materialSize?: string;
  materialColorCode?: string;
  materialColorName?: string;
  unit: string;
  estimatedAmountUsed: number; // estimated amount of each material used for this task
  rateOfConsumption: number; // rate of consumption per hour
  consumedSoFar?: number; // actual tracked consumption so far
  initialStockAtStart?: number; // stock level when task began
  allocatedAtStart?: number; // initial allocation deducted when task launched
  unitCost?: number;
}

export type MachineOperatingSpeedMode = 'cutdana' | 'sequin' | 'flat_zari' | 'custom';

export interface YuemeiFrameMaterialEstimate {
  slotNumber: number;
  name: string;
  category: string;
  metricType: 'length' | 'weight' | 'reels';
  unit: string;
  minPerFrame: number;
  maxPerFrame: number;
  avgPerFrame: number;
  perHeadNote?: string;
  totalForFrames: number;
  burnRatePerHour: number;
}

export interface Yuemei25HeadFrameCalculation {
  frameCount: number;
  stitchesPerHead: number;
  totalStitchesAllHeads: number; // stitchesPerHead * 25
  speedMode: MachineOperatingSpeedMode;
  operatingRpm: number;
  estimatedHoursPerFrame: number;
  totalEstimatedHours: number;
  materials: YuemeiFrameMaterialEstimate[];
}

export interface MachineTask {
  id: string;
  taskCode: string;
  title: string;
  targetOutputUnits: number;
  currentOutputUnits: number;
  targetUnitName: string; // e.g. 'meters', 'units', 'pcs', 'frames'
  materials: TaskMaterialInput[]; // multi-material inputs, addable and deductable
  operator: string;
  startedAt?: string;
  completedAt?: string;
  estimatedHours?: number;
  status: 'running' | 'paused' | 'completed' | 'queued' | 'discarded';
  totalMaterialCost?: number;
  notes?: string;
  // 25-Head Yuemei Frame & Pattern Telemetry
  machineHeadCount?: number; // e.g. 25
  patternStitchesPerHead?: number; // e.g. 125000 stitches
  targetFramesCount?: number; // e.g. 8 full frames
  completedFramesCount?: number; // e.g. 3 frames
  speedMode?: MachineOperatingSpeedMode; // 'cutdana' | 'sequin' | 'flat_zari'
  frameLengthMeters?: number; // e.g. 12.5 meters
}

export interface PredictiveStockMetric {
  materialId: string;
  materialName: string;
  materialCode?: string;
  category: string;
  currentStock: number;
  unit: string;
  unitCost: number;
  minThreshold: number;
  totalBurnRatePerHour: number;
  activeMachineCount: number;
  activeMachineNames: string[];
  activeTaskCodes: string[];
  hoursRemaining: number | null;
  estimatedDepletionDate: Date | null;
  depletionStatus: 'critical' | 'warning' | 'normal' | 'idle';
  formattedTimeRemaining: string;
}

export interface Machine {
  id: string;
  name: string;
  model: string;
  status: MachineStatus;
  currentMaterialId?: string; // assigned primary material (legacy/quick ref)
  secondaryMaterialId?: string; // optional secondary feed
  activeTask?: MachineTask; // active multi-material task running on machine
  activeJobName: string;
  rpm: number;
  maxRpm: number;
  outputCount: number;
  targetCount: number;
  operator: string;
  temperatureCelsius: number;
  uptimeHours: number;
  efficiencyPercent: number;
  feedLinesCount: number;
  lastMaintenance: string;
  notes?: string;
  // 25-Head Yuemei Specifications & Frame Dimensions
  headCount?: number; // default 25 heads
  headPitchMm?: number; // 400 mm to 500 mm per head
  frameLengthMeters?: number; // 10.5 to 13.5 meters across all 25 heads
  embroideryAreaMm?: { x: number; y: number }; // 400 mm × 1200 mm (or up to 1500 mm Y)
  speedMode?: MachineOperatingSpeedMode; // 'cutdana' (450-650 RPM), 'sequin' (650-800 RPM), 'flat_zari' (850-1000 RPM)
  currentStitchesPerHead?: number; // e.g. 125,000 stitches
  completedFramesCount?: number; // completed full frames
  targetFramesCount?: number; // target full frames
}

export interface ProductionJob {
  id: string;
  jobCode: string;
  title: string;
  machineId: string;
  requiredMaterialId: string;
  quantityRequired: number;
  quantityCompleted: number;
  status: 'queued' | 'in_progress' | 'completed' | 'paused';
  createdAt: string;
  estimatedCompletion: string;
}

export interface StockTransaction {
  id: string;
  materialId: string;
  materialName: string;
  type: 'consumption' | 'restock' | 'transfer' | 'adjustment' | 'dispatch';
  quantity: number;
  unit: string;
  machineId?: string;
  machineName?: string;
  operator: string;
  timestamp: string;
  batchId?: string; // Unified unique batch/lot ID
  unitCost?: number; // Cost per unit in INR ₹
  totalCost?: number; // Total financial value/cost of this transaction
  supplierName?: string; // Linked supplier
  linkedPayableId?: string; // Linked Supplier Payable in Finance
  linkedExpenseId?: string; // Linked Operating Expense in Finance
  notes?: string;
}

export interface SyncConfig {
  sheetUrl: string;
  sheetId: string;
  deploymentId: string;
  scriptUrl: string;
  autoSyncIntervalSec: number;
  lastSyncTimestamp: string | null;
  syncStatus: 'synced' | 'syncing' | 'error' | 'idle';
  lastErrorMessage?: string;
  mode: 'live_app_script' | 'sheet_csv' | 'local_storage';
}

export interface FactoryAlert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  sourceId?: string;
  sourceType: 'machine' | 'material' | 'system';
  resolved: boolean;
}

export interface CompanyWorkspace {
  id: string;
  name: string;
  code: string;
  sheetId: string;
  scriptUrl?: string;
  isPrimary?: boolean;
  logo?: string;
  ownerEmail: string;
  allowedEmails?: string[];
  membersCount?: number;
  description?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  accessToken?: string;
  role: 'owner' | 'editor' | 'viewer' | 'operator';
  companyId?: string;
  companyName?: string;
  companyCode?: string;
  sheetAccessGranted: boolean;
  sheetTitle?: string;
  authMethod: 'google_oauth' | 'demo' | 'tenant';
  loginTimestamp: string;
}

export type AppTab = 'workflow' | 'inventory' | 'dispatch' | 'finance' | 'production' | 'analytics';

export type WorkflowStageId = 
  | 'fabric'
  | 'chalan'
  | 'inspection'
  | 'stitching_patta'
  | 'embroidery'
  | 'dhaga_cutting'
  | 'inspection_alter'
  | 'altering'
  | 'folding'
  | 'prepare_dispatch';

export interface WorkflowStageHistory {
  stageId?: WorkflowStageId;
  fromStage?: WorkflowStageId | string;
  toStage?: WorkflowStageId | string;
  stageName?: string;
  enteredAt?: string;
  timestamp?: string;
  completedAt?: string;
  operatorName?: string;
  operator?: string;
  notes?: string;
  qualityStatus?: 'good' | 'bad_return' | 'needs_alter' | 'passed';
}

export interface WorkflowCustomMetadataField {
  key: string;
  value: string;
}

export interface DesignPhoto {
  id: string;
  url: string;
  storagePath?: string;
  caption?: string;
  stageCapturedAt?: WorkflowStageId;
  stageCaptured?: WorkflowStageId;
  capturedBy?: string;
  takenBy?: string;
  timestamp: string;
  deviceSource?: 'android_app' | 'web_camera' | 'web_upload';
  source?: 'android_app' | 'web_camera' | 'web_upload';
  metadata?: {
    cameraModel?: string;
    resolution?: string;
    stageName?: string;
    notes?: string;
    [key: string]: any;
  };
}

export interface WorkflowItem {
  id: string;
  lotNumber: string; // Job No. / Lot No. e.g. "LOT-8421"
  jobNo?: string; // Job No. (e.g. "JOB-2026-104")
  designNumber: string; // Design no. (D.no) e.g. "DSG-104"
  designName?: string; // Descriptive name e.g. "Bridal Lehanga Border"
  designImage?: string; // Primary design photo / thumbnail URL
  photos?: DesignPhoto[]; // Gallery of all captured photos from mobile Android app & web
  fabricType: string; // Fabric type (e.g. "Kali", "Dupatta", "Blouse front", "Blouse Back", "Lace", etc.)
  fabricColor?: string; // 1) Color
  partyOrClientName?: string; // 2) Party Name
  partyName?: string; // 2) Party Name alias
  date?: string; // 4) Date of creation / receipt (YYYY-MM-DD)
  chalanNumber?: string; // 5) Chalan no. (Ch. NO.)
  pieces?: number; // 6) Pcs (integer count)
  quantity: number; // e.g. 120 pieces or 450 meters
  unit: 'pieces' | 'meters' | 'rolls' | 'sets' | 'sarees' | 'suits';
  currentStage: WorkflowStageId;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  initialInspectionResult?: 'good' | 'bad_return' | 'pending';
  alterInspectionResult?: 'passed' | 'needs_alter' | 'pending';
  alterationReason?: string;
  assignedOperator?: string;
  machineAssigned?: string;
  tags?: string[];
  notes?: string; // 9) Note of any kind
  createdDate: string; // Date
  dueDate?: string;
  customMetadata?: WorkflowCustomMetadataField[]; // Custom metadata key-values (e.g. Storage Location, Bin, Roll Barcode, Stitch density)
  stageHistory: WorkflowStageHistory[];
  isReturned?: boolean; // For items marked as Bad (Return) in initial inspection
  isDispatched?: boolean; // Handed off to dispatch
  lastSyncedWithFirebase?: string;

  // After Completion Fields:
  deliveryChalanNumber?: string; // 10) Delivery Chalan No. (Ch. no.)
  deliveryChalanNo?: string; // 10) Delivery Chalan No. alias
  deliveryDate?: string; // 11) Date of delivery (YYYY-MM-DD)
  dateOfDelivery?: string; // 11) Date of delivery alias
  billNumber?: string; // 12) Bill no.
  billNo?: string; // 12) Bill no. alias
  piecesCompleted?: number; // 13) Pieces completed (integer)
  firmName?: string; // 14) Firm name (e.g. "Udhna Textile Embroidery Works")

  // Matrix Slip & Stage Piece Distribution
  colorSwatchHex?: string; // Hex color preview (e.g. #ea580c)
  orderSlipId?: string; // Ref to master S V ART & CREATION slip
  stagePieceBreakdown?: Partial<Record<WorkflowStageId, number>>; // Explicit breakdown of pieces in each of the 10 stages!
  individualPieces?: IndividualPieceUnit[]; // Unit-level piece tracking (e.g. Piece #1 to #20 with custom stages)
  orderCalculationNotes?: string;
  challanBreakdownNotes?: string;
}

export interface IndividualPieceUnit {
  id: string; // e.g. `${lotId}_piece_${pieceNumber}`
  parentLotId: string;
  lotNumber: string;
  jobNo?: string;
  pieceNumber: number; // e.g. 1, 2, ... 20
  pieceTag: string; // e.g. "JOB-06/05-KALI-P01"
  partyName: string;
  designNumber: string;
  fabricType: string;
  fabricColor: string;
  colorHex?: string;
  currentStage: WorkflowStageId;
  status: 'good' | 'needs_alter' | 'in_rework' | 'repaired' | 'rejected' | 'completed';
  defectReason?: string;
  alterNotes?: string;
  assignedOperator?: string;
  lastUpdated: string;
  history?: Array<{
    stage: WorkflowStageId;
    status: string;
    timestamp: string;
    note?: string;
  }>;
}

export interface OrderSlipColorRow {
  id: string;
  colorName: string;
  colorHex?: string;
  colorCode?: string;
  count?: number;
  stageBreakdown?: Partial<Record<WorkflowStageId, number>>;
  completedCount?: number;
  swatchPhoto?: string;
  designNumber?: string;
  fabricQuantities?: Record<string, number>; // fabricType -> pieces count
  notes?: string;
}

export interface OrderSlip {
  id: string;
  jobNo: string; // e.g. "06/05" or "JOB-2"
  date?: string; // e.g. "2026-07-05"
  dateOfEntry?: string;
  chalanNo: string; // e.g. "227"
  partyName: string; // e.g. "Jaishri" or "BL. FASHION"
  totalPcs: number; // e.g. 144
  fabricColumns: string[]; // e.g. ["Kali", "Dupatta", "BL. Front", "BL. Back", "Lace", "Kurti", "Lass"]
  colorRows: OrderSlipColorRow[];
  calculationNotes?: string; // e.g. "Kali 3.30 = 39.50\nKurti 2 = 24\nLass 1 = 12"
  inwardNotes?: string;
  inwardChallanNotes?: string; // e.g. "Ch 227: 12x6x2 = 24x6"
  
  // Delivery & After Completion
  deliveryChalanNo?: string;
  deliveryDate?: string;
  billNo?: string;
  billDate?: string;
  piecesCompleted?: number;
  firmName?: string;
  status?: 'active' | 'in_progress' | 'completed' | 'dispatched' | 'ACTIVE';
  createdAt?: string;
  updatedAt?: string;
}

export type DispatchStatus = 'ready_to_dispatch' | 'in_transit' | 'dispatched' | 'delivered' | 'cancelled';
export type DispatchPaymentStatus = 'unpaid' | 'partial' | 'paid';

export interface DispatchPaymentRecord {
  id: string;
  date: string;
  amount: number;
  paymentMode: string; // 'bank_transfer' | 'upi' | 'cheque' | 'cash' | 'neft_rtgs'
  transactionRef?: string;
  receiptNumber?: string;
  notes?: string;
  recordedBy?: string;
}

export interface DispatchOrder {
  id: string;
  dispatchNumber: string; // e.g. "DSP-2026-001"
  orderNumber?: string; // Client PO / Order Ref, e.g. "PO-NK-892"
  partyName: string; // Client/Buyer name
  contactPerson?: string;
  contactPhone?: string;
  contactEmail?: string;
  deliveryAddress?: string;
  gstNumber?: string;
  
  // Product / Item details
  productName: string; // e.g. "4mm Emerald Green Braided Polyester Cord"
  itemCode?: string;
  category?: string;
  colorName?: string;
  colorCode?: string;
  size?: string;
  lotBatchNumber?: string;
  linkedTaskCode?: string; // e.g. "TASK-2026-004"
  linkedMaterialId?: string;
  
  // Quantities & Pricing
  quantity: number;
  unit: string; // "meters", "pcs", "rolls", "kg", "spools", "gross", "boxes", "packets"
  unitPrice: number; // ₹ per unit
  subtotal: number; // quantity * unitPrice
  taxPercent: number; // GST 0%, 5%, 12%, 18%, 28%
  taxAmount: number;
  discountAmount?: number;
  shippingCharges?: number;
  totalInvoiceAmount: number; // Final payable amount
  totalAmount?: number; // Alias for totalInvoiceAmount

  // Logistics & Dispatch details
  status: DispatchStatus;
  readyDate: string;
  dispatchedDate?: string;
  expectedDeliveryDate?: string;
  transporterName?: string; // Courier / Transporter, e.g. "VRL Logistics", "BlueDart Express", "Internal Delivery Van"
  vehicleOrTrackingNumber?: string; // LR / Waybill / Tracking / Vehicle #
  trackingNumber?: string; // Tracking / Waybill #
  packagingDetails?: string; // e.g. "4 Corrugated Boxes (80 kg total)"
  notes?: string;

  // Finance Integration & Payments
  linkedInvoiceId?: string; // ID of the PartyInvoice in Finance
  invoiceNumber?: string; // e.g. "INV-DSP-1001"
  amountPaid: number; // Amount collected so far
  balanceDue: number; // totalInvoiceAmount - amountPaid
  paymentStatus: DispatchPaymentStatus;
  paymentDueDate?: string;
  paymentHistory: DispatchPaymentRecord[];
  
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeRecord {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  department: 'Production' | 'Maintenance' | 'Warehouse' | 'Quality' | 'Administration';
  salaryType: 'monthly' | 'hourly';
  baseSalary: number; // monthly fixed salary or base pay
  hourlyRate?: number;
  hoursWorkedMonth?: number;
  hoursWorkedThisMonth?: number;
  bonusOrOvertime?: number;
  deductions?: number;
  netPayable: number;
  paymentStatus: 'paid' | 'pending' | 'partially_paid';
  lastPaidDate?: string;
  paidDate?: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'cheque';
  bankAccountOrUpi?: string;
  phone?: string;
  assignedMachineId?: string;
}

export interface ElectricityUsageRecord {
  id: string;
  month: string; // e.g. 'August 2026'
  meterReadingStartKwh: number;
  meterReadingEndKwh: number;
  totalKwhConsumed: number;
  tariffPerKwh: number; // e.g. $0.14/kWh
  baseFixedCharges: number;
  peakDemandCharges: number;
  totalBillAmount: number;
  paymentStatus: 'paid' | 'unpaid' | 'overdue';
  dueDate: string;
  paidDate?: string;
  billInvoiceRef?: string;
  notes?: string;
}

export type ExpenseCategory = 
  | 'electricity' 
  | 'payroll' 
  | 'materials_procurement' 
  | 'machine_maintenance' 
  | 'packaging_shipping' 
  | 'factory_rent_lease' 
  | 'tooling_spares' 
  | 'office_admin' 
  | 'taxes_licenses' 
  | 'custom_other';

export interface OperationalExpense {
  id: string;
  expenseCode: string;
  date: string;
  category: ExpenseCategory;
  title: string;
  amount: number;
  vendorOrPayee: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'credit_card' | 'cheque' | 'upi';
  paymentStatus: 'paid' | 'pending';
  receiptInvoiceNo?: string;
  linkedMachineId?: string;
  linkedMaterialId?: string;
  notes?: string;
  recordedBy: string;
}

export interface PartyInvoice {
  id: string;
  invoiceNumber: string;
  partyName: string; // Client / Buyer, e.g. 'Nike Footwear Hub', 'Zara Apparel', 'Decathlon Global'
  clientGstOrTaxId?: string;
  orderDescription: string;
  linkedTaskCode?: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  amountReceived: number;
  balanceDue: number;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    paymentMode: string;
    transactionRef: string;
    notes?: string;
  }[];
  contactPerson?: string;
  contactEmail?: string;
}

export interface SupplierPayable {
  id: string;
  purchaseOrderCode: string;
  supplierName: string; // Supplier e.g. 'Apex Fibers Ltd', 'Vanguard Cordage Co.'
  materialNameOrDescription: string;
  linkedMaterialId?: string;
  quantityImported: number;
  unit: string;
  unitPrice: number;
  totalBillAmount: number;
  amountPaid: number;
  balanceOwed: number;
  purchaseDate: string;
  paymentDueDate: string;
  status: 'settled' | 'partial' | 'unpaid' | 'overdue';
  shippingAndCustomsCost?: number;
  lotBatchNumber?: string;
  notes?: string;
  paymentHistory: {
    id: string;
    date: string;
    amount: number;
    paymentMode: string;
    reference: string;
  }[];
}

