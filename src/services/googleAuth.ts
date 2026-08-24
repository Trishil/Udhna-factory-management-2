import { AuthUser, CompanyWorkspace } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

export const OAUTH_CLIENT_ID = '735454245560-jorlpsur6poq88o942h0330n98mcs8o0.apps.googleusercontent.com';
export const FIREBASE_OAUTH_CLIENT_ID = (firebaseConfig as any)?.oAuthClientId || '735454245560-jorlpsur6poq88o942h0330n98mcs8o0.apps.googleusercontent.com';

export function getEffectiveOAuthClientId(): string {
  try {
    const custom = localStorage.getItem('texflow_custom_oauth_client_id');
    if (custom && custom.trim()) return custom.trim();
  } catch {}
  return OAUTH_CLIENT_ID;
}

export function setCustomOAuthClientId(clientId: string) {
  try {
    localStorage.setItem('texflow_custom_oauth_client_id', clientId.trim());
  } catch {}
}

export const DEFAULT_SHEET_ID = '1ZlURNllkyGeQF40UsG4QWNqdqRA1Uxg5MnRqWblDYxw';
export const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwDzJBRmDRrxhFg10u9wgektant3SqpWl83ZzOLEc7-s3ZJOk6FXEe_mHxQxFfF6kaY/exec';

const AUTH_STORAGE_KEY = 'texflow_auth_user_v2';
const SHEET_ID_STORAGE_KEY = 'texflow_target_sheet_id_v2';
const WORKSPACE_STORAGE_KEY = 'texflow_active_workspace_v2';
const ALL_WORKSPACES_KEY = 'texflow_all_workspaces_v2';

// Primary Organization: Trisharth
export const TRISHARTH_WORKSPACE: CompanyWorkspace = {
  id: 'trisharth',
  name: 'Trisharth',
  code: 'TRISHARTH-HQ',
  sheetId: DEFAULT_SHEET_ID,
  scriptUrl: DEFAULT_APPS_SCRIPT_URL,
  isPrimary: true,
  ownerEmail: 'atharvabalar6@gmail.com',
  membersCount: 10,
  description: 'Primary Manufacturing & Embroidery Plant (Surat / Udhna)'
};

export const PRESET_WORKSPACES: CompanyWorkspace[] = [
  TRISHARTH_WORKSPACE,
  {
    id: 'client_workspace_demo',
    name: 'Partner Textile Co. (Demo)',
    code: 'PARTNER-01',
    sheetId: '1EXAMPLE_CLIENT_SHEET_ID_ISOLATED',
    scriptUrl: '',
    isPrimary: false,
    ownerEmail: 'partner.director@example.com',
    membersCount: 5,
    description: 'Isolated external client workspace — data, sheets and lots isolated from Trisharth'
  }
];

export function getStoredWorkspaces(): CompanyWorkspace[] {
  try {
    const raw = localStorage.getItem(ALL_WORKSPACES_KEY);
    if (!raw) return PRESET_WORKSPACES;
    const parsed: CompanyWorkspace[] = JSON.parse(raw);
    const hasTrisharth = parsed.some(w => w.id === 'trisharth');
    return hasTrisharth ? parsed : [TRISHARTH_WORKSPACE, ...parsed];
  } catch {
    return PRESET_WORKSPACES;
  }
}

export function saveCustomWorkspace(workspace: CompanyWorkspace): CompanyWorkspace[] {
  const current = getStoredWorkspaces();
  const existingIdx = current.findIndex(w => w.id === workspace.id || w.code.toLowerCase() === workspace.code.toLowerCase());
  let updated: CompanyWorkspace[];
  if (existingIdx >= 0) {
    updated = current.map((w, idx) => idx === existingIdx ? workspace : w);
  } else {
    updated = [...current, workspace];
  }
  localStorage.setItem(ALL_WORKSPACES_KEY, JSON.stringify(updated));
  return updated;
}

export function getActiveWorkspace(): CompanyWorkspace {
  try {
    const raw = localStorage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) return TRISHARTH_WORKSPACE;
    return JSON.parse(raw);
  } catch {
    return TRISHARTH_WORKSPACE;
  }
}

export function setActiveWorkspace(workspace: CompanyWorkspace) {
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace));
  if (workspace.sheetId) {
    setStoredSheetId(workspace.sheetId);
  }
}

export function getStoredSheetId(): string {
  const active = getActiveWorkspace();
  return localStorage.getItem(SHEET_ID_STORAGE_KEY) || active.sheetId || DEFAULT_SHEET_ID;
}

