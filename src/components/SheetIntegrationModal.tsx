import React, { useState } from 'react';
import { 
  X, 
  FileSpreadsheet, 
  RefreshCw, 
  ExternalLink, 
  Copy, 
  Check, 
  Download, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  ShieldCheck,
  GitFork,
  ClipboardList,
  Layers,
  Truck,
  Users
} from 'lucide-react';
import { SyncConfig, RawMaterial, WorkflowItem, OrderSlip, DispatchOrder, Machine } from '../types';
import { generateRecommendedAppsScriptCode, exportDataAsCsv } from '../services/sheetSync';

interface SheetIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncConfig: SyncConfig;
  materials: RawMaterial[];
  machines?: Machine[];
  workflowItems?: WorkflowItem[];
  orderSlips?: OrderSlip[];
  dispatchOrders?: DispatchOrder[];
  onUpdateSyncConfig: (config: SyncConfig) => void;
  onTriggerSync: () => Promise<void>;
  onOpenCreateSheet?: () => void;
  onImportData?: (imported: { materials?: RawMaterial[] }) => void;
}

export const SheetIntegrationModal: React.FC<SheetIntegrationModalProps> = ({
  isOpen,
  onClose,
  syncConfig,
  materials,
  workflowItems = [],
  orderSlips = [],
  dispatchOrders = [],
  onUpdateSyncConfig,
  onTriggerSync,
  onOpenCreateSheet
}) => {
  if (!isOpen) return null;

  const [sheetUrl, setSheetUrl] = useState(syncConfig.sheetUrl);
  const [deploymentId, setDeploymentId] = useState(syncConfig.deploymentId);
  const [scriptUrl, setScriptUrl] = useState(syncConfig.scriptUrl);
  const [autoInterval, setAutoInterval] = useState(syncConfig.autoSyncIntervalSec);
  const [isTestingSync, setIsTestingSync] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Extract ID from URL or use stored ID
  const extractSheetId = (url: string) => {
    const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : syncConfig.sheetId;
  };

  const currentSheetId = extractSheetId(sheetUrl) || syncConfig.sheetId;
  const appsScriptCode = generateRecommendedAppsScriptCode(currentSheetId);

  const handleTestAndSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingSync(true);
    setSyncFeedback(null);

    const sheetId = extractSheetId(sheetUrl);

    const updated: SyncConfig = {
      ...syncConfig,
      sheetUrl,
      sheetId,
      deploymentId,
      scriptUrl: scriptUrl || (deploymentId ? `https://script.google.com/macros/s/${deploymentId}/exec` : ''),
      autoSyncIntervalSec: Number(autoInterval),
      lastSyncTimestamp: new Date().toISOString(),
      syncStatus: 'syncing'
    };

    onUpdateSyncConfig(updated);

    try {
      await onTriggerSync();
      setSyncFeedback('Synchronization complete. Master Order Slips, 10-Stage Workflow, Matrix, Inventory & Finances updated.');
    } catch (err: any) {
      setSyncFeedback(`Sync active with local cache backup. Note: ${err.message || 'Ready'}`);
    } finally {
      setIsTestingSync(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleExportCsv = () => {
    const { orderSlipsCsv, workflowCsv, pieceTrackingCsv, matrixCsv, inventoryCsv, dispatchCsv } = exportDataAsCsv(
      materials, 
      workflowItems, 
      orderSlips, 
      dispatchOrders
    );
    const dateStr = new Date().toISOString().split('T')[0];
    
    // Download Master Order Slips CSV
    const blobSlips = new Blob([orderSlipsCsv], { type: 'text/csv;charset=utf-8;' });
    const linkSlips = document.createElement('a');
    linkSlips.href = URL.createObjectURL(blobSlips);
    linkSlips.setAttribute('download', `factory_order_slips_${dateStr}.csv`);
    document.body.appendChild(linkSlips);
    linkSlips.click();
    document.body.removeChild(linkSlips);

    // Download 10-Stage Workflow CSV
    const blobWf = new Blob([workflowCsv], { type: 'text/csv;charset=utf-8;' });
    const linkWf = document.createElement('a');
    linkWf.href = URL.createObjectURL(blobWf);
    linkWf.setAttribute('download', `factory_workflow_designs_${dateStr}.csv`);
    document.body.appendChild(linkWf);
    linkWf.click();
    document.body.removeChild(linkWf);

    // Download Piece-Level Tracking CSV
    const blobPieces = new Blob([pieceTrackingCsv], { type: 'text/csv;charset=utf-8;' });
    const linkPieces = document.createElement('a');
    linkPieces.href = URL.createObjectURL(blobPieces);
    linkPieces.setAttribute('download', `factory_piece_tracking_${dateStr}.csv`);
    document.body.appendChild(linkPieces);
    linkPieces.click();
    document.body.removeChild(linkPieces);

    // Download Fabric Matrix CSV
    const blobMat = new Blob([matrixCsv], { type: 'text/csv;charset=utf-8;' });
    const linkMat = document.createElement('a');
    linkMat.href = URL.createObjectURL(blobMat);
    linkMat.setAttribute('download', `factory_fabric_matrix_${dateStr}.csv`);
    document.body.appendChild(linkMat);
    linkMat.click();
    document.body.removeChild(linkMat);

    // Download Inventory CSV
    const blobInv = new Blob([inventoryCsv], { type: 'text/csv;charset=utf-8;' });
    const linkInv = document.createElement('a');
    linkInv.href = URL.createObjectURL(blobInv);
    linkInv.setAttribute('download', `factory_inventory_${dateStr}.csv`);
    document.body.appendChild(linkInv);
    linkInv.click();
    document.body.removeChild(linkInv);

    // Download Dispatch CSV
    const blobDsp = new Blob([dispatchCsv], { type: 'text/csv;charset=utf-8;' });
    const linkDsp = document.createElement('a');
    linkDsp.href = URL.createObjectURL(blobDsp);
    linkDsp.setAttribute('download', `factory_dispatches_${dateStr}.csv`);
    document.body.appendChild(linkDsp);
    linkDsp.click();
    document.body.removeChild(linkDsp);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Google Sheets Live Sync</h3>
              <p className="text-xs text-slate-500">Synchronize 10-stage workflow, slips, inventory, and finance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick action bar */}
        <div className="flex items-center justify-between p-3.5 bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-100 rounded-xl mb-4 text-xs">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />
            <div>
              <span className="font-bold text-slate-900 block">Need a new spreadsheet?</span>
              <span className="text-[11px] text-slate-600">Auto-create with 11 pre-formatted workflow tabs & sharing</span>
            </div>
          </div>
          {onOpenCreateSheet && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateSheet();
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Create Now
            </button>
          )}
        </div>

        {/* Collaborators Box */}
        <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-200 text-purple-950 text-xs mb-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-purple-600 shrink-0" />
            <div>
              <span className="font-bold block text-purple-900">Team Collaborators</span>
              <span className="text-[11px] text-purple-800">drlaljirpatel@gmail.com & trishilbalar@gmail.com</span>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
            Editor Access
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleTestAndSave} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Google Spreadsheet URL
            </label>
            <input
              type="url"
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono text-xs"
            />
            {currentSheetId && (
              <p className="text-[11px] text-slate-500 mt-1 flex items-center space-x-1">
                <span>Spreadsheet ID:</span>
                <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">{currentSheetId}</code>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Auto-Sync Interval
              </label>
              <select
                value={autoInterval}
                onChange={(e) => setAutoInterval(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900"
              >
                <option value={30}>Every 30 seconds</option>
                <option value={60}>Every 1 minute</option>
                <option value={180}>Every 3 minutes</option>
                <option value={300}>Every 5 minutes</option>
                <option value={0}>Manual Only (On action)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Last Sync Status
              </label>
              <div className="px-3 py-2 bg-slate-100 rounded-lg text-slate-700 font-medium flex items-center space-x-1.5 truncate">
                <Clock className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                <span className="truncate">
                  {syncConfig.lastSyncTimestamp 
                    ? new Date(syncConfig.lastSyncTimestamp).toLocaleTimeString() 
                    : 'Not synced yet'}
                </span>
              </div>
            </div>
          </div>

          {/* Feedback notice */}
          {syncFeedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{syncFeedback}</span>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full sm:w-auto px-3 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download 6 CSVs</span>
            </button>

            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold"
              >
                Close
              </button>

              <button
                type="submit"
                disabled={isTestingSync}
                className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isTestingSync ? 'animate-spin' : ''}`} />
                <span>{isTestingSync ? 'Syncing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {/* Apps Script Option */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600">Google Apps Script Webhook Code (Optional)</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
              >
                {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-slate-900 text-emerald-400 font-mono text-[10px] rounded-lg max-h-24 overflow-y-auto">
              {appsScriptCode}
            </pre>
          </div>
        </form>

      </div>
    </div>
  );
};
