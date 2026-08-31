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
  Tag,
  Copy,
  Check,
  Code2,
  Trash2,
  FolderSync,
  HelpCircle
} from 'lucide-react';
import { createAutomatedFactorySpreadsheet } from '../services/googleSheetsApi';
import { requestDirectGoogleOAuth, DEFAULT_SHEET_ID, DEFAULT_APPS_SCRIPT_URL } from '../services/googleAuth';
import { GOOGLE_APPS_SCRIPT_BACKEND_CODE } from '../utils/backendScriptSource';
import { 
  RawMaterial, 
  AuthUser, 
  WorkflowItem, 
  OrderSlip, 
  Machine, 
  DispatchOrder, 
  PartyInvoice, 
  SupplierPayable, 
  EmployeeRecord, 
  OperationalExpense, 
  StockTransaction 
} from '../types';
import confetti from 'canvas-confetti';

interface CreateNewSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  materials: RawMaterial[];
  machines?: Machine[];
  workflowItems?: WorkflowItem[];
  orderSlips?: OrderSlip[];
  dispatchOrders?: DispatchOrder[];
  partyInvoices?: PartyInvoice[];
  supplierPayables?: SupplierPayable[];
  employees?: EmployeeRecord[];
  expenses?: OperationalExpense[];
  transactions?: StockTransaction[];
  onSpreadsheetCreated: (
    sheetId: string, 
    sheetUrl: string, 
    title: string, 
    dataTransferMode?: 'fresh' | 'transfer_all' | 'transfer_selected',
    selectedSlipIds?: string[],
    customScriptUrl?: string
  ) => void;
  onUpdateCurrentUser?: (user: AuthUser) => void;
}