export function setStoredSheetId(sheetId: string) {
  localStorage.setItem(SHEET_ID_STORAGE_KEY, sheetId);
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredAuthUser(user: AuthUser | null) {
  if (user) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }
}

export function isGsiLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as any).google?.accounts?.oauth2;
}

export interface VerifySheetAccessResult {
  hasAccess: boolean;
  role: 'owner' | 'editor' | 'viewer' | 'operator';
  sheetTitle?: string;
  sheetNames?: string[];
  errorMessage?: string;
}

export async function verifySheetAccess(accessToken: string, sheetId: string): Promise<VerifySheetAccessResult> {
  try {
    const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties.title`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (res.status === 200) {
      const data = await res.json();
      const sheetTitle = data.properties?.title || 'Trisharth Production & Inventory Sheet';
      const sheetNames = (data.sheets || []).map((s: any) => s.properties?.title);
      return {
        hasAccess: true,
        role: 'editor',
        sheetTitle,
        sheetNames
      };
    } else if (res.status === 403) {
      return {
        hasAccess: false,
        role: 'operator',
        errorMessage: 'Your Google Account does not have view/edit permissions for this Google Sheet. Please request access from the spreadsheet owner.'
      };
    } else if (res.status === 404) {
      return {
        hasAccess: false,
        role: 'operator',
        errorMessage: 'Spreadsheet not found. Please verify the Google Sheet ID or request access from the owner.'
      };
    } else {
      const errText = await res.text();
      return {
        hasAccess: false,
        role: 'operator',
        errorMessage: `Google API Error (${res.status}): ${errText || 'Unable to verify sheet permissions'}`
      };
    }
  } catch (error: any) {
    return {
      hasAccess: false,
      role: 'operator',
      errorMessage: `Network error verifying spreadsheet access: ${error.message || error}`
    };
  }
}

export async function fetchGoogleUserProfile(accessToken: string): Promise<{ email: string; name: string; picture?: string; sub: string }> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });
  if (!res.ok) {
    throw new Error('Failed to retrieve user profile from Google');
  }
  return res.json();
}

import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth as firebaseAuth } from './firebaseService';export async function requestGoogleSignIn(
  sheetId: string,
  workspace: CompanyWorkspace = TRISHARTH_WORKSPACE
): Promise<{ user: AuthUser; sheetResult: VerifySheetAccessResult }> {
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    const credential = await signInWithPopup(firebaseAuth, provider);
    if (credential && credential.user) {
      const fbUser = credential.user;
      const email = fbUser.email || '';
      const name = fbUser.displayName || email.split('@')[0];
      const picture = fbUser.photoURL || undefined;

      const isKnownOwner = email.toLowerCase().includes('atharvabalar') || 
                           email.toLowerCase().includes('atharva') ||
                           email.toLowerCase().includes('trishil') ||
                           email.toLowerCase() === workspace.ownerEmail?.toLowerCase();

      const authUser: AuthUser = {
        id: fbUser.uid || `g_${Date.now()}`,
        email,
        name,
        picture,
        role: isKnownOwner ? 'owner' : 'editor',
        companyId: workspace.id,
        companyName: workspace.name,
        companyCode: workspace.code,
        sheetAccessGranted: true,
        sheetTitle: `${workspace.name} Operations Sheet`,
        authMethod: 'google_oauth',
        loginTimestamp: new Date().toISOString()
      };

      return {
        user: authUser,
        sheetResult: {
          hasAccess: true,
          role: authUser.role,
          sheetTitle: `${workspace.name} Operations Sheet`
        }
      };
    }
    throw new Error('No user profile returned from Google.');
  } catch (fbErr: any) {
    console.error('Firebase Google Sign-In error details:', fbErr);
    
    if (fbErr?.code === 'auth/popup-closed-by-user') {
      throw new Error('Google Sign-In popup was closed before completing authentication.');
    }
    if (fbErr?.code === 'auth/unauthorized-domain') {
      throw new Error('Firebase Authorized Domain required: Please add "ai.studio" and "textileflow.ai.studio" in Firebase Console > Authentication > Settings > Authorized domains.');
    }
    if (fbErr?.code === 'auth/operation-not-allowed' || fbErr?.code === 'auth/configuration-not-found') {
      throw new Error('Google Sign-In is disabled: Please enable Google in Firebase Console > Authentication > Sign-in method.');
    }
    
    throw new Error(fbErr?.message || 'Google Sign-In failed.');
  }
}

// Direct OAuth token request for creating new sheets & Drive operations
export function requestDirectGoogleOAuth(): Promise<{ accessToken: string; user: AuthUser }> {
  return new Promise((resolve, reject) => {
    if (!isGsiLoaded()) {
      reject(new Error('Google Identity Services SDK is not loaded yet. Please refresh or check network connectivity.'));
      return;
    }

    try {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: getEffectiveOAuthClientId(),
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
        callback: async (tokenResponse: any) => {
          if (tokenResponse.error) {
            reject(new Error(tokenResponse.error_description || tokenResponse.error || 'Google Sign-In failed'));
            return;
          }

          const accessToken = tokenResponse.access_token;
          if (!accessToken) {
            reject(new Error('No access token received from Google'));
            return;
          }

          try {
            const profile = await fetchGoogleUserProfile(accessToken);
            const authUser: AuthUser = {
              id: profile.sub,
              email: profile.email,
              name: profile.name,
              picture: profile.picture,
              accessToken,
              role: 'owner',
              companyId: 'trisharth',
              companyName: 'Trisharth',
              sheetAccessGranted: true,
              sheetTitle: 'Trisharth Production & Inventory Sheet',
              authMethod: 'google_oauth',
              loginTimestamp: new Date().toISOString()
            };

            resolve({ accessToken, user: authUser });
          } catch (err: any) {
            reject(err);
          }
        },
        error_callback: (err: any) => {
          reject(new Error(err?.message || 'OAuth popup closed or failed'));
        }
      });

      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err: any) {
      reject(err);
    }
  });
}

export const TRISHARTH_TEAM_MEMBERS: Array<{
  name: string;
  email: string;
  role: AuthUser['role'];
  jobTitle: string;
  department: string;
  badge: string;
  avatarText: string;
  hasAccess: boolean;
  description: string;
}> = [
  {
    name: 'Atharva Balar',
    email: 'atharvabalar6@gmail.com',
    role: 'owner',
    jobTitle: 'Managing Director & Sheet Owner',
    department: 'Executive Management',
    badge: 'Sheet Owner & Executive',
    avatarText: 'AB',
    hasAccess: true,
    description: 'Master administrator with full financial, inventory, and machine control'
  },
  {
    name: 'Trishil Balar',
    email: 'trishilbalar@trisharth.com',
    role: 'owner',
    jobTitle: 'Head of Plant & Production Ops',
    department: 'Plant Operations',
    badge: 'Operations Head',
    avatarText: 'TB',
    hasAccess: true,
    description: 'Production lead managing workflow stages, pieces, and schedule synchronization'
  },
  {
    name: 'Floor Operations Supervisor',
    email: 'floor.supervisor@trisharth.internal',
    role: 'editor',
    jobTitle: 'Floor Lead & Job Dispatcher',
    department: 'Floor Supervision',
    badge: 'Production Supervisor',
    avatarText: 'FS',
    hasAccess: true,
    description: 'Floor supervisor issuing challan slips, managing lot flow, and dispatch'
  },
  {
    name: 'Embroidery Master',
    email: 'embroidery.master@trisharth.internal',
    role: 'editor',
    jobTitle: 'Embroidery Plant Master',
    department: 'Embroidery Section',
    badge: 'Embroidery Lead',
    avatarText: 'EM',
    hasAccess: true,
    description: 'Machine scheduling, head allocation, stitch monitoring, and shift output'
  },
  {
    name: 'Lead QC Inspector',
    email: 'qc.inspector@trisharth.internal',
    role: 'editor',
    jobTitle: 'Quality Control Lead',
    department: 'Quality Assurance',
    badge: 'QC Lead Inspector',
    avatarText: 'QC',
    hasAccess: true,
    description: 'Fabric defect detection, alteration flagging, and photo inspections'
  },
  {
    name: 'Dhaga Cutting Master',
    email: 'dhaga.cutting@trisharth.internal',
    role: 'editor',
    jobTitle: 'Thread Trimming & Finishing Lead',
    department: 'Finishing Section',
    badge: 'Cutting & Trimming',
    avatarText: 'DC',
    hasAccess: true,
    description: 'Thread trimming coordination, piece counts, and stage advancement'
  },
  {
    name: 'Khakha & Jari Specialist',
    email: 'khakha.jari@trisharth.internal',
    role: 'editor',
    jobTitle: 'Manual Craft & Stitching Incharge',
    department: 'Hand Craft & Jari',
    badge: 'Craft Specialist',
    avatarText: 'KJ',
    hasAccess: true,
    description: 'Specialized jari embroidery, manual khakha work, and custom stitching'
  },
  {
    name: 'Pressing & Packing Lead',
    email: 'packing.lead@trisharth.internal',
    role: 'editor',
    jobTitle: 'Saree Folding & Packing Head',
    department: 'Packaging & Dispatch',
    badge: 'Packing Incharge',
    avatarText: 'PL',
    hasAccess: true,
    description: 'Iron pressing, folding inspection, box packing, and barcode labeling'
  },
  {
    name: 'Dispatch & Logistics Officer',
    email: 'dispatch.officer@trisharth.internal',
    role: 'editor',
    jobTitle: 'Logistics & Consignment Lead',
    department: 'Dispatch & Logistics',
    badge: 'Logistics Officer',
    avatarText: 'DO',
    hasAccess: true,
    description: 'Delivery challan generation, transporter handoff, and party delivery tracking'
  },
  {
    name: 'Inventory & Accounts Auditor',
    email: 'accounts.auditor@trisharth.internal',
    role: 'editor',
    jobTitle: 'Materials & Financial Controller',
    department: 'Accounts & Stores',
    badge: 'Accounts Controller',
    avatarText: 'IA',
    hasAccess: true,
    description: 'Raw material stock, thread consumption, wage payouts, and expense ledgers'
  }
];

export const PRESET_ACCOUNTS = TRISHARTH_TEAM_MEMBERS;

export function createPresetSession(
  accountEmail: string, 
  sheetId: string,
  workspace: CompanyWorkspace = TRISHARTH_WORKSPACE
): { user: AuthUser; sheetResult: VerifySheetAccessResult } {
  const account = TRISHARTH_TEAM_MEMBERS.find(a => a.email === accountEmail) || TRISHARTH_TEAM_MEMBERS[0];
  
  const sheetResult: VerifySheetAccessResult = account.hasAccess ? {
    hasAccess: true,
    role: account.role,
    sheetTitle: `${workspace.name} Production & Inventory Sheet (Live)`,
    sheetNames: ['Fabric Design Workflow', 'Master Order Slips', 'Inventory Materials', 'Dispatches', 'Transactions']
  } : {
    hasAccess: false,
    role: 'operator',
    errorMessage: `Access denied. Account ${account.email} does not have sharing permissions on spreadsheet ${sheetId}.`
  };

  const user: AuthUser = {
    id: `usr-${account.avatarText.toLowerCase()}-${Date.now()}`,
    email: account.email,
    name: account.name,
    role: account.role,
    companyId: workspace.id,
    companyName: workspace.name,
    companyCode: workspace.code,
    sheetAccessGranted: account.hasAccess,
    sheetTitle: account.hasAccess ? `${workspace.name} Production & Inventory (Live)` : undefined,
    authMethod: 'demo',
    loginTimestamp: new Date().toISOString()
  };

  return { user, sheetResult };
}

export const REMEMBERED_COMPANY_KEY = 'texflow_remembered_company_code';

export function getRememberedCompanyCode(): string {
  try {
    return localStorage.getItem(REMEMBERED_COMPANY_KEY) || 'TRISHARTH-HQ';
  } catch {
    return 'TRISHARTH-HQ';
  }
}

export function setRememberedCompanyCode(code: string) {
  try {
    localStorage.setItem(REMEMBERED_COMPANY_KEY, code.trim().toUpperCase());
  } catch {}
}

export async function lookupCompanyByCode(code: string): Promise<CompanyWorkspace | null> {
  if (!code) return null;
  const cleanCode = code.trim().toUpperCase();

  // 1. Check Trisharth Primary Workspace
  if (cleanCode === 'TRISHARTH-HQ' || cleanCode === 'TRISHARTH') {
    return TRISHARTH_WORKSPACE;
  }

  // 2. Check local stored workspaces
  const localList = getStoredWorkspaces();
  const localFound = localList.find(w => w.code.toUpperCase() === cleanCode || w.id.toUpperCase() === cleanCode);
  if (localFound) return localFound;

  // 3. Query Master Registry Google Sheet via Apps Script Backend
  try {
    const url = `${DEFAULT_APPS_SCRIPT_URL}?action=get_company&code=${encodeURIComponent(cleanCode)}`;
    const res = await fetch(url, { method: 'GET', mode: 'cors' });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success' && data.found && data.company) {
        const comp = data.company;
        const newWs: CompanyWorkspace = {
          id: `company_${comp.code.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
          name: comp.name,
          code: comp.code,
          sheetId: comp.sheetId || DEFAULT_SHEET_ID,
          scriptUrl: comp.scriptUrl || '',
          isPrimary: comp.isPrimary || false,
          ownerEmail: comp.ownerEmail || '',
          membersCount: 1,
          description: `Registered workspace for ${comp.name}`
        };
        saveCustomWorkspace(newWs);
        return newWs;
      }
    }
  } catch (err) {
    console.warn('Backend company lookup failed, falling back to local:', err);
  }

  return null;
}

