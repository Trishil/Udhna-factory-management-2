import React, { useState, useRef, useEffect } from 'react';
import { 
  Factory, 
  Layers, 
  RefreshCw, 
  Play, 
  Pause, 
  FileSpreadsheet, 
  Bell, 
  PackagePlus,
  Cpu,
  LogOut,
  User,
  ShieldCheck,
  ExternalLink,
  ChevronDown,
  Sparkles,
  CheckCircle2,
  Wallet,
  Truck,
  Workflow,
  Scroll
} from 'lucide-react';
import { Machine, RawMaterial, SyncConfig, FactoryAlert, AuthUser, AppTab, DispatchOrder, WorkflowItem } from '../types';

interface NavbarProps {
  machines?: Machine[];
  materials: RawMaterial[];
  alerts: FactoryAlert[];
  syncConfig: SyncConfig;
  isSimulating?: boolean;
  currentUser: AuthUser | null;
  activeTab?: AppTab;
  dispatchOrders?: DispatchOrder[];
  workflowItems?: WorkflowItem[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onTabChange?: (tab: AppTab) => void;
  onToggleSimulation?: () => void;
  onOpenSyncModal: () => void;
  onOpenCreateSheet: () => void;
  onOpenAddMachine?: () => void;
  onOpenAddMaterial: () => void;
  onOpenStockAdjust: () => void;
  onOpenAlerts: () => void;
  onTriggerManualSync: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  machines = [],
  materials,
  alerts,
  syncConfig,
  isSimulating,
  currentUser,
  activeTab = 'workflow',
  dispatchOrders = [],
  workflowItems = [],
  isSidebarCollapsed,
  onToggleSidebar,
  onTabChange,
  onToggleSimulation,
  onOpenSyncModal,
  onOpenCreateSheet,
  onOpenAddMachine,
  onOpenAddMaterial,
  onOpenStockAdjust,
  onOpenAlerts,
  onTriggerManualSync,
  onSignOut,
  onSwitchAccount
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const lowStockCount = materials.filter(m => m.currentStock <= m.minThreshold).length;
  const readyDispatchCount = dispatchOrders.filter(o => o.status === 'ready_to_dispatch').length;
  const activeAlertsCount = alerts.filter(a => !a.resolved).length;
  const totalStockValue = materials.reduce((acc, m) => acc + (m.currentStock * m.unitCost), 0);
  const activeWorkflowCount = workflowItems ? workflowItems.length : 0;

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email) return email.slice(0, 2).toUpperCase();
    return 'AB';
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'workflow':
        return { title: 'Workflow Management', subtitle: '10 Stages, Piece Matrix & Unit Routing' };
      case 'inventory':
        return { title: 'Inventory & Raw Materials', subtitle: 'Thread, Fabric, Jari & Spare Inventory' };
      case 'dispatch':
        return { title: 'Dispatch & Consignments', subtitle: 'Delivery Challans, Shipments & Unpaid Invoices' };
      case 'finance':
        return { title: 'Finance & Accounts Ledger', subtitle: 'Wages, Electricity, Expenses & Cash Flow' };
      default:
        return { title: 'Factory Operations', subtitle: 'Production & Inventory Control' };
    }
  };

  const tabInfo = getTabTitle();

  return (
    <header id="app-header" className="bg-white text-slate-900 border-b border-slate-200/90 sticky top-0 z-20 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        
        {/* Main Nav Row */}
        <div className="flex items-center justify-between min-h-[72px] py-2 gap-3 flex-wrap md:flex-nowrap">
          
          {/* Left Title / Breadcrumb Context */}
          <div className="flex items-center space-x-3 shrink-0">
            {onToggleSidebar && (
              <button
                type="button"
                onClick={onToggleSidebar}
                className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors"
                title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              >
                <Layers className="h-4 w-4" />
              </button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold tracking-tight text-slate-900 font-mono">
                  {tabInfo.title}
                </h1>
                <span className="text-[10px] text-slate-600 font-mono font-semibold bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                  Live System
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                {tabInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Center Stock Health Indicators (Visible on lg+) */}
          <div className="hidden xl:flex items-center space-x-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0">
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
              <span className="font-bold text-slate-900">{materials.length}</span> SKUs
            </div>
            {lowStockCount > 0 ? (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="font-bold">{lowStockCount}</span> LOW STOCK
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px]">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                <span className="font-semibold">STOCK HEALTHY</span>
              </div>
            )}
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-mono text-[11px]">
              <span className="text-slate-500">VALUATION:</span>
              <span className="text-slate-900 font-bold">₹{totalStockValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {/* Right Action Controls & User Profile */}
          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0 ml-auto">
            
            {/* Google Sheets Live Sync Indicator */}
            <button
              id="btn-open-sync-modal"
              onClick={onOpenSyncModal}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors shadow-2xs"
              title="Google Sheets Auto-Sync & Integration Status"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="hidden sm:block text-left font-mono">
                <div className="text-[11px] font-bold uppercase tracking-tight leading-tight flex items-center space-x-1">
                  <span>AUTO-ENTRY:</span>
                  <span className="text-emerald-700 font-bold">ON</span>
                </div>
              </div>
              <span className={`w-2 h-2 rounded-full ${syncConfig.syncStatus === 'synced' ? 'bg-emerald-500' : 'bg-amber-400'}`}></span>
            </button>

            {/* Quick Action: Create New Sheet */}
            <button
              id="btn-create-new-sheet"
              onClick={onOpenCreateSheet}
              className="hidden lg:flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-xs"
              title="Create a new automated Google Spreadsheet"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-300" />
              <span>New Sheet</span>
            </button>

            {/* Quick Action: Log Consumption / Restock */}
            <button
              id="btn-quick-stock"
              onClick={onOpenStockAdjust}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-colors shadow-2xs"
            >
              <PackagePlus className="h-3.5 w-3.5 text-slate-600" />
              <span className="hidden md:inline">Log Stock</span>
              <span className="md:hidden">Stock</span>
            </button>

            {/* Alerts Bell */}
            <button
              id="btn-open-alerts"
              onClick={onOpenAlerts}
              className="relative p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors shrink-0 shadow-2xs"
              title="Factory Alerts & Logs"
            >
              <Bell className="h-4 w-4" />
              {activeAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                  {activeAlertsCount}
                </span>
              )}
            </button>

            {/* User Account Popover */}
            <div className="relative shrink-0" ref={menuRef}>
              <button
                id="btn-user-profile-menu"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all text-left"
                title="Account & Sheet Access Status"
              >
                {currentUser?.picture ? (
                  <img 
                    src={currentUser.picture} 
                    alt={currentUser.name} 
                    className="h-8 w-8 rounded-full border border-slate-200 object-cover shadow-xs shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 font-mono">
                    {getInitials(currentUser?.name, currentUser?.email)}
                  </div>
                )}
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                    {currentUser?.name || 'Trishil Balar'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium flex items-center space-x-1">
                    <ShieldCheck className="h-2.5 w-2.5 text-emerald-600" />
                    <span>{currentUser?.companyName || 'Trisharth'}</span>
                    <span className="text-slate-400">•</span>
                    <span className="text-slate-600 font-semibold">{currentUser?.role === 'owner' ? 'OWNER' : 'STAFF'}</span>
                  </div>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden lg:block" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-3.5 text-xs text-slate-800 animate-in fade-in zoom-in-95 duration-100">
                  <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
                    {currentUser?.picture ? (
                      <img 
                        src={currentUser.picture} 
                        alt={currentUser.name} 
                        className="h-10 w-10 rounded-full border border-slate-200 object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-slate-900 flex items-center justify-center font-bold text-sm text-white font-mono">
                        {getInitials(currentUser?.name, currentUser?.email)}
                      </div>
                    )}
                    <div className="truncate">
                      <p className="font-bold text-slate-900 text-sm truncate">{currentUser?.name || 'Trishil Balar'}</p>
                      <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser?.email || 'trishilbalar@gmail.com'}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                        {currentUser?.companyName || 'Trisharth'}
                      </span>
                    </div>
                  </div>

                  <div className="py-2.5 border-b border-slate-100 space-y-1.5 text-slate-600 text-xs">
                    <div className="flex justify-between items-center py-0.5">
                      <span>Organization:</span>
                      <span className="text-[11px] text-slate-900 font-mono font-bold">{currentUser?.companyName || 'Trisharth'}</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span>Google Sheet:</span>
                      <span className="text-[11px] text-emerald-700 font-mono font-bold">READY</span>
                    </div>
                    <div className="flex justify-between items-center py-0.5">
                      <span>Sheet ID:</span>
                      <span className="text-[11px] text-slate-500 font-mono">{syncConfig.sheetId ? `${syncConfig.sheetId.slice(0, 8)}...` : 'None'}</span>
                    </div>
                  </div>

                  <div className="pt-2 space-y-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenSyncModal();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors font-medium"
                    >
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <span>Spreadsheet Connection Settings</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenCreateSheet();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors font-medium text-left"
                    >
                      <Sparkles className="h-4 w-4 text-slate-500" />
                      <span>Create New Factory Sheet</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSwitchAccount();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-slate-50 text-slate-700 transition-colors font-medium"
                    >
                      <User className="h-4 w-4 text-slate-500" />
                      <span>Switch Google Account</span>
                    </button>
                    <button
                      id="btn-signout"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl hover:bg-rose-50 text-rose-700 transition-colors font-medium"
                    >
                      <LogOut className="h-4 w-4 text-rose-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
};
