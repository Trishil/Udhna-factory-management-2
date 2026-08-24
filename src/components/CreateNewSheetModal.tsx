import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  X, 
  Layers, 
  History, 
  ArrowRight,
  ShieldCheck,
  ClipboardList,
  GitFork,
  DollarSign,
  Zap,
  Users,
  Building2,
  AlertTriangle,
  LogIn,
  Truck,
  Grid3X3,
  Tag
} from 'lucide-react';
import { createAutomatedFactorySpreadsheet } from '../services/googleSheetsApi';
import { requestDirectGoogleOAuth, DEFAULT_SHEET_ID } from '../services/googleAuth';
import { RawMaterial, AuthUser, WorkflowItem, OrderSlip, Machine } from '../types';
import confetti from 'canvas-confetti';

interface CreateNewSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  materials: RawMaterial[];
  machines?: Machine[];
  workflowItems?: WorkflowItem[];
  orderSlips?: OrderSlip[];
  onSpreadsheetCreated: (sheetId: string, sheetUrl: string, title: string) => void;
  onUpdateCurrentUser?: (user: AuthUser) => void;
}

export const CreateNewSheetModal: React.FC<CreateNewSheetModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  materials,
  workflowItems = [],
  orderSlips = [],
  onSpreadsheetCreated,
  onUpdateCurrentUser
}) => {
  if (!isOpen) return null;

  const [title, setTitle] = useState(`Udhna Factory Master & 10-Stage Workflow — ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const [creationMode, setCreationMode] = useState<'google' | 'sandbox'>('google');
  const [isCreating, setIsCreating] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ id: string; url: string; title: string; mode: 'google' | 'sandbox' } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  const executeCreationWithToken = async (targetToken: string, sheetTitle: string) => {
    const result = await createAutomatedFactorySpreadsheet(
      targetToken, 
      sheetTitle, 
      materials, 
      [], 
      workflowItems, 
      orderSlips
    );
    setCreatedResult({
      id: result.spreadsheetId,
      url: result.spreadsheetUrl,
      title: result.title,
      mode: 'google'
    });
    onSpreadsheetCreated(result.spreadsheetId, result.spreadsheetUrl, result.title);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  };

  const createSandboxSheet = (sheetTitle: string) => {
    const validSheetId = DEFAULT_SHEET_ID || '1ZlURNllkyGeQF40UsG4QWNqdqRA1Uxg5MnRqWblDYxw';
    const validUrl = `https://docs.google.com/spreadsheets/d/${validSheetId}/edit`;
    
    setCreatedResult({
      id: validSheetId,
      url: validUrl,
      title: sheetTitle,
      mode: 'sandbox'
    });

    onSpreadsheetCreated(validSheetId, validUrl, sheetTitle);
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMessage(null);
    setIsAuthError(false);

    if (creationMode === 'sandbox') {
      createSandboxSheet(title);
      setIsCreating(false);
      return;
    }

    // 1. Try Direct Google OAuth creation if accessToken exists
    if (currentUser?.accessToken) {
      try {
        await executeCreationWithToken(currentUser.accessToken, title);
        setIsCreating(false);
        return;
      } catch (tokenErr) {
        console.warn('OAuth direct token creation failed, falling back to Apps Script Cloud Backend...', tokenErr);
      }
    }

    // 2. Try Apps Script Cloud Webhook creation (Requires NO OAuth token or popup from browser!)
    try {
      const cloudUrl = `${DEFAULT_APPS_SCRIPT_URL}?action=create_company_sheet&companyName=${encodeURIComponent(title)}&ownerEmail=${encodeURIComponent(currentUser?.email || '')}&companyCode=${encodeURIComponent(currentUser?.companyCode || '')}`;
      const res = await fetch(cloudUrl);
      if (res.ok) {
        const cloudData = await res.json();
        if (cloudData.status === 'success' && cloudData.sheetId) {
          setCreatedResult({
            id: cloudData.sheetId,
            url: cloudData.sheetUrl,
            title: cloudData.title || title,
            mode: 'google'
          });
          onSpreadsheetCreated(cloudData.sheetId, cloudData.sheetUrl, cloudData.title || title);
          confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
          setIsCreating(false);
          return;
        }
      }
    } catch (cloudErr) {
      console.warn('Cloud webhook creation failed, falling back to Google OAuth prompt...', cloudErr);
    }

    // 3. Fallback to Google Sign-In prompt if both fail
    try {
      setIsAuthenticating(true);
      const { accessToken, user } = await requestDirectGoogleOAuth();
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(user);
      }
      setIsAuthenticating(false);
      await executeCreationWithToken(accessToken, title);
    } catch (err: any) {
      console.warn('Sheet creation failed:', err);
      const rawMsg = err.message || '';
      
      if (
        rawMsg.includes('401') || 
        rawMsg.includes('UNAUTHENTICATED') || 
        rawMsg.includes('invalid authentication credentials') ||
        rawMsg.includes('popup_closed') ||
        rawMsg.includes('OAuth')
      ) {
        setIsAuthError(true);
        setErrorMessage('Google Authentication Required: Your Google session is unauthenticated or the access token has expired. You can also use Sandbox Mode to test without Google account permissions.');
      } else {
        setErrorMessage(rawMsg || 'Failed to create Google Spreadsheet. Please verify your Google Account permissions.');
      }
    } finally {
      setIsCreating(false);
      setIsAuthenticating(false);
    }
  };

  const handlePromptGoogleAuthAndRetry = async () => {
    setIsCreating(true);
    setIsAuthenticating(true);
    setErrorMessage(null);
    setIsAuthError(false);

    try {
      const { accessToken, user } = await requestDirectGoogleOAuth();
      if (onUpdateCurrentUser) {
        onUpdateCurrentUser(user);
      }
      setIsAuthenticating(false);
      await executeCreationWithToken(accessToken, title);
    } catch (err: any) {
      setIsAuthError(true);
      setErrorMessage(err.message || 'Google authorization could not be completed. You can create a local Sandbox sheet instead.');
    } finally {
      setIsCreating(false);
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create Workflow Spreadsheet</h3>
              <p className="text-xs text-slate-500">Auto-configured 11 tabs with 10-stage workflow, matrix, and finance</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success View */}
        {createdResult ? (
          <div className="space-y-4 py-2 text-center animate-in fade-in">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            
            <div>
              <h4 className="text-base font-bold text-slate-900">Spreadsheet Successfully Created!</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                {createdResult.mode === 'google' 
                  ? 'Your spreadsheet is live on Google Sheets and synchronized with your 10-stage workflow.' 
                  : 'Your local sandbox spreadsheet has been configured and linked.'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
              <div className="text-slate-500 text-[11px] font-sans font-medium">Sheet Title:</div>
              <div className="font-bold text-slate-800 truncate">{createdResult.title}</div>
              <div className="text-slate-500 text-[11px] font-sans font-medium pt-1">Collaborators Granted Writer Access:</div>
              <div className="text-[10px] text-slate-700 bg-white p-1.5 rounded border border-slate-200">
                • drlaljirpatel@gmail.com<br />
                • trishilbalar@gmail.com
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <a
                href={createdResult.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-colors"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form View */
          <form onSubmit={handleCreate} className="space-y-4 text-xs">
            
            {/* Target Title */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Spreadsheet Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium text-xs"
                placeholder="e.g., Udhna Factory Master & 10-Stage Workflow"
              />
            </div>

            {/* Mode Select */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Creation Destination</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCreationMode('google')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    creationMode === 'google'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Real Google Sheet</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Directly creates in Google Drive and shares with authorized team emails.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setCreationMode('sandbox')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    creationMode === 'sandbox'
                      ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                    <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
                    <span>Sandbox Mode</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                    Simulates sheet creation without requiring Google permissions.
                  </p>
                </button>
              </div>
            </div>

            {/* Collaborator Sharing Notice */}
            <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 text-purple-950 text-[11px] space-y-1">
              <div className="font-bold flex items-center space-x-1.5 text-purple-900">
                <Users className="h-3.5 w-3.5 text-purple-600" />
                <span>Automatic Access & Sharing Configured</span>
              </div>
              <p className="text-purple-800 leading-relaxed">
                Editor access will automatically be granted to <b>drlaljirpatel@gmail.com</b> and <b>trishilbalar@gmail.com</b>.
              </p>
            </div>

            {/* Generated Tabs Overview */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
              <div className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Sparkles className="h-3.5 w-3.5 text-blue-600" />
                <span>11 Dedicated Workflow & Ops Tabs Created</span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <ClipboardList className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">1. Master Order Slips</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <GitFork className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">2. 10-Stage Workflow</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Tag className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">3. Piece Tracking</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Grid3X3 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">4. Fabric & Color Matrix</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Layers className="h-3.5 w-3.5 text-teal-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">5. Live Inventory</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <History className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">6. Stock Transactions</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Truck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">7. Dispatch & Shipments</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">8. Party Invoices</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Building2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">9. Supplier Payables</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80">
                  <Users className="h-3.5 w-3.5 text-violet-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">10. Staff Payroll</span>
                </div>
                <div className="flex items-center space-x-1.5 p-1.5 rounded bg-white border border-slate-200/80 col-span-2">
                  <Zap className="h-3.5 w-3.5 text-red-600 shrink-0" />
                  <span className="font-medium text-slate-700 truncate">11. Expenses & Utilities (INR ₹)</span>
                </div>
              </div>
            </div>

            {/* Error Message & Interactive Fix */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-rose-900">
                      {isAuthError ? 'Google Authentication Required' : 'Creation Notice'}
                    </p>
                    <p className="text-[11px] text-rose-800 mt-0.5 leading-relaxed">
                      {errorMessage}
                    </p>
                  </div>
                </div>

                {isAuthError && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handlePromptGoogleAuthAndRetry}
                      disabled={isAuthenticating || isCreating}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      <span>{isAuthenticating ? 'Authorizing Google...' : 'Sign in with Google & Retry'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        createSandboxSheet(title);
                      }}
                      className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-lg font-semibold text-xs border border-slate-300 transition-colors"
                    >
                      Create Sandbox Sheet
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isCreating || isAuthenticating || !title.trim()}
                className="px-5 py-2.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>
                  {isAuthenticating 
                    ? 'Authorizing Google...' 
                    : isCreating 
                      ? 'Creating Spreadsheet...' 
                      : creationMode === 'google' 
                        ? 'Create & Link Google Sheet' 
                        : 'Create Sandbox Sheet'
                  }
                </span>
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
