import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { 
  INITIAL_MACHINES, 
  INITIAL_MATERIALS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_SYNC_CONFIG, 
  INITIAL_ALERTS,
  INITIAL_EMPLOYEES,
  INITIAL_ELECTRICITY_RECORDS,
  INITIAL_EXPENSES,
  INITIAL_PARTY_INVOICES,
  INITIAL_SUPPLIER_PAYABLES,
  INITIAL_DISPATCH_ORDERS
} from './data/initialData';
import { 
  Machine, 
  RawMaterial, 
  StockTransaction, 
  SyncConfig, 
  FactoryAlert, 
  MachineStatus, 
  AuthUser, 
  MachineTask,
  EmployeeRecord,
  ElectricityUsageRecord,
  OperationalExpense,
  PartyInvoice,
  SupplierPayable,
  DispatchOrder,
  DispatchPaymentRecord,
  AppTab,
  WorkflowItem,
  WorkflowStageId,
  OrderSlip
} from './types';
import { 
  syncWithAppsScript, 
  exportDataAsCsv, 
  pushItemToGoogleSheets,
  pushMaterialToAppsScript,
  pushDeleteMaterialToAppsScript,
  pushStockTransactionToAppsScript,
  pushDispatchOrderToAppsScript,
  pushOrderSlipToAppsScript,
  pushPiecesToAppsScript,
  pushFullStateToAppsScript,
  mergeMaterials
} from './services/sheetSync';
import { 
  syncAllToGoogleSheets, 
  appendTransactionToGoogleSheet, 
  appendWorkflowDesignToGoogleSheet,
  appendPieceStatusToGoogleSheet,
  appendOrderSlipToGoogleSheet,
  appendDispatchOrderToGoogleSheet
} from './services/googleSheetsApi';
import { getStoredAuthUser, saveStoredAuthUser, getStoredSheetId, setStoredSheetId, getActiveWorkspace } from './services/googleAuth';
import { 
  getStoredWorkflowItems, 
  saveStoredWorkflowItems, 
  getStoredOrderSlips, 
  saveStoredOrderSlips, 
  WORKFLOW_STAGES,
  mergeWorkflowItems,
  mergeOrderSlips,
  INITIAL_WORKFLOW_ITEMS,
  DEFAULT_ORDER_SLIPS
} from './utils/workflowData';
import { 
  saveDesignToFirestore, 
  deleteDesignFromFirestore, 
  subscribeToDesigns,
  saveOrderSlipToFirestore,
  deleteOrderSlipFromFirestore,
  subscribeToOrderSlips,
  saveMaterialToFirestore,
  deleteMaterialFromFirestore,
  subscribeToMaterials,
  saveDispatchOrderToFirestore,
  deleteDispatchOrderFromFirestore,
  subscribeToDispatchOrders,
  attachStoragePhotosToWorkflowItems,
  saveCompanySpreadsheetConfig,
  subscribeToCompanySpreadsheetConfig,
  CompanySpreadsheetConfig
} from './services/firebaseService';

import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './components/LoginPage';
import { OverviewMetrics } from './components/OverviewMetrics';
import { MachineMonitor } from './components/MachineMonitor';
import { InventoryManager } from './components/InventoryManager';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { FinanceManager } from './components/FinanceManager';
import { DispatchManager } from './components/DispatchManager';
import { WorkflowManager } from './components/WorkflowManager';

import { AddMachineModal } from './components/AddMachineModal';
import { AddMaterialModal, InitialBatchFinancialOption } from './components/AddMaterialModal';
import { StockAdjustModal, RestockFinancialLink } from './components/StockAdjustModal';
import { MaterialAssignModal } from './components/MaterialAssignModal';
import { MachineDetailModal } from './components/MachineDetailModal';
import { SheetIntegrationModal } from './components/SheetIntegrationModal';
import { CreateNewSheetModal } from './components/CreateNewSheetModal';
import { JobPlannerModal } from './components/JobPlannerModal';
import { FinishTaskModal, TaskCompletionSummary, TaskDiscardOptions } from './components/FinishTaskModal';
import { AlertsDrawer } from './components/AlertsDrawer';
import { calculatePredictiveInventory } from './utils/predictiveInventory';
import { generateUniqueMaterialId, generateUniqueBatchId } from './utils/idGenerator';
import { CheckCircle2, FileSpreadsheet, Sparkles, ExternalLink, Trash2, Layers, Wallet, Activity, Package, ArrowDownRight, ArrowUpRight, Clock, Building2 } from 'lucide-react';

