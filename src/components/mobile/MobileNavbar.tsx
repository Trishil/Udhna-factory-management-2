import React, { useState, useRef, useEffect } from 'react';
import { 
  Workflow, 
  Bell, 
  Monitor, 
  Smartphone, 
  FileSpreadsheet, 
  User, 
  LogOut, 
  ArrowRightLeft,
  ChevronDown,
  Sparkles
} from 'lucide-react';
import { AuthUser } from '../../types';
import { ViewMode } from '../../hooks/useResponsiveView';

interface MobileNavbarProps {
  currentUser: AuthUser | null;
  activeAlertsCount: number;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
  onOpenAlerts: () => void;
  onExportExcel?: () => void;
  onSignOut: () => void;
  onSwitchAccount: () => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
  currentUser,
  activeAlertsCount,
  viewMode,
  onSetViewMode,
  onOpenAlerts,
  onExportExcel,
  onSignOut,
  onSwitchAccount
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isViewSwitcherOpen, setIsViewSwitcherOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const viewSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (viewSwitcherRef.current && !viewSwitcherRef.current.contains(e.target as Node)) {
        setIsViewSwitcherOpen(false);
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
    return 'TF';
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 shadow-xs">
      <div className="flex items-center justify-between">
        
        {/* Brand & Cloud Status */}
        <div className="flex items-center space-x-2 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs shrink-0">
            <Workflow className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="font-mono font-black text-xs text-slate-900 tracking-tight truncate">
                TextileFlow
              </span>
              <div 
                className="flex items-center space-x-1 px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[9px] font-bold font-mono text-emerald-800 shrink-0"
                title="Cloud DB Live"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>LIVE</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 truncate font-semibold">
              {currentUser?.companyName || 'Trisharth'} ERP
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          
          {/* Excel Export */}
          {onExportExcel && (
            <button
              type="button"
              onClick={onExportExcel}
              className="p-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </button>
          )}

          {/* View Switcher (Mobile / Desktop) */}
          <div className="relative" ref={viewSwitcherRef}>
            <button
              type="button"
              onClick={() => setIsViewSwitcherOpen(!isViewSwitcherOpen)}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
              title="Switch Layout Mode"
            >
              {viewMode === 'desktop' ? (
                <Monitor className="h-3.5 w-3.5 text-blue-600" />
              ) : (
                <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
              )}
              <span className="capitalize">{viewMode === 'auto' ? 'Auto' : viewMode}</span>
              <ChevronDown className="h-3 w-3 text-slate-400" />
            </button>

            {isViewSwitcherOpen && (
              <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Layout View
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSetViewMode('mobile');
                    setIsViewSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center space-x-2 transition-colors ${
                    viewMode === 'mobile' ? 'bg-emerald-50 text-emerald-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Mobile View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetViewMode('desktop');
                    setIsViewSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center space-x-2 transition-colors ${
                    viewMode === 'desktop' ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Monitor className="h-3.5 w-3.5 text-blue-600" />
                  <span>Desktop View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetViewMode('auto');
                    setIsViewSwitcherOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 flex items-center space-x-2 transition-colors ${
                    viewMode === 'auto' ? 'bg-slate-100 text-slate-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Auto (Device)</span>
                </button>
              </div>
            )}
          </div>

          {/* Alerts Bell */}
          <button
            type="button"
            onClick={onOpenAlerts}
            className="relative p-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
            title="Alerts"
          >
            <Bell className="h-4 w-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[8px] font-bold text-white">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* User Profile Avatar */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center rounded-lg p-0.5 focus:outline-none"
            >
              {currentUser?.picture ? (
                <img 
                  src={currentUser.picture} 
                  alt={currentUser.name} 
                  className="h-7 w-7 rounded-lg object-cover border border-slate-300"
                />
              ) : (
                <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center text-[10px] font-black font-mono shadow-xs">
                  {getInitials(currentUser?.name, currentUser?.email)}
                </div>
              )}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="font-bold text-slate-900 truncate">{currentUser?.name || 'Factory Admin'}</p>
                  <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
                  <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 text-slate-700 capitalize">
                    {currentUser?.role || 'Manager'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSwitchAccount();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-slate-50 text-slate-700 transition-colors"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 text-slate-400" />
                    <span>Switch Account</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-rose-50 text-rose-700 transition-colors font-semibold"
                  >
                    <LogOut className="h-3.5 w-3.5 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
