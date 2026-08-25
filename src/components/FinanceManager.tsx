import React, { useState } from 'react';
import { 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap, 
  Package, 
  FileText, 
  CreditCard, 
  ArrowDownRight, 
  ArrowUpRight, 
  Plus, 
  Search, 
  Filter, 
  Building2, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Receipt, 
  Truck, 
  Wallet,
  Sparkles,
  ArrowRight,
  UserPlus,
  RefreshCw,
  Sliders,
  Check,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { 
  EmployeeRecord, 
  ElectricityUsageRecord, 
  OperationalExpense, 
  PartyInvoice, 
  SupplierPayable, 
  RawMaterial, 
  Machine 
} from '../types';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_UNITS,
  DEFAULT_SUPPLIERS,
  DEFAULT_LOCATIONS,
  getStoredCategories,
  saveStoredCategory,
  getStoredUnits,
  saveStoredUnit,
  getStoredSuppliers,
  saveStoredSupplier,
  getStoredLocations,
  saveStoredLocation,
  getStoredSizes,
  saveStoredSize,
  getStoredLots,
  saveStoredLot,
  getStoredColors,
  saveStoredColor,
  getCategoryProfile,
  generateItemCode,
  generateLotNumber
} from '../utils/inventoryPresets';

interface FinanceManagerProps {
  employees: EmployeeRecord[];
  electricityRecords: ElectricityUsageRecord[];
  expenses: OperationalExpense[];
  partyInvoices: PartyInvoice[];
  supplierPayables: SupplierPayable[];
  materials: RawMaterial[];
  machines: Machine[];
  onAddExpense: (expense: Omit<OperationalExpense, 'id' | 'expenseCode'>) => void;
  onPaySalary: (employeeId: string) => void;
  onAddEmployee: (employee: Omit<EmployeeRecord, 'id' | 'employeeCode' | 'netPayable'>) => void;
  onRecordPartyPayment: (invoiceId: string, amount: number, paymentMode: string, transactionRef: string, notes?: string) => void;
  onRecordSupplierPayment: (payableId: string, amount: number, paymentMode: string, reference: string) => void;
  onImportStockWithPayable: (data: {
    materialId?: string;
    code?: string;
    newMaterialName?: string;
    category?: string;
    size?: string;
    colorName?: string;
    colorCode?: string;
    locationBin?: string;
    minThreshold?: number;
    consumptionRatePerHour?: number;
    supplierName: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amountPaidNow: number;
    paymentDueDate: string;
    lotNumber?: string;
    notes?: string;
  }) => void;
  onPayElectricityBill: (recordId: string) => void;
  onAddElectricityRecord?: (record: Omit<ElectricityUsageRecord, 'id'>) => void;
  onEditElectricityRecord?: (record: ElectricityUsageRecord) => void;
  onDeleteElectricityRecord?: (recordId: string) => void;
  onDeleteEmployee?: (employeeId: string) => void;
  onDeleteExpense?: (expenseId: string) => void;
  onDeletePartyInvoice?: (invoiceId: string) => void;
  onDeleteSupplierPayable?: (payableId: string) => void;
  onClearAllFinanceData?: () => void;
  syncConfig?: any;
  onOpenSyncModal?: () => void;
  onOpenCreateSheet?: () => void;
}

