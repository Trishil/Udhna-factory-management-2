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

export const INITIAL_MATERIALS: RawMaterial[] = [];

export const INITIAL_MACHINES: Machine[] = [];

export const INITIAL_TRANSACTIONS: StockTransaction[] = [];

export const INITIAL_SYNC_CONFIG: SyncConfig = {
  sheetId: '1ZlURNllkyGeQF40UsG4QWNqdqRA1Uxg5MnRqWblDYxw',
  sheetUrl: 'https://docs.google.com/spreadsheets/d/1ZlURNllkyGeQF40UsG4QWNqdqRA1Uxg5MnRqWblDYxw/edit',
  deploymentId: 'AKfycbwDzJBRmDRrxhFg10u9wgektant3SqpWl83ZzOLEc7-s3ZJOk6FXEe_mHxQxFfF6kaY',
  scriptUrl: 'https://script.google.com/macros/s/AKfycbwDzJBRmDRrxhFg10u9wgektant3SqpWl83ZzOLEc7-s3ZJOk6FXEe_mHxQxFfF6kaY/exec',
  autoSyncIntervalSec: 60,
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
