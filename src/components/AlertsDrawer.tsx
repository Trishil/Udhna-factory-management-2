import React from 'react';
import { X, AlertTriangle, Info, AlertCircle, CheckCircle2, PackagePlus, ArrowRight } from 'lucide-react';
import { FactoryAlert, RawMaterial } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: FactoryAlert[];
  materials: RawMaterial[];
  onResolveAlert: (id: string) => void;
  onOpenQuickRestock: (material: RawMaterial) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  materials,
  onResolveAlert,
  onOpenQuickRestock
}) => {
  if (!isOpen) return null;

  const activeAlerts = alerts.filter(a => !a.resolved);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Factory Alerts & Warnings</h3>
              <p className="text-[11px] text-slate-500">{activeAlerts.length} Active System Notices</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Alerts List */}
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {activeAlerts.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-slate-700">All Systems Operational</p>
              <p className="text-[11px] mt-1">No active low-stock or machinery warning alerts.</p>
            </div>
          ) : (
            activeAlerts.map(alert => {
              const matchedMat = alert.sourceType === 'material' && alert.sourceId 
                ? materials.find(m => m.id === alert.sourceId)
                : null;

              return (
                <div 
                  key={alert.id}
                  className={`p-3.5 rounded-xl border text-xs space-y-2 ${
                    alert.type === 'critical'
                      ? 'bg-rose-50 border-rose-200'
                      : alert.type === 'warning'
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-1.5">
                      {alert.type === 'warning' ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                      ) : alert.type === 'critical' ? (
                        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                      ) : (
                        <Info className="h-4 w-4 text-blue-600 shrink-0" />
                      )}
                      <span className="font-bold text-slate-900">{alert.title}</span>
                    </div>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-[11px]">{alert.message}</p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="text-[10px] text-slate-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>

                    <div className="flex items-center space-x-1.5">
                      {matchedMat && (
                        <button
                          id={`btn-alert-restock-${matchedMat.id}`}
                          onClick={() => {
                            onClose();
                            onOpenQuickRestock(matchedMat);
                          }}
                          className="flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] transition-colors"
                        >
                          <PackagePlus className="h-3 w-3" />
                          <span>Restock SKU</span>
                        </button>
                      )}

                      <button
                        id={`btn-alert-dismiss-${alert.id}`}
                        onClick={() => onResolveAlert(alert.id)}
                        className="px-2.5 py-1 rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-[10px] transition-colors"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
};
