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
  ArrowRightLeft
} from 'lucide-react';
import { AppTab, AuthUser } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  workflowCount: number;
  lowStockCount: number;
  readyDispatchCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  currentUser?: AuthUser | null;
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
  onOpenSyncModal,
  onOpenCreateSheet
}) => {
  const navItems = [
    {
      id: 'workflow' as AppTab,
      label: 'Workflow',
      sublabel: '10 Stages & Piece Matrix',
      icon: Workflow,
      badge: workflowCount > 0 ? workflowCount : null,
      badgeColor: 'bg-blue-600 text-white',
      activeColor: 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-extrabold',
      hoverColor: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      accent: 'border-blue-500'
    },
    {
      id: 'inventory' as AppTab,
      label: 'Inventory & Stock',
      sublabel: 'Threads, Fabrics & Spares',
      icon: Layers,
      badge: lowStockCount > 0 ? `${lowStockCount} LOW` : null,
      badgeColor: 'bg-amber-500 text-slate-950 font-bold animate-pulse',
      activeColor: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-extrabold',
      hoverColor: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      accent: 'border-indigo-500'
    },
    {
      id: 'dispatch' as AppTab,
      label: 'Dispatch & Orders',
      sublabel: 'Challan & Shipments',
      icon: Truck,
      badge: readyDispatchCount > 0 ? readyDispatchCount : null,
      badgeColor: 'bg-amber-400 text-slate-900 font-bold',
      activeColor: 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 font-extrabold',
      hoverColor: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      accent: 'border-amber-500'
    },
    {
      id: 'finance' as AppTab,
      label: 'Finance & Accounts',
      sublabel: 'Bills, Wages & Payables',
      icon: Wallet,
      badge: null,
      badgeColor: '',
      activeColor: 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 font-extrabold',
      hoverColor: 'hover:bg-slate-800 text-slate-300 hover:text-white',
      accent: 'border-emerald-500'
    }
  ];

  return (
    <aside
      id="app-left-sidebar"
      className={`bg-slate-900 text-white border-r border-slate-800 flex flex-col justify-between transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-screen z-30 select-none shadow-2xl ${
        isCollapsed ? 'w-18' : 'w-64'
      }`}
    >
      {/* Top Brand Header */}
      <div>
        <div className="h-[72px] flex items-center justify-between px-3.5 border-b border-slate-800/90">
          {!isCollapsed ? (
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md border border-blue-400/30 shrink-0">
                <Workflow className="h-5 w-5" />
              </div>
              <div className="truncate">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black tracking-wider text-white font-mono truncate">
                    TexFlow
                  </span>
                  <span className="text-[9px] text-blue-300 font-mono font-bold bg-blue-950 px-1.5 py-0.2 rounded border border-blue-700/50">
                    v5.0
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 uppercase tracking-tight font-medium truncate">
                  {currentUser?.companyName || 'Trisharth'} ERP
                </p>
              </div>
            </div>
          ) : (
            <div className="mx-auto">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md border border-blue-400/30">
                <Workflow className="h-5 w-5" />
              </div>
            </div>
          )}

          {/* Toggle Button */}
          <button
            id="btn-toggle-sidebar"
            type="button"
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ${
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
              className="p-1.5 w-full flex justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Expand Sidebar"
            >
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        )}

        {/* Navigation Tabs List */}
        <div className="px-2.5 py-4 space-y-1.5">
          {!isCollapsed && (
            <div className="px-2.5 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
              Core Modules
            </div>
          )}

          {navItems.map((item) => {
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
                    : `${item.hoverColor} bg-slate-900/40`
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`flex items-center space-x-3 truncate ${isCollapsed ? 'justify-center' : ''}`}>
                  <Icon
                    className={`h-5 w-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-slate-400'
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="text-left truncate">
                      <div className="text-xs tracking-tight truncate leading-tight font-bold">
                        {item.label}
                      </div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-blue-100 opacity-90' : 'text-slate-400'}`}>
                        {item.sublabel}
                      </div>
                    </div>
                  )}
                </div>

                {/* Badge Counter */}
                {item.badge && !isCollapsed && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full shrink-0 shadow-xs ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                )}

                {/* Collapsed indicator dot / mini badge */}
                {item.badge && isCollapsed && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Quick Utilities Section */}
        {!isCollapsed && (
          <div className="px-3 pt-3 space-y-2 border-t border-slate-800/80 mx-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono px-1">
              Data &amp; Cloud Sync
            </div>

            {onOpenSyncModal && (
              <button
                type="button"
                onClick={onOpenSyncModal}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition-colors border border-slate-700/50"
              >
                <div className="flex items-center space-x-2">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px]">Google Sheets Sync</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </button>
            )}

            {onOpenCreateSheet && (
              <button
                type="button"
                onClick={onOpenCreateSheet}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold transition-colors border border-emerald-800/40"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[11px]">+ New Auto Sheet</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom User & Factory Info */}
      <div className="p-3 border-t border-slate-800/90 bg-slate-950/60">
        {!isCollapsed ? (
          <div className="flex items-center space-x-2.5">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-inner shrink-0">
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AB'}
            </div>
            <div className="truncate flex-1">
              <div className="text-xs font-bold text-slate-200 truncate">
                {currentUser?.name || 'Atharva Balar'}
              </div>
              <div className="text-[10px] text-emerald-400 font-mono font-semibold uppercase flex items-center truncate">
                <CheckCircle2 className="h-2.5 w-2.5 mr-1 shrink-0 text-emerald-400" />
                <span>Production Online</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-bold text-xs text-white shadow-inner" title={currentUser?.name || 'Atharva Balar'}>
              {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'AB'}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
