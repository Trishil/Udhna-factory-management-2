import React from 'react';
import { 
  Workflow, 
  Layers, 
  Truck, 
  Wallet, 
  ChevronLeft, 
  ChevronRight, 
  Factory, 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck,
  Package,
  ArrowRightLeft,
  Building2,
  Crown
} from 'lucide-react';
import { AppTab, AuthUser, CompanyWorkspace } from '../types';
import logoImg from '../assets/logo.png';
import { isPlatformSuperAdmin, isPlatformOwnerTrishil } from '../services/googleAuth';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  workflowCount: number;
  lowStockCount: number;
  readyDispatchCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: AuthUser | null;
  activeWorkspace?: CompanyWorkspace;
  onOpenFactorySwitcher?: () => void;
  onOpenSyncModal?: () => void;
  onOpenCreateSheet?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  workflowCount,
  lowStockCount,
  readyDispatchCount,
  isCollapsed,
  onToggleCollapse,
  currentUser,
  activeWorkspace,
  onOpenFactorySwitcher,
  onOpenSyncModal,
  onOpenCreateSheet
}) => {
  const isSuperAdmin = currentUser?.isSuperAdmin || isPlatformSuperAdmin(currentUser?.email);
  const isMasterOwner = isPlatformOwnerTrishil(currentUser?.email);

  const navItems = [
    {
      id: 'workflow' as AppTab,
      label: 'Workflow',
      sublabel: '10 Stages & Piece Matrix',
      icon: Workflow,
      badge: workflowCount > 0 ? workflowCount : null,
      badgeColor: 'bg-slate-100 text-slate-800 border border-slate-200',
      activeColor: 'bg-slate-900 text-white shadow-xs font-bold',
      hoverColor: 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
    },
    {
      id: 'inventory' as AppTab,
      label: 'Inventory & Stock',
      sublabel: 'Threads, Fabrics & Spares',
      icon: Layers,
      badge: lowStockCount > 0 ? `${lowStockCount} LOW` : null,
      badgeColor: 'bg-amber-50 text-amber-900 border border-amber-200 font-bold',
      activeColor: 'bg-slate-900 text-white shadow-xs font-bold',
      hoverColor: 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
    },
    {
      id: 'dispatch' as AppTab,
      label: 'Dispatch & Orders',
      sublabel: 'Challan & Shipments',
      icon: Truck,
      badge: readyDispatchCount > 0 ? readyDispatchCount : null,
      badgeColor: 'bg-slate-100 text-slate-800 border border-slate-200 font-bold',
      activeColor: 'bg-slate-900 text-white shadow-xs font-bold',
      hoverColor: 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
    },
    {
      id: 'finance' as AppTab,
      label: 'Finance & Accounts',
      sublabel: 'Bills, Wages & Payables',
      icon: Wallet,
      badge: null,
      badgeColor: '',
      activeColor: 'bg-slate-900 text-white shadow-xs font-bold',
      hoverColor: 'hover:bg-slate-100/80 text-slate-600 hover:text-slate-900'
    }
  ];

  const hasFinancialAccess = currentUser?.role === 'owner' || currentUser?.financialAccess === true;
  const visibleNavItems = navItems.filter(item => item.id !== 'finance' || hasFinancialAccess);

  return (
    <aside
      id="app-left-sidebar"
      className={`bg-white text-slate-900 border-r border-slate-200/90 hidden md:flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-screen z-30 select-none shadow-[1px_0_4px_rgba(0,0,0,0.02)] ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-[72px] flex items-center justify-between px-4 border-b border-slate-200/90">
          {!isCollapsed ? (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
                <img src={logoImg} alt="Trisharth Textile" className="h-full w-full object-contain" />
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black tracking-tight text-slate-900 font-mono truncate">
                    Trisharth
                  </span>
                  <span className="text-[9px] text-blue-700 font-mono font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    ERP
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                  Textile Management
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center p-1 shadow-xs overflow-hidden">
                <img src={logoImg} alt="Trisharth Textile" className="h-full w-full object-contain" />
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            id="btn-toggle-sidebar"
            type="button"
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ${
              isCollapsed ? 'hidden' : 'block'
            }`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>

        {/* Collapsed expand button on icon rail */}
        {isCollapsed && (
          <div className="pt-2 px-3 flex justify-center">
            <button
              id="btn-expand-sidebar"
              type="button"
              onClick={onToggleCollapse}
              className="p-1.5 w-full flex justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        )}

        {/* Super Admin: Commercial Client Management Console (Trishil Balar Only) */}
        {!isCollapsed && onOpenFactorySwitcher && isMasterOwner && (
          <div className="px-3 pt-3 pb-1">
            <button
              type="button"
              onClick={onOpenFactorySwitcher}
              className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-50/80 hover:bg-amber-100/80 border border-amber-200 hover:border-amber-300 transition-all text-left group cursor-pointer shadow-2xs"
              title="Commercial Client Accounts & Provisioning (Super Admin)"
            >
              <div className="flex items-center space-x-2 truncate">
                <div className="p-1.5 rounded-lg bg-white border border-amber-200 text-amber-600 group-hover:text-amber-700 shrink-0">
                  <Crown className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <span className="block text-[11px] font-black text-amber-900 truncate leading-tight">
                    👑 Platform Admin
                  </span>
                  <span className="block text-[9px] font-mono text-amber-700 font-bold leading-tight truncate">
                    {activeWorkspace?.name || 'Trisharth HQ'} ({activeWorkspace?.code})
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-amber-800 font-black ml-1 shrink-0 bg-amber-200/80 px-1.5 py-0.5 rounded">
                Clients ▾
              </span>
            </button>
          </div>
        )}

        {isCollapsed && onOpenFactorySwitcher && isSuperAdmin && (
          <div className="pt-2 px-3 flex justify-center">
            <button
              type="button"
              onClick={onOpenFactorySwitcher}
              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
              title={`Platform Admin: Inspecting ${activeWorkspace?.name || 'Trisharth'}`}
            >
              <Crown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Regular Commercial Client: Static Private Company Badge (NO Switch Button!) */}
        {!isCollapsed && !isSuperAdmin && (
          <div className="px-3 pt-3 pb-1">
            <div className="w-full flex items-center p-2 rounded-xl bg-slate-50 border border-slate-200 text-left">
              <div className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 shrink-0 mr-2">
                <Building2 className="h-3.5 w-3.5" />
              </div>
              <div className="truncate">
                <span className="block text-[11px] font-black text-slate-900 truncate leading-tight">
                  {activeWorkspace?.name || 'My Factory'}
                </span>
                <span className="block text-[9px] font-mono text-slate-500 font-bold leading-tight">
                  {activeWorkspace?.code || 'PLANT-01'}
                </span>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && !isSuperAdmin && (
          <div className="pt-2 px-3 flex justify-center">
            <div
              className="p-1.5 rounded-lg text-slate-600"
              title={`Factory: ${activeWorkspace?.name || 'My Factory'}`}
            >
              <Building2 className="h-4 w-4" />
            </div>
          </div>
        )}

        {/* Navigation Tabs List */}
        <div className="px-3 py-4 space-y-1.5">
          {!isCollapsed && (
            <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Core Modules
            </div>
          )}

          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                type="button"
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center rounded-xl transition-all relative group ${
                  isCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5 justify-between'
                } ${
                  isActive
                    ? item.activeColor
                    : `${item.hoverColor} bg-transparent`
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center space-x-3 truncate ${isCollapsed ? 'justify-center' : ''}`}>
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-105 ${
                      isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="text-left truncate">
                      <div className="text-xs tracking-tight truncate leading-tight font-bold">
                        {item.label}
                      </div>
                      <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                        {item.sublabel}
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge Counter */}
                {item.badge && !isCollapsed && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full shrink-0 shadow-xs ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor
                  }`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed indicator dot / mini badge */}
                {item.badge && isCollapsed && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-slate-900 ring-2 ring-white" />
                )}
              </button>
            );
          })}
        </div>

      </div>

      {/* Bottom User & Factory Info */}
      <div className="p-3 border-t border-slate-200/90 bg-slate-50/60">
        {!isCollapsed ? (
          <div className="flex items-center space-x-2.5 p-1">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white shadow-xs shrink-0 font-mono">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'TR'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-800 truncate">
                {currentUser?.name || 'Trishil Balar'}
              </div>
              <div className="text-[10px] text-slate-500 font-medium flex items-center truncate mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                <span>{currentUser?.companyName || 'Trisharth'} • {currentUser?.role || 'Owner'}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center py-1">
            <div className="h-8 w-8 rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs text-white shadow-xs font-mono" title={currentUser?.name || 'Trishil Balar'}>
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'TR'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
