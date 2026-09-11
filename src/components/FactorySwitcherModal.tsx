import React, { useState } from 'react';
import { 
  Building2, 
  Plus, 
  Check, 
  X, 
  User, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  Factory,
  Crown,
  ExternalLink,
  Lock
} from 'lucide-react';
import { CompanyWorkspace, AuthUser } from '../types';
import { DEFAULT_APPS_SCRIPT_URL, DEFAULT_SHEET_ID, isPlatformSuperAdmin } from '../services/googleAuth';

interface FactorySwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeWorkspace: CompanyWorkspace;
  onSwitchWorkspace: (workspace: CompanyWorkspace) => void;
  factories: CompanyWorkspace[];
  onAddFactory: (newFactory: CompanyWorkspace) => Promise<void>;
  currentUser?: AuthUser | null;
}

export const FactorySwitcherModal: React.FC<FactorySwitcherModalProps> = ({
  isOpen,
  onClose,
  activeWorkspace,
  onSwitchWorkspace,
  factories,
  onAddFactory,
  currentUser
}) => {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sheetId, setSheetId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = currentUser?.isSuperAdmin || isPlatformSuperAdmin(currentUser?.email);

  // STRICT PRIVACY GUARD: Only platform super admins can ever view or open this console
  if (!isOpen || !isSuperAdmin) return null;

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanName = name.trim();
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9\-]/g, '');

    if (!cleanName) {
      setError('Please enter a factory or company name.');
      return;
    }

    if (!cleanCode || cleanCode.length < 3) {
      setError('Company Code must be at least 3 characters (e.g. APEX-01).');
      return;
    }

    if (!ownerEmail.trim()) {
      setError('Client Owner Email is required for commercial licensing.');
      return;
    }

    // Check code collision
    const existing = factories.find(f => f.code.toUpperCase() === cleanCode);
    if (existing) {
      setError(`A company with code "${cleanCode}" already exists (${existing.name}). Please use a unique code.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const newWs: CompanyWorkspace = {
        id: `company_${cleanCode.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        name: cleanName,
        code: cleanCode,
        sheetId: sheetId.trim() || DEFAULT_SHEET_ID,
        scriptUrl: DEFAULT_APPS_SCRIPT_URL,
        isPrimary: false,
        ownerEmail: ownerEmail.trim().toLowerCase(),
        ownerName: ownerName.trim() || 'Factory Owner',
        createdAt: new Date().toISOString(),
        planStatus: 'active',
        membersCount: 1,
        description: location.trim() ? `${cleanName} — ${location.trim()}` : `Commercial industrial workspace for ${cleanName}`
      };

      await onAddFactory(newWs);
      onSwitchWorkspace(newWs);
      setIsAddingNew(false);
      setName('');
      setCode('');
      setLocation('');
      setOwnerName('');
      setOwnerEmail('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to provision commercial client factory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        
        {/* Header: Platform Super Admin Console */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl border border-amber-200">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900">Commercial Client Accounts</h3>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                  Platform Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Provision new client factories and access tenant workspaces for customer support.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-4 space-y-4 flex-1 pr-1">
          
          {/* Active Factory Indicator */}
          <div className="p-3.5 bg-gradient-to-r from-slate-50 to-blue-50/50 rounded-xl border border-slate-200">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider block mb-1">
              Currently Inspecting Workspace
            </span>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-xs font-mono">
                  {activeWorkspace.code.slice(0, 4)}
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900">{activeWorkspace.name}</h4>
                  <div className="flex items-center space-x-2 text-xs text-slate-600 mt-0.5">
                    <span className="font-mono font-bold text-blue-800 bg-blue-100 px-1.5 py-0.2 rounded text-[10px]">
                      {activeWorkspace.code}
                    </span>
                    {activeWorkspace.isPrimary ? (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                        Flagship Plant
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded">
                        Commercial Tenant
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <span className="flex items-center space-x-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Active</span>
              </span>
            </div>
          </div>

          {/* Toggle Provision New Factory Form */}
          {!isAddingNew ? (
            <button
              onClick={() => setIsAddingNew(true)}
              className="w-full flex items-center justify-center space-x-2 p-3.5 bg-blue-50 hover:bg-blue-100/70 border border-blue-200 hover:border-blue-300 rounded-xl text-blue-700 font-bold text-xs transition-all cursor-pointer shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>+ Provision New Commercial Client Factory</span>
            </button>
          ) : (
            <div className="p-4 bg-slate-50 rounded-xl border border-blue-200 animate-in fade-in space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center space-x-1.5 text-slate-900 font-bold text-xs">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>Provision New Commercial Factory</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Client Factory / Company Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!code) {
                        const autoCode = e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + '-01';
                        setCode(autoCode);
                      }
                    }}
                    placeholder="e.g. Apex Silk Mills"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Company Code *</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX-01"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold uppercase"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Assigned to client staff for login</span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Location / City</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Sachin GIDC, Surat"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Owner Full Name</label>
                    <input
                      type="text"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Vikram Shah"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Client Owner Email *</label>
                    <input
                      type="email"
                      required
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      placeholder="owner@apexsilkmills.com"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Google Spreadsheet ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={sheetId}
                    onChange={(e) => setSheetId(e.target.value)}
                    placeholder="Leave blank to use default cloud workspace"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono text-[11px]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    A dedicated isolated Firestore database (factory_{cleanCode || 'code'}_*) is provisioned automatically.
                  </span>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingNew(false)}
                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-600 rounded-lg font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? 'Provisioning...' : 'Provision Client Factory'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* All Registered Commercial Clients */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Registered Factory Tenants ({factories.length})
              </span>
              <span className="text-[10px] text-slate-400">
                Visible only to Platform Super Admins
              </span>
            </div>

            {factories.map((f) => {
              const isActive = f.code.toUpperCase() === activeWorkspace.code.toUpperCase();
              return (
                <div
                  key={f.code || f.id}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-blue-50/50 border-blue-300 shadow-2xs'
                      : 'bg-white hover:bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                      isActive ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {f.code.slice(0, 3)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-slate-900 text-xs truncate">{f.name}</span>
                        {f.isPrimary ? (
                          <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded shrink-0">
                            Flagship
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded shrink-0">
                            Client Tenant
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-500 font-mono mt-0.5">
                        <span className="font-bold text-slate-700">{f.code}</span>
                        {f.ownerEmail && (
                          <span className="truncate max-w-[180px] text-slate-400">· {f.ownerEmail}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 ml-2">
                    {isActive ? (
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-xs font-bold flex items-center space-x-1">
                        <Check className="h-3 w-3" />
                        <span>Inspecting</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          onSwitchWorkspace(f);
                          onClose();
                        }}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        title="Enter this client workspace for customer support"
                      >
                        Enter Workspace
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between shrink-0">
          <span className="flex items-center space-x-1">
            <Lock className="h-3.5 w-3.5 text-slate-400" />
            <span>Clients have strict zero-visibility of other factories.</span>
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 text-slate-600 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
