import React, { useState } from 'react';
import { 
  Workflow, 
  Building2, 
  User, 
  ArrowRight, 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  Users,
  Search,
  CheckCircle2,
  Lock,
  KeyRound
} from 'lucide-react';
import { AuthUser, CompanyWorkspace } from '../types';
import { 
  requestGoogleSignIn, 
  authenticateWithGoogle,
  findWorkspaceByEmail,
  createPresetSession, 
  TRISHARTH_TEAM_MEMBERS,
  TRISHARTH_WORKSPACE,
  lookupCompanyByCode,
  registerNewCompany,
  registerEmployeeAccount,
  getRememberedCompanyCode,
  setRememberedCompanyCode,
  getEffectiveOAuthClientId,
  setCustomOAuthClientId,
  OAUTH_CLIENT_ID,
  FIREBASE_OAUTH_CLIENT_ID
} from '../services/googleAuth';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, sheetId: string) => void;
  initialSheetId: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess
}) => {
  // Main view: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Sign up sub-view: 'choose' | 'register_company' | 'join_company'
  const [signupType, setSignupType] = useState<'choose' | 'register_company' | 'join_company'>('choose');

  // Login form state
  const [companyCode, setCompanyCode] = useState(() => getRememberedCompanyCode());
  const [loginEmail, setLoginEmail] = useState('');
  const [quickStaffSearch, setQuickStaffSearch] = useState('');
  const [showStaffQuickList, setShowStaffQuickList] = useState(false);

  // Register company form state
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanyCode, setRegCompanyCode] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerEmail, setRegOwnerEmail] = useState('');
  const [regSheetId, setRegSheetId] = useState('');

  // Join company form state
  const [joinCompanyCode, setJoinCompanyCode] = useState(() => getRememberedCompanyCode());
  const [joinEmployeeName, setJoinEmployeeName] = useState('');
  const [joinEmployeeEmail, setJoinEmployeeEmail] = useState('');
  const [joinJobRole, setJoinJobRole] = useState('Floor Lead');

  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Log In
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) {
      setErrorMessage('Please enter your Company Code.');
      return;
    }

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your Email or Name before signing in.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep('Verifying Company Code with Google Sheet Backend...');

    try {
      const workspace = await lookupCompanyByCode(companyCode);
      if (!workspace) {
        setErrorMessage(`Company Code "${companyCode.trim().toUpperCase()}" is not registered. Please check with your factory owner or register a new company under Sign Up.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      setRememberedCompanyCode(workspace.code);
      setAuthStep(`Connecting to ${workspace.name}...`);

      const email = loginEmail.trim();
      const { user, sheetResult } = createPresetSession(email, workspace.sheetId, workspace);

      if (user.sheetAccessGranted) {
        setAuthStep('Access verified! Launching workspace...');
        setTimeout(() => {
          onLoginSuccess(user, workspace.sheetId);
        }, 350);
      } else {
        setErrorMessage(sheetResult.errorMessage || 'Access Denied.');
        setIsLoading(false);
        setAuthStep('');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Login error occurred.');
      setIsLoading(false);
      setAuthStep('');
    }
  };

  // Handle 1-Click Team Member Quick Login for Trisharth
  const handleQuickStaffSelect = async (memberEmail: string) => {
    setLoginEmail(memberEmail);
    setShowStaffQuickList(false);
    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep(`Signing in as ${memberEmail}...`);

    try {
      const workspace = await lookupCompanyByCode(companyCode) || TRISHARTH_WORKSPACE;
      setRememberedCompanyCode(workspace.code);
      const { user } = createPresetSession(memberEmail, workspace.sheetId, workspace);
      onLoginSuccess(user, workspace.sheetId);
    } catch {
      setIsLoading(false);
    }
  };

  // Handle Google OAuth Sign In (Smart Routing: Existing -> Dashboard, New -> Sign Up)
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAuthStep('Opening Google Sign-In...');

    try {
      const profile = await authenticateWithGoogle();
      setAuthStep(`Google verified (${profile.email}). Checking company registry...`);

      // 1. Check if user typed a company code OR has an existing company registered with this email
      let workspace: CompanyWorkspace | null = null;
      if (companyCode.trim()) {
        workspace = await lookupCompanyByCode(companyCode.trim());
      }
      if (!workspace) {
        workspace = findWorkspaceByEmail(profile.email);
      }

      if (workspace) {
        // Existing Workspace found! Automatically log in
        setRememberedCompanyCode(workspace.code);
        const isKnownOwner = profile.email.toLowerCase().includes('atharvabalar') || 
                             profile.email.toLowerCase().includes('atharva') ||
                             profile.email.toLowerCase().includes('trishil') ||
                             profile.email.toLowerCase() === workspace.ownerEmail?.toLowerCase();

        const authUser: AuthUser = {
          id: profile.uid || `g_${Date.now()}`,
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          role: isKnownOwner ? 'owner' : 'editor',
          companyId: workspace.id,
          companyName: workspace.name,
          companyCode: workspace.code,
          sheetAccessGranted: true,
          sheetTitle: `${workspace.name} Operations Sheet`,
          authMethod: 'google_oauth',
          loginTimestamp: new Date().toISOString()
        };

        setAuthStep(`Welcome back, ${profile.name}! Launching ${workspace.name}...`);
        setTimeout(() => {
          onLoginSuccess(authUser, workspace.sheetId);
        }, 350);
      } else {
        // First-time User: Redirect to Sign Up to choose Register Company or Join Company
        setRegOwnerName(profile.name);
        setRegOwnerEmail(profile.email);
        setJoinEmployeeName(profile.name);
        setJoinEmployeeEmail(profile.email);
        
        setAuthMode('signup');
        setSignupType('choose');
        setSuccessMessage(`Google account verified (${profile.email})! Please choose whether to register a new company or join an existing one.`);
        setIsLoading(false);
        setAuthStep('');
      }
    } catch (err: any) {
      if (!err?.message?.includes('closed')) {
        setErrorMessage(err?.message || 'Google Sign-In failed.');
      }
      setIsLoading(false);
      setAuthStep('');
    }
  };

  // Handle Register New Company (Owner Sign-Up)
  const handleRegisterCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regCompanyName.trim() || !regOwnerEmail.trim()) {
      setErrorMessage('Please enter Company Name and Owner Email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep(`Registering company ${regCompanyName} to Google Sheet Backend...`);

    try {
      const { workspace, user } = await registerNewCompany(
        regCompanyName,
        regCompanyCode,
        regOwnerName,
        regOwnerEmail,
        regSheetId
      );

      setCompanyCode(workspace.code);
      setRememberedCompanyCode(workspace.code);
      setSuccessMessage(`Company "${workspace.name}" created! Your Company Code is: ${workspace.code}`);
      
      setTimeout(() => {
        onLoginSuccess(user, workspace.sheetId);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to register company.');
      setIsLoading(false);
      setAuthStep('');
    }
  };

  // Handle Join Existing Company (Employee Sign-Up)
  const handleJoinCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCompanyCode.trim() || !joinEmployeeName.trim()) {
      setErrorMessage('Please enter your Company Code and Full Name.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep(`Validating company code ${joinCompanyCode} with Google Sheet Backend...`);

    try {
      const result = await registerEmployeeAccount(
        joinCompanyCode,
        joinEmployeeName,
        joinEmployeeEmail,
        joinJobRole
      );

      if ('error' in result) {
        setErrorMessage(result.error);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      setCompanyCode(result.workspace.code);
      setRememberedCompanyCode(result.workspace.code);
      setSuccessMessage(`Welcome to ${result.workspace.name}! Entering workspace...`);
      
      setTimeout(() => {
        onLoginSuccess(result.user, result.workspace.sheetId);
      }, 500);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to join company.');
      setIsLoading(false);
      setAuthStep('');
    }
  };

  const isTrisharthCode = companyCode.trim().toUpperCase() === 'TRISHARTH-HQ' || companyCode.trim().toUpperCase() === 'TRISHARTH';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col justify-between font-sans selection:bg-blue-600 selection:text-white">
      
      {/* Background dot pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none" 
        style={{ backgroundImage: 'radial-gradient(#0f172a 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      />

      {/* Top Navbar */}
      <header className="relative z-10 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Workflow className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 font-mono">
                TextileFlow
              </span>
              <span className="ml-2 text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                Industrial Textile ERP
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-medium">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Secure Cloud Access</span>
          </div>
        </div>
      </header>

      {/* Main Centered Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="max-w-md w-full">
          
          {/* Pure White Card */}
          <div className="bg-white border border-slate-200/90 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] rounded-3xl p-7 sm:p-9">
            
            {/* Header / Title */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {authMode === 'login' ? 'Sign In to TextileFlow' : 'Get Started with TextileFlow'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === 'login' 
                  ? 'Enter your company code and credentials to access your workspace' 
                  : 'Register a new factory or join with a company code'}
              </p>
            </div>

            {/* Segmented Switcher: Log In | Sign Up */}
            <div className="flex p-1 bg-slate-100/80 rounded-xl mb-6 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                  authMode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setSignupType('choose');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                  authMode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Alert / Error Messages */}
            {errorMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start space-x-2 animate-in fade-in">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Loading Banner */}
            {isLoading && (
              <div className="mb-5 p-4 rounded-xl bg-blue-50 border border-blue-200 text-center animate-pulse">
                <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-blue-800">{authStep}</p>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 1: LOG IN (NO PUBLIC DROPDOWNS — CODE BASED) */}
            {/* ========================================================================= */}
            {authMode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                
                {/* Company Code Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Company Code
                  </label>
                  <div className="relative">
                    <Building2 className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      placeholder="e.g. TRISHARTH-HQ"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs font-mono font-bold uppercase text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 tracking-wide"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Enter your unique company ID assigned to your factory.
                  </p>
                </div>

                {/* Email / User Identifier Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-700">
                      Email or Name
                    </label>
                    {isTrisharthCode && (
                      <button
                        type="button"
                        onClick={() => setShowStaffQuickList(!showStaffQuickList)}
                        className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center space-x-1"
                      >
                        <Users className="h-3 w-3" />
                        <span>{showStaffQuickList ? 'Type Email' : '1-Click Team Roles'}</span>
                      </button>
                    )}
                  </div>

                  {!showStaffQuickList ? (
                    <div className="relative">
                      <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="e.g. atharvabalar6@gmail.com"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  ) : (
                    /* Trisharth Staff Quick Picker */
                    <div className="border border-slate-200 rounded-xl p-2 bg-slate-50 space-y-1.5 max-h-48 overflow-y-auto">
                      <div className="relative mb-1">
                        <Search className="h-3 w-3 absolute left-2.5 top-2.5 text-slate-400" />
                        <input
                          type="text"
                          value={quickStaffSearch}
                          onChange={(e) => setQuickStaffSearch(e.target.value)}
                          placeholder="Search role..."
                          className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] text-slate-800 focus:outline-none"
                        />
                      </div>
                      {TRISHARTH_TEAM_MEMBERS
                        .filter(m => m.name.toLowerCase().includes(quickStaffSearch.toLowerCase()) || m.jobTitle.toLowerCase().includes(quickStaffSearch.toLowerCase()))
                        .map(m => (
                          <button
                            key={m.email}
                            type="button"
                            onClick={() => handleQuickStaffSelect(m.email)}
                            className="w-full text-left p-2 rounded-lg bg-white hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-xs flex items-center justify-between group transition-colors"
                          >
                            <div className="truncate">
                              <span className="font-bold text-slate-900 group-hover:text-blue-700 block truncate">{m.name}</span>
                              <span className="text-[10px] text-slate-500 block truncate">{m.jobTitle}</span>
                            </div>
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono shrink-0 ml-2">
                              {m.badge}
                            </span>
                          </button>
                        ))
                      }
                    </div>
                  )}
                </div>

                {/* Sign In Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Divider */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400">
                    or continue with
                  </span>
                </div>

                {/* Google Sign In Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150 flex items-center justify-center space-x-2.5"
                >
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google Account</span>
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: SIGN UP — CHOICE OF PATH */}
            {/* ========================================================================= */}
            {authMode === 'signup' && signupType === 'choose' && (
              <div className="space-y-3.5">
                <p className="text-xs text-slate-600 mb-2 text-center">
                  How would you like to set up your TextileFlow access?
                </p>

                {/* Option A: Register New Company */}
                <button
                  type="button"
                  onClick={() => setSignupType('register_company')}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-blue-600 bg-slate-50/50 hover:bg-blue-50/30 text-left transition-all duration-150 group"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          Register a New Company
                        </h4>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        I am a factory owner setting up a private TextileFlow workspace with my own Google Sheet &amp; company code.
                      </p>
                    </div>
                  </div>
                </button>

                {/* Option B: Join Existing Company as Employee */}
                <button
                  type="button"
                  onClick={() => setSignupType('join_company')}
                  className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-indigo-600 bg-slate-50/50 hover:bg-indigo-50/30 text-left transition-all duration-150 group"
                >
                  <div className="flex items-start space-x-3.5">
                    <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                          Join Existing Company
                        </h4>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        I am an employee joining my company's team using the company code provided by my factory owner.
                      </p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2A: REGISTER NEW COMPANY FORM */}
            {/* ========================================================================= */}
            {authMode === 'signup' && signupType === 'register_company' && (
              <form onSubmit={handleRegisterCompanySubmit} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => setSignupType('choose')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-2 font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Options</span>
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company / Factory Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={regCompanyName}
                    onChange={(e) => setRegCompanyName(e.target.value)}
                    placeholder="e.g. Apex Textile Mills"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Company Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={regCompanyCode}
                      onChange={(e) => setRegCompanyCode(e.target.value.toUpperCase())}
                      placeholder="e.g. APEX-01"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Owner Name
                    </label>
                    <input
                      type="text"
                      value={regOwnerName}
                      onChange={(e) => setRegOwnerName(e.target.value)}
                      placeholder="e.g. Rajesh Shah"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Owner Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={regOwnerEmail}
                    onChange={(e) => setRegOwnerEmail(e.target.value)}
                    placeholder="e.g. owner@apextextiles.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Google Sheet ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={regSheetId}
                    onChange={(e) => setRegSheetId(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 mt-2"
                >
                  <Building2 className="h-4 w-4" />
                  <span>Register Company &amp; Launch</span>
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2B: JOIN EXISTING COMPANY (EMPLOYEE SIGN-UP) */}
            {/* ========================================================================= */}
            {authMode === 'signup' && signupType === 'join_company' && (
              <form onSubmit={handleJoinCompanySubmit} className="space-y-3.5">
                <button
                  type="button"
                  onClick={() => setSignupType('choose')}
                  className="text-xs text-slate-500 hover:text-slate-800 flex items-center space-x-1 mb-2 font-medium"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <span>Back to Options</span>
                </button>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={joinCompanyCode}
                    onChange={(e) => setJoinCompanyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. TRISHARTH-HQ"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold uppercase text-blue-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ask your factory owner for your company's secret code.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={joinEmployeeName}
                    onChange={(e) => setJoinEmployeeName(e.target.value)}
                    placeholder="e.g. Ramesh Patel"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Email (Optional)
                  </label>
                  <input
                    type="email"
                    value={joinEmployeeEmail}
                    onChange={(e) => setJoinEmployeeEmail(e.target.value)}
                    placeholder="e.g. ramesh@company.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Factory Role
                  </label>
                  <select
                    value={joinJobRole}
                    onChange={(e) => setJoinJobRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Floor Supervisor">Floor Supervisor</option>
                    <option value="Embroidery Master">Embroidery Master</option>
                    <option value="QC Inspector">QC Inspector</option>
                    <option value="Dhaga Cutting">Dhaga Cutting Lead</option>
                    <option value="Pressing & Packing">Pressing &amp; Packing</option>
                    <option value="Dispatch Officer">Dispatch Officer</option>
                    <option value="Inventory Manager">Inventory &amp; Stores</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 mt-2"
                >
                  <User className="h-4 w-4" />
                  <span>Join Company Workspace</span>
                </button>
              </form>
            )}

          </div>

          {/* Footer Note */}
          <div className="mt-6 text-center text-xs text-slate-500">
            <span>Powered by <strong>TextileFlow</strong> • Private Industrial Cloud</span>
          </div>

          {/* OAuth Diagnostics & Client ID Manager (Expandable) */}
          <div className="mt-4 p-3 bg-white/80 rounded-xl border border-slate-200 text-slate-700 text-xs">
            <details className="cursor-pointer">
              <summary className="font-bold text-slate-700 select-none flex items-center justify-between text-[11px]">
                <span className="flex items-center space-x-1.5 text-blue-600">
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>Google OAuth Diagnostics &amp; Client ID Manager</span>
                </span>
                <span className="text-[10px] text-slate-500">Configure</span>
              </summary>
              
              <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5 text-[11px]">
                <div>
                  <span className="text-slate-500 block font-semibold">Current Browser Origin (Whitelist in Google Cloud):</span>
                  <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[10px] font-mono select-all block mt-0.5 break-all">
                    {typeof window !== 'undefined' ? window.location.origin : 'https://textileflow.ai.studio'}
                  </code>
                </div>

                <div>
                  <span className="text-slate-500 block font-semibold">Active OAuth Client ID:</span>
                  <code className="bg-slate-100 text-slate-800 px-2 py-1 rounded text-[10px] font-mono select-all block mt-0.5 break-all">
                    {getEffectiveOAuthClientId()}
                  </code>
                </div>

                <div className="pt-1">
                  <span className="text-slate-600 font-semibold block mb-1">Active Client ID:</span>
                  <div className="p-2 rounded-lg border border-emerald-500 bg-emerald-50 text-emerald-900 text-[10px] font-mono">
                    <span className="block font-bold text-emerald-800">✓ Google Cloud Project (735454245560)</span>
                    <span className="text-[9px] text-emerald-700 truncate block mt-0.5">735454245560-jorlpsur6poq88o942h0330n98mcs8o0.apps.googleusercontent.com</span>
                  </div>
                </div>
              </div>
            </details>
          </div>

        </div>
      </main>

      {/* Global Bottom Bar */}
      <footer className="relative z-10 py-3 text-center text-slate-500 text-[11px] border-t border-slate-200 bg-white/60">
        <div className="max-w-5xl mx-auto px-4 flex items-center justify-between text-[11px]">
          <span>© 2026 TextileFlow Industrial Cloud</span>
          <div className="flex items-center space-x-3 text-slate-600">
            <span className="flex items-center space-x-1 text-emerald-600 font-medium">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Multi-Tenant Data Isolated</span>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};