export default function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return getStoredAuthUser();
  });

  // State initialization with localStorage fallback
  const [machines, setMachines] = useState<Machine[]>(() => {
    const saved = localStorage.getItem('factory_machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });

  const [materials, setMaterials] = useState<RawMaterial[]>(() => {
    const saved = localStorage.getItem('factory_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [transactions, setTransactions] = useState<StockTransaction[]>(() => {
    const saved = localStorage.getItem('factory_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  const [syncConfig, setSyncConfig] = useState<SyncConfig>(() => {
    const saved = localStorage.getItem('factory_sync_config');
    const storedId = getStoredSheetId();
    const base = saved ? JSON.parse(saved) : INITIAL_SYNC_CONFIG;
    base.scriptUrl = INITIAL_SYNC_CONFIG.scriptUrl;
    base.deploymentId = INITIAL_SYNC_CONFIG.deploymentId;
    if (storedId) {
      base.sheetId = storedId;
      base.sheetUrl = `https://docs.google.com/spreadsheets/d/${storedId}/edit`;
    }
    base.autoSyncIntervalSec = 15;
    return base;
  });

  const [alerts, setAlerts] = useState<FactoryAlert[]>(() => {
    const saved = localStorage.getItem('factory_alerts');
    return saved ? JSON.parse(saved) : INITIAL_ALERTS;
  });

  // Finance State with Persistence
  const [employees, setEmployees] = useState<EmployeeRecord[]>(() => {
    const saved = localStorage.getItem('factory_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [electricityRecords, setElectricityRecords] = useState<ElectricityUsageRecord[]>(() => {
    const saved = localStorage.getItem('factory_electricity');
    return saved ? JSON.parse(saved) : INITIAL_ELECTRICITY_RECORDS;
  });

  const [expenses, setExpenses] = useState<OperationalExpense[]>(() => {
    const saved = localStorage.getItem('factory_expenses');
    return saved ? JSON.parse(saved) : INITIAL_EXPENSES;
  });

  const [partyInvoices, setPartyInvoices] = useState<PartyInvoice[]>(() => {
    const saved = localStorage.getItem('factory_party_invoices');
    return saved ? JSON.parse(saved) : INITIAL_PARTY_INVOICES;
  });

  const [supplierPayables, setSupplierPayables] = useState<SupplierPayable[]>(() => {
    const saved = localStorage.getItem('factory_supplier_payables');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIER_PAYABLES;
  });

  const [dispatchOrders, setDispatchOrders] = useState<DispatchOrder[]>(() => {
    const saved = localStorage.getItem('factory_dispatch_orders');
    return saved ? JSON.parse(saved) : INITIAL_DISPATCH_ORDERS;
  });

  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>(() => {
    return getStoredWorkflowItems();
  });

  const [orderSlips, setOrderSlips] = useState<OrderSlip[]>(() => {
    return getStoredOrderSlips();
  });

  // UI state
  const [activeMainTab, setActiveMainTab] = useState<AppTab>('workflow');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('factory_sidebar_collapsed');
    return saved === 'true';
  });
  const [isSimulating, setIsSimulating] = useState(false);
  const [lowStockFilterActive, setLowStockFilterActive] = useState(false);
  const [lastAutoEntryNotice, setLastAutoEntryNotice] = useState<string | null>(null);

  // Modals state
  const [isAddMachineOpen, setIsAddMachineOpen] = useState(false);
  const [isAddMaterialOpen, setIsAddMaterialOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);

  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const [adjustTargetMaterial, setAdjustTargetMaterial] = useState<RawMaterial | null>(null);
  const [adjustType, setAdjustType] = useState<'restock' | 'consumption'>('restock');

  const [isAssignMaterialOpen, setIsAssignMaterialOpen] = useState(false);
  const [selectedMachineForAssign, setSelectedMachineForAssign] = useState<Machine | null>(null);

  const [isMachineDetailOpen, setIsMachineDetailOpen] = useState(false);
  const [selectedMachineForDetail, setSelectedMachineForDetail] = useState<Machine | null>(null);

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [isJobPlannerOpen, setIsJobPlannerOpen] = useState(false);
  const [jobPlannerMachineId, setJobPlannerMachineId] = useState<string | undefined>(undefined);
  const [isFinishTaskOpen, setIsFinishTaskOpen] = useState(false);
  const [machineForFinishTask, setMachineForFinishTask] = useState<Machine | null>(null);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [machineToDelete, setMachineToDelete] = useState<{ id: string; name: string; model: string } | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<{ id: string; name: string } | null>(null);

  // One-time cleanup for old mock finance records if they were saved in localStorage
  useEffect(() => {
    const isCleared = localStorage.getItem('factory_finance_cleared_v2');
    if (!isCleared) {
      setEmployees([]);
      setElectricityRecords([]);
      setExpenses([]);
      setPartyInvoices([]);
      setSupplierPayables([]);
      localStorage.setItem('factory_employees', JSON.stringify([]));
      localStorage.setItem('factory_electricity', JSON.stringify([]));
      localStorage.setItem('factory_expenses', JSON.stringify([]));
      localStorage.setItem('factory_party_invoices', JSON.stringify([]));
      localStorage.setItem('factory_supplier_payables', JSON.stringify([]));
      localStorage.setItem('factory_finance_cleared_v2', 'true');
    }

    // 1. Fetch latest data from Google Apps Script Webhook on startup & smartly merge
    syncWithAppsScript(syncConfig).then(result => {
      if (result.success) {
        if (result.workflow && result.workflow.length > 0) {
          setWorkflowItems(prev => {
            const merged = mergeWorkflowItems(prev, result.workflow || []);
            saveStoredWorkflowItems(merged);
            return merged;
          });
        }
        if (result.orderSlips && result.orderSlips.length > 0) {
          setOrderSlips(prev => {
            const merged = mergeOrderSlips(prev, result.orderSlips || []);
            saveStoredOrderSlips(merged);
            return merged;
          });
        }
        if (result.inventory && result.inventory.length > 0) {
          setMaterials(prev => mergeMaterials(prev, result.inventory || []));
        }
        if (result.dispatchOrders && result.dispatchOrders.length > 0) {
          setDispatchOrders(prev => {
            const map = new Map<string, DispatchOrder>();
            result.dispatchOrders!.forEach(d => map.set((d.dispatchNumber || d.id).toLowerCase(), d));
            prev.forEach(d => {
              const k = (d.dispatchNumber || d.id).toLowerCase();
              if (!map.has(k)) map.set(k, d);
            });
            return Array.from(map.values());
          });
        }
        if (result.partyInvoices && result.partyInvoices.length > 0) {
          setPartyInvoices(result.partyInvoices);
        }
        if (result.supplierPayables && result.supplierPayables.length > 0) {
          setSupplierPayables(result.supplierPayables);
        }
      }
    }).catch(() => {});

    // 2. Live real-time bidirectional photo & design sync with Android Mobile app & Firebase
    const unsubscribeDesigns = subscribeToDesigns((firestoreItems) => {
      if (firestoreItems && firestoreItems.length > 0) {
        setWorkflowItems((prev) => {
          const merged = mergeWorkflowItems(prev, firestoreItems);
          saveStoredWorkflowItems(merged);
          return merged;
        });
      }
    });

    const unsubscribeSlips = subscribeToOrderSlips((firestoreSlips) => {
      if (firestoreSlips && firestoreSlips.length > 0) {
        setOrderSlips((prev) => {
          const merged = mergeOrderSlips(prev, firestoreSlips);
          saveStoredOrderSlips(merged);
          return merged;
        });
      }
    });

    const unsubscribeMaterials = subscribeToMaterials((firestoreMats) => {
      if (firestoreMats && firestoreMats.length > 0) {
        setMaterials((prev) => mergeMaterials(prev, firestoreMats));
      }
    });

    const unsubscribeDispatches = subscribeToDispatchOrders((firestoreDispatches) => {
      if (firestoreDispatches && firestoreDispatches.length > 0) {
        setDispatchOrders((prev) => {
          const map = new Map<string, DispatchOrder>();
          firestoreDispatches.forEach(d => map.set((d.dispatchNumber || d.id).toLowerCase(), d));
          prev.forEach(d => {
            const k = (d.dispatchNumber || d.id).toLowerCase();
            if (!map.has(k)) map.set(k, d);
          });
          return Array.from(map.values());
        });
      }
    });

    // 3. Centralized Company Google Spreadsheet configuration listener (incognito & multi-device sync)
    const unsubscribeCompanyConfig = subscribeToCompanySpreadsheetConfig((cloudCfg) => {
      if (cloudCfg && cloudCfg.sheetId) {
        setStoredSheetId(cloudCfg.sheetId);
        setSyncConfig(prev => {
          if (prev.sheetId !== cloudCfg.sheetId) {
            return {
              ...prev,
              sheetId: cloudCfg.sheetId,
              sheetUrl: cloudCfg.sheetUrl || `https://docs.google.com/spreadsheets/d/${cloudCfg.sheetId}/edit`,
              scriptUrl: cloudCfg.scriptUrl || prev.scriptUrl,
              deploymentId: cloudCfg.deploymentId || prev.deploymentId,
              syncStatus: 'synced',
              lastSyncTimestamp: new Date().toISOString()
            };
          }
          return prev;
        });
      }
    });

    return () => {
      if (unsubscribeDesigns) unsubscribeDesigns();
      if (unsubscribeSlips) unsubscribeSlips();
      if (unsubscribeMaterials) unsubscribeMaterials();
      if (unsubscribeDispatches) unsubscribeDispatches();
      if (unsubscribeCompanyConfig) unsubscribeCompanyConfig();
    };
  }, []);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('factory_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('factory_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem('factory_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('factory_sync_config', JSON.stringify(syncConfig));
  }, [syncConfig]);

  useEffect(() => {
    localStorage.setItem('factory_alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('factory_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('factory_electricity', JSON.stringify(electricityRecords));
  }, [electricityRecords]);

  useEffect(() => {
    localStorage.setItem('factory_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('factory_party_invoices', JSON.stringify(partyInvoices));
  }, [partyInvoices]);

  useEffect(() => {
    localStorage.setItem('factory_supplier_payables', JSON.stringify(supplierPayables));
  }, [supplierPayables]);

  useEffect(() => {
    localStorage.setItem('factory_dispatch_orders', JSON.stringify(dispatchOrders));
  }, [dispatchOrders]);

  // Auth Handlers
  const handleLoginSuccess = (user: AuthUser, sheetId: string) => {
    setCurrentUser(user);
    saveStoredAuthUser(user);
    setStoredSheetId(sheetId);
    
    const activeWs = getActiveWorkspace();
    const scriptUrl = activeWs.scriptUrl || syncConfig.scriptUrl;

    setSyncConfig(prev => ({
      ...prev,
      sheetId,
      scriptUrl: scriptUrl || prev.scriptUrl,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
      syncStatus: 'synced',
      lastSyncTimestamp: new Date().toISOString()
    }));
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
  };

  const handleSignOut = () => {
    setCurrentUser(null);
    saveStoredAuthUser(null);
  };

  const handleSwitchAccount = () => {
    setCurrentUser(null);
    saveStoredAuthUser(null);
  };

  // Real-time Simulation Engine
  useEffect(() => {
    if (!isSimulating || !currentUser || !currentUser.sheetAccessGranted) return;

    const interval = setInterval(() => {
      setMachines(prevMachines => {
        return prevMachines.map(m => {
          if (m.status !== 'running') return m;

          const jitter = Math.floor(Math.random() * 21) - 10;
          const targetRpm = Math.max(800, Math.min(m.maxRpm, (m.rpm || 1200) + jitter));
          const increment = Math.floor((targetRpm / 1200) * 2);
          const newOutput = m.outputCount + increment;

          if (newOutput >= m.targetCount && m.outputCount < m.targetCount) {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.7 } });
          }

          let updatedActiveTask = m.activeTask;
          if (updatedActiveTask && updatedActiveTask.materials?.length > 0) {
            updatedActiveTask = {
              ...updatedActiveTask,
              currentOutputUnits: newOutput,
              materials: updatedActiveTask.materials.map(mat => {
                const burnStep = Math.max(1, Math.round((mat.rateOfConsumption || 100) / 60));
                return {
                  ...mat,
                  consumedSoFar: (mat.consumedSoFar || 0) + burnStep
                };
              })
            };
          }

          return {
            ...m,
            rpm: targetRpm,
            outputCount: newOutput,
            activeTask: updatedActiveTask,
            uptimeHours: +(m.uptimeHours + 0.002).toFixed(2),
            temperatureCelsius: +(45 + Math.sin(Date.now() / 10000) * 3 + Math.random()).toFixed(1)
          };
        });
      });

      setMaterials(prevMaterials => {
        let updatedMaterials = [...prevMaterials];

        machines.forEach(mach => {
          if (mach.status === 'running') {
            if (mach.activeTask && mach.activeTask.materials?.length > 0) {
              mach.activeTask.materials.forEach(matInput => {
                const matIndex = updatedMaterials.findIndex(x => x.id === matInput.materialId);
                if (matIndex >= 0) {
                  const currentStock = updatedMaterials[matIndex].currentStock;
                  if (currentStock > 0) {
                    const burnAmount = Math.max(1, Math.round((matInput.rateOfConsumption || 100) / 60));
                    const newStock = Math.max(0, currentStock - burnAmount);
                    updatedMaterials[matIndex] = {
                      ...updatedMaterials[matIndex],
                      currentStock: newStock
                    };

                    if (newStock <= updatedMaterials[matIndex].minThreshold && currentStock > updatedMaterials[matIndex].minThreshold) {
                      setAlerts(prev => [
                        {
                          id: `alt-${Date.now()}-${matInput.materialId}`,
                          type: 'warning',
                          title: `Low Stock: ${updatedMaterials[matIndex].name}`,
                          message: `Stock fell to ${newStock} ${updatedMaterials[matIndex].unit} during task ${mach.activeTask?.taskCode || ''}.`,
                          timestamp: new Date().toISOString(),
                          sourceId: updatedMaterials[matIndex].id,
                          sourceType: 'material',
                          resolved: false
                        },
                        ...prev
                      ]);
                    }
                  }
                }
              });
            } else if (mach.currentMaterialId) {
              const matIndex = updatedMaterials.findIndex(x => x.id === mach.currentMaterialId);
              if (matIndex >= 0) {
                const currentStock = updatedMaterials[matIndex].currentStock;
                if (currentStock > 0) {
                  const burnAmount = 1;
                  const newStock = Math.max(0, currentStock - burnAmount);
                  updatedMaterials[matIndex] = {
                    ...updatedMaterials[matIndex],
                    currentStock: newStock
                  };
                }
              }
            }
          }
        });

        return updatedMaterials;
      });

    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulating, machines, currentUser]);

  // Predictive Inventory Check: Estimates when a material will hit zero based on floor run rates and notifies the user with a threshold alert
  useEffect(() => {
    if (!isSimulating || !currentUser) return;
    const runningMachines = machines.filter(m => m.status === 'running' && m.activeTask);
    if (runningMachines.length === 0) return;

    const metrics = calculatePredictiveInventory(materials, machines);
    const criticalMetrics = metrics.filter(m => m.depletionStatus === 'critical' || m.depletionStatus === 'warning');

    if (criticalMetrics.length > 0) {
      setAlerts(prevAlerts => {
        let updated = [...prevAlerts];
        let hasNew = false;

        criticalMetrics.forEach(metric => {
          // Check if an unresolved predictive alert already exists for this material
          const existingAlert = updated.find(a => 
            a.sourceId === metric.materialId && 
            a.type === 'warning' && 
            !a.resolved &&
            a.title.startsWith('Predictive Depletion')
          );

          if (!existingAlert) {
            hasNew = true;
            updated.unshift({
              id: `pred-alt-${Date.now()}-${metric.materialId}`,
              type: 'warning',
              title: `Predictive Depletion: ${metric.materialName}`,
              message: `At active floor run rate of ${metric.totalBurnRatePerHour.toFixed(1)} ${metric.unit}/h, current stock (${metric.currentStock.toLocaleString()} ${metric.unit}) will hit ZERO in ~${metric.formattedTimeRemaining}.`,
              timestamp: new Date().toISOString(),
              sourceId: metric.materialId,
              sourceType: 'material',
              resolved: false
            });
          }
        });

        return hasNew ? updated : prevAlerts;
      });
    }
  }, [materials, machines, isSimulating, currentUser]);

  // Automated Google Sheet Background Synchronization & Telemetry Stream
  const latestStateRef = useRef({
    materials,
    machines,
    employees,
    electricityRecords,
    expenses,
    partyInvoices,
    supplierPayables,
    transactions,
    dispatchOrders,
    workflowItems,
    orderSlips,
    currentUser,
    syncConfig
  });

  useEffect(() => {
    latestStateRef.current = {
      materials,
      machines,
      employees,
      electricityRecords,
      expenses,
      partyInvoices,
      supplierPayables,
      transactions,
      dispatchOrders,
      workflowItems,
      orderSlips,
      currentUser,
      syncConfig
    };
  });

  useEffect(() => {
    if (!currentUser || !currentUser.sheetAccessGranted) return;
    if (!syncConfig.autoSyncIntervalSec || syncConfig.autoSyncIntervalSec <= 0) return;

    const syncInterval = setInterval(async () => {
      const state = latestStateRef.current;
      if (state.currentUser?.accessToken && state.syncConfig.sheetId) {
        try {
          await syncAllToGoogleSheets(
            state.currentUser.accessToken, 
            state.syncConfig.sheetId, 
            state.materials, 
            state.machines,
            {
              employees: state.employees,
              electricityRecords: state.electricityRecords,
              expenses: state.expenses,
              partyInvoices: state.partyInvoices,
              supplierPayables: state.supplierPayables,
              transactions: state.transactions,
              dispatchOrders: state.dispatchOrders,
              workflowItems: state.workflowItems,
              orderSlips: state.orderSlips
            }
          );
          setSyncConfig(prev => ({
            ...prev,
            lastSyncTimestamp: new Date().toISOString(),
            syncStatus: 'synced'
          }));
        } catch {
          handlePerformSync(true);
        }
      } else {
        handlePerformSync(true);
      }
    }, Math.max(30, syncConfig.autoSyncIntervalSec) * 1000);

    return () => clearInterval(syncInterval);
  }, [syncConfig.autoSyncIntervalSec, syncConfig.sheetId, currentUser?.sheetAccessGranted]);

  // Helper to reliably sync entire factory floor, inventory & financial state to Google Sheets
  const syncFullStateToGoogleSheets = (overrides?: {
    materialsList?: RawMaterial[];
    machinesList?: Machine[];
    employeesList?: EmployeeRecord[];
    electricityList?: ElectricityUsageRecord[];
    expensesList?: OperationalExpense[];
    partyInvoicesList?: PartyInvoice[];
    payablesList?: SupplierPayable[];
    transactionsList?: StockTransaction[];
    dispatchOrdersList?: DispatchOrder[];
    workflowItemsList?: WorkflowItem[];
    orderSlipsList?: OrderSlip[];
  }) => {
    const targetMats = overrides?.materialsList || materials;
    const targetMachs = overrides?.machinesList || machines;
    const targetSlips = overrides?.orderSlipsList || orderSlips;
    const targetWf = overrides?.workflowItemsList || workflowItems;
    const targetDsp = overrides?.dispatchOrdersList || dispatchOrders;
    const targetTx = overrides?.transactionsList || transactions;

    // 1. Always push to active sheet via Google Apps Script Webhook
    pushFullStateToAppsScript(syncConfig, {
      orderSlips: targetSlips,
      workflow: targetWf,
      inventory: targetMats,
      dispatch: targetDsp
    });

    // 2. If direct Google OAuth token is active, also push directly via Google Sheets API
    if (currentUser?.accessToken && syncConfig.sheetId) {
      syncAllToGoogleSheets(
        currentUser.accessToken,
        syncConfig.sheetId,
        targetMats,
        targetMachs,
        {
          employees: overrides?.employeesList || employees,
          electricityRecords: overrides?.electricityList || electricityRecords,
          expenses: overrides?.expensesList || expenses,
          partyInvoices: overrides?.partyInvoicesList || partyInvoices,
          supplierPayables: overrides?.payablesList || supplierPayables,
          transactions: targetTx,
          dispatchOrders: targetDsp,
          workflowItems: targetWf,
          orderSlips: targetSlips
        }
      ).catch(() => {});
    }
  };

  // Sync execution handler
  const handlePerformSync = async (silent = false) => {
    if (!silent) {
      setSyncConfig(prev => ({ ...prev, syncStatus: 'syncing' }));
    }

    try {
      // 1. If accessToken exists, use Direct Google Sheets API
      if (currentUser?.accessToken && syncConfig.sheetId) {
        const result = await syncAllToGoogleSheets(
          currentUser.accessToken, 
          syncConfig.sheetId, 
          materials, 
          machines,
          {
            employees,
            electricityRecords,
            expenses,
            partyInvoices,
            supplierPayables,
            transactions,
            dispatchOrders,
            workflowItems,
            orderSlips
          }
        );
        if (result.success) {
          setSyncConfig(prev => ({
            ...prev,
            lastSyncTimestamp: result.timestamp,
            syncStatus: 'synced',
            lastErrorMessage: undefined
          }));
          setLastAutoEntryNotice(`Fully synchronized ${orderSlips.length} master slips, ${workflowItems.length} workflow designs, inventory & finances to Google Sheet`);
          setTimeout(() => setLastAutoEntryNotice(null), 4000);
          return;
        }
      }

      // 2. Apps Script sync & smart merge (Photo URLs are read directly from Google Sheet column 26)
      const result = await syncWithAppsScript(syncConfig);
      if (result.success) {
        if (result.workflow && result.workflow.length > 0) {
          setWorkflowItems(prev => {
            const mergedWf = mergeWorkflowItems(prev, result.workflow || []);
            saveStoredWorkflowItems(mergedWf);
            return mergedWf;
          });
        }
        if (result.orderSlips && result.orderSlips.length > 0) {
          setOrderSlips(prev => {
            const merged = mergeOrderSlips(prev, result.orderSlips || []);
            saveStoredOrderSlips(merged);
            return merged;
          });
        }
        if (result.inventory && result.inventory.length > 0) {
          setMaterials(prev => mergeMaterials(prev, result.inventory || []));
        }
        if (result.dispatchOrders && result.dispatchOrders.length > 0) {
          setDispatchOrders(result.dispatchOrders);
        }
        if (result.partyInvoices && result.partyInvoices.length > 0) {
          setPartyInvoices(result.partyInvoices);
        }
        if (result.supplierPayables && result.supplierPayables.length > 0) {
          setSupplierPayables(result.supplierPayables);
        }
        if (result.employees && result.employees.length > 0) {
          setEmployees(result.employees);
        }
        if (result.expenses && result.expenses.length > 0) {
          setExpenses(result.expenses);
        }

        setSyncConfig(prev => ({
          ...prev,
          lastSyncTimestamp: result.timestamp,
          syncStatus: 'synced',
          lastErrorMessage: undefined
        }));
      } else {
        setSyncConfig(prev => ({
          ...prev,
          lastSyncTimestamp: result.timestamp,
          syncStatus: 'synced',
          lastErrorMessage: result.message
        }));
      }
    } catch (err: any) {
      setSyncConfig(prev => ({
        ...prev,
        syncStatus: 'synced',
        lastErrorMessage: err.message
      }));
    }
  };

  // Machine controls
  const handleToggleStatus = (machineId: string, newStatus: MachineStatus) => {
    const updatedMachs = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        status: newStatus,
        rpm: newStatus === 'running' ? Math.round(m.maxRpm * 0.75) : 0
      };
    });
    setMachines(updatedMachs);

    // Trigger auto-write to Google Sheets
    setTimeout(() => {
      syncFullStateToGoogleSheets({ machinesList: updatedMachs });
    }, 300);
  };

  const handleAssignMaterial = (machineId: string, primaryMaterialId: string, secondaryMaterialId?: string) => {
    const updatedMachs = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        currentMaterialId: primaryMaterialId,
        secondaryMaterialId
      };
    });
    setMachines(updatedMachs);

    setTimeout(() => {
      syncFullStateToGoogleSheets({ machinesList: updatedMachs });
    }, 300);
  };

  const handleAddMachine = (newMachineData: Omit<Machine, 'id'>) => {
    const newMachine: Machine = {
      ...newMachineData,
      id: `m-${Date.now()}`
    };
    const updated = [...machines, newMachine];
    setMachines(updated);
    confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });

    syncFullStateToGoogleSheets({ machinesList: updated });
    setLastAutoEntryNotice(`Added new machine "${newMachine.name}" & reflected in Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  const handleUpdateMachine = (updated: Machine) => {
    const updatedList = machines.map(m => m.id === updated.id ? updated : m);
    setMachines(updatedList);
    syncFullStateToGoogleSheets({ machinesList: updatedList });
  };

  const handleRequestDeleteMachine = (machineId: string, machineName?: string, machineModel?: string) => {
    const m = machines.find(item => item.id === machineId);
    setMachineToDelete({
      id: machineId,
      name: machineName || m?.name || 'Machine Unit',
      model: machineModel || m?.model || ''
    });
  };

  const handleExecuteDeleteMachine = (machineId: string) => {
    const m = machines.find(item => item.id === machineId);
    const updatedList = machines.filter(item => item.id !== machineId);
    setMachines(updatedList);
    setMachineToDelete(null);
    setIsMachineDetailOpen(false);
    setSelectedMachineForDetail(null);

    syncFullStateToGoogleSheets({ machinesList: updatedList });
    setLastAutoEntryNotice(`Removed "${m?.name || 'Machine'}" from floor & Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  // Material actions with Unified ID & Financial Integration
  const handleSaveMaterial = (
    materialData: RawMaterial | Omit<RawMaterial, 'id'>,
    financialOption?: InitialBatchFinancialOption
  ) => {
    let updatedList: RawMaterial[];
    let createdPayable: SupplierPayable | undefined;
    let createdExpense: OperationalExpense | undefined;
    let newTxList = [...transactions];

    if ('id' in materialData) {
      // Edit existing SKU
      updatedList = materials.map(m => m.id === materialData.id ? materialData : m);
      setMaterials(updatedList);
    } else {
      // Add brand-new SKU with standardized unique ID
      const assignedId = generateUniqueMaterialId(materials);
      const newMat: RawMaterial = {
        ...materialData,
        id: assignedId
      };
      updatedList = [newMat, ...materials];
      setMaterials(updatedList);
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });

      // Initial batch stock transaction
      if (newMat.currentStock > 0) {
        const initialTx: StockTransaction = {
          id: `tx-${Date.now()}`,
          materialId: newMat.id,
          materialName: newMat.name,
          type: 'restock',
          quantity: newMat.currentStock,
          unit: newMat.unit,
          batchId: newMat.lotNumber,
          unitCost: newMat.unitCost,
          totalCost: +(newMat.currentStock * (newMat.unitCost || 0)).toFixed(2),
          supplierName: newMat.supplier,
          operator: currentUser?.name || 'Warehouse Officer',
          timestamp: new Date().toISOString(),
          notes: `Initial stock registration for SKU ${newMat.id}`
        };
        newTxList = [initialTx, ...transactions];
        setTransactions(newTxList);
      }

      // Process Finance Integration if requested
      if (financialOption?.recordInFinance && financialOption.amount > 0) {
        if (financialOption.type === 'supplier_payable') {
          const poCode = generateUniqueBatchId('PO');
          createdPayable = {
            id: `sup-pay-${Date.now()}`,
            purchaseOrderCode: poCode,
            supplierName: financialOption.supplier || newMat.supplier || 'Primary Supplier',
            materialNameOrDescription: `${newMat.name} (${newMat.currentStock.toLocaleString()} ${newMat.unit})`,
            linkedMaterialId: newMat.id,
            quantityImported: newMat.currentStock,
            unit: newMat.unit,
            unitPrice: newMat.unitCost || 0,
            totalBillAmount: financialOption.amount,
            amountPaid: 0,
            balanceOwed: financialOption.amount,
            purchaseDate: new Date().toISOString().split('T')[0],
            paymentDueDate: financialOption.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
            status: 'unpaid',
            lotBatchNumber: financialOption.lotNumber || newMat.lotNumber,
            paymentHistory: []
          };
          setSupplierPayables(prev => [createdPayable!, ...prev]);
        } else if (financialOption.type === 'paid_expense') {
          createdExpense = {
            id: `exp-${Date.now()}`,
            expenseCode: generateUniqueBatchId('EXP-MAT'),
            title: `Initial Material Purchase: ${newMat.name}`,
            category: 'custom_other',
            amount: financialOption.amount,
            date: new Date().toISOString().split('T')[0],
            vendorOrPayee: financialOption.supplier || newMat.supplier,
            paymentMethod: 'bank_transfer',
            paymentStatus: 'paid',
            recordedBy: currentUser?.name || 'Admin',
            notes: `Batch Lot: ${newMat.lotNumber} | SKU: ${newMat.id}`
          };
          setExpenses(prev => [createdExpense!, ...prev]);
        }
      }
    }

    const targetMat = ('id' in materialData) ? (materialData as RawMaterial) : updatedList[0];
    saveMaterialToFirestore(targetMat);
    pushMaterialToAppsScript(syncConfig, targetMat);
    if (newTxList.length > transactions.length) {
      pushStockTransactionToAppsScript(syncConfig, newTxList[0], targetMat);
    }

    syncFullStateToGoogleSheets({
      materialsList: updatedList,
      payablesList: createdPayable ? [createdPayable, ...supplierPayables] : supplierPayables,
      expensesList: createdExpense ? [createdExpense, ...expenses] : expenses,
      transactionsList: newTxList
    });
    setLastAutoEntryNotice(`Auto-updated inventory & reflected in Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  const handleRequestDeleteMaterial = (materialId: string, materialName?: string) => {
    const mat = materials.find(m => m.id === materialId);
    setMaterialToDelete({
      id: materialId,
      name: materialName || mat?.name || 'Raw Material'
    });
  };

  const handleExecuteDeleteMaterial = (materialId: string) => {
    const mat = materials.find(m => m.id === materialId);
    const updatedList = materials.filter(m => m.id !== materialId);
    setMaterials(updatedList);

    // Unassign from machines
    const updatedMachs = machines.map(m => {
      let changed = false;
      let newCurrent = m.currentMaterialId;
      let newSec = m.secondaryMaterialId;
      if (m.currentMaterialId === materialId) {
        newCurrent = undefined;
        changed = true;
      }
      if (m.secondaryMaterialId === materialId) {
        newSec = undefined;
        changed = true;
      }
      return changed ? { ...m, currentMaterialId: newCurrent, secondaryMaterialId: newSec } : m;
    });
    setMachines(updatedMachs);

    setMaterialToDelete(null);
    setIsAddMaterialOpen(false);
    setEditingMaterial(null);

    deleteMaterialFromFirestore(materialId);
    pushDeleteMaterialToAppsScript(syncConfig, materialId);
    syncFullStateToGoogleSheets({ materialsList: updatedList, machinesList: updatedMachs });
    setLastAutoEntryNotice(`Deleted "${mat?.name || 'Material'}" from inventory & Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  // Stock transactions: Automatically writes back to Google Sheet with unified cost tracking!
  const handleLogTransaction = (
    txData: Omit<StockTransaction, 'id' | 'timestamp'>, 
    newStock: number,
    financialLink?: RestockFinancialLink
  ) => {
    let createdPayable: SupplierPayable | undefined;
    let createdExpense: OperationalExpense | undefined;
    let linkedPayableId: string | undefined;
    let linkedExpenseId: string | undefined;

    if (financialLink?.syncToFinance && financialLink.totalCost > 0) {
      if (financialLink.financeMode === 'supplier_payable') {
        const poCode = generateUniqueBatchId('PO');
        createdPayable = {
          id: `sup-pay-${Date.now()}`,
          purchaseOrderCode: poCode,
          supplierName: financialLink.supplierName,
          materialNameOrDescription: `${txData.materialName} (${Math.abs(txData.quantity).toLocaleString()} ${txData.unit})`,
          linkedMaterialId: txData.materialId,
          quantityImported: Math.abs(txData.quantity),
          unit: txData.unit,
          unitPrice: financialLink.unitCost,
          totalBillAmount: financialLink.totalCost,
          amountPaid: 0,
          balanceOwed: financialLink.totalCost,
          purchaseDate: new Date().toISOString().split('T')[0],
          paymentDueDate: financialLink.paymentDueDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          status: 'unpaid',
          lotBatchNumber: financialLink.batchId,
          paymentHistory: []
        };
        linkedPayableId = createdPayable.id;
        setSupplierPayables(prev => [createdPayable!, ...prev]);
      } else if (financialLink.financeMode === 'paid_expense') {
        createdExpense = {
          id: `exp-${Date.now()}`,
          expenseCode: generateUniqueBatchId('EXP-MAT'),
          title: `Restock Procurement: ${txData.materialName}`,
          category: 'custom_other',
          amount: financialLink.totalCost,
          date: new Date().toISOString().split('T')[0],
          vendorOrPayee: financialLink.supplierName,
          paymentMethod: 'bank_transfer',
          paymentStatus: 'paid',
          recordedBy: currentUser?.name || 'Admin',
          notes: `Restock batch ${financialLink.batchId}`
        };
        linkedExpenseId = createdExpense.id;
        setExpenses(prev => [createdExpense!, ...prev]);
      }
    }

    const newTx: StockTransaction = {
      ...txData,
      id: `tx-${Date.now()}`,
      linkedPayableId,
      linkedExpenseId,
      timestamp: new Date().toISOString()
    };
    const updatedTxList = [newTx, ...transactions];
    setTransactions(updatedTxList);

    // Update material stock
    const updatedMaterials = materials.map(m => {
      if (m.id !== txData.materialId) return m;
      return {
        ...m,
        currentStock: newStock,
        unitCost: txData.unitCost !== undefined ? txData.unitCost : m.unitCost,
        lastUpdated: new Date().toISOString()
      };
    });
    setMaterials(updatedMaterials);

    const targetMat = updatedMaterials.find(m => m.id === txData.materialId);
    if (targetMat) {
      saveMaterialToFirestore(targetMat);
      pushStockTransactionToAppsScript(syncConfig, newTx, targetMat);
    }

    // AUTO-RECORD INTO GOOGLE SHEETS VIA DIRECT OAUTH IF LOGGED IN
    if (currentUser?.accessToken && syncConfig.sheetId) {
      appendTransactionToGoogleSheet(currentUser.accessToken, syncConfig.sheetId, newTx, newStock);
      syncFullStateToGoogleSheets({
        materialsList: updatedMaterials,
        payablesList: createdPayable ? [createdPayable, ...supplierPayables] : supplierPayables,
        expensesList: createdExpense ? [createdExpense, ...expenses] : expenses,
        transactionsList: updatedTxList
      });
    }
    setLastAutoEntryNotice(`Auto-recorded ${newTx.type.toUpperCase()} transaction & synced Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  // Start Production Task & Multi-Material Recipe Order
  const handleStartTask = (machineId: string, task: MachineTask) => {
    const targetMachine = machines.find(m => m.id === machineId);
    const machineName = targetMachine?.name ? targetMachine.name.split('—')[0].trim() : 'Machine';

    const updatedMachines = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        status: 'running' as const,
        activeTask: task,
        activeJobName: `${task.taskCode}: ${task.title}`,
        targetCount: task.targetOutputUnits,
        outputCount: 0,
        operator: task.operator || m.operator,
        rpm: Math.round(m.maxRpm * 0.8)
      };
    });
    setMachines(updatedMachines);

    // Log allocation transaction for each fed material
    task.materials.forEach(matInput => {
      const targetMat = materials.find(m => m.id === matInput.materialId);
      if (targetMat) {
        handleLogTransaction({
          materialId: targetMat.id,
          materialName: targetMat.name,
          type: 'consumption',
          quantity: -Math.min(targetMat.currentStock, Math.round(matInput.estimatedAmountUsed * 0.05)),
          unit: targetMat.unit,
          machineId,
          machineName,
          operator: `${task.operator} (${task.taskCode})`,
          notes: `Task ${task.taskCode} launched on ${machineName} (Rate: ${matInput.rateOfConsumption} ${matInput.unit}/h, Est: ${matInput.estimatedAmountUsed} ${matInput.unit})`
        }, Math.max(0, targetMat.currentStock - Math.round(matInput.estimatedAmountUsed * 0.05)));
      }
    });

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Started task ${task.taskCode} on ${machineName} (${task.materials.length} material feeds)`);
    setTimeout(() => setLastAutoEntryNotice(null), 4500);

    syncFullStateToGoogleSheets({ machinesList: updatedMachines });
  };

  // Complete / Stop Task on Machine
  const handleStopTask = (machineId: string) => {
    const targetMachine = machines.find(m => m.id === machineId);
    if (targetMachine?.activeTask) {
      setMachineForFinishTask(targetMachine);
      setIsFinishTaskOpen(true);
      return;
    }

    const taskCode = targetMachine?.activeTask?.taskCode || 'Task';
    const machineName = targetMachine?.name ? targetMachine.name.split('—')[0].trim() : 'Machine';

    const updatedMachines = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        status: 'idle' as const,
        rpm: 0,
        activeTask: undefined,
        activeJobName: undefined
      };
    });
    setMachines(updatedMachines);

    setLastAutoEntryNotice(`Completed & unloaded ${taskCode} from ${machineName}`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
    syncFullStateToGoogleSheets({ machinesList: updatedMachines });
  };

  const handleOpenFinishTask = (machine: Machine) => {
    setMachineForFinishTask(machine);
    setIsFinishTaskOpen(true);
  };

  // Process Settled Task Completion with Final Cost Calculation
  const handleCompleteTask = (machineId: string, summary: TaskCompletionSummary) => {
    const targetMachine = machines.find(m => m.id === machineId);
    const machineName = targetMachine?.name ? targetMachine.name.split('—')[0].trim() : 'Machine';

    // 1. Unload task & set machine to idle with final output count
    const updatedMachs = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        status: 'idle' as const,
        rpm: 0,
        outputCount: summary.outputProduced,
        activeTask: undefined,
        activeJobName: undefined
      };
    });
    setMachines(updatedMachs);

    // 2. Adjust material stocks and log formal consumption transactions
    let updatedMaterials = [...materials];
    let updatedTx = [...transactions];
    summary.consumedBreakdown.forEach(item => {
      const matIndex = updatedMaterials.findIndex(m => m.id === item.materialId);
      if (matIndex >= 0) {
        const mat = updatedMaterials[matIndex];
        // Calculate the initial baseline or allocated amount
        const taskInput = summary.task.materials.find(tm => tm.materialId === item.materialId);
        const allocated = taskInput?.allocatedAtStart || Math.round(taskInput?.estimatedAmountUsed || 0 * 0.05);
        const netDeductionNeeded = Math.max(0, item.quantityUsed - allocated);
        const finalStock = Math.max(0, mat.currentStock - netDeductionNeeded);

        updatedMaterials[matIndex] = {
          ...mat,
          currentStock: finalStock,
          lastUpdated: new Date().toISOString()
        };

        // Log transaction for the final settlement
        const newTx: StockTransaction = {
          id: `tx-${Date.now()}-${item.materialId}`,
          timestamp: new Date().toISOString(),
          materialId: item.materialId,
          materialName: item.materialName,
          type: 'consumption',
          quantity: -item.quantityUsed,
          unit: item.unit,
          machineId,
          machineName,
          operator: `${summary.task.operator} (${summary.task.taskCode})`,
          notes: `Task ${summary.task.taskCode} FINISHED: ${item.quantityUsed} ${item.unit} consumed (₹${item.totalCost.toFixed(2)}) — Output: ${summary.outputProduced} ${summary.task.targetUnitName || 'meters'}`
        };

        updatedTx = [newTx, ...updatedTx];
        setTransactions(updatedTx);

        if (currentUser?.accessToken && syncConfig.sheetId) {
          appendTransactionToGoogleSheet(currentUser.accessToken, syncConfig.sheetId, newTx, finalStock);
        }
      }
    });

    setMaterials(updatedMaterials);

    // 3. Log settled operational expense for batch materials
    let updatedExpenses = expenses;
    if (summary.totalMaterialCost > 0) {
      const matExpense: OperationalExpense = {
        id: `exp-${Date.now()}`,
        expenseCode: `EXP-SETTLE-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `Material Settlement: ${summary.task.taskCode}`,
        category: 'materials_procurement',
        amount: summary.totalMaterialCost,
        date: new Date().toISOString().split('T')[0],
        vendorOrPayee: `${summary.task.taskCode} Batch Settlement`,
        paymentMethod: 'bank_transfer',
        paymentStatus: 'paid',
        recordedBy: currentUser?.name || 'Operator',
        notes: `Settled material cost for task ${summary.task.taskCode} (${summary.outputProduced} ${summary.task.targetUnitName || 'units'} output)`
      };
      updatedExpenses = [matExpense, ...expenses];
      setExpenses(updatedExpenses);
    }

    // Close modal & celebrate
    setIsFinishTaskOpen(false);
    setMachineForFinishTask(null);
    confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });

    setLastAutoEntryNotice(`Task ${summary.task.taskCode} finished! Total Material Cost: ₹${summary.totalMaterialCost.toLocaleString()}`);
    setTimeout(() => setLastAutoEntryNotice(null), 5500);

    syncFullStateToGoogleSheets({
      materialsList: updatedMaterials,
      machinesList: updatedMachs,
      expensesList: updatedExpenses,
      transactionsList: updatedTx
    });
  };

  // Process Task Discard (Revert / Refund Materials vs. Keep as Scrap)
  const handleDiscardTask = (machineId: string, options: TaskDiscardOptions) => {
    const targetMachine = machines.find(m => m.id === machineId);
    const machineName = targetMachine?.name ? targetMachine.name.split('—')[0].trim() : 'Machine';

    // 1. Unload task & set machine to idle
    const updatedMachs = machines.map(m => {
      if (m.id !== machineId) return m;
      return {
        ...m,
        status: 'idle' as const,
        rpm: 0,
        activeTask: undefined,
        activeJobName: undefined
      };
    });
    setMachines(updatedMachs);

    let updatedMaterials = [...materials];
    let updatedTx = [...transactions];
    let updatedExpenses = expenses;

    if (options.revertMaterials) {
      // Revert/refund materials back to pre-task baseline
      options.task.materials.forEach(taskMat => {
        const matIndex = updatedMaterials.findIndex(m => m.id === taskMat.materialId);
        if (matIndex >= 0) {
          const mat = updatedMaterials[matIndex];
          // If initial stock was captured, restore to initial stock; else add back allocated amount
          let restoredStock = mat.currentStock;
          let refundQty = 0;

          if (taskMat.initialStockAtStart !== undefined && taskMat.initialStockAtStart > mat.currentStock) {
            restoredStock = taskMat.initialStockAtStart;
            refundQty = taskMat.initialStockAtStart - mat.currentStock;
          } else {
            const allocated = taskMat.allocatedAtStart || Math.round(taskMat.estimatedAmountUsed * 0.05);
            refundQty = allocated + (taskMat.consumedSoFar || 0);
            restoredStock = mat.currentStock + refundQty;
          }

          if (refundQty > 0) {
            updatedMaterials[matIndex] = {
              ...mat,
              currentStock: restoredStock,
              lastUpdated: new Date().toISOString()
            };

            const refundTx: StockTransaction = {
              id: `tx-refund-${Date.now()}-${taskMat.materialId}`,
              timestamp: new Date().toISOString(),
              materialId: taskMat.materialId,
              materialName: taskMat.materialName,
              type: 'restock',
              quantity: refundQty,
              unit: taskMat.unit,
              machineId,
              machineName,
              operator: `${options.task.operator} (${options.task.taskCode})`,
              notes: `Task ${options.task.taskCode} DISCARDED (Stock Refunded & Reset: +${refundQty} ${taskMat.unit})`
            };

            updatedTx = [refundTx, ...updatedTx];
            setTransactions(updatedTx);

            if (currentUser?.accessToken && syncConfig.sheetId) {
              appendTransactionToGoogleSheet(currentUser.accessToken, syncConfig.sheetId, refundTx, restoredStock);
            }
          }
        }
      });

      setMaterials(updatedMaterials);
      setLastAutoEntryNotice(`Task ${options.task.taskCode} discarded. Material stocks fully refunded to pre-task baseline.`);
    } else {
      // Keep materials as scrap / loss
      if (options.scrapCost > 0) {
        const scrapExp: OperationalExpense = {
          id: `exp-${Date.now()}`,
          expenseCode: `SCRAP-${Math.floor(1000 + Math.random() * 9000)}`,
          title: `Discard Scrap Loss: ${options.task.taskCode}`,
          category: 'custom_other',
          amount: options.scrapCost,
          date: new Date().toISOString().split('T')[0],
          vendorOrPayee: `${options.task.taskCode} Scrap Loss`,
          paymentMethod: 'cash',
          paymentStatus: 'paid',
          recordedBy: currentUser?.name || 'Operator',
          notes: `Discarded task scrap loss: ${options.reason || 'Task abandoned during run'}`
        };
        updatedExpenses = [scrapExp, ...expenses];
        setExpenses(updatedExpenses);
      }

      setLastAutoEntryNotice(`Task ${options.task.taskCode} discarded. Used materials logged as scrap loss (₹${options.scrapCost.toLocaleString()}).`);
    }

    setIsFinishTaskOpen(false);
    setMachineForFinishTask(null);
    setTimeout(() => setLastAutoEntryNotice(null), 5500);

    syncFullStateToGoogleSheets({
      materialsList: updatedMaterials,
      machinesList: updatedMachs,
      expensesList: updatedExpenses,
      transactionsList: updatedTx
    });
  };

  // Handle Brand-New Spreadsheet Creation & Global Company Distribution
  const handleSpreadsheetCreated = (sheetId: string, sheetUrl: string, title: string) => {
    setStoredSheetId(sheetId);
    const newCfg: SyncConfig = {
      ...syncConfig,
      sheetId,
      sheetUrl,
      syncStatus: 'synced',
      lastSyncTimestamp: new Date().toISOString()
    };
    setSyncConfig(newCfg);

    saveCompanySpreadsheetConfig({
      sheetId,
      sheetUrl,
      scriptUrl: syncConfig.scriptUrl,
      deploymentId: syncConfig.deploymentId,
      ownerEmail: currentUser?.email || 'admin@udhna.com',
      title,
      companyName: 'Udhna Factory'
    });

    // Populate all 11 tabs & Push full state immediately into the new sheet
    pushFullStateToAppsScript(newCfg, {
      orderSlips,
      workflow: workflowItems,
      inventory: materials,
      dispatch: dispatchOrders
    });

    setLastAutoEntryNotice(`Created & linked company spreadsheet "${title}" across all devices`);
    setTimeout(() => setLastAutoEntryNotice(null), 5000);
  };

  // Alerts
  const handleResolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  };

  const handleCategoriesUpdated = (updatedCats: string[], updatedMats?: RawMaterial[]) => {
    if (updatedMats) {
      setMaterials(updatedMats);
      syncFullStateToGoogleSheets({ materialsList: updatedMats });
    }
    setLastAutoEntryNotice(`Category list updated & reflected across system`);
    setTimeout(() => setLastAutoEntryNotice(null), 3000);
  };

  // Finance Action Handlers
  const handleAddExpense = (newExp: Omit<OperationalExpense, 'id' | 'expenseCode'>) => {
    const expenseCode = `EXP-${Math.floor(4020 + expenses.length + Math.random() * 100)}`;
    const createdExpense: OperationalExpense = {
      ...newExp,
      id: `exp-${Date.now()}`,
      expenseCode
    };

    const updatedExpenses = [createdExpense, ...expenses];
    setExpenses(updatedExpenses);

    syncFullStateToGoogleSheets({ expensesList: updatedExpenses });
    setLastAutoEntryNotice(`Auto-recorded expense "${newExp.title}" (₹${newExp.amount}) into Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
  };

  const handlePaySalary = (employeeId: string) => {
    const emp = employees.find(e => e.id === employeeId);
    if (!emp) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedEmployees = employees.map(e => e.id === employeeId ? {
      ...e,
      paymentStatus: 'paid' as const,
      lastPaidDate: today
    } : e);
    setEmployees(updatedEmployees);

    // Also auto-log as operational expense
    const salaryExpense: OperationalExpense = {
      id: `exp-sal-${Date.now()}`,
      expenseCode: `EXP-SAL-${emp.employeeCode}`,
      date: today,
      category: 'payroll',
      title: `Monthly Wage Disbursement: ${emp.name} (${emp.role})`,
      amount: emp.netPayable,
      vendorOrPayee: emp.name,
      paymentMethod: emp.paymentMethod || 'bank_transfer',
      paymentStatus: 'paid',
      receiptInvoiceNo: `PAYROLL-${emp.employeeCode}-${today.slice(0, 7)}`,
      notes: `Disbursed to ${emp.bankAccountOrUpi || 'account on file'}`,
      recordedBy: currentUser?.name || 'Admin'
    };

    const updatedExpenses = [salaryExpense, ...expenses];
    setExpenses(updatedExpenses);

    confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    setLastAutoEntryNotice(`Disbursed salary of ₹${emp.netPayable.toLocaleString()} to ${emp.name}`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({
      employeesList: updatedEmployees,
      expensesList: updatedExpenses
    });
  };

  const handleAddEmployee = (newEmpData: Omit<EmployeeRecord, 'id' | 'employeeCode' | 'netPayable'>) => {
    const net = (newEmpData.baseSalary || 0) + (newEmpData.bonusOrOvertime || 0) - (newEmpData.deductions || 0);
    const newRecord: EmployeeRecord = {
      ...newEmpData,
      id: `emp-${Date.now()}`,
      employeeCode: `EMP-${100 + employees.length + 1}`,
      netPayable: net
    };

    const updatedEmployees = [...employees, newRecord];
    setEmployees(updatedEmployees);
    setLastAutoEntryNotice(`Added staff member ${newRecord.name} (${newRecord.role})`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({ employeesList: updatedEmployees });
  };

  const handleRecordPartyPayment = (
    invoiceId: string, 
    amount: number, 
    paymentMode: string, 
    transactionRef: string, 
    notes?: string
  ) => {
    const inv = partyInvoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const newReceived = inv.amountReceived + amount;
    const newBalance = Math.max(0, inv.totalAmount - newReceived);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const newHistoryEntry = {
      id: `pay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMode,
      transactionRef,
      notes
    };

    const updatedInvoices = partyInvoices.map(i => i.id === invoiceId ? {
      ...i,
      amountReceived: newReceived,
      balanceDue: newBalance,
      status: newStatus as any,
      paymentHistory: [...(i.paymentHistory || []), newHistoryEntry]
    } : i);

    setPartyInvoices(updatedInvoices);

    // Also synchronize into matching Dispatch Order if linked
    let updatedDispatches = [...dispatchOrders];
    const matchingDispatch = dispatchOrders.find(d => d.linkedInvoiceId === invoiceId || (d.invoiceNumber && d.invoiceNumber === inv.invoiceNumber));
    if (matchingDispatch) {
      const newDispatchPaid = matchingDispatch.amountPaid + amount;
      const totalDispatchAmt = matchingDispatch.totalInvoiceAmount ?? matchingDispatch.totalAmount ?? 0;
      const newDispatchBalance = Math.max(0, totalDispatchAmt - newDispatchPaid);
      const newDispatchStatus = newDispatchBalance <= 0 ? 'paid' : 'partial';
      updatedDispatches = dispatchOrders.map(d => d.id === matchingDispatch.id ? {
        ...d,
        amountPaid: newDispatchPaid,
        balanceDue: newDispatchBalance,
        paymentStatus: newDispatchStatus as any,
        paymentHistory: [
          ...(d.paymentHistory || []),
          {
            id: `dpay-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            amount,
            paymentMode,
            transactionRef,
            notes
          }
        ]
      } : d);
      setDispatchOrders(updatedDispatches);
    }

    confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Recorded payment of ₹${amount.toLocaleString('en-IN')} from ${inv.partyName} (Synced across Finance & Dispatch)`);
    setTimeout(() => setLastAutoEntryNotice(null), 4500);

    syncFullStateToGoogleSheets({ 
      partyInvoicesList: updatedInvoices,
      dispatchOrdersList: updatedDispatches
    });
  };

  const handleRecordSupplierPayment = (
    payableId: string, 
    amount: number, 
    paymentMode: string, 
    reference: string
  ) => {
    const sp = supplierPayables.find(s => s.id === payableId);
    if (!sp) return;

    const newPaid = sp.amountPaid + amount;
    const newBalance = Math.max(0, sp.totalBillAmount - newPaid);
    const newStatus = newBalance <= 0 ? 'settled' : 'partial';

    const newHistory = {
      id: `spay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMode,
      reference
    };

    const updatedPayables = supplierPayables.map(s => s.id === payableId ? {
      ...s,
      amountPaid: newPaid,
      balanceOwed: newBalance,
      status: newStatus as any,
      paymentHistory: [...(s.paymentHistory || []), newHistory]
    } : s);

    setSupplierPayables(updatedPayables);

    // Log as operational outflow expense
    const supplierExpense: OperationalExpense = {
      id: `exp-sup-${Date.now()}`,
      expenseCode: `EXP-OUT-${sp.purchaseOrderCode}`,
      date: new Date().toISOString().split('T')[0],
      category: 'custom_other',
      title: `Supplier Import Payment: ${sp.supplierName} (${sp.purchaseOrderCode})`,
      amount,
      vendorOrPayee: sp.supplierName,
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      receiptInvoiceNo: reference,
      notes: `Payment towards ${sp.materialNameOrDescription}`,
      recordedBy: currentUser?.name || 'Admin'
    };

    const updatedExpenses = [supplierExpense, ...expenses];
    setExpenses(updatedExpenses);

    setLastAutoEntryNotice(`Disbursed payment of ₹${amount.toLocaleString('en-IN')} to supplier ${sp.supplierName}`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({
      payablesList: updatedPayables,
      expensesList: updatedExpenses
    });
  };

  const handleImportStockWithPayable = (data: {
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
  }) => {
    let targetMat: RawMaterial | undefined;
    let updatedMaterials = [...materials];

    if (data.materialId) {
      targetMat = materials.find(m => m.id === data.materialId);
      if (targetMat) {
        const newStock = targetMat.currentStock + data.quantity;
        updatedMaterials = materials.map(m => m.id === data.materialId ? {
          ...m,
          currentStock: newStock,
          unitCost: data.unitPrice,
          supplier: data.supplierName || m.supplier,
          lotNumber: data.lotNumber || m.lotNumber,
          lastUpdated: new Date().toISOString()
        } : m);
        setMaterials(updatedMaterials);

        handleLogTransaction({
          materialId: targetMat.id,
          materialName: targetMat.name,
          type: 'restock',
          quantity: data.quantity,
          unit: targetMat.unit,
          operator: currentUser?.name || 'Warehouse Officer',
          notes: data.notes || `Imported shipment from ${data.supplierName} (Lot: ${data.lotNumber || 'N/A'})`
        }, newStock);
      }
    } else if (data.newMaterialName) {
      const newSku: RawMaterial = {
        id: `mat-${Date.now()}`,
        code: data.code || `MAT-${Math.floor(100 + materials.length + 1)}`,
        name: data.newMaterialName,
        category: data.category || 'Strings',
        size: data.size || 'Standard',
        colorName: data.colorName || 'Raw Natural',
        colorCode: data.colorCode || '#2563eb',
        currentStock: data.quantity,
        minThreshold: data.minThreshold !== undefined ? data.minThreshold : Math.round(data.quantity * 0.25),
        unit: data.unit || 'meters',
        unitCost: data.unitPrice,
        locationBin: data.locationBin || `BIN-${String.fromCharCode(65 + (materials.length % 6))}-0${(materials.length % 4) + 1}`,
        supplier: data.supplierName,
        lotNumber: data.lotNumber || `LOT-${new Date().getFullYear()}-0${materials.length + 1}`,
        consumptionRatePerHour: data.consumptionRatePerHour !== undefined ? data.consumptionRatePerHour : 200,
        lastUpdated: new Date().toISOString()
      };

      updatedMaterials = [...materials, newSku];
      setMaterials(updatedMaterials);
      targetMat = newSku;

      handleLogTransaction({
        materialId: newSku.id,
        materialName: newSku.name,
        type: 'restock',
        quantity: data.quantity,
        unit: newSku.unit,
        operator: currentUser?.name || 'Warehouse Officer',
        notes: data.notes || `New material SKU created & imported from ${data.supplierName} (Lot: ${newSku.lotNumber})`
      }, data.quantity);
    }

    // Create Supplier Accounts Payable record (What We Owe)
    const totalBill = data.quantity * data.unitPrice;
    const balanceOwed = Math.max(0, totalBill - data.amountPaidNow);
    const poCode = `PO-IMP-${Math.floor(8800 + supplierPayables.length + 1)}`;

    const newPayable: SupplierPayable = {
      id: `sup-pay-${Date.now()}`,
      purchaseOrderCode: poCode,
      supplierName: data.supplierName,
      materialNameOrDescription: targetMat ? `${targetMat.name} (${data.quantity.toLocaleString()} ${data.unit})` : `Raw Material Import (${data.quantity.toLocaleString()} ${data.unit})`,
      linkedMaterialId: targetMat?.id,
      quantityImported: data.quantity,
      unit: data.unit,
      unitPrice: data.unitPrice,
      totalBillAmount: totalBill,
      amountPaid: data.amountPaidNow,
      balanceOwed,
      purchaseDate: new Date().toISOString().split('T')[0],
      paymentDueDate: data.paymentDueDate,
      status: balanceOwed <= 0 ? 'settled' : data.amountPaidNow > 0 ? 'partial' : 'unpaid',
      lotBatchNumber: data.lotNumber,
      paymentHistory: data.amountPaidNow > 0 ? [{
        id: `spay-init-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: data.amountPaidNow,
        paymentMode: 'Upfront Bank Transfer',
        reference: `ADV-${poCode}`
      }] : []
    };

    const updatedPayables = [newPayable, ...supplierPayables];
    setSupplierPayables(updatedPayables);

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Imported ${data.quantity.toLocaleString()} ${data.unit} from ${data.supplierName} & synced Payable (₹${balanceOwed.toLocaleString('en-IN')} owed)`);
    setTimeout(() => setLastAutoEntryNotice(null), 5000);

    syncFullStateToGoogleSheets({
      materialsList: updatedMaterials,
      payablesList: updatedPayables
    });
  };

  const handleAddElectricityRecord = (record: Omit<ElectricityUsageRecord, 'id'>) => {
    const newRec: ElectricityUsageRecord = {
      ...record,
      id: `elec-${Date.now()}`
    };
    const updated = [newRec, ...electricityRecords];
    setElectricityRecords(updated);

    setLastAutoEntryNotice(`Logged electricity bill for ${newRec.month} (₹${newRec.totalBillAmount.toLocaleString('en-IN')})`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({ electricityList: updated });
  };

  const handleEditElectricityRecord = (record: ElectricityUsageRecord) => {
    const updated = electricityRecords.map(e => e.id === record.id ? record : e);
    setElectricityRecords(updated);

    setLastAutoEntryNotice(`Updated electricity bill for ${record.month} (₹${record.totalBillAmount.toLocaleString('en-IN')})`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({ electricityList: updated });
  };

  const handleDeleteElectricityRecord = (recordId: string) => {
    const target = electricityRecords.find(e => e.id === recordId);
    const updated = electricityRecords.filter(e => e.id !== recordId);
    setElectricityRecords(updated);

    if (target) {
      setLastAutoEntryNotice(`Deleted electricity log for ${target.month}`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({ electricityList: updated });
  };

  const handlePayElectricityBill = (recordId: string) => {
    const elec = electricityRecords.find(e => e.id === recordId);
    if (!elec) return;

    const today = new Date().toISOString().split('T')[0];
    const updatedElec = electricityRecords.map(e => e.id === recordId ? {
      ...e,
      paymentStatus: 'paid' as const,
      paidDate: today
    } : e);
    setElectricityRecords(updatedElec);

    // Record utility expense
    const utilityExpense: OperationalExpense = {
      id: `exp-elec-${Date.now()}`,
      expenseCode: `EXP-UTIL-${elec.billInvoiceRef || 'GRID'}`,
      date: today,
      category: 'electricity',
      title: `3-Phase Industrial Electricity Bill: ${elec.month}`,
      amount: elec.totalBillAmount,
      vendorOrPayee: 'Industrial Power Grid Utility',
      paymentMethod: 'bank_transfer',
      paymentStatus: 'paid',
      receiptInvoiceNo: elec.billInvoiceRef || `ELEC-${today.slice(0, 7)}`,
      notes: `Consumed: ${elec.totalKwhConsumed.toLocaleString()} kWh @ ₹${elec.tariffPerKwh}/kWh`,
      recordedBy: currentUser?.name || 'Admin'
    };

    const updatedExpenses = [utilityExpense, ...expenses];
    setExpenses(updatedExpenses);

    setLastAutoEntryNotice(`Paid Electricity Bill for ${elec.month} (₹${elec.totalBillAmount.toLocaleString('en-IN')})`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({
      electricityList: updatedElec,
      expensesList: updatedExpenses
    });
  };

  const handleDeleteEmployee = (employeeId: string) => {
    const target = employees.find(e => e.id === employeeId);
    const updated = employees.filter(e => e.id !== employeeId);
    setEmployees(updated);

    if (target) {
      setLastAutoEntryNotice(`Removed employee ${target.name}`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({ employeesList: updated });
  };

  const handleDeleteExpense = (expenseId: string) => {
    const target = expenses.find(e => e.id === expenseId);
    const updated = expenses.filter(e => e.id !== expenseId);
    setExpenses(updated);

    if (target) {
      setLastAutoEntryNotice(`Removed expense "${target.title}"`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({ expensesList: updated });
  };

  const handleDeletePartyInvoice = (invoiceId: string) => {
    const target = partyInvoices.find(i => i.id === invoiceId);
    const updated = partyInvoices.filter(i => i.id !== invoiceId);
    setPartyInvoices(updated);

    if (target) {
      setLastAutoEntryNotice(`Removed party invoice ${target.invoiceNumber}`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({ partyInvoicesList: updated });
  };

  const handleDeleteSupplierPayable = (payableId: string) => {
    const target = supplierPayables.find(p => p.id === payableId);
    const updated = supplierPayables.filter(p => p.id !== payableId);
    setSupplierPayables(updated);

    if (target) {
      setLastAutoEntryNotice(`Removed supplier payable ${target.purchaseOrderCode}`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({ payablesList: updated });
  };

  // Dispatch & Consignment Handlers
  const handleCreateDispatchOrder = (
    orderData: Omit<DispatchOrder, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const dispatchNumber = orderData.dispatchNumber || `DSP-${new Date().getFullYear()}-${String(100 + dispatchOrders.length + 1).slice(1)}`;
    const totalAmount = orderData.totalInvoiceAmount;
    const balanceDue = Math.max(0, totalAmount - orderData.amountPaid);
    const paymentStatus = balanceDue <= 0 ? 'paid' : orderData.amountPaid > 0 ? 'partial' : 'unpaid';
    const invoiceNum = orderData.invoiceNumber || `INV-${dispatchNumber}`;

    // 1. Create matching Party Invoice in Finance tab
    const linkedInvoiceId = `inv-dsp-${Date.now()}`;
    const newInvoice: PartyInvoice = {
      id: linkedInvoiceId,
      invoiceNumber: invoiceNum,
      partyName: orderData.partyName,
      contactPerson: orderData.contactPerson,
      orderDescription: `Dispatch: ${orderData.productName} (${orderData.quantity.toLocaleString()} ${orderData.unit})`,
      totalAmount: totalAmount,
      amountReceived: orderData.amountPaid,
      balanceDue,
      issueDate: orderData.readyDate || new Date().toISOString().split('T')[0],
      dueDate: orderData.paymentDueDate || orderData.expectedDeliveryDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: paymentStatus as any,
      paymentHistory: orderData.paymentHistory?.map(p => ({
        id: p.id,
        date: p.date,
        amount: p.amount,
        paymentMode: p.paymentMode,
        transactionRef: p.transactionRef,
        notes: p.notes
      })) || (orderData.amountPaid > 0 ? [{
        id: `pay-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
        amount: orderData.amountPaid,
        paymentMode: 'Direct Advance',
        transactionRef: `ADV-${invoiceNum}`
      }] : [])
    };

    const newDispatch: DispatchOrder = {
      ...orderData,
      id: `dsp-${Date.now()}`,
      dispatchNumber,
      invoiceNumber: invoiceNum,
      linkedInvoiceId,
      balanceDue,
      paymentStatus: paymentStatus as any,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedDispatches = [newDispatch, ...dispatchOrders];
    setDispatchOrders(updatedDispatches);

    const updatedInvoices = [newInvoice, ...partyInvoices];
    setPartyInvoices(updatedInvoices);

    // If stock deduction is needed, deduct from linked material
    let updatedMaterials = [...materials];
    let updatedTransactions = [...transactions];
    const targetMat = orderData.linkedMaterialId 
      ? updatedMaterials.find(m => m.id === orderData.linkedMaterialId)
      : updatedMaterials.find(m => m.name.toLowerCase() === orderData.productName.toLowerCase());

    if (targetMat) {
      const newStock = Math.max(0, targetMat.currentStock - orderData.quantity);
      updatedMaterials = updatedMaterials.map(m => m.id === targetMat.id ? {
        ...m,
        currentStock: newStock,
        lastUpdated: new Date().toISOString()
      } : m);

      const tx: StockTransaction = {
        id: `tx-dsp-${Date.now()}`,
        materialId: targetMat.id,
        materialName: targetMat.name,
        type: 'dispatch',
        quantity: orderData.quantity,
        unit: targetMat.unit,
        batchId: orderData.lotBatchNumber || targetMat.lotNumber,
        unitCost: orderData.unitPrice,
        totalCost: orderData.subtotal,
        supplierName: orderData.partyName,
        operator: currentUser?.name || 'Dispatch Manager',
        timestamp: new Date().toISOString(),
        notes: `Dispatched order ${dispatchNumber} to ${orderData.partyName}`
      };
      updatedTransactions = [tx, ...updatedTransactions];
      setMaterials(updatedMaterials);
      setTransactions(updatedTransactions);
    }

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Created Dispatch Order ${dispatchNumber} for ${orderData.partyName} (Synced to Finance Invoice #${invoiceNum})`);
    setTimeout(() => setLastAutoEntryNotice(null), 5000);

    saveDispatchOrderToFirestore(newDispatch).catch(() => {});
    pushDispatchOrderToAppsScript(syncConfig, newDispatch);

    syncFullStateToGoogleSheets({
      dispatchOrdersList: updatedDispatches,
      partyInvoicesList: updatedInvoices,
      materialsList: updatedMaterials,
      transactionsList: updatedTransactions
    });
  };

  const handleUpdateDispatchOrder = (order: DispatchOrder) => {
    const updated = dispatchOrders.map(d => d.id === order.id ? { ...order, updatedAt: new Date().toISOString() } : d);
    setDispatchOrders(updated);

    // Update matching party invoice if exists
    let updatedInvoices = [...partyInvoices];
    if (order.linkedInvoiceId || order.invoiceNumber) {
      updatedInvoices = partyInvoices.map(inv => (inv.id === order.linkedInvoiceId || inv.invoiceNumber === order.invoiceNumber) ? {
        ...inv,
        partyName: order.partyName,
        totalAmount: order.totalInvoiceAmount,
        amountReceived: order.amountPaid,
        balanceDue: order.balanceDue,
        status: order.paymentStatus as any
      } : inv);
      setPartyInvoices(updatedInvoices);
    }

    const updatedTarget = updated.find(d => d.id === order.id);
    if (updatedTarget) {
      saveDispatchOrderToFirestore(updatedTarget).catch(() => {});
      pushDispatchOrderToAppsScript(syncConfig, updatedTarget);
    }

    setLastAutoEntryNotice(`Updated Dispatch Order ${order.dispatchNumber}`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);

    syncFullStateToGoogleSheets({
      dispatchOrdersList: updated,
      partyInvoicesList: updatedInvoices
    });
  };

  const handleMarkAsDispatched = (
    orderId: string,
    dispatchData: {
      dispatchedDate: string;
      transporterName: string;
      vehicleOrTrackingNumber: string;
      deliveryAddress?: string;
      packagingDetails?: string;
      notes?: string;
    }
  ) => {
    const order = dispatchOrders.find(d => d.id === orderId);
    if (!order) return;

    const updated = dispatchOrders.map(d => d.id === orderId ? {
      ...d,
      status: 'dispatched' as const,
      dispatchedDate: dispatchData.dispatchedDate,
      transporterName: dispatchData.transporterName,
      vehicleOrTrackingNumber: dispatchData.vehicleOrTrackingNumber,
      deliveryAddress: dispatchData.deliveryAddress || d.deliveryAddress,
      packagingDetails: dispatchData.packagingDetails || d.packagingDetails,
      notes: dispatchData.notes || d.notes,
      updatedAt: new Date().toISOString()
    } : d);
    setDispatchOrders(updated);

    const updatedTarget = updated.find(d => d.id === orderId);
    if (updatedTarget) {
      saveDispatchOrderToFirestore(updatedTarget).catch(() => {});
      pushDispatchOrderToAppsScript(syncConfig, updatedTarget);
    }

    confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Order ${order.dispatchNumber} marked as DISPATCHED via ${dispatchData.transporterName}`);
    setTimeout(() => setLastAutoEntryNotice(null), 4500);

    syncFullStateToGoogleSheets({ dispatchOrdersList: updated });
  };

  const handleRecordDispatchPayment = (
    dispatchId: string,
    amount: number,
    paymentMode: string,
    transactionRef: string,
    notes?: string
  ) => {
    const order = dispatchOrders.find(d => d.id === dispatchId);
    if (!order) return;

    const newPaid = order.amountPaid + amount;
    const newBalance = Math.max(0, order.totalInvoiceAmount - newPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const newPaymentEntry: DispatchPaymentRecord = {
      id: `dpay-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      amount,
      paymentMode,
      transactionRef,
      notes
    };

    const updatedOrders = dispatchOrders.map(d => d.id === dispatchId ? {
      ...d,
      amountPaid: newPaid,
      balanceDue: newBalance,
      paymentStatus: newStatus as any,
      paymentHistory: [...(d.paymentHistory || []), newPaymentEntry],
      updatedAt: new Date().toISOString()
    } : d);
    setDispatchOrders(updatedOrders);

    const updatedTarget = updatedOrders.find(d => d.id === dispatchId);
    if (updatedTarget) {
      saveDispatchOrderToFirestore(updatedTarget).catch(() => {});
      pushDispatchOrderToAppsScript(syncConfig, updatedTarget);
    }

    // Sync into matching party invoice in Finance tab
    let updatedInvoices = [...partyInvoices];
    const targetInvoice = partyInvoices.find(i => i.id === order.linkedInvoiceId || (order.invoiceNumber && i.invoiceNumber === order.invoiceNumber));
    if (targetInvoice) {
      const invPaid = targetInvoice.amountReceived + amount;
      const invBalance = Math.max(0, targetInvoice.totalAmount - invPaid);
      const invStatus = invBalance <= 0 ? 'paid' : 'partial';
      updatedInvoices = partyInvoices.map(i => i.id === targetInvoice.id ? {
        ...i,
        amountReceived: invPaid,
        balanceDue: invBalance,
        status: invStatus as any,
        paymentHistory: [...(i.paymentHistory || []), {
          id: `pay-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          amount,
          paymentMode,
          transactionRef,
          notes
        }]
      } : i);
      setPartyInvoices(updatedInvoices);
    }

    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    setLastAutoEntryNotice(`Received ₹${amount.toLocaleString('en-IN')} for Dispatch Order ${order.dispatchNumber} (${order.partyName}) & Synced to Finance`);
    setTimeout(() => setLastAutoEntryNotice(null), 5000);

    syncFullStateToGoogleSheets({
      dispatchOrdersList: updatedOrders,
      partyInvoicesList: updatedInvoices
    });
  };

  const handleDeleteDispatchOrder = (orderId: string) => {
    const target = dispatchOrders.find(d => d.id === orderId);
    const updated = dispatchOrders.filter(d => d.id !== orderId);
    setDispatchOrders(updated);
    deleteDispatchOrderFromFirestore(orderId).catch(() => {});
    setDispatchOrders(updated);

    // Also remove linked party invoice if present
    let updatedInvoices = [...partyInvoices];
    if (target?.linkedInvoiceId || target?.invoiceNumber) {
      updatedInvoices = partyInvoices.filter(i => i.id !== target.linkedInvoiceId && i.invoiceNumber !== target.invoiceNumber);
      setPartyInvoices(updatedInvoices);
    }

    if (target) {
      setLastAutoEntryNotice(`Removed dispatch order ${target.dispatchNumber} (${target.partyName})`);
      setTimeout(() => setLastAutoEntryNotice(null), 4000);
    }

    syncFullStateToGoogleSheets({
      dispatchOrdersList: updated,
      partyInvoicesList: updatedInvoices
    });
  };

  const handleClearAllFinanceData = () => {
    setEmployees([]);
    setElectricityRecords([]);
    setExpenses([]);
    setPartyInvoices([]);
    setSupplierPayables([]);
    localStorage.removeItem('factory_employees');
    localStorage.removeItem('factory_electricity');
    localStorage.removeItem('factory_expenses');
    localStorage.removeItem('factory_party_invoices');
    localStorage.removeItem('factory_supplier_payables');
    localStorage.setItem('factory_finance_cleared_v2', 'true');

    setLastAutoEntryNotice('All financial ledger data deleted. Starting fresh with clean slate.');
    setTimeout(() => setLastAutoEntryNotice(null), 5000);

    syncFullStateToGoogleSheets({
      employeesList: [],
      electricityList: [],
      expensesList: [],
      partyInvoicesList: [],
      payablesList: []
    });
  };

  // CSV Export helper
  const handleExportCsv = () => {
    const { inventoryCsv } = exportDataAsCsv(materials, workflowItems, orderSlips, dispatchOrders);
    const blob = new Blob([inventoryCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `factory_inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Workflow Handlers & Realtime Firestore sync with Android App
  useEffect(() => {
    saveStoredWorkflowItems(workflowItems);
  }, [workflowItems]);

  useEffect(() => {
    saveStoredOrderSlips(orderSlips);
  }, [orderSlips]);

  useEffect(() => {
    const unsubDesigns = subscribeToDesigns(async (remoteDesigns) => {
      if (remoteDesigns && remoteDesigns.length > 0) {
        let mergedList: WorkflowItem[] = [];
        setWorkflowItems((prev) => {
          const map = new Map<string, WorkflowItem>();
          
          // 1. Put current items keyed by lot / id
          (prev || []).forEach(item => {
            const key = (item.lotNumber || item.jobNo || item.id || '').trim().toLowerCase();
            if (key) map.set(key, item);
          });

          // 2. Merge remote Firestore items
          remoteDesigns.forEach(remote => {
            const key = (remote.lotNumber || remote.jobNo || remote.id || '').trim().toLowerCase();
            if (key) {
              const existing = map.get(key);
              if (existing) {
                const validRemotePhotos = (remote.photos || []).filter(p => p.url && p.url.startsWith('http'));
                const validExistingPhotos = (existing.photos || []).filter(p => p.url && p.url.startsWith('http'));
                const validRemoteImage = (remote.designImage && remote.designImage.startsWith('http') && !remote.designImage.includes('unsplash.com')) ? remote.designImage : undefined;
                const validExistingImage = (existing.designImage && existing.designImage.startsWith('http') && !existing.designImage.includes('unsplash.com')) ? existing.designImage : undefined;

                map.set(key, {
                  ...existing,
                  ...remote,
                  photos: validRemotePhotos.length > 0 ? validRemotePhotos : validExistingPhotos,
                  designImage: validRemoteImage || validExistingImage || (validRemotePhotos[0]?.url) || (validExistingPhotos[0]?.url) || undefined,
                  stageHistory: (remote.stageHistory && remote.stageHistory.length > 0) ? remote.stageHistory : (existing.stageHistory || [])
                });
              } else {
                map.set(key, remote);
              }
            }
          });

          mergedList = Array.from(map.values());
          if (mergedList.length > 0) {
            saveStoredWorkflowItems(mergedList);
            return mergedList;
          }
          return prev;
        });

        if (mergedList.length > 0) {
          try {
            const withPhotos = await attachStoragePhotosToWorkflowItems(mergedList);
            if (withPhotos && withPhotos.length > 0) {
              setWorkflowItems(withPhotos);
              saveStoredWorkflowItems(withPhotos);
            }
          } catch (e) {}
        }
      }
    });

    const unsubSlips = subscribeToOrderSlips((remoteSlips) => {
      if (remoteSlips && remoteSlips.length > 0) {
        setOrderSlips((prev) => {
          const map = new Map<string, OrderSlip>();
          prev.forEach(slip => {
            const key = (slip.jobNo || slip.id || '').trim().toLowerCase();
            if (key) map.set(key, slip);
          });
          remoteSlips.forEach(slip => {
            const key = (slip.jobNo || slip.id || '').trim().toLowerCase();
            if (key) {
              map.set(key, { ...(map.get(key) || {}), ...slip });
            }
          });
          const merged = Array.from(map.values());
          saveStoredOrderSlips(merged);
          return merged;
        });
      }
    });

    return () => {
      if (unsubDesigns) unsubDesigns();
      if (unsubSlips) unsubSlips();
    };
  }, []);

  const handleUpdateWorkflowStage = (
    itemId: string, 
    newStage: WorkflowStageId, 
    notes?: string, 
    qualityStatus?: 'good' | 'bad_return' | 'needs_alter' | 'passed'
  ) => {
    const stageDef = WORKFLOW_STAGES.find(s => s.id === newStage);
    const nowIso = new Date().toISOString();

    let updatedItemForSync: WorkflowItem | null = null;
    let nextList: WorkflowItem[] = [];

    setWorkflowItems(prev => {
      nextList = prev.map(item => {
        if (item.id !== itemId) return item;
        
        const newHistory = [
          ...(item.stageHistory || []),
          {
            stageId: newStage,
            stageName: stageDef ? stageDef.name : newStage,
            enteredAt: nowIso,
            operatorName: currentUser?.name || 'Floor Supervisor',
            notes: notes || `Moved to ${stageDef?.shortName || newStage}`,
            qualityStatus
          }
        ];

        const updated: WorkflowItem = {
          ...item,
          currentStage: newStage,
          stageHistory: newHistory,
          isReturned: qualityStatus === 'bad_return' ? true : item.isReturned,
          initialInspectionResult: qualityStatus === 'good' || qualityStatus === 'bad_return' 
            ? qualityStatus 
            : item.initialInspectionResult,
          alterInspectionResult: qualityStatus === 'passed' || qualityStatus === 'needs_alter'
            ? qualityStatus
            : item.alterInspectionResult,
          alterationReason: qualityStatus === 'needs_alter' && notes ? notes : item.alterationReason,
          lastSyncedWithFirebase: nowIso
        };

        updatedItemForSync = updated;
        return updated;
      });

      saveStoredWorkflowItems(nextList);
      return nextList;
    });

    // Find the item and sync immediately to Firestore and Google Sheets
    const targetItem = workflowItems.find(i => i.id === itemId) || updatedItemForSync;
    if (targetItem) {
      const itemToSync: WorkflowItem = {
        ...targetItem,
        currentStage: newStage,
        lastSyncedWithFirebase: nowIso
      };
      saveDesignToFirestore(itemToSync).catch(err => {
        console.warn('Firestore sync note:', err);
      });
      pushItemToGoogleSheets(syncConfig, itemToSync);
      syncFullStateToGoogleSheets({ 
        workflowItemsList: workflowItems.map(i => i.id === itemId ? itemToSync : i)
      });
    }

    if (newStage === 'prepare_dispatch') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }
  };

  const handleCreateWorkflowItem = (newItem: WorkflowItem) => {
    const updated = [newItem, ...workflowItems];
    setWorkflowItems(updated);
    pushItemToGoogleSheets(syncConfig, newItem);
    saveDesignToFirestore(newItem).catch(err => console.warn('Firestore sync error:', err));
    syncFullStateToGoogleSheets({ workflowItemsList: updated });
    setLastAutoEntryNotice(`Registered ${newItem.designNumber} (Lot ${newItem.lotNumber}) in workflow pipeline & Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 4000);
    confetti({
      particleCount: 40,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  const handleUpdateWorkflowItem = (updated: WorkflowItem) => {
    const updatedList = workflowItems.map(i => i.id === updated.id ? updated : i);
    setWorkflowItems(updatedList);
    pushItemToGoogleSheets(syncConfig, updated);
    if (updated.individualPieces && updated.individualPieces.length > 0) {
      pushPiecesToAppsScript(syncConfig, updated.individualPieces);
    }
    saveDesignToFirestore(updated).catch(err => console.warn('Firestore sync error:', err));
    syncFullStateToGoogleSheets({ workflowItemsList: updatedList });
    setLastAutoEntryNotice(`Updated design ${updated.designNumber} & synced to Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 3000);
  };

  const handleDeleteWorkflowItem = (itemId: string) => {
    const target = workflowItems.find(i => i.id === itemId);
    const updatedList = workflowItems.filter(i => i.id !== itemId);
    setWorkflowItems(updatedList);
    deleteDesignFromFirestore(itemId).catch(err => console.warn('Firestore delete error:', err));
    syncFullStateToGoogleSheets({ workflowItemsList: updatedList });
    if (target) {
      setLastAutoEntryNotice(`Deleted job ${target.designNumber} (${target.lotNumber}) & updated Google Sheet`);
      setTimeout(() => setLastAutoEntryNotice(null), 3000);
    }
  };

  const handleSaveOrderSlip = (slip: OrderSlip, generatedItems: WorkflowItem[]) => {
    const existingIdx = orderSlips.findIndex(s => s.id === slip.id);
    let updatedSlips: OrderSlip[];
    if (existingIdx >= 0) {
      updatedSlips = orderSlips.map(s => s.id === slip.id ? slip : s);
    } else {
      updatedSlips = [slip, ...orderSlips];
    }
    setOrderSlips(updatedSlips);
    saveStoredOrderSlips(updatedSlips);
    pushOrderSlipToAppsScript(syncConfig, slip);
    saveOrderSlipToFirestore(slip).catch(err => console.warn('Firestore order slip sync error:', err));

    // Merge generated items into workflowItems and persist each to Firestore & Google Sheets
    setWorkflowItems(prev => {
      let nextList = [...prev];
      generatedItems.forEach(it => {
        const idx = nextList.findIndex(existing => existing.id === it.id);
        if (idx >= 0) {
          nextList[idx] = it;
        } else {
          nextList.unshift(it);
        }
        pushItemToGoogleSheets(syncConfig, it);
        saveDesignToFirestore(it).catch(err => console.warn('Firestore design sync error:', err));
      });
      saveStoredWorkflowItems(nextList);
      syncFullStateToGoogleSheets({ 
        workflowItemsList: nextList,
        orderSlipsList: updatedSlips
      });
      return nextList;
    });

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
    setLastAutoEntryNotice(`Saved Order Slip for ${slip.partyName} (Job: ${slip.jobNo}) & Synced ${generatedItems.length} Component Lots to Firestore & Cloud`);
    setTimeout(() => setLastAutoEntryNotice(null), 4500);
  };

  const handleHandoverWorkflowToDispatch = (workflowItem: WorkflowItem) => {
    const now = new Date();
    const dspNumber = `DSP-${now.getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
    const unitPrice = 250;
    const subtotal = workflowItem.quantity * unitPrice;
    const taxPercent = 5;
    const taxAmount = (subtotal * taxPercent) / 100;
    const totalInvoiceAmount = subtotal + taxAmount;
    
    const newDispatch: DispatchOrder = {
      id: `dsp-${Date.now()}`,
      dispatchNumber: dspNumber,
      orderNumber: workflowItem.lotNumber,
      partyName: workflowItem.partyOrClientName || 'Direct Market Client',
      productName: `${workflowItem.designNumber} - ${workflowItem.fabricType}`,
      itemCode: workflowItem.designNumber,
      lotBatchNumber: workflowItem.lotNumber,
      colorName: workflowItem.fabricColor,
      quantity: workflowItem.quantity,
      unit: workflowItem.unit,
      unitPrice,
      subtotal,
      taxPercent,
      taxAmount,
      totalInvoiceAmount,
      status: 'ready_to_dispatch',
      paymentStatus: 'unpaid',
      amountPaid: 0,
      balanceDue: totalInvoiceAmount,
      readyDate: now.toISOString().split('T')[0],
      paymentHistory: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      notes: `Generated from 10-stage Workflow completion (Lot: ${workflowItem.lotNumber}, Slip: ${workflowItem.chalanNumber || 'N/A'})`
    };

    const updatedDispatches = [newDispatch, ...dispatchOrders];
    const updatedWorkflows = workflowItems.map(i => i.id === workflowItem.id ? { ...i, isDispatched: true } : i);
    setDispatchOrders(updatedDispatches);
    setWorkflowItems(updatedWorkflows);
    setActiveMainTab('dispatch');

    setLastAutoEntryNotice(`Handed over ${workflowItem.designNumber} to Dispatch (Order ${dspNumber}) & Synced to Google Sheet`);
    setTimeout(() => setLastAutoEntryNotice(null), 5000);

    syncFullStateToGoogleSheets({
      dispatchOrdersList: updatedDispatches,
      workflowItemsList: updatedWorkflows
    });

    confetti({
      particleCount: 70,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Auth gate
  if (!currentUser || !currentUser.sheetAccessGranted) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        initialSheetId={syncConfig.sheetId}
      />
    );
  }

  const lowStockCount = materials.filter(m => m.currentStock <= m.minThreshold).length;
  const readyDispatchCount = dispatchOrders.filter(o => o.status === 'ready_to_dispatch').length;

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('factory_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex font-sans selection:bg-slate-900 selection:text-white">
      
      {/* Collapsible Left Sidebar */}
      <Sidebar
        activeTab={activeMainTab}
        onTabChange={setActiveMainTab}
        workflowCount={workflowItems.length}
        lowStockCount={lowStockCount}
        readyDispatchCount={readyDispatchCount}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        currentUser={currentUser}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onOpenCreateSheet={() => setIsCreateSheetOpen(true)}
      />

      {/* Main Column (Navbar + Main Content + Footer) */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Navigation */}
        <Navbar
          machines={machines}
          materials={materials}
          alerts={alerts}
          syncConfig={syncConfig}
          isSimulating={isSimulating}
          currentUser={currentUser}
          activeTab={activeMainTab}
          dispatchOrders={dispatchOrders}
          workflowItems={workflowItems}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={handleToggleSidebar}
          onTabChange={setActiveMainTab}
          onToggleSimulation={() => setIsSimulating(!isSimulating)}
          onOpenSyncModal={() => setIsSyncModalOpen(true)}
          onOpenCreateSheet={() => setIsCreateSheetOpen(true)}
          onOpenAddMachine={() => setIsAddMachineOpen(true)}
          onOpenAddMaterial={() => {
            setEditingMaterial(null);
            setIsAddMaterialOpen(true);
          }}
          onOpenStockAdjust={() => {
            setAdjustTargetMaterial(materials[0] || null);
            setAdjustType('restock');
            setIsStockAdjustOpen(true);
          }}
          onOpenAlerts={() => setIsAlertsOpen(true)}
          onTriggerManualSync={() => handlePerformSync(false)}
          onSignOut={handleSignOut}
          onSwitchAccount={handleSwitchAccount}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {activeMainTab === 'workflow' && (
          /* 10-Stage Fabric Design Workflow Pipeline */
          <WorkflowManager
            items={workflowItems}
            onUpdateStage={handleUpdateWorkflowStage}
            onCreateItem={handleCreateWorkflowItem}
            onUpdateItem={handleUpdateWorkflowItem}
            onDeleteItem={handleDeleteWorkflowItem}
            onHandoverToDispatch={handleHandoverWorkflowToDispatch}
            onTriggerSync={() => handlePerformSync(false)}
            orderSlips={orderSlips}
            onSaveOrderSlip={handleSaveOrderSlip}
          />
        )}
        
        {activeMainTab === 'inventory' && (
          <div className="space-y-6">
            {/* Real-time Stock Telemetry, Level Graphs & Valuation Breakdown */}
            <AnalyticsPanel
              materials={materials}
              onSelectLowStockFilter={() => setLowStockFilterActive(true)}
            />

            {/* Unified Inventory & Stock Manager */}
            <InventoryManager
              materials={materials}
              machines={machines}
              lowStockFilterActive={lowStockFilterActive}
              onClearLowStockFilter={() => setLowStockFilterActive(false)}
              onOpenAddMaterial={() => {
                setEditingMaterial(null);
                setIsAddMaterialOpen(true);
              }}
              onOpenQuickAdjust={(material, type) => {
                setAdjustTargetMaterial(material);
                setAdjustType(type);
                setIsStockAdjustOpen(true);
              }}
              onOpenAssignMaterial={(material) => {
                const mach = machines[0] || null;
                setSelectedMachineForAssign(mach);
                setIsAssignMaterialOpen(true);
              }}
              onEditMaterial={(material) => {
                setEditingMaterial(material);
                setIsAddMaterialOpen(true);
              }}
              onDeleteMaterial={(id, name) => handleRequestDeleteMaterial(id, name)}
              onCategoriesUpdated={handleCategoriesUpdated}
              onExportCsv={handleExportCsv}
            />

            {/* Unified Stock Transaction & Financial Audit Ledger */}
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center space-x-2">
                  <Package className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-800">
                    Live Stock Audit &amp; Financial Ledger Stream
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                    {transactions.length} LOGS
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Synced directly with Google Sheets &bull; Real-time burn rates
                </div>
              </div>

              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/75 text-slate-600 font-bold uppercase text-[10px] tracking-wider sticky top-0">
                    <tr>
                      <th className="py-2 px-3.5">Time</th>
                      <th className="py-2 px-3.5">Type</th>
                      <th className="py-2 px-3.5">Material SKU</th>
                      <th className="py-2 px-3.5">Batch / PO</th>
                      <th className="py-2 px-3.5 text-right">Quantity</th>
                      <th className="py-2 px-3.5 text-right">Unit Rate</th>
                      <th className="py-2 px-3.5 text-right">Total Cost</th>
                      <th className="py-2 px-3.5">Operator</th>
                      <th className="py-2 px-3.5">Finance Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {transactions.slice(0, 15).map(tx => (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {tx.timestamp.split('T')[1]?.slice(0, 5) || 'Now'}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'restock' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : tx.type === 'consumption'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {tx.type === 'restock' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            <span className="uppercase">{tx.type}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                          {tx.materialName}
                          <span className="ml-1 text-[10px] font-mono text-slate-400 font-normal">({tx.materialId})</span>
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {tx.batchId || '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                          <span className={tx.quantity > 0 ? 'text-emerald-700' : 'text-amber-700'}>
                            {tx.quantity > 0 ? `+${tx.quantity.toLocaleString()}` : tx.quantity.toLocaleString()} {tx.unit}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono text-slate-600 whitespace-nowrap">
                          {tx.unitCost !== undefined ? `₹${tx.unitCost}` : '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {tx.totalCost !== undefined ? `₹${tx.totalCost.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap">
                          {tx.operator}
                        </td>
                        <td className="py-2.5 px-3.5 whitespace-nowrap">
                          {tx.linkedPayableId ? (
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                              Payable Created
                            </span>
                          ) : tx.linkedExpenseId ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              Paid Expense
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Inventory Only</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeMainTab === 'dispatch' && (
          /* Dispatch, Logistics & Ready-to-Dispatch Consignments Module */
          <DispatchManager
            dispatchOrders={dispatchOrders}
            materials={materials}
            machines={machines}
            onCreateDispatch={handleCreateDispatchOrder}
            onUpdateDispatch={handleUpdateDispatchOrder}
            onMarkAsDispatched={handleMarkAsDispatched}
            onRecordDispatchPayment={handleRecordDispatchPayment}
            onDeleteDispatch={handleDeleteDispatchOrder}
            onNavigateToFinance={() => setActiveMainTab('finance')}
          />
        )}

        {activeMainTab === 'finance' && (
          /* Finance, Accounts, Staff & Inventory Sync Module */
          <FinanceManager
            materials={materials}
            machines={machines}
            employees={employees}
            electricityRecords={electricityRecords}
            expenses={expenses}
            partyInvoices={partyInvoices}
            supplierPayables={supplierPayables}
            onAddExpense={handleAddExpense}
            onPaySalary={handlePaySalary}
            onAddEmployee={handleAddEmployee}
            onRecordPartyPayment={handleRecordPartyPayment}
            onRecordSupplierPayment={handleRecordSupplierPayment}
            onImportStockWithPayable={handleImportStockWithPayable}
            onPayElectricityBill={handlePayElectricityBill}
            onAddElectricityRecord={handleAddElectricityRecord}
            onEditElectricityRecord={handleEditElectricityRecord}
            onDeleteElectricityRecord={handleDeleteElectricityRecord}
            onDeleteEmployee={handleDeleteEmployee}
            onDeleteExpense={handleDeleteExpense}
            onDeletePartyInvoice={handleDeletePartyInvoice}
            onDeleteSupplierPayable={handleDeleteSupplierPayable}
            onClearAllFinanceData={handleClearAllFinanceData}
            onOpenSyncModal={() => setIsSyncModalOpen(true)}
            onOpenCreateSheet={() => setIsCreateSheetOpen(true)}
            syncConfig={syncConfig}
          />
        )}

      </main>

      {/* Floating Auto-Entry Confirmation Toast */}
      {lastAutoEntryNotice && (
        <div className="fixed bottom-14 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center space-x-3 text-xs animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold text-white block">Auto-Entry Synchronized</span>
            <span className="text-slate-300 text-[11px]">{lastAutoEntryNotice}</span>
          </div>
          <a
            href={syncConfig.sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="p-1 text-slate-400 hover:text-white transition-colors"
            title="Open Google Sheet"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      )}

      {/* Footer - Professional Polish status console */}
      <footer className="bg-white text-slate-500 border-t border-slate-200 py-3 text-xs font-mono shadow-xs">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center space-x-3 flex-wrap">
            <span className="font-bold text-slate-700">DATABASE ID:</span>
            <span className="text-slate-500">{syncConfig.sheetId ? `${syncConfig.sheetId.slice(0, 12)}...` : 'Local / Connected'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-semibold">COMPANY: {currentUser?.companyName || 'Trisharth'}</span>
            <span className="text-slate-300">|</span>
            <span className="text-emerald-700 flex items-center font-semibold">
              <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-600" />
              AUTO-ENTRY ACTIVE
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setIsCreateSheetOpen(true)}
              className="text-slate-700 hover:text-slate-900 font-semibold uppercase flex items-center space-x-1"
            >
              <Sparkles className="h-3 w-3 mr-0.5 text-slate-400" />
              <span>+ Create New Sheet</span>
            </button>
            <span className="text-slate-300">|</span>
            <button 
              onClick={() => setIsSyncModalOpen(true)}
              className="text-slate-700 hover:text-slate-900 font-semibold uppercase"
            >
              Spreadsheet Config
            </button>
          </div>
        </div>
      </footer>
      </div>

      {/* Modals & Drawers */}
      <AddMachineModal
        isOpen={isAddMachineOpen}
        onClose={() => setIsAddMachineOpen(false)}
        materials={materials}
        existingMachinesCount={machines.length}
        onAddMachine={handleAddMachine}
      />

      <AddMaterialModal
        isOpen={isAddMaterialOpen}
        onClose={() => {
          setIsAddMaterialOpen(false);
          setEditingMaterial(null);
        }}
        editingMaterial={editingMaterial}
        materials={materials}
        onSaveMaterial={handleSaveMaterial}
        onDeleteMaterial={(id, name) => handleRequestDeleteMaterial(id, name)}
        onCategoriesUpdated={handleCategoriesUpdated}
        onSwitchToRestock={(mat) => {
          setIsAddMaterialOpen(false);
          setAdjustTargetMaterial(mat);
          setAdjustType('restock');
          setIsStockAdjustOpen(true);
        }}
      />

      {/* In-App Delete Material Confirmation Modal */}
      {materialToDelete && (
        <div 
          id="modal-delete-material-confirm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Delete Material SKU?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to permanently remove <strong className="text-slate-900">"{materialToDelete.name}"</strong>? This will remove it from the live inventory, unassign it from any active machines, and immediately update your connected Google Sheet.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs font-mono text-slate-600 space-y-1 mb-6">
                <div>SKU ID: <span className="font-bold text-slate-800">{materialToDelete.id}</span></div>
                <div>Status: <span className="text-rose-600 font-bold">Permanent Deletion</span></div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  id="btn-cancel-delete-material"
                  type="button"
                  onClick={() => setMaterialToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-material"
                  type="button"
                  onClick={() => handleExecuteDeleteMaterial(materialToDelete.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Permanently</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-App Delete Machine Confirmation Modal */}
      {machineToDelete && (
        <div 
          id="modal-delete-machine-confirm"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                Remove Machine from Factory Floor?
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to remove <strong className="text-slate-900">"{machineToDelete.name}"</strong> {machineToDelete.model ? `(${machineToDelete.model})` : ''}? This unit will be decommissioned and unsynced from your connected Google Sheet.
              </p>
              
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-xs font-mono text-slate-600 space-y-1 mb-6">
                <div>Machine ID: <span className="font-bold text-slate-800">{machineToDelete.id}</span></div>
                <div>Action: <span className="text-rose-600 font-bold">Floor Decommission &amp; Sheet Unlink</span></div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  id="btn-cancel-delete-machine"
                  type="button"
                  onClick={() => setMachineToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  id="btn-confirm-delete-machine"
                  type="button"
                  onClick={() => handleExecuteDeleteMachine(machineToDelete.id)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Machine</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <StockAdjustModal
        isOpen={isStockAdjustOpen}
        onClose={() => {
          setIsStockAdjustOpen(false);
          setAdjustTargetMaterial(null);
        }}
        materials={materials}
        machines={machines}
        initialMaterial={adjustTargetMaterial}
        initialType={adjustType}
        onLogTransaction={handleLogTransaction}
      />

      <MaterialAssignModal
        isOpen={isAssignMaterialOpen}
        onClose={() => {
          setIsAssignMaterialOpen(false);
          setSelectedMachineForAssign(null);
        }}
        machine={selectedMachineForAssign}
        materials={materials}
        onAssignMaterial={handleAssignMaterial}
      />

      <MachineDetailModal
        isOpen={isMachineDetailOpen}
        onClose={() => {
          setIsMachineDetailOpen(false);
          setSelectedMachineForDetail(null);
        }}
        machine={selectedMachineForDetail}
        materials={materials}
        onUpdateMachine={handleUpdateMachine}
        onDeleteMachine={(id, name, model) => handleRequestDeleteMachine(id, name, model)}
        onOpenStartTask={(machId) => {
          setJobPlannerMachineId(machId);
          setIsJobPlannerOpen(true);
        }}
        onOpenFinishTask={(mach) => {
          setMachineForFinishTask(mach);
          setIsFinishTaskOpen(true);
        }}
      />

      <SheetIntegrationModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        syncConfig={syncConfig}
        materials={materials}
        machines={machines}
        workflowItems={workflowItems}
        orderSlips={orderSlips}
        dispatchOrders={dispatchOrders}
        onUpdateSyncConfig={setSyncConfig}
        onTriggerSync={() => handlePerformSync(false)}
        onOpenCreateSheet={() => setIsCreateSheetOpen(true)}
        onImportData={(imported) => {
          if (imported.materials) setMaterials(imported.materials);
        }}
      />

      <CreateNewSheetModal
        isOpen={isCreateSheetOpen}
        onClose={() => setIsCreateSheetOpen(false)}
        currentUser={currentUser}
        materials={materials}
        machines={machines}
        workflowItems={workflowItems}
        orderSlips={orderSlips}
        onSpreadsheetCreated={handleSpreadsheetCreated}
        onUpdateCurrentUser={(user) => {
          setCurrentUser(user);
          saveStoredAuthUser(user);
        }}
      />

      <JobPlannerModal
        isOpen={isJobPlannerOpen}
        onClose={() => {
          setIsJobPlannerOpen(false);
          setJobPlannerMachineId(undefined);
        }}
        machines={machines}
        materials={materials}
        preSelectedMachineId={jobPlannerMachineId}
        onStartTask={handleStartTask}
      />

      <FinishTaskModal
        isOpen={isFinishTaskOpen}
        onClose={() => {
          setIsFinishTaskOpen(false);
          setMachineForFinishTask(null);
        }}
        machine={machineForFinishTask}
        materials={materials}
        onCompleteTask={handleCompleteTask}
        onDiscardTask={handleDiscardTask}
      />

      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        materials={materials}
        onResolveAlert={handleResolveAlert}
        onOpenQuickRestock={(material) => {
          setAdjustTargetMaterial(material);
          setAdjustType('restock');
          setIsStockAdjustOpen(true);
        }}
      />

    </div>
  );
}
