import { 
  Machine, 
  RawMaterial, 
  StockTransaction, 
  SyncConfig, 
  FactoryAlert,
  EmployeeRecord,
  ElectricityUsageRecord,
  OperationalExpense,
  PartyInvoice,
  SupplierPayable,
  DispatchOrder
} from '../types';

export const INITIAL_MATERIALS: RawMaterial[] = [
  {
    id: 'mat-zr-gld-01',
    code: 'ZR-GLD-01',
    name: 'Metallic Gold Zari 70D',
    category: 'Zari Threads',
    size: '70D',
    currentStock: 1450,
    unit: 'spools',
    minThreshold: 300,
    unitCost: 120,
    supplier: 'Surat Zari Mills',
    colorName: 'Metallic Gold',
    colorCode: '#D97706',
    lotNumber: 'LOT-ZR-441',
    locationBin: 'Rack A-01',
    consumptionRatePerHour: 15,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'mat-sq-3mm-gld',
    code: 'SQ-3MM-GLD',
    name: '3mm Flat Sequin Spool',
    category: 'Sequins',
    size: '3mm',
    currentStock: 820,
    unit: 'spools',
    minThreshold: 200,
    unitCost: 85,
    supplier: 'Mehta Embellishments',
    colorName: 'Gloss Gold',
    colorCode: '#F59E0B',
    lotNumber: 'LOT-SQ-108',
    locationBin: 'Rack A-04',
    consumptionRatePerHour: 10,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'mat-geo-slk-emr',
    code: 'GEO-SLK-EMR',
    name: 'Silk Georgette Fabric Base',
    category: 'Fabric Rolls',
    size: '60 GSM',
    currentStock: 450,
    unit: 'meters',
    minThreshold: 150,
    unitCost: 240,
    supplier: 'Riddhi Textiles',
    colorName: 'Emerald Green',
    colorCode: '#059669',
    lotNumber: 'LOT-FB-902',
    locationBin: 'Bay B-12',
    consumptionRatePerHour: 30,
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 'mat-vlv-9000-nvy',
    code: 'VLV-9000-NVY',
    name: 'Micro Velvet 9000 Base',
    category: 'Fabric Rolls',
    size: '9000 Quality',
    currentStock: 320,
    unit: 'meters',
    minThreshold: 100,
    unitCost: 310,
    supplier: 'Royal Velvet Mills',
    colorName: 'Midnight Navy',
    colorCode: '#1E3A8A',
    lotNumber: 'LOT-FB-881',
    locationBin: 'Bay C-02',
    consumptionRatePerHour: 20,
    lastUpdated: new Date().toISOString().split('T')[0]
  }
];

export const INITIAL_MACHINES: Machine[] = [
  {
    id: 'M-101',
    name: 'Tajima High-Speed 25-Head',
    model: 'TMAR-KC1225',
    status: 'running',
    operator: 'Ramesh Kumar',
    activeJobName: 'Bridal Lehanga Embroidery',
    currentMaterialId: 'mat-zr-gld-01',
    rpm: 1050,
    maxRpm: 1200,
    efficiencyPercent: 94,
    outputCount: 42,
    targetCount: 45,
    temperatureCelsius: 42,
    uptimeHours: 1420,
    feedLinesCount: 25,
    lastMaintenance: '2026-08-15',
    headCount: 25,
    frameLengthMeters: 12.5,
    speedMode: 'flat_zari'
  },
  {
    id: 'M-102',
    name: 'Barudan 20-Head Multi-Sequin',
    model: 'BEXY-S1520C',
    status: 'running',
    operator: 'Vikas Sharma',
    activeJobName: 'Peacock Jacquard Border Weaving',
    currentMaterialId: 'mat-sq-3mm-gld',
    rpm: 950,
    maxRpm: 1100,
    efficiencyPercent: 88,
    outputCount: 30,
    targetCount: 35,
    temperatureCelsius: 39,
    uptimeHours: 1850,
    feedLinesCount: 20,
    lastMaintenance: '2026-08-10',
    headCount: 20,
    frameLengthMeters: 10.5,
    speedMode: 'sequin'
  }
];

export const INITIAL_TRANSACTIONS: StockTransaction[] = [
  {
    id: 'TX-1001',
    timestamp: new Date().toISOString(),
    materialId: 'mat-zr-gld-01',
    materialName: 'Metallic Gold Zari 70D',
    type: 'restock',
    quantity: 500,
    unit: 'spools',
    unitCost: 120,
    totalCost: 60000,
    operator: 'Warehouse Supervisor',
    notes: 'Inward shipment from Surat Zari Mills'
  }
];

export const INITIAL_SYNC_CONFIG: SyncConfig = {
  sheetId: '1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU/edit',
  deploymentId: 'AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh',
  scriptUrl: 'https://script.google.com/macros/s/AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh/exec',
  autoSyncIntervalSec: 30,
  lastSyncTimestamp: null,
  syncStatus: 'idle',
  mode: 'live_app_script',
};

export const INITIAL_ALERTS: FactoryAlert[] = [];

export const INITIAL_EMPLOYEES: EmployeeRecord[] = [];

export const INITIAL_ELECTRICITY_RECORDS: ElectricityUsageRecord[] = [];

export const INITIAL_EXPENSES: OperationalExpense[] = [];

export const INITIAL_PARTY_INVOICES: PartyInvoice[] = [];

export const INITIAL_SUPPLIER_PAYABLES: SupplierPayable[] = [];

export const INITIAL_DISPATCH_ORDERS: DispatchOrder[] = [];