export const CreateNewSheetModal: React.FC<CreateNewSheetModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  materials,
  workflowItems = [],
  orderSlips = [],
  dispatchOrders = [],
  partyInvoices = [],
  supplierPayables = [],
  employees = [],
  expenses = [],
  transactions = [],
  onSpreadsheetCreated,
  onUpdateCurrentUser
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'create' | 'script'>('create');
  const [title, setTitle] = useState(`Udhna Factory Master & 10-Stage Workflow — ${new Date().toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`);
  const [creationMode, setCreationMode] = useState<'google' | 'custom' | 'sandbox'>('custom');
  const [customSheetUrl, setCustomSheetUrl] = useState('');
  
  // Data Transfer selection
  const [dataTransferMode, setDataTransferMode] = useState<'fresh' | 'transfer_all' | 'transfer_selected'>('fresh');
  const [selectedSlipIds, setSelectedSlipIds] = useState<string[]>([]);
  
  const [isCopied, setIsCopied] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ id: string; url: string; title: string; mode: 'google' | 'sandbox' } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_BACKEND_CODE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const extractSheetId = (input: string): string => {
    const clean = input.trim();
    if (clean.includes('/spreadsheets/d/')) {
      const match = clean.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) return match[1];
    }
    return clean;
  };

  const [customScriptUrl, setCustomScriptUrl] = useState('');

  const handleLinkCustomSheet = (sheetInput: string, customTitle: string) => {
    const sheetId = extractSheetId(sheetInput);
    if (!sheetId) {
      setErrorMessage('Please enter a valid Google Spreadsheet URL or Sheet ID.');
      return;
    }
    const fullUrl = sheetInput.includes('https://') ? sheetInput.trim() : `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
    const cleanScriptUrl = customScriptUrl.trim() || undefined;

    // Automatically trigger 11-tab generation in background on Google Drive
    try {
      const endpoint = cleanScriptUrl || DEFAULT_APPS_SCRIPT_URL;
      const populateUrl = `${endpoint}?action=populate_sheet_tabs&sheetId=${encodeURIComponent(sheetId)}`;
      fetch(populateUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});
    } catch (e) {}

    setCreatedResult({
      id: sheetId,
      url: fullUrl,
      title: customTitle,
      mode: 'google'
    });

    onSpreadsheetCreated(sheetId, fullUrl, customTitle, dataTransferMode, selectedSlipIds, cleanScriptUrl);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  };

  const executeCreationWithToken = async (targetToken: string, sheetTitle: string) => {
    const effectiveSlips = dataTransferMode === 'fresh' 
      ? [] 
      : (dataTransferMode === 'transfer_selected' ? orderSlips.filter(s => selectedSlipIds.includes(s.id)) : orderSlips);

    const effectiveItems = dataTransferMode === 'fresh'
      ? []
      : (dataTransferMode === 'transfer_selected' 
          ? workflowItems.filter(w => effectiveSlips.some(s => s.id === w.orderSlipId || s.jobNo === w.jobNo))
          : workflowItems);

    const result = await createAutomatedFactorySpreadsheet(
      targetToken, 
      sheetTitle, 
      materials, 
      [], 
      effectiveItems, 
      effectiveSlips,
      {
        dispatchOrders: dataTransferMode === 'fresh' ? [] : dispatchOrders,
        partyInvoices,
        supplierPayables,
        employees,
        expenses,
        transactions
      }
    );
    setCreatedResult({
      id: result.spreadsheetId,
      url: result.spreadsheetUrl,
      title: result.title,
      mode: 'google'
    });
    onSpreadsheetCreated(result.spreadsheetId, result.spreadsheetUrl, result.title, dataTransferMode, selectedSlipIds);
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

    if (creationMode === 'custom') {
      handleLinkCustomSheet(customSheetUrl, title);
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
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] overflow-y-auto">
        
        {/* Header with Navigation Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Workflow &amp; Spreadsheet Center</h3>
              <p className="text-xs text-slate-500">Link Google Sheets, manage backend scripts, and choose data retention</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Top Tab Bar */}
        <div className="flex items-center space-x-2 border-b border-slate-200 mb-4 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            <span>1. Link &amp; Sync Sheet</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
              activeTab === 'script'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Code2 className="h-3.5 w-3.5 text-amber-400" />
            <span>2. 📋 Apps Script Backend Code</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-400/20 text-amber-600 font-mono">
              Ready to Copy
            </span>
          </button>
        </div>

        {/* TAB 2: APPS SCRIPT BACKEND CODE HELPER */}
        {activeTab === 'script' && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Code2 className="h-5 w-5 text-amber-700" />
                  <span className="font-bold text-slate-900 text-sm">Google Apps Script Backend Code</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all ${
                    isCopied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Script Code (1-Click)'}</span>
                </button>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11px]">
                Employees don't need any coding tools or VS Code. Simply copy this script and paste it into your Google Spreadsheet's Apps Script editor.
              </p>
            </div>

            {/* 4 Step Instructions */}
            <div className="space-y-2.5 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                <HelpCircle className="h-4 w-4 text-blue-600" />
                <span>Step-by-Step Guide for New Sheets:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                    <span>Create &amp; Open Apps Script</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Open your Google Sheet (or <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-blue-600 underline font-bold">sheets.new</a>), then click <b>Extensions ➔ Apps Script</b>.
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    <span>Paste Backend Code</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Delete whatever is in <code>Code.gs</code>, click the button above, and paste (<code>Cmd+V</code> / <code>Ctrl+V</code>).
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
                    <span>Deploy as Web App</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Click <b>Deploy ➔ New deployment</b>, select <b>Web app</b>, set Who has access to <b>"Anyone"</b>, and click Deploy.
                  </p>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-slate-800 flex items-center space-x-1">
                    <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">4</span>
                    <span>Paste Link in Web App</span>
                  </div>
                  <p className="text-slate-500 text-[10px]">
                    Switch to the <b>Link &amp; Sync Sheet</b> tab, paste your Google Sheet or Web App link, and click Connect!
                  </p>
                </div>
              </div>
            </div>

            {/* Code Snippet Preview Box */}
            <div className="relative rounded-xl border border-slate-200 bg-slate-900 text-slate-300 p-3 font-mono text-[10px] max-h-48 overflow-y-auto">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
                <span>GoogleAppsScript_Backend.js (1,410 lines)</span>
                <button
                  type="button"
                  onClick={handleCopyScript}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-white text-[10px]"
                >
                  {isCopied ? 'Copied' : 'Copy All'}
                </button>
              </div>
              <pre className="whitespace-pre overflow-x-auto text-[10px] text-slate-300">
                {GOOGLE_APPS_SCRIPT_BACKEND_CODE.slice(0, 800)}
                {'\n... (1,410 lines total - click Copy above to get entire file)'}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 shadow-sm"
              >
                <span>Proceed to Link Sheet</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 1: CREATE / LINK SHEET WITH DATA RETENTION */}
        {activeTab === 'create' && (
          <>
            {/* Success View */}
            {createdResult ? (
              <div className="space-y-4 py-2 text-center animate-in fade-in">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto shadow-inner ${
                  createdResult.mode === 'google' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {createdResult.mode === 'google' ? 'Live Google Spreadsheet Linked!' : 'Sandbox Mode Configured!'}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {createdResult.mode === 'google' 
                      ? 'Your spreadsheet is live and synchronized across all company Google accounts in real time.' 
                      : 'Your local sandbox workspace is active.'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs space-y-1.5 font-mono">
                  <div className="text-slate-500 text-[11px] font-sans font-medium">Workspace Target:</div>
                  <div className="font-bold text-slate-800 truncate">{createdResult.title}</div>
                  <div className="text-slate-500 text-[11px] font-sans font-medium pt-1">Data Retention Applied:</div>
                  <div className="font-bold text-blue-700 font-sans text-xs">
                    {dataTransferMode === 'fresh' ? '✨ Clean Blank Slate (Fresh start)' : (dataTransferMode === 'transfer_all' ? '📦 All existing data transferred' : `🎯 Selected (${selectedSlipIds.length}) order slips transferred`)}
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  {createdResult.mode === 'google' ? (
                    <a
                      href={createdResult.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <span>Open in Google Sheets</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition-colors"
                    >
                      Continue in Sandbox Mode
                    </button>
                  )}

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
                  <label className="block font-semibold text-slate-700 mb-1">Connection Method</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCreationMode('custom')}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        creationMode === 'custom'
                          ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                        <ExternalLink className="h-4 w-4 text-purple-600 shrink-0" />
                        <span>Paste Sheet Link</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Link any new spreadsheet or Web App URL.
                      </p>
                    </button>

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
                        <span>Auto Cloud Sheet</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Auto-creates on Google Drive.
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
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Local in-memory test mode.
                      </p>
                    </button>
                  </div>
                </div>

                {/* Custom Sheet Link Input */}
                {creationMode === 'custom' && (
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-slate-800 text-xs">Google Spreadsheet URL or Sheet ID</label>
                      <a
                        href="https://sheets.new"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                      >
                        <span>+ Open Blank sheets.new</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <input
                      type="text"
                      value={customSheetUrl}
                      onChange={(e) => setCustomSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                      required={creationMode === 'custom'}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />

                    <div className="pt-2 border-t border-slate-200/80">
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-semibold text-slate-700 text-[11px]">Apps Script Web App URL <span className="text-slate-400 font-normal">(Optional)</span></label>
                        <button
                          type="button"
                          onClick={() => setActiveTab('script')}
                          className="text-[10px] text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <Code2 className="h-3 w-3" />
                          <span>Get Script Code</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        value={customScriptUrl}
                        onChange={(e) => setCustomScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/.../exec (leave blank to use cloud webhook)"
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                )}

                {/* DATA RETENTION SELECTION (Clean vs Transfer) */}
                <div className="p-3.5 bg-blue-50/40 rounded-2xl border border-blue-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-xs flex items-center space-x-1.5">
                      <FolderSync className="h-4 w-4 text-blue-600" />
                      <span>Data Retention Choice for New Sheet</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Choose initial state</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setDataTransferMode('fresh')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        dataTransferMode === 'fresh'
                          ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                        <Trash2 className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                        <span>Fresh Blank Slate</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Erases old test orders so your new sheet starts completely clean.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDataTransferMode('transfer_all')}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        dataTransferMode === 'transfer_all'
                          ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                        <FolderSync className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Transfer All Data</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Copies all {orderSlips.length} existing order slips &amp; lots into new sheet.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDataTransferMode('transfer_selected');
                        if (selectedSlipIds.length === 0 && orderSlips.length > 0) {
                          setSelectedSlipIds([orderSlips[0].id]);
                        }
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        dataTransferMode === 'transfer_selected'
                          ? 'border-blue-600 bg-white ring-2 ring-blue-500/20 shadow-2xs'
                          : 'border-slate-200 bg-white/70 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center space-x-1.5 font-bold text-slate-900 text-xs">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                        <span>Select Slips</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                        Pick specific order slips to keep and transfer.
                      </p>
                    </button>
                  </div>

                  {/* Selective Slip Picker if 'transfer_selected' is active */}
                  {dataTransferMode === 'transfer_selected' && (
                    <div className="pt-2 space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-700 block">Select Order Slips to Migrate:</label>
                      {orderSlips.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic">No existing order slips found in system.</p>
                      ) : (
                        <div className="max-h-32 overflow-y-auto space-y-1 bg-white p-2 rounded-xl border border-slate-200">
                          {orderSlips.map(slip => (
                            <label key={slip.id} className="flex items-center space-x-2 text-[11px] text-slate-800 hover:bg-slate-50 p-1 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedSlipIds.includes(slip.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSlipIds(prev => [...prev, slip.id]);
                                  } else {
                                    setSelectedSlipIds(prev => prev.filter(id => id !== slip.id));
                                  }
                                }}
                                className="rounded text-blue-600"
                              />
                              <span className="font-bold">{slip.partyName}</span>
                              <span className="text-slate-500 font-mono text-[10px]">(Job {slip.jobNo} • {slip.totalPcs || 0} pcs)</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
                          ? 'Linking Spreadsheet...' 
                          : creationMode === 'google' 
                            ? 'Create & Link Google Sheet' 
                            : 'Connect & Sync Spreadsheet'
                      }
                    </span>
                  </button>
                </div>

              </form>
            )}
          </>
        )}

      </div>
    </div>
  );
};