export function findWorkspaceByCode(code: string): CompanyWorkspace | undefined {
  const clean = code.trim().toUpperCase();
  const workspaces = getStoredWorkspaces();
  return workspaces.find(w => w.code.toUpperCase() === clean || w.name.toUpperCase() === clean || w.id.toUpperCase() === clean);
}

export async function registerNewCompany(
  companyName: string,
  companyCode: string,
  ownerName: string,
  ownerEmail: string,
  sheetId?: string,
  scriptUrl?: string
): Promise<{ workspace: CompanyWorkspace; user: AuthUser }> {
  const code = (companyCode.trim() || companyName.trim().slice(0, 4) + '-' + Math.floor(1000 + Math.random() * 9000)).toUpperCase();
  const effectiveSheetId = sheetId?.trim() || `1SHEET_${code}_${Date.now()}`;
  
  const newWs: CompanyWorkspace = {
    id: `company_${Date.now()}`,
    name: companyName.trim(),
    code,
    sheetId: effectiveSheetId,
    scriptUrl: scriptUrl?.trim() || '',
    isPrimary: false,
    ownerEmail: ownerEmail.trim() || 'admin@' + code.toLowerCase() + '.internal',
    membersCount: 1,
    description: `Private workspace for ${companyName.trim()}`
  };

  saveCustomWorkspace(newWs);
  setActiveWorkspace(newWs);
  setRememberedCompanyCode(newWs.code);

  // Sync to Master Registry Google Sheet in background
  try {
    const payload = {
      name: newWs.name,
      code: newWs.code,
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      sheetId: newWs.sheetId,
      scriptUrl: newWs.scriptUrl
    };
    const syncUrl = `${DEFAULT_APPS_SCRIPT_URL}?action=register_company&data=${encodeURIComponent(JSON.stringify(payload))}`;
    fetch(syncUrl, { method: 'GET', mode: 'no-cors' }).catch(() => {});
  } catch (e) {
    console.warn('Could not sync to master Google Sheet registry:', e);
  }

  const user: AuthUser = {
    id: `usr-owner-${Date.now()}`,
    email: ownerEmail.trim() || `owner@${code.toLowerCase()}.internal`,
    name: ownerName.trim() || 'Company Administrator',
    role: 'owner',
    companyId: newWs.id,
    companyName: newWs.name,
    companyCode: newWs.code,
    sheetAccessGranted: true,
    sheetTitle: `${newWs.name} Production Master`,
    authMethod: 'tenant',
    loginTimestamp: new Date().toISOString()
  };

  saveStoredAuthUser(user);
  return { workspace: newWs, user };
}

export async function registerEmployeeAccount(
  companyCode: string,
  employeeName: string,
  employeeEmail: string,
  jobRole: string = 'Production Staff'
): Promise<{ user: AuthUser; workspace: CompanyWorkspace } | { error: string }> {
  const ws = await lookupCompanyByCode(companyCode);
  if (!ws) {
    return { error: `No registered company found with code "${companyCode}". Please ask your factory owner for the correct code.` };
  }

  setActiveWorkspace(ws);
  setRememberedCompanyCode(ws.code);

  const user: AuthUser = {
    id: `usr-emp-${Date.now()}`,
    email: employeeEmail.trim() || `${employeeName.toLowerCase().replace(/\s+/g, '.')}@${ws.code.toLowerCase()}.internal`,
    name: employeeName.trim(),
    role: 'editor',
    companyId: ws.id,
    companyName: ws.name,
    companyCode: ws.code,
    sheetAccessGranted: true,
    sheetTitle: `${ws.name} Production Sheet`,
    authMethod: 'tenant',
    loginTimestamp: new Date().toISOString()
  };

  saveStoredAuthUser(user);
  return { user, workspace: ws };
}
