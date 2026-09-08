import React from 'react';
import { 
  Workflow, 
  Layers, 
  Truck, 
  Wallet 
} from 'lucide-react';
import { AppTab } from '../../types';

interface MobileBottomNavProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  workflowCount: number;
  lowStockCount: number;
  readyDispatchCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  workflowCount,
  lowStockCount,
  readyDispatchCount
}) => {
  const tabs = [
    {
      id: 'workflow' as AppTab,
      label: 'Workflow',
      icon: Workflow,
      badge: workflowCount > 0 ? workflowCount : null,
      badgeColor: 'bg-slate-900 text-white'
    },
    {
      id: 'inventory' as AppTab,
      label: 'Inventory',
      icon: Layers,
      badge: lowStockCount > 0 ? lowStockCount : null,
      badgeColor: 'bg-amber-500 text-white'
    },
    {
      id: 'dispatch' as AppTab,
      label: 'Dispatch',
      icon: Truck,
      badge: readyDispatchCount > 0 ? readyDispatchCount : null,
      badgeColor: 'bg-emerald-600 text-white'
    },
    {
      id: 'finance' as AppTab,
      label: 'Finance',
      icon: Wallet,
      badge: null,
      badgeColor: ''
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom,0px)]">
      <div className="grid grid-cols-4 h-15 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center py-1 relative transition-all active:scale-95 ${
                isActive ? 'text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 w-8 h-0.5 bg-slate-950 rounded-full" />
              )}

              {/* Icon & Badge Container */}
              <div className="relative">
                <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-slate-100 text-slate-900' : ''}`}>
                  <Icon className="h-5 w-5" />
                </div>

                {tab.badge !== null && (
                  <span className={`absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full text-[9px] font-black font-mono flex items-center justify-center shadow-xs ${tab.badgeColor}`}>
                    {tab.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-black text-slate-900' : 'text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
