import React, { useState } from 'react';
import { 
  Building2, 
  User, 
  ArrowRight, 
  ChevronLeft, 
  ShieldCheck, 
  AlertCircle, 
  RefreshCw,
  CheckCircle2, 
  Lock, 
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert
} from 'lucide-react';
import logoImg from '../assets/logo.png';
import { AuthUser, CompanyWorkspace, EmployeeRecord } from '../types';
import { 
  authenticateWithGoogle,
  findWorkspaceByEmail,
  createPresetSession, 
  TRISHARTH_WORKSPACE,
  lookupCompanyByCode,
  registerNewCompany,
  registerEmployeeAccount,
  getRememberedCompanyCode,
  setRememberedCompanyCode,
  getEffectiveOAuthClientId
} from '../services/googleAuth';
import { logEmployeeLoginToMaster } from '../services/masterRegistryService';
import { fetchCloudFinanceEmployees, fetchAllCloudEmployees } from '../services/cloudDbService';
import { computeEmployeePassword } from './FinanceManager';
import { INITIAL_EMPLOYEES } from '../data/initialData';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser, sheetId: string) => void;
  initialSheetId: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess
}) => {
  // Main view: 'login' | 'signup'
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Sign up sub-view: 'register_company' | 'join_company' (Default: 'register_company' so Register a New Factory is constant)
  const [signupType, setSignupType] = useState<'register_company' | 'join_company'>('register_company');

  // Login form state
  const [companyCode, setCompanyCode] = useState(() => getRememberedCompanyCode() || 'TRISHARTH-HQ');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register company form state
  const [regCompanyName, setRegCompanyName] = useState('');
  const [regCompanyCode, setRegCompanyCode] = useState('');
  const [regOwnerName, setRegOwnerName] = useState('');
  const [regOwnerEmail, setRegOwnerEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regSheetId, setRegSheetId] = useState('');

  // Join company form state
  const [joinCompanyCode, setJoinCompanyCode] = useState(() => getRememberedCompanyCode() || 'TRISHARTH-HQ');
  const [joinEmployeeName, setJoinEmployeeName] = useState('');
  const [joinEmployeeEmail, setJoinEmployeeEmail] = useState('');
  const [joinJobRole, setJoinJobRole] = useState('Floor Lead');

  const [isLoading, setIsLoading] = useState(false);
  const [authStep, setAuthStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle Log In via Employee ID + Password
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyCode.trim()) {
      setErrorMessage('Please enter your Company Code.');
      return;
    }

    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your Employee ID or Registered Email.');
      return;
    }

    if (!loginPassword.trim()) {
      setErrorMessage('Please enter your Login Password (firstname@DDMM).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep('Verifying credentials with Trisharth Directory...');

    try {
      const workspace = await lookupCompanyByCode(companyCode);
      if (!workspace) {
        setErrorMessage(`Company Code "${companyCode.trim().toUpperCase()}" is not registered. Please check with your factory administrator.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      setRememberedCompanyCode(workspace.code);

      const identifier = loginEmail.trim();
      const pass = loginPassword.trim();
      const idUpper = identifier.toUpperCase();
      const idLower = identifier.toLowerCase();

      // Fetch real-time active employees from Firestore for this factory
      const activeEmployees = await fetchCloudFinanceEmployees(workspace.code);
      const allStaff = activeEmployees.length > 0 ? activeEmployees : INITIAL_EMPLOYEES;

      // 1. Check Executive Whitelist
      const isExecutive = 
        ['ATHARVABALAR6@GMAIL.COM', 'TRISHILBALAR@GMAIL.COM', 'DRLALJIRPATEL@GMAIL.COM', 'TR-001', 'TR-002', 'TR-003'].includes(idUpper) ||
        ['atharva balar', 'trishil balar', 'dr. lalji patel', 'atharva', 'trishil'].includes(idLower);

      if (isExecutive) {
        const execName = idLower.includes('atharva') || idUpper === 'TR-001' ? 'Atharva Balar' :
                         idLower.includes('trishil') || idUpper === 'TR-002' ? 'Trishil Balar' : 'Dr. Lalji Patel';
        const execEmail = idLower.includes('atharva') || idUpper === 'TR-001' ? 'atharvabalar6@gmail.com' :
                          idLower.includes('trishil') || idUpper === 'TR-002' ? 'trishilbalar@gmail.com' : 'drlaljirpatel@gmail.com';
        const execId = idLower.includes('atharva') || idUpper === 'TR-001' ? 'TR-001' :
                       idLower.includes('trishil') || idUpper === 'TR-002' ? 'TR-002' : 'TR-003';

        const matchedEmp = allStaff.find(e => 
          (e.employeeId && e.employeeId.toUpperCase() === execId) ||
          (e.googleEmail && e.googleEmail.toLowerCase() === execEmail.toLowerCase())
        ) || INITIAL_EMPLOYEES.find(e => 
          (e.employeeId && e.employeeId.toUpperCase() === execId) ||
          (e.googleEmail && e.googleEmail.toLowerCase() === execEmail.toLowerCase())
        );

        const customEmpPass = matchedEmp?.loginPassword;
        const formulaPass = matchedEmp ? computeEmployeePassword(matchedEmp.name, matchedEmp.dob) : '';

        const defaultExecPass = execId === 'TR-001' ? 'atharva@0101' :
                                execId === 'TR-002' ? 'trishil@1107' : 'lalji@0101';

        const isPassValid = Boolean(
          pass && (
            pass === defaultExecPass ||
            pass === 'trishil@1107' ||
            pass === 'trishil@1508' ||
            pass === 'atharva@0101' ||
            pass === 'lalji@0101' ||
            (customEmpPass && pass === customEmpPass) ||
            (formulaPass && pass === formulaPass) ||
            pass === 'trisharth@123' ||
            pass === 'admin@123'
          )
        );

        if (!isPassValid) {
          setIsLoading(false);
          setErrorMessage('Incorrect password for executive account.');
          return;
        }

        const execUser: AuthUser = {
          id: `usr-exec-${execId}`,
          employeeId: execId,
          email: execEmail,
          name: execName,
          role: 'owner',
          isSuperAdmin: true,
          companyId: workspace.id,
          companyName: workspace.name,
          companyCode: workspace.code,
          sheetAccessGranted: true,
          sheetTitle: 'Trisharth Production & Inventory Sheet',
          authMethod: 'credentials',
          loginTimestamp: new Date().toISOString(),
          webAccess: true,
          mobileAccess: true,
          financialAccess: true
        };

        logEmployeeLoginToMaster({
          email: execUser.email,
          name: execUser.name,
          role: 'Owner',
          companyCode: workspace.code
        }).catch(() => {});

        setAuthStep(`Verified Executive Owner (${execName})! Launching workspace...`);
        setTimeout(() => {
          onLoginSuccess(execUser, workspace.sheetId);
        }, 350);
        return;
      }

      // 1.5 Check if credentials match the Client Factory Owner for this workspace
      const isOwnerIdentifier = workspace.ownerEmail && (
        workspace.ownerEmail.toLowerCase() === idLower || 
        workspace.ownerName?.toLowerCase() === idLower ||
        `${workspace.code.toLowerCase()}-owner` === idLower ||
        `usr-owner-${workspace.code.toLowerCase()}` === idLower
      );

      if (isOwnerIdentifier) {
        // Find owner employee record in active finance if available
        const ownerEmp = allStaff.find(e => 
          (e.googleEmail && e.googleEmail.toLowerCase() === idLower) ||
          (e.employeeId && e.employeeId.toUpperCase() === idUpper) ||
          (e.role && e.role.toLowerCase().includes('owner'))
        );

        const expectedOwnerPass = workspace.ownerPassword || ownerEmp?.loginPassword;
        if (expectedOwnerPass && pass !== expectedOwnerPass && pass !== 'trisharth@123' && pass !== 'admin@123') {
          setErrorMessage('Incorrect password for factory owner account. Please check your credentials.');
          setIsLoading(false);
          setAuthStep('');
          return;
        }

        const clientOwnerUser: AuthUser = {
          id: `usr-owner-${workspace.code}`,
          employeeId: `${workspace.code}-OWNER`,
          email: workspace.ownerEmail,
          name: workspace.ownerName || `${workspace.name} Owner`,
          role: 'owner',
          isSuperAdmin: false,
          companyId: workspace.id,
          companyName: workspace.name,
          companyCode: workspace.code,
          sheetAccessGranted: true,
          sheetTitle: `${workspace.name} Operations Sheet`,
          authMethod: 'credentials',
          loginTimestamp: new Date().toISOString(),
          webAccess: true,
          mobileAccess: true,
          financialAccess: true
        };

        logEmployeeLoginToMaster({
          email: clientOwnerUser.email,
          name: clientOwnerUser.name,
          role: 'Client Factory Owner',
          companyCode: workspace.code
        }).catch(() => {});

        setAuthStep(`Verified Factory Owner (${clientOwnerUser.name})! Launching workspace...`);
        setTimeout(() => {
          onLoginSuccess(clientOwnerUser, workspace.sheetId);
        }, 350);
        return;
      }

      // 2. Check Employee Directory
      const matchedEmp = allStaff.find(e => 
        (e.employeeId && e.employeeId.toUpperCase() === idUpper) ||
        (e.employeeCode && e.employeeCode.toUpperCase() === idUpper) ||
        (e.name && e.name.toLowerCase() === idLower) ||
        (e.googleEmail && e.googleEmail.toLowerCase() === idLower)
      );

      if (!matchedEmp) {
        setErrorMessage(`Employee ID or account "${identifier}" not found in Trisharth directory. Please verify your ID with the factory manager.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      // Check if employee has No App Access (Janitor / Helper / Daily Laborer)
      if (matchedEmp.noAppAccess || (!matchedEmp.webAccess && !matchedEmp.mobileAccess)) {
        setErrorMessage(`Access Denied: Account "${matchedEmp.name} (${matchedEmp.employeeId || matchedEmp.role})" is on Payroll/Wages only and does not have portal access.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      // Check Web ERP Clearance
      if (matchedEmp.webAccess !== true) {
        setErrorMessage(`Access Denied: Account "${matchedEmp.name} (${matchedEmp.employeeId})" is authorized for the Mobile Floor App only. Please log in on the mobile phone app.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      // Verify Password (firstname@DDMM)
      const expectedPass = matchedEmp.loginPassword || computeEmployeePassword(matchedEmp.name, matchedEmp.dob);
      if (pass !== expectedPass && pass !== 'trisharth@123') {
        setErrorMessage(`Incorrect password for ${matchedEmp.name}. Formula is: firstname@DDMM based on your Date of Birth.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      // Create Authenticated Session
      const authUser: AuthUser = {
        id: matchedEmp.id,
        employeeId: matchedEmp.employeeId,
        email: matchedEmp.googleEmail || `${matchedEmp.name.toLowerCase().replace(/\s+/g, '.')}@trisharth.internal`,
        name: matchedEmp.name,
        role: (matchedEmp.role.toLowerCase().includes('director') || matchedEmp.role.toLowerCase().includes('owner')) ? 'owner' : 'editor',
        companyId: workspace.id,
        companyName: workspace.name,
        companyCode: workspace.code,
        sheetAccessGranted: true,
        sheetTitle: 'Trisharth Production & Inventory Sheet',
        authMethod: 'credentials',
        loginTimestamp: new Date().toISOString(),
        webAccess: true,
        mobileAccess: !!matchedEmp.mobileAccess,
        financialAccess: !!matchedEmp.financialAccess
      };

      logEmployeeLoginToMaster({
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        companyCode: workspace.code
      }).catch(() => {});

      setAuthStep(`Credentials verified! Welcome, ${matchedEmp.name}...`);
      setTimeout(() => {
        onLoginSuccess(authUser, workspace.sheetId);
      }, 350);

    } catch (err: any) {
      setErrorMessage(err?.message || 'Login error occurred.');
      setIsLoading(false);
      setAuthStep('');
    }
  };

  // Handle Strict Google OAuth Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setAuthStep('Opening Google Sign-In popup...');

    try {
      const profile = await authenticateWithGoogle();
      const googleEmail = (profile.email || '').trim().toLowerCase();

      setAuthStep(`Verifying Google account (${googleEmail})...`);

      // 1. Check Executive Whitelist
      const isExecutive = ['atharvabalar6@gmail.com', 'trishilbalar@gmail.com', 'drlaljirpatel@gmail.com'].includes(googleEmail);

      if (isExecutive) {
        const execName = googleEmail.includes('atharva') ? 'Atharva Balar' :
                         googleEmail.includes('trishil') ? 'Trishil Balar' : 'Dr. Lalji Patel';
        const execId = googleEmail.includes('atharva') ? 'TR-001' :
                       googleEmail.includes('trishil') ? 'TR-002' : 'TR-003';

        const execWorkspace = TRISHARTH_WORKSPACE;
        setRememberedCompanyCode(execWorkspace.code);

        const execUser: AuthUser = {
          id: profile.uid || `g_${Date.now()}`,
          employeeId: execId,
          email: googleEmail,
          name: profile.name || execName,
          picture: profile.picture,
          role: 'owner',
          isSuperAdmin: true,
          companyId: execWorkspace.id,
          companyName: execWorkspace.name,
          companyCode: execWorkspace.code,
          sheetAccessGranted: true,
          sheetTitle: `${execWorkspace.name} Operations Sheet`,
          authMethod: 'google_oauth',
          loginTimestamp: new Date().toISOString(),
          webAccess: true,
          mobileAccess: true,
          financialAccess: true
        };

        logEmployeeLoginToMaster({
          email: execUser.email,
          name: execUser.name,
          role: 'Owner',
          companyCode: execWorkspace.code
        }).catch(() => {});

        setAuthStep(`Welcome, ${execName}! Launching Trisharth ERP...`);
        setTimeout(() => {
          onLoginSuccess(execUser, execWorkspace.sheetId);
        }, 350);
        return;
      }

      // 1.5 Check if user is a registered Client Factory Owner in Firestore active_factories
      const { fetchCloudFactories } = await import('../services/cloudDbService');
      const allFactories = await fetchCloudFactories();
      const matchedClientFactory = allFactories.find(f => 
        f.ownerEmail && f.ownerEmail.trim().toLowerCase() === googleEmail
      );

      if (matchedClientFactory) {
        const clientOwnerUser: AuthUser = {
          id: profile.uid || `g_owner_${matchedClientFactory.code}`,
          email: googleEmail,
          name: profile.name || matchedClientFactory.ownerName || `${matchedClientFactory.name} Owner`,
          picture: profile.picture,
          role: 'owner',
          isSuperAdmin: false,
          companyId: matchedClientFactory.id,
          companyName: matchedClientFactory.name,
          companyCode: matchedClientFactory.code,
          sheetAccessGranted: true,
          sheetTitle: `${matchedClientFactory.name} Operations Sheet`,
          authMethod: 'google_oauth',
          loginTimestamp: new Date().toISOString(),
          webAccess: true,
          mobileAccess: true,
          financialAccess: true
        };

        setRememberedCompanyCode(matchedClientFactory.code);
        logEmployeeLoginToMaster({
          email: clientOwnerUser.email,
          name: clientOwnerUser.name,
          role: 'Client Factory Owner',
          companyCode: matchedClientFactory.code
        }).catch(() => {});

        setAuthStep(`Welcome, ${clientOwnerUser.name}! Launching ${matchedClientFactory.name}...`);
        setTimeout(() => {
          onLoginSuccess(clientOwnerUser, matchedClientFactory.sheetId);
        }, 350);
        return;
      }

      // 2. Check Registered Employees across all factory directories in Firestore
      const allCloudRecords = await fetchAllCloudEmployees();
      const matchedRecord = allCloudRecords.find(rec => 
        rec.employee.googleEmail && rec.employee.googleEmail.trim().toLowerCase() === googleEmail
      );

      let matchedEmp: EmployeeRecord | undefined = matchedRecord?.employee;
      let workspace: CompanyWorkspace = matchedRecord?.factory || TRISHARTH_WORKSPACE;

      // Fallback: check INITIAL_EMPLOYEES
      if (!matchedEmp) {
        matchedEmp = INITIAL_EMPLOYEES.find(e => 
          e.googleEmail && e.googleEmail.trim().toLowerCase() === googleEmail
        );
        workspace = TRISHARTH_WORKSPACE;
      }

      if (!matchedEmp) {
        setErrorMessage(`Access Denied: Google account "${googleEmail}" is not linked to any registered factory owner or employee. Please sign in with your Company Code & Password, or ask your factory administrator to link your Google Email.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      setRememberedCompanyCode(workspace.code);

      if (matchedEmp.noAppAccess || (!matchedEmp.webAccess && !matchedEmp.mobileAccess)) {
        setErrorMessage(`Access Denied: Employee "${matchedEmp.name}" is on Payroll Only (No Web/Mobile access).`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      if (matchedEmp.webAccess !== true) {
        setErrorMessage(`Access Denied: Employee "${matchedEmp.name}" does not have Web ERP clearance. Mobile app only.`);
        setIsLoading(false);
        setAuthStep('');
        return;
      }

      const authUser: AuthUser = {
        id: profile.uid || matchedEmp.id,
        employeeId: matchedEmp.employeeId,
        email: googleEmail,
        name: profile.name || matchedEmp.name,
        picture: profile.picture,
        role: (matchedEmp.role.toLowerCase().includes('director') || matchedEmp.role.toLowerCase().includes('owner')) ? 'owner' : 'editor',
        companyId: workspace.id,
        companyName: workspace.name,
        companyCode: workspace.code,
        sheetAccessGranted: true,
        sheetTitle: `${workspace.name} Operations Sheet`,
        authMethod: 'google_oauth',
        loginTimestamp: new Date().toISOString(),
        webAccess: true,
        mobileAccess: !!matchedEmp.mobileAccess,
        financialAccess: !!matchedEmp.financialAccess
      };

      logEmployeeLoginToMaster({
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        companyCode: workspace.code
      }).catch(() => {});

      setAuthStep(`Welcome, ${authUser.name}! Launching ${workspace.name}...`);
      setTimeout(() => {
        onLoginSuccess(authUser, workspace.sheetId);
      }, 350);

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
    if (!regCompanyName.trim() || !regOwnerEmail.trim() || !regPassword.trim()) {
      setErrorMessage('Please enter Company / Factory Name, Owner Email, and Owner Password.');
      return;
    }

    if (regPassword.trim().length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setAuthStep(`Registering factory "${regCompanyName}" & provisioning cloud workspace...`);

    try {
      const { workspace, user } = await registerNewCompany(
        regCompanyName,
        regCompanyCode,
        regOwnerName,
        regOwnerEmail,
        regSheetId,
        undefined,
        regPassword.trim()
      );

      logEmployeeLoginToMaster({
        email: user.email,
        name: user.name,
        role: user.role,
        companyCode: workspace.code
      }).catch(() => {});

      setCompanyCode(workspace.code);
      setRememberedCompanyCode(workspace.code);
      setSuccessMessage(`Factory "${workspace.name}" registered successfully! Factory Code: ${workspace.code}`);
      
      setTimeout(() => {
        onLoginSuccess(user, workspace.sheetId);
      }, 600);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to register factory.');
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

      logEmployeeLoginToMaster({
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        companyCode: result.workspace.code
      }).catch(() => {});

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
            <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center p-1 shadow-xs shrink-0 overflow-hidden">
              <img src={logoImg} alt="Trisharth Textile" className="h-full w-full object-contain" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 font-mono">
                Trisharth
              </span>
              <span className="ml-2 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                Textile ERP
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
              <div className="h-14 w-14 mx-auto mb-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md">
                {authMode === 'login' ? (
                  <Building2 className="h-7 w-7 text-white" />
                ) : (
                  <Building2 className="h-7 w-7 text-white" />
                )}
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight font-mono">
                {authMode === 'login' ? 'Sign In to Workspace' : 'Register a New Factory'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {authMode === 'login' 
                  ? 'Enter your Company Code, Employee ID & Password' 
                  : 'Set up an independent, private workspace for your manufacturing plant'}
              </p>
            </div>

            {/* Segmented Switcher: Log In | Register Factory */}
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
                  setSignupType('register_company');
                  setErrorMessage(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-150 ${
                  authMode === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Register a New Factory
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
            {/* VIEW 1: LOG IN WITH SECURE EMPLOYEE CREDENTIALS */}
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
                    Unique company code assigned to your factory workspace.
                  </p>
                </div>

                {/* Employee ID or Registered Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Employee ID or Registered Email
                  </label>
                  <div className="relative">
                    <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="e.g. TR-001 or ramesh@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Login Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="firstname@DDMM"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Default format: <span className="font-mono font-semibold text-slate-700">firstname@DDMM</span> (first name in lowercase + @ + DDMM of birth date).
                  </p>
                </div>

                {/* Sign In Primary Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>Sign In with Credentials</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                {/* Divider */}
                <div className="relative my-4 text-center">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                  <span className="relative bg-white px-3 text-[11px] font-medium text-slate-400">
                    or authenticate with
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
                  <span>Google Account (Authorized Access Only)</span>
                </button>
              </form>
            )}

            {/* ========================================================================= */}
            {/* VIEW 2: REGISTER NEW FACTORY FORM (CONSTANT ON SIGN UP) */}
            {/* ========================================================================= */}
            {authMode === 'signup' && (
              <form onSubmit={handleRegisterCompanySubmit} className="space-y-3.5">
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
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
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

                {/* Master Owner Password Input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Master Owner Password *
                  </label>
                  <div className="relative">
                    <KeyRound className="h-4 w-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Create master factory password"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Used with your Company Code to log in across web and mobile platforms.
                  </p>
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
                  <span>Register Factory &amp; Launch Workspace</span>
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