export const FinanceManager: React.FC<FinanceManagerProps> = ({
  employees,
  electricityRecords,
  expenses,
  partyInvoices,
  supplierPayables,
  materials,
  machines,
  onAddExpense,
  onPaySalary,
  onAddEmployee,
  onRecordPartyPayment,
  onRecordSupplierPayment,
  onImportStockWithPayable,
  onPayElectricityBill,
  onAddElectricityRecord,
  onEditElectricityRecord,
  onDeleteElectricityRecord,
  onDeleteEmployee,
  onDeleteExpense,
  onDeletePartyInvoice,
  onDeleteSupplierPayable,
  onClearAllFinanceData,
  syncConfig,
  onOpenSyncModal,
  onOpenCreateSheet
}) => {
  const [activeFinanceTab, setActiveFinanceTab] = useState<'overview' | 'employees' | 'electricity' | 'expenses' | 'parties' | 'imports'>('overview');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);

  // Modals state
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PartyInvoice | null>(null);

  const [isSupplierPayOpen, setIsSupplierPayOpen] = useState(false);
  const [selectedPayable, setSelectedPayable] = useState<SupplierPayable | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Electricity Modal states
  const [isAddElectricityOpen, setIsAddElectricityOpen] = useState(false);
  const [editingElectricity, setEditingElectricity] = useState<ElectricityUsageRecord | null>(null);

  // Electricity Form state
  const currentMonthName = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' });
  const [elecForm, setElecForm] = useState({
    month: currentMonthName,
    meterReadingStartKwh: '105000',
    meterReadingEndKwh: '138500',
    tariffPerKwh: '9.50',
    baseFixedCharges: '4500',
    peakDemandCharges: '2800',
    dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    billInvoiceRef: `EB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    paymentStatus: 'unpaid' as 'paid' | 'unpaid' | 'overdue'
  });

  // Base tariff rate state for live telemetry calculations (default ₹9.50/kWh)
  const [currentTariffRate, setCurrentTariffRate] = useState<number>(9.50);

  // Form states for modals
  const [newExpense, setNewExpense] = useState({
    category: 'machine_maintenance' as any,
    title: '',
    amount: '',
    vendorOrPayee: '',
    paymentMethod: 'bank_transfer' as any,
    paymentStatus: 'paid' as any,
    receiptInvoiceNo: '',
    notes: '',
    recordedBy: 'Floor Admin'
  });

  const [newEmp, setNewEmp] = useState({
    name: '',
    role: '',
    department: 'Production' as const,
    salaryType: 'monthly' as const,
    baseSalary: '',
    hourlyRate: '',
    hoursWorkedMonth: '160',
    bonusOrOvertime: '0',
    deductions: '0',
    paymentStatus: 'pending' as const,
    paymentMethod: 'bank_transfer' as const,
    bankAccountOrUpi: '',
    phone: '',
    assignedMachineId: ''
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'Bank Transfer / NEFT',
    transactionRef: '',
    notes: ''
  });

  const [supplierPayForm, setSupplierPayForm] = useState({
    amount: '',
    paymentMode: 'Bank Transfer / RTGS',
    reference: ''
  });

  const [importForm, setImportForm] = useState({
    mode: 'existing' as 'existing' | 'new',
    materialId: materials[0]?.id || '',
    code: 'PD080 # 4mm',
    newMaterialName: 'Faceted Crystal Glass Beads (4mm)',
    category: 'Beads',
    size: '4 mm',
    colorName: 'Emerald Green',
    colorCode: '#059669',
    supplierName: materials[0]?.supplier || 'Apex Beads & Findings',
    quantity: '2000',
    unit: 'pcs',
    unitPrice: '0.04',
    minThreshold: '500',
    consumptionRatePerHour: '350',
    locationBin: 'Bead Drawer #1',
    lotNumber: `LOT-BEA-${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
    amountPaidNow: '5000',
    paymentDueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    notes: 'Direct supplier shipment with payable invoice'
  });

  // Inline creation states for all variables
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isAddingSize, setIsAddingSize] = useState(false);
  const [newSizeInput, setNewSizeInput] = useState('');
  const [isAddingUnit, setIsAddingUnit] = useState(false);
  const [newUnitInput, setNewUnitInput] = useState('');
  const [isAddingSupplier, setIsAddingSupplier] = useState(false);
  const [newSupplierInput, setNewSupplierInput] = useState('');
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [isAddingColor, setIsAddingColor] = useState(false);
  const [newColorNameInput, setNewColorNameInput] = useState('');
  const [newColorHexInput, setNewColorHexInput] = useState('#2563EB');

  // Trigger state to refresh lists immediately when a new custom item is added
  const [customListVersion, setCustomListVersion] = useState(0);

  // Dynamic Lists for Autocomplete Dropdowns (with recent/new additions placed at the top)
  const categoriesList = React.useMemo(() => getStoredCategories(materials), [materials, customListVersion]);
  const unitsList = React.useMemo(() => getStoredUnits(materials), [materials, customListVersion]);
  const suppliersList = React.useMemo(() => getStoredSuppliers(materials), [materials, customListVersion]);
  const locationsList = React.useMemo(() => getStoredLocations(materials), [materials, customListVersion]);
  const sizesList = React.useMemo(() => getStoredSizes(importForm.category, materials), [importForm.category, materials, customListVersion]);
  const lotsList = React.useMemo(() => getStoredLots(materials), [materials, customListVersion]);
  const codesList = React.useMemo(() => Array.from(new Set(materials.map(m => m.code).filter(Boolean))) as string[], [materials]);
  const namesList = React.useMemo(() => Array.from(new Set(materials.map(m => m.name).filter(Boolean))), [materials]);
  const categoryProfile = React.useMemo(() => getCategoryProfile(importForm.category), [importForm.category]);
  const colorPresets = React.useMemo(() => getStoredColors(importForm.category), [importForm.category, customListVersion]);

  const handleImportCategoryChange = (newCat: string) => {
    const prof = getCategoryProfile(newCat);
    const szs = getStoredSizes(newCat, materials);
    const selectedSize = szs[0] || '4 mm';
    const suggestedColor = prof.suggestedColorNames[0] || { name: 'Emerald Green', hex: '#059669' };
    const autoCode = generateItemCode(newCat, selectedSize, prof.defaultCodePrefix);
    const autoLot = generateLotNumber(newCat, prof.sampleName);

    setImportForm(prev => ({
      ...prev,
      category: newCat,
      size: selectedSize,
      unit: prof.defaultUnit || prev.unit,
      supplierName: prof.suggestedVendors[0] || suppliersList[0] || prev.supplierName,
      colorName: suggestedColor.name,
      colorCode: suggestedColor.hex,
      code: autoCode,
      newMaterialName: `${prof.sampleName} (${selectedSize})`,
      minThreshold: prof.defaultThreshold?.toString() || '1000',
      quantity: prof.defaultStock?.toString() || prev.quantity,
      lotNumber: autoLot,
      locationBin: newCat.toLowerCase().includes('bead') ? 'Bead Drawer #1' : (locationsList[0] || 'Rack A-01')
    }));
  };

  const handleImportSizeChange = (newSize: string) => {
    setImportForm(prev => {
      let nextCode = prev.code;
      if (!prev.code || prev.code.includes('#')) {
        const prefix = prev.code.split('#')[0]?.trim() || getCategoryProfile(prev.category).defaultCodePrefix || 'SKU';
        nextCode = `${prefix} # ${newSize.replace(/\s+/g, '')}`;
      }
      let nextName = prev.newMaterialName;
      if (nextName.includes('(') && nextName.includes(')')) {
        nextName = nextName.replace(/\([^)]*\)/, `(${newSize})`);
      }
      return {
        ...prev,
        size: newSize,
        code: nextCode,
        newMaterialName: nextName
      };
    });
  };

  const handleAutoGenerateCode = () => {
    const newCode = generateItemCode(importForm.category, importForm.size);
    setImportForm(prev => ({ ...prev, code: newCode }));
  };

  const handleAutoGenerateLot = () => {
    const newLot = generateLotNumber(importForm.category, importForm.newMaterialName);
    setImportForm(prev => ({ ...prev, lotNumber: newLot }));
  };

  // Inline creation handlers (immediately saves and places new item at the top of the list)
  const handleCreateCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    saveStoredCategory(trimmed);
    setCustomListVersion(v => v + 1);
    setImportForm(prev => ({ ...prev, category: trimmed }));
    handleImportCategoryChange(trimmed);
    setNewCategoryInput('');
    setIsAddingCategory(false);
  };

  const handleCreateSize = () => {
    const trimmed = newSizeInput.trim();
    if (!trimmed) return;
    saveStoredSize(importForm.category, trimmed);
    setCustomListVersion(v => v + 1);
    handleImportSizeChange(trimmed);
    setNewSizeInput('');
    setIsAddingSize(false);
  };

  const handleCreateUnit = () => {
    const trimmed = newUnitInput.trim().toLowerCase();
    if (!trimmed) return;
    saveStoredUnit(trimmed);
    setCustomListVersion(v => v + 1);
    setImportForm(prev => ({ ...prev, unit: trimmed }));
    setNewUnitInput('');
    setIsAddingUnit(false);
  };

  const handleCreateSupplier = () => {
    const trimmed = newSupplierInput.trim();
    if (!trimmed) return;
    saveStoredSupplier(trimmed);
    setCustomListVersion(v => v + 1);
    setImportForm(prev => ({ ...prev, supplierName: trimmed }));
    setNewSupplierInput('');
    setIsAddingSupplier(false);
  };

  const handleCreateLocation = () => {
    const trimmed = newLocationInput.trim();
    if (!trimmed) return;
    saveStoredLocation(trimmed);
    setCustomListVersion(v => v + 1);
    setImportForm(prev => ({ ...prev, locationBin: trimmed }));
    setNewLocationInput('');
    setIsAddingLocation(false);
  };

  const handleCreateColor = () => {
    const trimmed = newColorNameInput.trim();
    if (!trimmed) return;
    saveStoredColor(trimmed, newColorHexInput);
    setCustomListVersion(v => v + 1);
    setImportForm(prev => ({ ...prev, colorName: trimmed, colorCode: newColorHexInput }));
    setNewColorNameInput('');
    setIsAddingColor(false);
  };

  // Financial Calculations
  // 1. Current Live Inventory Total Valuation
  const totalInventoryValuation = materials.reduce((sum, mat) => sum + (mat.currentStock * mat.unitCost), 0);

  // 2. Client Receivables (What Parties Owe)
  const totalPartyBilled = partyInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPartyReceived = partyInvoices.reduce((sum, inv) => sum + inv.amountReceived, 0);
  const totalPartyReceivableOutstanding = partyInvoices.reduce((sum, inv) => sum + inv.balanceDue, 0);

  // 3. Supplier Payables (What We Owe for Raw Materials & Imports)
  const totalSupplierBilled = supplierPayables.reduce((sum, sp) => sum + sp.totalBillAmount, 0);
  const totalSupplierPaid = supplierPayables.reduce((sum, sp) => sum + sp.amountPaid, 0);
  const totalSupplierBalanceOwed = supplierPayables.reduce((sum, sp) => sum + sp.balanceOwed, 0);

  // 4. Payroll Total
  const totalMonthlyPayroll = employees.reduce((sum, emp) => sum + emp.netPayable, 0);
  const paidPayroll = employees.filter(e => e.paymentStatus === 'paid').reduce((sum, emp) => sum + emp.netPayable, 0);
  const pendingPayroll = employees.filter(e => e.paymentStatus !== 'paid').reduce((sum, emp) => sum + emp.netPayable, 0);

  // 5. Electricity Live & Recorded Total
  const runningMachinesCount = machines.filter(m => m.status === 'running').length;
  // Estimate ~8.5 kW per active unit @ current tariff rate (₹/kWh)
  const liveKwLoad = runningMachinesCount * 8.5;
  const liveHourlyElectricityCost = liveKwLoad * currentTariffRate;
  const latestElectricityRecord = electricityRecords[0];
  const totalElectricityBilled = electricityRecords.reduce((sum, e) => sum + e.totalBillAmount, 0);

  // 6. Operational Expenses Total
  const totalOperationalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // 7. Net Cash Inflows vs Outflows
  const totalCashInflow = totalPartyReceived;
  const totalCashOutflow = totalSupplierPaid + paidPayroll + totalOperationalExpenses + (latestElectricityRecord?.paymentStatus === 'paid' ? latestElectricityRecord.totalBillAmount : 0);
  const netOperatingMargin = totalCashInflow - totalCashOutflow;

  // Handlers for Submitting Forms
  const handleCreateExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount) return;

    onAddExpense({
      date: new Date().toISOString().split('T')[0],
      category: newExpense.category,
      title: newExpense.title,
      amount: parseFloat(newExpense.amount),
      vendorOrPayee: newExpense.vendorOrPayee || 'General Payee',
      paymentMethod: newExpense.paymentMethod,
      paymentStatus: newExpense.paymentStatus,
      receiptInvoiceNo: newExpense.receiptInvoiceNo || `EXP-${Date.now().toString().slice(-4)}`,
      notes: newExpense.notes,
      recordedBy: newExpense.recordedBy
    });

    setNewExpense({
      category: 'machine_maintenance',
      title: '',
      amount: '',
      vendorOrPayee: '',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      receiptInvoiceNo: '',
      notes: '',
      recordedBy: 'Floor Admin'
    });
    setIsAddExpenseOpen(false);
  };

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmp.name || !newEmp.role) return;

    const base = parseFloat(newEmp.baseSalary) || 0;
    const bonus = parseFloat(newEmp.bonusOrOvertime) || 0;
    const ded = parseFloat(newEmp.deductions) || 0;
    const hourly = parseFloat(newEmp.hourlyRate) || 0;
    const hours = parseFloat(newEmp.hoursWorkedMonth) || 160;

    onAddEmployee({
      name: newEmp.name,
      role: newEmp.role,
      department: newEmp.department,
      salaryType: newEmp.salaryType,
      baseSalary: base,
      hourlyRate: hourly > 0 ? hourly : undefined,
      hoursWorkedThisMonth: hours,
      bonusOrOvertime: bonus,
      deductions: ded,
      paymentStatus: newEmp.paymentStatus,
      paymentMethod: newEmp.paymentMethod,
      bankAccountOrUpi: newEmp.bankAccountOrUpi || undefined,
      phone: newEmp.phone || undefined,
      assignedMachineId: newEmp.assignedMachineId || undefined
    });

    setNewEmp({
      name: '',
      role: '',
      department: 'Production',
      salaryType: 'monthly',
      baseSalary: '',
      hourlyRate: '',
      hoursWorkedMonth: '160',
      bonusOrOvertime: '0',
      deductions: '0',
      paymentStatus: 'pending',
      paymentMethod: 'bank_transfer',
      bankAccountOrUpi: '',
      phone: '',
      assignedMachineId: ''
    });
    setIsAddEmployeeOpen(false);
  };

  const handleOpenPartyPaymentModal = (invoice: PartyInvoice) => {
    setSelectedInvoice(invoice);
    setPaymentForm({
      amount: invoice.balanceDue.toString(),
      paymentMode: 'Bank Transfer / NEFT',
      transactionRef: `REC-${Date.now().toString().slice(-6)}`,
      notes: `Payment for ${invoice.invoiceNumber}`
    });
    setIsRecordPaymentOpen(true);
  };

  const handleRecordPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice || !paymentForm.amount) return;

    onRecordPartyPayment(
      selectedInvoice.id,
      parseFloat(paymentForm.amount),
      paymentForm.paymentMode,
      paymentForm.transactionRef,
      paymentForm.notes
    );

    setIsRecordPaymentOpen(false);
    setSelectedInvoice(null);
  };

  const handleOpenSupplierPayModal = (payable: SupplierPayable) => {
    setSelectedPayable(payable);
    setSupplierPayForm({
      amount: payable.balanceOwed.toString(),
      paymentMode: 'Bank Transfer / RTGS',
      reference: `PAY-${Date.now().toString().slice(-6)}`
    });
    setIsSupplierPayOpen(true);
  };

  const handleSupplierPaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPayable || !supplierPayForm.amount) return;

    onRecordSupplierPayment(
      selectedPayable.id,
      parseFloat(supplierPayForm.amount),
      supplierPayForm.paymentMode,
      supplierPayForm.reference
    );

    setIsSupplierPayOpen(false);
    setSelectedPayable(null);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (importForm.mode === 'existing' && !importForm.materialId) return;
    if (importForm.mode === 'new' && !importForm.newMaterialName) return;

    // Persist all variable entries to saved presets with last entry placed on top
    if (importForm.mode === 'new') {
      if (importForm.category) saveStoredCategory(importForm.category);
      if (importForm.unit) saveStoredUnit(importForm.unit);
      if (importForm.supplierName) saveStoredSupplier(importForm.supplierName);
      if (importForm.locationBin) saveStoredLocation(importForm.locationBin);
      if (importForm.size) saveStoredSize(importForm.category, importForm.size);
      if (importForm.lotNumber) saveStoredLot(importForm.lotNumber);
      if (importForm.colorName) saveStoredColor(importForm.colorName, importForm.colorCode);
    } else {
      if (importForm.supplierName) saveStoredSupplier(importForm.supplierName);
      if (importForm.lotNumber) saveStoredLot(importForm.lotNumber);
      if (importForm.locationBin) saveStoredLocation(importForm.locationBin);
      if (importForm.unit) saveStoredUnit(importForm.unit);
    }
    setCustomListVersion(v => v + 1);

    onImportStockWithPayable({
      materialId: importForm.mode === 'existing' ? importForm.materialId : undefined,
      code: importForm.mode === 'new' ? importForm.code : undefined,
      newMaterialName: importForm.mode === 'new' ? importForm.newMaterialName : undefined,
      category: importForm.category,
      size: importForm.size,
      colorName: importForm.colorName,
      colorCode: importForm.colorCode,
      locationBin: importForm.locationBin,
      minThreshold: parseFloat(importForm.minThreshold) || 500,
      consumptionRatePerHour: parseFloat(importForm.consumptionRatePerHour) || 200,
      supplierName: importForm.supplierName,
      quantity: parseFloat(importForm.quantity) || 0,
      unit: importForm.unit,
      unitPrice: parseFloat(importForm.unitPrice) || 0,
      amountPaidNow: parseFloat(importForm.amountPaidNow) || 0,
      paymentDueDate: importForm.paymentDueDate,
      lotNumber: importForm.lotNumber,
      notes: importForm.notes
    });

    setIsImportModalOpen(false);
  };

  // Open Add Electricity Modal
  const handleOpenAddElectricity = () => {
    setEditingElectricity(null);
    const lastRec = electricityRecords[0];
    const nextStart = lastRec ? lastRec.meterReadingEndKwh : 100000;
    const nextEnd = nextStart + 35000;

    setElecForm({
      month: currentMonthName,
      meterReadingStartKwh: nextStart.toString(),
      meterReadingEndKwh: nextEnd.toString(),
      tariffPerKwh: currentTariffRate.toString(),
      baseFixedCharges: '4500',
      peakDemandCharges: '2800',
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
      billInvoiceRef: `EB-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      paymentStatus: 'unpaid'
    });
    setIsAddElectricityOpen(true);
  };

  // Open Edit Electricity Modal
  const handleOpenEditElectricity = (rec: ElectricityUsageRecord) => {
    setEditingElectricity(rec);
    setElecForm({
      month: rec.month,
      meterReadingStartKwh: rec.meterReadingStartKwh.toString(),
      meterReadingEndKwh: rec.meterReadingEndKwh.toString(),
      tariffPerKwh: rec.tariffPerKwh.toString(),
      baseFixedCharges: rec.baseFixedCharges.toString(),
      peakDemandCharges: rec.peakDemandCharges.toString(),
      dueDate: rec.dueDate,
      billInvoiceRef: rec.billInvoiceRef || '',
      paymentStatus: rec.paymentStatus
    });
    setIsAddElectricityOpen(true);
  };

  // Submit Electricity Form (Add or Edit)
  const handleSaveElectricitySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseFloat(elecForm.meterReadingStartKwh) || 0;
    const end = parseFloat(elecForm.meterReadingEndKwh) || 0;
    const consumed = Math.max(0, end - start);
    const tariff = parseFloat(elecForm.tariffPerKwh) || currentTariffRate;
    const fixed = parseFloat(elecForm.baseFixedCharges) || 0;
    const peak = parseFloat(elecForm.peakDemandCharges) || 0;
    const totalBill = (consumed * tariff) + fixed + peak;

    if (editingElectricity) {
      if (onEditElectricityRecord) {
        onEditElectricityRecord({
          ...editingElectricity,
          month: elecForm.month,
          meterReadingStartKwh: start,
          meterReadingEndKwh: end,
          totalKwhConsumed: consumed,
          tariffPerKwh: tariff,
          baseFixedCharges: fixed,
          peakDemandCharges: peak,
          totalBillAmount: totalBill,
          dueDate: elecForm.dueDate,
          billInvoiceRef: elecForm.billInvoiceRef,
          paymentStatus: elecForm.paymentStatus
        });
      }
    } else {
      if (onAddElectricityRecord) {
        onAddElectricityRecord({
          month: elecForm.month,
          meterReadingStartKwh: start,
          meterReadingEndKwh: end,
          totalKwhConsumed: consumed,
          tariffPerKwh: tariff,
          baseFixedCharges: fixed,
          peakDemandCharges: peak,
          totalBillAmount: totalBill,
          paymentStatus: elecForm.paymentStatus,
          dueDate: elecForm.dueDate,
          billInvoiceRef: elecForm.billInvoiceRef
        });
      }
    }

    setIsAddElectricityOpen(false);
    setEditingElectricity(null);
  };

  // Helper formatter for Rupee amounts
  const formatINR = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div id="finance-manager-root" className="space-y-6">
      
      {/* Top Banner with Summary & Quick Actions */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-slate-900 rounded-xl text-white shadow-xs shrink-0">
                <IndianRupee className="h-6 w-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-black tracking-tight text-slate-900">Factory Financial Management &amp; Ledger</h2>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200">
                    LIVE LEDGER (INR ₹)
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                  Complete financial synchronization linking real-time warehouse inventory, staff salaries, 3-phase electricity consumption, party receivables, and supplier payables.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-import-stock-payable"
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Truck className="h-4 w-4 text-slate-300" />
              <span>+ Import Stock &amp; Payable</span>
            </button>

            <button
              id="btn-add-expense-top"
              onClick={() => setIsAddExpenseOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all"
            >
              <Plus className="h-4 w-4 text-slate-500" />
              <span>+ Add Expense</span>
            </button>

            {onClearAllFinanceData && (
              <button
                id="btn-clear-finance-records"
                onClick={() => setIsClearAllConfirmOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200 transition-all"
                title="Reset ledger records to clean slate"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                <span>Clear Records</span>
              </button>
            )}
          </div>
        </div>

        {/* Highlight Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-5 text-xs">
          
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Live Stock Asset</span>
            <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
              {formatINR(totalInventoryValuation)}
            </span>
            <span className="text-[10px] text-slate-500">{materials.length} Raw Material SKUs</span>
          </div>

          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200/80">
            <span className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider block">Party Receivables</span>
            <span className="text-base font-black text-emerald-950 font-mono block mt-0.5">
              {formatINR(totalPartyReceivableOutstanding)}
            </span>
            <span className="text-[10px] text-emerald-700 font-medium">{partyInvoices.length} Client Invoices</span>
          </div>

          <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/80">
            <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">Supplier Payables</span>
            <span className="text-base font-black text-amber-950 font-mono block mt-0.5">
              {formatINR(totalSupplierBalanceOwed)}
            </span>
            <span className="text-[10px] text-amber-700 font-medium">{supplierPayables.length} Purchase Orders</span>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Monthly Payroll</span>
            <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
              {formatINR(totalMonthlyPayroll)}
            </span>
            <span className="text-[10px] text-slate-500">{employees.length} Active Staff</span>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Electricity Cost</span>
            <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
              ₹{liveHourlyElectricityCost.toFixed(2)}/hr
            </span>
            <span className="text-[10px] text-slate-500">{runningMachinesCount} Running Units</span>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[10px] text-slate-600 font-bold uppercase tracking-wider block">Net Cash Margin</span>
            <span className={`text-base font-black font-mono block mt-0.5 ${netOperatingMargin >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatINR(netOperatingMargin)}
            </span>
            <span className="text-[10px] text-slate-500">Inflows vs Outflows</span>
          </div>

        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          id="tab-finance-overview"
          onClick={() => setActiveFinanceTab('overview')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'overview'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          <span>Financial Overview &amp; P&amp;L</span>
        </button>

        <button
          id="tab-finance-parties"
          onClick={() => setActiveFinanceTab('parties')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'parties'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>Party Invoices &amp; Receivables ({partyInvoices.length})</span>
        </button>

        <button
          id="tab-finance-imports"
          onClick={() => setActiveFinanceTab('imports')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'imports'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Supplier Payables &amp; Imports ({supplierPayables.length})</span>
        </button>

        <button
          id="tab-finance-employees"
          onClick={() => setActiveFinanceTab('employees')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'employees'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Staff Salaries &amp; Payroll ({employees.length})</span>
        </button>

        <button
          id="tab-finance-electricity"
          onClick={() => setActiveFinanceTab('electricity')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'electricity'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Zap className="h-4 w-4" />
          <span>Electricity &amp; Power Utilities ({electricityRecords.length})</span>
        </button>

        <button
          id="tab-finance-expenses"
          onClick={() => setActiveFinanceTab('expenses')}
          className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
            activeFinanceTab === 'expenses'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Operating Expenses ({expenses.length})</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL OVERVIEW */}
      {activeFinanceTab === 'overview' && (
        <div className="space-y-6">
          
          {/* Working Capital & Receivables vs Payables Matrix */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* 1. Cash Inflow & Party Receivables Card */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Party Receivables</span>
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <ArrowDownRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {formatINR(totalPartyReceivableOutstanding)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Pending collection across {partyInvoices.filter(i => i.status !== 'paid').length} active client orders
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Billed to Parties:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(totalPartyBilled)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Collected / Received:</span>
                    <span className="font-mono font-bold">{formatINR(totalPartyReceived)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveFinanceTab('parties')}
                className="mt-4 w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
              >
                <span>View Party Ledger</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 2. Supplier Payables & Import Obligations */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Supplier Payables (Owed)</span>
                  <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                    <ArrowUpRight className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-amber-600 font-mono">
                    {formatINR(totalSupplierBalanceOwed)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Owed for imported raw materials, yarn lots, and spool consignments
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Total Import Invoices:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(totalSupplierBilled)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-600">
                    <span>Paid to Suppliers:</span>
                    <span className="font-mono font-bold">{formatINR(totalSupplierPaid)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveFinanceTab('imports')}
                className="mt-4 w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
              >
                <span>Manage Supplier POs</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* 3. Monthly Operational Burn (Payroll + Power + Overhead) */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Monthly Floor Operating Burn</span>
                  <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                    <Wallet className="h-4 w-4" />
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-black text-slate-900 font-mono">
                    {formatINR(totalMonthlyPayroll + (latestElectricityRecord?.totalBillAmount || 0) + totalOperationalExpenses)}
                  </span>
                  <p className="text-xs text-slate-500 mt-1">
                    Fixed &amp; variable monthly factory overheads
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Staff Payroll:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(totalMonthlyPayroll)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Power &amp; Utilities (Latest):</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(latestElectricityRecord?.totalBillAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Direct Floor Expenses:</span>
                    <span className="font-mono font-bold text-slate-900">{formatINR(totalOperationalExpenses)}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setActiveFinanceTab('expenses')}
                className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center space-x-1"
              >
                <span>View Expense Breakdown</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

          </div>

          {/* Quick Ledger Snapshot Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            
            {/* Top Parties with Outstanding Balances */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-slate-800">Pending Party Collections</h3>
                </div>
                <button 
                  onClick={() => setActiveFinanceTab('parties')}
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              {partyInvoices.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No party invoices recorded yet. Click on "Party Invoices" tab to add client bills.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {partyInvoices.slice(0, 4).map(inv => (
                    <div key={inv.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-800">{inv.invoiceNumber}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {inv.status}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 mt-0.5">{inv.partyName}</p>
                        <p className="text-[10px] text-slate-400">{inv.orderDescription}</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-slate-900">{formatINR(inv.balanceDue)}</span>
                        <span className="text-[10px] text-slate-400 block">Due: {inv.dueDate}</span>
                        {inv.balanceDue > 0 && (
                          <button
                            onClick={() => handleOpenPartyPaymentModal(inv)}
                            className="mt-1 px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px] hover:bg-emerald-500"
                          >
                            Receive Payment
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming Supplier Obligations */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-800">Pending Supplier Payables</h3>
                </div>
                <button 
                  onClick={() => setActiveFinanceTab('imports')}
                  className="text-xs font-bold text-amber-600 hover:underline"
                >
                  View All &rarr;
                </button>
              </div>

              {supplierPayables.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  No supplier payables recorded. Use "+ Import Stock &amp; Payable" to import materials on credit.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {supplierPayables.slice(0, 4).map(sp => (
                    <div key={sp.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-slate-800">{sp.purchaseOrderCode}</span>
                          <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            sp.status === 'settled' || (sp.status as any) === 'paid' ? 'bg-emerald-100 text-emerald-700' : sp.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {sp.status}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 mt-0.5">{sp.supplierName}</p>
                        <p className="text-[10px] text-slate-400">{sp.materialNameOrDescription} ({sp.quantityImported.toLocaleString()} {sp.unit})</p>
                      </div>

                      <div className="text-right">
                        <span className="font-mono font-black text-amber-700">{formatINR(sp.balanceOwed)}</span>
                        <span className="text-[10px] text-slate-400 block">Due: {sp.paymentDueDate}</span>
                        {sp.balanceOwed > 0 && (
                          <button
                            onClick={() => handleOpenSupplierPayModal(sp)}
                            className="mt-1 px-2 py-0.5 bg-amber-600 text-white rounded font-bold text-[10px] hover:bg-amber-500"
                          >
                            Pay Supplier
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* TAB 2: PARTY INVOICES & RECEIVABLES */}
      {activeFinanceTab === 'parties' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Client Parties &amp; Sales Invoices</h3>
              <p className="text-xs text-slate-500">Track shipments dispatched, payments received from buyers, and outstanding credit balances.</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Total Outstanding:</span>
              <span className="text-sm font-black font-mono text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                {formatINR(totalPartyReceivableOutstanding)}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Invoice #</th>
                    <th className="py-3 px-4">Party Name</th>
                    <th className="py-3 px-3">Order Description</th>
                    <th className="py-3 px-3">Issue / Due Date</th>
                    <th className="py-3 px-3">Total Amount</th>
                    <th className="py-3 px-3">Received</th>
                    <th className="py-3 px-3">Balance Due</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {partyInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-10 text-slate-400">
                        No party invoices created yet. All newly created invoices will be automatically tracked here and synced to Google Sheets.
                      </td>
                    </tr>
                  ) : (
                    partyInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-800">{inv.partyName}</p>
                          <span className="text-[10px] text-slate-400">{inv.contactPerson || 'Contact N/A'}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          {inv.orderDescription}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          <div>Issued: {inv.issueDate}</div>
                          <div className="text-rose-600 font-semibold">Due: {inv.dueDate}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {formatINR(inv.totalAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                          {formatINR(inv.amountReceived)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          <span className={inv.balanceDue > 0 ? 'text-rose-600' : 'text-slate-400'}>
                            {formatINR(inv.balanceDue)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            inv.status === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {inv.balanceDue > 0 ? (
                              <button
                                onClick={() => handleOpenPartyPaymentModal(inv)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs"
                              >
                                Receive Payment
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end space-x-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Settled</span>
                              </span>
                            )}
                            {onDeletePartyInvoice && (
                              <button
                                onClick={() => onDeletePartyInvoice(inv.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                                title="Delete Party Invoice"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIER PAYABLES & IMPORTS */}
      {activeFinanceTab === 'imports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Raw Material Imports &amp; Supplier Payables</h3>
              <p className="text-xs text-slate-500">Every stock import directly credits your warehouse inventory and posts a corresponding payable liability.</p>
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
            >
              <Truck className="h-4 w-4" />
              <span>+ Import New Material Batch</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">PO Code</th>
                    <th className="py-3 px-4">Supplier</th>
                    <th className="py-3 px-3">Material Imported</th>
                    <th className="py-3 px-3">Qty &amp; Unit Price</th>
                    <th className="py-3 px-3">Total Bill</th>
                    <th className="py-3 px-3">Paid So Far</th>
                    <th className="py-3 px-3">Balance Owed</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supplierPayables.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No supplier imports logged yet. Click "+ Import New Material Batch" above to receive inventory and log liabilities.
                      </td>
                    </tr>
                  ) : (
                    supplierPayables.map((sp) => (
                      <tr key={sp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          {sp.purchaseOrderCode}
                          {sp.lotBatchNumber && (
                            <span className="block text-[10px] text-slate-400 font-mono">LOT: {sp.lotBatchNumber}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">
                          {sp.supplierName}
                        </td>
                        <td className="py-3 px-3 text-slate-700">
                          <p className="font-semibold">{sp.materialNameOrDescription}</p>
                          <span className="text-[10px] text-slate-400">Imported: {sp.purchaseDate}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          <div>{sp.quantityImported.toLocaleString()} {sp.unit}</div>
                          <span className="text-[10px] text-slate-400 font-mono">@ {formatINR(sp.unitPrice)}</span>
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-900">
                          {formatINR(sp.totalBillAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                          {formatINR(sp.amountPaid)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold">
                          <span className={sp.balanceOwed > 0 ? 'text-amber-700' : 'text-slate-400'}>
                            {formatINR(sp.balanceOwed)}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {sp.paymentDueDate}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            sp.status === 'settled' || (sp.status as any) === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sp.status === 'partial'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {sp.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {sp.balanceOwed > 0 ? (
                              <button
                                onClick={() => handleOpenSupplierPayModal(sp)}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs"
                              >
                                Pay Supplier
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end space-x-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Paid in Full</span>
                              </span>
                            )}
                            {onDeleteSupplierPayable && (
                              <button
                                onClick={() => onDeleteSupplierPayable(sp.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                                title="Delete Supplier Payable"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: EMPLOYEES & SALARIES */}
      {activeFinanceTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Factory Floor Operators &amp; Staff Payroll</h3>
              <p className="text-xs text-slate-500">Manage monthly wages, hourly technician rates, overtime bonuses, and direct salary disbursements.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="btn-add-employee-top"
                onClick={() => setIsAddEmployeeOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <UserPlus className="h-4 w-4" />
                <span>+ Add Employee</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Code</th>
                    <th className="py-3 px-4">Employee Name</th>
                    <th className="py-3 px-3">Role / Dept</th>
                    <th className="py-3 px-3">Salary Model</th>
                    <th className="py-3 px-3">Base Amount</th>
                    <th className="py-3 px-3">Overtime / Bonus</th>
                    <th className="py-3 px-3">Deductions</th>
                    <th className="py-3 px-3">Net Payable</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Disburse</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No employees added yet. Click "+ Add Employee" above to add machine operators and staff.
                      </td>
                    </tr>
                  ) : (
                    employees.map((emp) => (
                      <tr key={emp.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {emp.employeeCode}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{emp.name}</p>
                          <span className="text-[10px] text-slate-400 font-mono">{emp.phone || emp.bankAccountOrUpi || 'Direct Payout'}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-semibold text-slate-800">{emp.role}</span>
                          <span className="block text-[10px] text-slate-400">{emp.department}</span>
                        </td>
                        <td className="py-3 px-3 capitalize font-medium text-slate-600">
                          {emp.salaryType}
                        </td>
                        <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                          {formatINR(emp.baseSalary)}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-600 font-semibold">
                          +{formatINR(emp.bonusOrOvertime || 0)}
                        </td>
                        <td className="py-3 px-3 font-mono text-rose-600 font-semibold">
                          -{formatINR(emp.deductions || 0)}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                          {formatINR(emp.netPayable)}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            emp.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {emp.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {emp.paymentStatus !== 'paid' ? (
                              <button
                                onClick={() => onPaySalary(emp.id)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs"
                              >
                                Pay Salary
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-emerald-600 flex items-center justify-end space-x-1">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Paid ({emp.paidDate || emp.lastPaidDate || 'Disbursed'})</span>
                              </span>
                            )}
                            {onDeleteEmployee && (
                              <button
                                onClick={() => onDeleteEmployee(emp.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                                title="Delete Employee"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: EDITABLE ELECTRICITY & POWER UTILITIES */}
      {activeFinanceTab === 'electricity' && (
        <div className="space-y-6">
          
          {/* Live Industrial Power Telemetry Card */}
          <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                    <Zap className="h-5 w-5 fill-current" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900">3-Phase Industrial Power Telemetry &amp; Electricity Billing</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Live power consumption monitoring based on active equipment RPM and industrial utility tariffs.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-log-meter-reading"
                  onClick={handleOpenAddElectricity}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all"
                >
                  <Plus className="h-4 w-4" />
                  <span>+ Log Meter Reading / Bill</span>
                </button>
              </div>
            </div>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-amber-200/80 text-xs">
              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Active Floor Load</span>
                <span className="text-base font-black text-slate-900 font-mono block mt-0.5">{liveKwLoad.toFixed(1)} kW</span>
                <span className="text-[10px] text-slate-400">{runningMachinesCount} Running Machines</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Tariff Rate (₹ / kWh)</span>
                <div className="flex items-center space-x-1 mt-0.5">
                  <span className="text-base font-black text-amber-700 font-mono">₹{currentTariffRate.toFixed(2)}</span>
                  <span className="text-[10px] text-slate-400">/ kWh</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  value={currentTariffRate}
                  onChange={(e) => setCurrentTariffRate(parseFloat(e.target.value) || 9.5)}
                  className="mt-1 w-full text-[11px] px-2 py-0.5 bg-slate-50 border border-slate-300 rounded font-mono font-bold"
                  title="Adjust active tariff rate"
                />
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Hourly Burn Rate</span>
                <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
                  ₹{liveHourlyElectricityCost.toFixed(2)}/hr
                </span>
                <span className="text-[10px] text-slate-400">≈ ₹{(liveHourlyElectricityCost * 24).toFixed(0)}/day</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-amber-200">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Total Grid Bills</span>
                <span className="text-base font-black text-slate-900 font-mono block mt-0.5">
                  {formatINR(totalElectricityBilled)}
                </span>
                <span className="text-[10px] text-slate-400">{electricityRecords.length} Recorded Billing Cycles</span>
              </div>
            </div>
          </div>

          {/* Editable Electricity Bills Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Monthly Electricity Consumption Logs &amp; Utility Invoices</h4>
                <p className="text-[11px] text-slate-500">You can edit any meter reading, update invoice numbers, or record payments directly.</p>
              </div>
              <button
                onClick={handleOpenAddElectricity}
                className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                + New Log Entry
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Billing Month</th>
                    <th className="py-3 px-3">Start Meter (kWh)</th>
                    <th className="py-3 px-3">End Meter (kWh)</th>
                    <th className="py-3 px-3">Units Consumed</th>
                    <th className="py-3 px-3">Tariff (₹/kWh)</th>
                    <th className="py-3 px-3">Fixed / Peak</th>
                    <th className="py-3 px-3">Total Bill Amount</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {electricityRecords.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No electricity bills logged yet. Click "+ Log Meter Reading / Bill" above to add your first billing record.
                      </td>
                    </tr>
                  ) : (
                    electricityRecords.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {rec.month}
                          {rec.billInvoiceRef && (
                            <span className="block text-[10px] text-slate-400 font-mono">REF: {rec.billInvoiceRef}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {rec.meterReadingStartKwh.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          {rec.meterReadingEndKwh.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-amber-700">
                          {rec.totalKwhConsumed.toLocaleString()} kWh
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-700">
                          ₹{rec.tariffPerKwh.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                          <div>Fixed: ₹{rec.baseFixedCharges.toLocaleString()}</div>
                          <div>Peak: ₹{rec.peakDemandCharges.toLocaleString()}</div>
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                          {formatINR(rec.totalBillAmount)}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {rec.dueDate}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            rec.paymentStatus === 'paid'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}>
                            {rec.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {rec.paymentStatus !== 'paid' && (
                              <button
                                onClick={() => onPayElectricityBill(rec.id)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] shadow-xs"
                                title="Mark as Paid"
                              >
                                Pay Bill
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditElectricity(rec)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                              title="Edit Electricity Record"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {onDeleteElectricityRecord && (
                              <button
                                onClick={() => onDeleteElectricityRecord(rec.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                                title="Delete Record"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 6: OPERATING EXPENSES */}
      {activeFinanceTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Operational Factory Expenses</h3>
              <p className="text-xs text-slate-500">Track equipment maintenance, spare parts, bobbin replacements, warehouse logistics, and utility bills.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                id="btn-add-expense-modal"
                onClick={() => setIsAddExpenseOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Expense</span>
              </button>
            </div>
          </div>

          {/* Expense Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            {['all', 'machine_maintenance', 'spare_parts', 'electricity', 'logistics', 'packaging', 'general_overhead'].map(cat => (
              <button
                key={cat}
                onClick={() => setExpenseFilterCategory(cat)}
                className={`px-3 py-1 rounded-full font-bold text-[11px] uppercase whitespace-nowrap transition-colors ${
                  expenseFilterCategory === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/90 text-slate-500 uppercase tracking-wider font-bold text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Expense Code</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Category</th>
                    <th className="py-3 px-3">Title / Description</th>
                    <th className="py-3 px-3">Payee / Vendor</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Payment Method</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Receipt #</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-slate-400">
                        No operational expenses recorded yet.
                      </td>
                    </tr>
                  ) : (
                    expenses
                      .filter(ex => expenseFilterCategory === 'all' || ex.category === expenseFilterCategory)
                      .map((ex) => (
                        <tr key={ex.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {ex.expenseCode}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-600">
                            {ex.date}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-50 text-purple-700 border border-purple-200">
                              {ex.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-semibold text-slate-800">
                            {ex.title}
                          </td>
                          <td className="py-3 px-3 text-slate-700">
                            {ex.vendorOrPayee}
                          </td>
                          <td className="py-3 px-3 font-mono font-black text-slate-900 text-sm">
                            {formatINR(ex.amount)}
                          </td>
                          <td className="py-3 px-3 capitalize text-slate-600 font-medium">
                            {ex.paymentMethod.replace('_', ' ')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                              {ex.paymentStatus}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-500">
                            {ex.receiptInvoiceNo || '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {onDeleteExpense && (
                              <button
                                onClick={() => onDeleteExpense(ex.id)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors inline-flex items-center"
                                title="Delete Expense"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD OR EDIT ELECTRICITY RECORD */}
      {isAddElectricityOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingElectricity ? 'Edit Electricity Log / Bill' : 'Log Electricity Meter Reading & Bill'}
                </h3>
              </div>
              <button 
                onClick={() => setIsAddElectricityOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveElectricitySubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Billing Month *</label>
                  <input
                    type="text"
                    required
                    value={elecForm.month}
                    onChange={(e) => setElecForm({ ...elecForm, month: e.target.value })}
                    placeholder="e.g. Aug 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bill / Invoice Ref</label>
                  <input
                    type="text"
                    value={elecForm.billInvoiceRef}
                    onChange={(e) => setElecForm({ ...elecForm, billInvoiceRef: e.target.value })}
                    placeholder="e.g. EB-2026-892"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Start Meter Reading (kWh) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={elecForm.meterReadingStartKwh}
                    onChange={(e) => setElecForm({ ...elecForm, meterReadingStartKwh: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">End Meter Reading (kWh) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={elecForm.meterReadingEndKwh}
                    onChange={(e) => setElecForm({ ...elecForm, meterReadingEndKwh: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div className="col-span-2 flex justify-between text-xs text-amber-900 font-semibold pt-1 border-t border-amber-200/80">
                  <span>Calculated Net Consumption:</span>
                  <span className="font-mono font-black">
                    {Math.max(0, (parseFloat(elecForm.meterReadingEndKwh) || 0) - (parseFloat(elecForm.meterReadingStartKwh) || 0)).toLocaleString()} kWh
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tariff (₹ / kWh) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={elecForm.tariffPerKwh}
                    onChange={(e) => setElecForm({ ...elecForm, tariffPerKwh: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fixed Charges (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={elecForm.baseFixedCharges}
                    onChange={(e) => setElecForm({ ...elecForm, baseFixedCharges: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Peak Demand (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={elecForm.peakDemandCharges}
                    onChange={(e) => setElecForm({ ...elecForm, peakDemandCharges: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Due Date *</label>
                  <input
                    type="date"
                    required
                    value={elecForm.dueDate}
                    onChange={(e) => setElecForm({ ...elecForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Status</label>
                  <select
                    value={elecForm.paymentStatus}
                    onChange={(e) => setElecForm({ ...elecForm, paymentStatus: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
                  >
                    <option value="unpaid">Unpaid / Pending</option>
                    <option value="paid">Paid &amp; Settled</option>
                  </select>
                </div>
              </div>

              {/* Total Estimated Calculation Box */}
              <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between font-mono">
                <span className="text-xs text-slate-300">Total Calculated Bill:</span>
                <span className="text-base font-black text-amber-400">
                  {formatINR(
                    (Math.max(0, (parseFloat(elecForm.meterReadingEndKwh) || 0) - (parseFloat(elecForm.meterReadingStartKwh) || 0)) * (parseFloat(elecForm.tariffPerKwh) || 0)) +
                    (parseFloat(elecForm.baseFixedCharges) || 0) +
                    (parseFloat(elecForm.peakDemandCharges) || 0)
                  )}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddElectricityOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
                >
                  <Check className="h-4 w-4" />
                  <span>{editingElectricity ? 'Update Bill' : 'Save Electricity Record'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: IMPORT STOCK WITH PAYABLE */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 flex-shrink-0">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-200">
                  <Truck className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Import Raw Materials &amp; Create Supplier Payable</h3>
                  <p className="text-[11px] text-slate-500">Every import directly increases warehouse stock and logs an accounts payable liability.</p>
                </div>
              </div>
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleImportSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setImportForm(prev => ({ ...prev, mode: 'existing' }))}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    importForm.mode === 'existing' ? 'bg-white text-slate-900 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Restock Existing SKU
                </button>
                <button
                  type="button"
                  onClick={() => setImportForm(prev => ({ ...prev, mode: 'new' }))}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${
                    importForm.mode === 'new' ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/50' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  + New Material SKU &amp; Design Code
                </button>
              </div>

              {importForm.mode === 'existing' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Select Raw Material *</label>
                    <select
                      value={importForm.materialId}
                      onChange={(e) => {
                        const mat = materials.find(m => m.id === e.target.value);
                        setImportForm(prev => ({
                          ...prev,
                          materialId: e.target.value,
                          unit: mat?.unit || 'meters',
                          unitPrice: mat?.unitCost?.toString() || '12.50',
                          supplierName: mat?.supplier || prev.supplierName,
                          locationBin: mat?.locationBin || prev.locationBin
                        }));
                      }}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    >
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.code ? `[${m.code}] ` : ''}{m.name} ({m.category || 'General'} - {m.size || 'Std'}) — {m.currentStock.toLocaleString()} {m.unit} in stock
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Material Preview Card */}
                  {(() => {
                    const selMat = materials.find(m => m.id === importForm.materialId);
                    if (!selMat) return null;
                    return (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 block text-[10px]">Code:</span>
                          <span className="font-mono font-bold text-slate-800">{selMat.code || 'N/A'}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Category &amp; Size:</span>
                          <span className="font-semibold text-slate-800">{selMat.category} ({selMat.size || 'Std'})</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Current Stock:</span>
                          <span className="font-mono font-bold text-emerald-600">{selMat.currentStock.toLocaleString()} {selMat.unit}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Location:</span>
                          <span className="font-mono text-slate-700">{selMat.locationBin || 'Warehouse'}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="space-y-3.5 bg-emerald-50/40 p-3.5 rounded-xl border border-emerald-100">
                  {/* Category & Item Code */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Material Category *</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingCategory(!isAddingCategory);
                            setNewCategoryInput('');
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isAddingCategory ? 'Cancel' : '+ New Category'}</span>
                        </button>
                      </div>

                      {isAddingCategory ? (
                        <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                          <input
                            type="text"
                            autoFocus
                            value={newCategoryInput}
                            onChange={(e) => setNewCategoryInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                            placeholder="e.g. Zippers, Chains, Tassels..."
                            className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={handleCreateCategory}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <select
                          value={importForm.category}
                          onChange={(e) => handleImportCategoryChange(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                        >
                          {categoriesList.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Item / SKU / Design Code *</label>
                        <button
                          type="button"
                          onClick={handleAutoGenerateCode}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                          title="Generate code from Category and Size"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>✨ Auto</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        list="imp-codes-list"
                        value={importForm.code}
                        onChange={(e) => setImportForm(prev => ({ ...prev, code: e.target.value }))}
                        placeholder="e.g. PD080 # 4mm or STR01 # 2.5mm"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {/* Material Name & Size */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Material Name *</label>
                      <input
                        type="text"
                        required
                        list="imp-names-list"
                        value={importForm.newMaterialName}
                        onChange={(e) => setImportForm(prev => ({ ...prev, newMaterialName: e.target.value }))}
                        placeholder="e.g. Faceted Crystal Glass Beads (4mm)"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Size / Gauge / Thickness</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingSize(!isAddingSize);
                            setNewSizeInput('');
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isAddingSize ? 'Cancel' : '+ New Size'}</span>
                        </button>
                      </div>

                      {isAddingSize ? (
                        <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                          <input
                            type="text"
                            autoFocus
                            value={newSizeInput}
                            onChange={(e) => setNewSizeInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSize(); } }}
                            placeholder="e.g. 1.7 mm, 8 mm, 120D/2..."
                            className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={handleCreateSize}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <input
                            type="text"
                            list="imp-sizes-list"
                            value={importForm.size}
                            onChange={(e) => handleImportSizeChange(e.target.value)}
                            placeholder="e.g. 4 mm, 1.7 mm, 2.5 mm, 5 mm Flat"
                            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                          />
                          <div className="flex flex-wrap gap-1">
                            {sizesList.slice(0, 5).map((sz) => (
                              <button
                                key={sz}
                                type="button"
                                onClick={() => handleImportSizeChange(sz)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                  importForm.size === sz
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-emerald-50'
                                }`}
                              >
                                {sz}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Color Swatch & Presets */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-slate-700">Color / Finish Name</label>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingColor(!isAddingColor);
                            setNewColorNameInput('');
                          }}
                          className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                        >
                          <Plus className="h-3 w-3" />
                          <span>{isAddingColor ? 'Cancel' : '+ New Color'}</span>
                        </button>
                      </div>

                      {isAddingColor ? (
                        <div className="flex items-center space-x-1.5 animate-in fade-in duration-100">
                          <input
                            type="color"
                            value={newColorHexInput}
                            onChange={(e) => setNewColorHexInput(e.target.value)}
                            className="h-7 w-8 p-0.5 rounded border border-slate-300 cursor-pointer bg-white shrink-0"
                          />
                          <input
                            type="text"
                            autoFocus
                            value={newColorNameInput}
                            onChange={(e) => setNewColorNameInput(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateColor(); } }}
                            placeholder="e.g. Champagne Gold..."
                            className="flex-1 px-2 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={handleCreateColor}
                            className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={importForm.colorCode}
                            onChange={(e) => setImportForm(prev => ({ ...prev, colorCode: e.target.value }))}
                            className="h-8 w-10 p-0.5 rounded border border-slate-300 cursor-pointer bg-white"
                            title="Click to pick hex color"
                          />
                          <input
                            type="text"
                            list="imp-colors-list"
                            value={importForm.colorName}
                            onChange={(e) => setImportForm(prev => ({ ...prev, colorName: e.target.value }))}
                            placeholder="e.g. Emerald Green, Jet Black"
                            className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Quick Color Swatches</label>
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {colorPresets.slice(0, 6).map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setImportForm(prev => ({ ...prev, colorName: c.name, colorCode: c.hex }))}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold border flex items-center space-x-1.5 transition-all ${
                              importForm.colorName.toLowerCase() === c.name.toLowerCase() ? 'border-emerald-600 ring-2 ring-emerald-500/30 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <span className="w-2.5 h-2.5 rounded-full border border-black/10 shrink-0" style={{ backgroundColor: c.hex }} />
                            <span>{c.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Safety Stock & Burn Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Safety Min Stock Threshold</label>
                      <input
                        type="number"
                        min="0"
                        value={importForm.minThreshold}
                        onChange={(e) => setImportForm(prev => ({ ...prev, minThreshold: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Machine Burn Rate (units / hr)</label>
                      <input
                        type="number"
                        min="0"
                        value={importForm.consumptionRatePerHour}
                        onChange={(e) => setImportForm(prev => ({ ...prev, consumptionRatePerHour: e.target.value }))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Vendor & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Supplier / Vendor Name *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingSupplier(!isAddingSupplier);
                        setNewSupplierInput('');
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{isAddingSupplier ? 'Cancel' : '+ New Vendor'}</span>
                    </button>
                  </div>

                  {isAddingSupplier ? (
                    <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                      <input
                        type="text"
                        autoFocus
                        value={newSupplierInput}
                        onChange={(e) => setNewSupplierInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateSupplier(); } }}
                        placeholder="e.g. Apex Beads & Findings..."
                        className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleCreateSupplier}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      list="imp-suppliers-list"
                      value={importForm.supplierName}
                      onChange={(e) => setImportForm(prev => ({ ...prev, supplierName: e.target.value }))}
                      placeholder="e.g. Apex Beads & Findings"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Storage Bin / Warehouse Location</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingLocation(!isAddingLocation);
                        setNewLocationInput('');
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{isAddingLocation ? 'Cancel' : '+ New Location'}</span>
                    </button>
                  </div>

                  {isAddingLocation ? (
                    <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                      <input
                        type="text"
                        autoFocus
                        value={newLocationInput}
                        onChange={(e) => setNewLocationInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateLocation(); } }}
                        placeholder="e.g. Bin D-04, Shelf 3A..."
                        className="flex-1 px-2.5 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleCreateLocation}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      list="imp-locations-list"
                      value={importForm.locationBin}
                      onChange={(e) => setImportForm(prev => ({ ...prev, locationBin: e.target.value }))}
                      placeholder="e.g. Bead Drawer #1, Rack A-01"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  )}
                </div>
              </div>

              {/* Lot Number & Shipment Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Lot / Batch Number</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateLot}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center space-x-1"
                      title="Generate new lot number"
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>⚡ Auto</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    list="imp-lots-list"
                    value={importForm.lotNumber}
                    onChange={(e) => setImportForm(prev => ({ ...prev, lotNumber: e.target.value }))}
                    placeholder="e.g. LOT-BEA-2026-42"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-medium focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shipment Notes / PO Reference</label>
                  <input
                    type="text"
                    list="imp-notes-list"
                    value={importForm.notes}
                    onChange={(e) => setImportForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="e.g. Direct supplier shipment with payable invoice"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              {/* Quantity, Unit & Dynamic Unit Price */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Import Qty *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={importForm.quantity}
                    onChange={(e) => setImportForm(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">Unit of Measure *</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingUnit(!isAddingUnit);
                        setNewUnitInput('');
                      }}
                      className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline flex items-center space-x-0.5"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{isAddingUnit ? 'Cancel' : '+ New Unit'}</span>
                    </button>
                  </div>

                  {isAddingUnit ? (
                    <div className="flex items-center space-x-1 animate-in fade-in duration-100">
                      <input
                        type="text"
                        autoFocus
                        value={newUnitInput}
                        onChange={(e) => setNewUnitInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateUnit(); } }}
                        placeholder="e.g. kg, gross, rolls..."
                        className="flex-1 px-2 py-1.5 bg-white border border-emerald-400 rounded-lg text-xs font-semibold focus:outline-none text-slate-900"
                      />
                      <button
                        type="button"
                        onClick={handleCreateUnit}
                        className="px-2.5 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <input
                      type="text"
                      required
                      list="imp-units-list"
                      value={importForm.unit}
                      onChange={(e) => setImportForm(prev => ({ ...prev, unit: e.target.value }))}
                      placeholder="pcs, meters, kg..."
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    />
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-slate-700">
                      Unit Price (₹ per {importForm.unit || 'unit'}) *
                    </label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0"
                    value={importForm.unitPrice}
                    onChange={(e) => setImportForm(prev => ({ ...prev, unitPrice: e.target.value }))}
                    placeholder="0.04"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                  <span className="text-[10px] text-slate-500 block mt-0.5 truncate font-mono">
                    ₹{importForm.unitPrice || '0'} / {importForm.unit || 'unit'}
                  </span>
                </div>
              </div>

              {/* Financial Payable Section */}
              <div className="grid grid-cols-2 gap-3 bg-amber-50/80 p-3.5 rounded-xl border border-amber-200">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Advance Paid Now (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={importForm.amountPaidNow}
                    onChange={(e) => setImportForm(prev => ({ ...prev, amountPaidNow: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Balance Due Date *</label>
                  <input
                    type="date"
                    required
                    value={importForm.paymentDueDate}
                    onChange={(e) => setImportForm(prev => ({ ...prev, paymentDueDate: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
                <div className="col-span-2 pt-2 border-t border-amber-200/70 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="text-slate-600 font-semibold">Total Consignment: </span>
                    <span className="font-mono font-bold text-slate-900">
                      {importForm.quantity || '0'} {importForm.unit || 'units'} × ₹{importForm.unitPrice || '0'} = {formatINR((parseFloat(importForm.quantity) || 0) * (parseFloat(importForm.unitPrice) || 0))}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-amber-900 font-bold">Balance Owed:</span>
                    <span className="font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {formatINR(Math.max(0, (parseFloat(importForm.quantity) || 0) * (parseFloat(importForm.unitPrice) || 0) - (parseFloat(importForm.amountPaidNow) || 0)))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Datalists for Autocomplete Options across all inputs */}
              <datalist id="imp-categories-list">
                {categoriesList.map(cat => <option key={cat} value={cat} />)}
              </datalist>
              <datalist id="imp-codes-list">
                {codesList.map(code => <option key={code} value={code} />)}
              </datalist>
              <datalist id="imp-names-list">
                {namesList.map(name => <option key={name} value={name} />)}
              </datalist>
              <datalist id="imp-sizes-list">
                {sizesList.map(sz => <option key={sz} value={sz} />)}
              </datalist>
              <datalist id="imp-colors-list">
                {['Emerald Green', 'Sapphire Blue', 'Ruby Red', 'Jet Black', 'Pure White', 'Golden Yellow', 'Rose Pink', 'Lavender Violet', 'Turquoise Teal', 'Raw Natural', 'Silver Gray', 'Fluorescent Neon', 'Crimson Red', 'Navy Blue', 'Forest Green'].map(c => (
                  <option key={c} value={c} />
                ))}
              </datalist>
              <datalist id="imp-suppliers-list">
                {suppliersList.map(sup => <option key={sup} value={sup} />)}
              </datalist>
              <datalist id="imp-locations-list">
                {locationsList.map(loc => <option key={loc} value={loc} />)}
              </datalist>
              <datalist id="imp-lots-list">
                {lotsList.map(lot => <option key={lot} value={lot} />)}
              </datalist>
              <datalist id="imp-units-list">
                {unitsList.map(u => <option key={u} value={u} />)}
              </datalist>
              <datalist id="imp-notes-list">
                {['Direct supplier shipment with payable invoice', 'Quarterly raw material restocking consignment', 'Expedited air shipment for priority order', 'Sample lot inspection batch', 'Advance booked seasonal inventory'].map(n => (
                  <option key={n} value={n} />
                ))}
              </datalist>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center space-x-1.5 transition-all"
                >
                  <Truck className="h-4 w-4" />
                  <span>Import &amp; Record Payable</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: RECEIVE PAYMENT FROM PARTY */}
      {isRecordPaymentOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Receipt className="h-5 w-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Record Party Payment Received</h3>
              </div>
              <button 
                onClick={() => setIsRecordPaymentOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{selectedInvoice.partyName}</span>
                  <span className="font-mono">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Outstanding Due:</span>
                  <span className="font-mono font-bold text-rose-600">{formatINR(selectedInvoice.balanceDue)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  max={selectedInvoice.balanceDue}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={paymentForm.paymentMode}
                    onChange={(e) => setPaymentForm({ ...paymentForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Bank Transfer / NEFT">Bank NEFT / RTGS</option>
                    <option value="UPI / QR Payment">UPI / Instant Transfer</option>
                    <option value="Cheque / DD">Bank Cheque / Draft</option>
                    <option value="Cash / Floor">Cash at Factory</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Transaction Ref #</label>
                  <input
                    type="text"
                    value={paymentForm.transactionRef}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionRef: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Confirm &amp; Update Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: PAY SUPPLIER */}
      {isSupplierPayOpen && selectedPayable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Truck className="h-5 w-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Disburse Payment to Supplier</h3>
              </div>
              <button 
                onClick={() => setIsSupplierPayOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSupplierPaySubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-bold text-slate-900">
                  <span>{selectedPayable.supplierName}</span>
                  <span className="font-mono">{selectedPayable.purchaseOrderCode}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Balance Owed:</span>
                  <span className="font-mono font-bold text-amber-700">{formatINR(selectedPayable.balanceOwed)}</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Disbursement Amount (₹) *</label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  max={selectedPayable.balanceOwed}
                  value={supplierPayForm.amount}
                  onChange={(e) => setSupplierPayForm({ ...supplierPayForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Disbursement Mode</label>
                  <select
                    value={supplierPayForm.paymentMode}
                    onChange={(e) => setSupplierPayForm({ ...supplierPayForm, paymentMode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Bank Transfer / RTGS">Bank RTGS / NEFT</option>
                    <option value="Cheque / Draft">Supplier Account Cheque</option>
                    <option value="UPI / Wire">Corporate UPI / Wire</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank Reference #</label>
                  <input
                    type="text"
                    value={supplierPayForm.reference}
                    onChange={(e) => setSupplierPayForm({ ...supplierPayForm, reference: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSupplierPayOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Disburse &amp; Settle Payable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: ADD EMPLOYEE */}
      {isAddEmployeeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Add Staff Member / Machine Operator</h3>
              </div>
              <button 
                onClick={() => setIsAddEmployeeOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployeeSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.name}
                    onChange={(e) => setNewEmp({ ...newEmp, name: e.target.value })}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Role / Designation *</label>
                  <input
                    type="text"
                    required
                    value={newEmp.role}
                    onChange={(e) => setNewEmp({ ...newEmp, role: e.target.value })}
                    placeholder="e.g. Lead Braiding Operator"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newEmp.department}
                    onChange={(e) => setNewEmp({ ...newEmp, department: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="Production">Production Floor</option>
                    <option value="Maintenance">Maintenance &amp; Tooling</option>
                    <option value="Quality">Quality Control (QC)</option>
                    <option value="Logistics">Warehouse &amp; Logistics</option>
                    <option value="Admin">Factory Administration</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Salary Type</label>
                  <select
                    value={newEmp.salaryType}
                    onChange={(e) => setNewEmp({ ...newEmp, salaryType: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="monthly">Fixed Monthly Base</option>
                    <option value="hourly">Hourly Contract</option>
                    <option value="piece_rate">Piece Rate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Base Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newEmp.baseSalary}
                    onChange={(e) => setNewEmp({ ...newEmp, baseSalary: e.target.value })}
                    placeholder="25000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Overtime (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmp.bonusOrOvertime}
                    onChange={(e) => setNewEmp({ ...newEmp, bonusOrOvertime: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Deductions (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={newEmp.deductions}
                    onChange={(e) => setNewEmp({ ...newEmp, deductions: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Bank A/C or UPI ID</label>
                  <input
                    type="text"
                    value={newEmp.bankAccountOrUpi}
                    onChange={(e) => setNewEmp({ ...newEmp, bankAccountOrUpi: e.target.value })}
                    placeholder="e.g. 9876543210@upi"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newEmp.phone}
                    onChange={(e) => setNewEmp({ ...newEmp, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEmployeeOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 6: ADD OPERATIONAL EXPENSE */}
      {isAddExpenseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-purple-600" />
                <h3 className="text-base font-bold text-slate-900">Record Operational Expense</h3>
              </div>
              <button 
                onClick={() => setIsAddExpenseOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Expense Title / Description *</label>
                <input
                  type="text"
                  required
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="e.g. Spindle oil &amp; replacement ceramic eyelets"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  >
                    <option value="machine_maintenance">Machine Maintenance</option>
                    <option value="spare_parts">Spare Parts &amp; Tooling</option>
                    <option value="electricity">Utility &amp; Electricity</option>
                    <option value="logistics">Shipping &amp; Logistics</option>
                    <option value="packaging">Packaging Materials</option>
                    <option value="general_overhead">General Overhead</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="3500"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Payee / Vendor</label>
                  <input
                    type="text"
                    value={newExpense.vendorOrPayee}
                    onChange={(e) => setNewExpense({ ...newExpense, vendorOrPayee: e.target.value })}
                    placeholder="e.g. Industrial Spares Corp"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Receipt / Bill #</label>
                  <input
                    type="text"
                    value={newExpense.receiptInvoiceNo}
                    onChange={(e) => setNewExpense({ ...newExpense, receiptInvoiceNo: e.target.value })}
                    placeholder="e.g. BILL-9081"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddExpenseOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 7: CONFIRM CLEAR ALL FINANCE DATA */}
      {isClearAllConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600 mb-3">
              <div className="p-2.5 bg-rose-100 rounded-xl">
                <Trash2 className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete All Financial Records?</h3>
                <p className="text-xs text-rose-600 font-semibold">Start completely clean with a new ledger</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This will permanently delete all records across:
            </p>

            <ul className="text-xs text-slate-700 space-y-1 mb-5 bg-slate-50 p-3 rounded-xl border border-slate-200 list-disc list-inside">
              <li>All <strong>Party Invoices &amp; Receivables</strong> ({partyInvoices.length} entries)</li>
              <li>All <strong>Supplier Payables &amp; Purchase Orders</strong> ({supplierPayables.length} entries)</li>
              <li>All <strong>Employee Staff Payroll Logs</strong> ({employees.length} staff)</li>
              <li>All <strong>Electricity Consumption &amp; Bills</strong> ({electricityRecords.length} records)</li>
              <li>All <strong>Operational Expenses</strong> ({expenses.length} records)</li>
            </ul>

            <p className="text-[11px] text-slate-500 mb-6 italic">
              Your raw material stock levels and factory machines will remain intact.
            </p>

            <div className="flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setIsClearAllConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onClearAllFinanceData) {
                    onClearAllFinanceData();
                  }
                  setIsClearAllConfirmOpen(false);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Trash2 className="h-4 w-4" />
                <span>Yes, Delete All Finance Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
