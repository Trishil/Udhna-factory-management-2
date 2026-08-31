/**
 * Universal Master Directory Client Service
 * Connects Web & Mobile apps to Master Registry Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ/edit
 */

export const MASTER_REGISTRY_SPREADSHEET_ID = "1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ";
export const MASTER_REGISTRY_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ/edit";
export const MASTER_REGISTRY_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh/exec";
export const MASTER_REGISTRY_DEPLOYMENT_ID = "AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh";

export interface MasterWorkspaceConfig {
  code: string;
  name: string;
  sheetId: string;
  sheetUrl: string;
  scriptUrl?: string;
  deploymentId?: string;
  lastUpdated?: string;
  updatedBy?: string;
}

export interface MasterEmployeeRecord {
  email: string;
  name: string;
  role?: string;
  companyCode?: string;
  platform?: string;
}

/**
 * Automatically fetch latest active sheet ID & script URL from Master Registry
 */
export async function fetchActiveMasterWorkspace(
  companyCode: string = "TRISHARTH-HQ",
  customEndpoint?: string
): Promise<MasterWorkspaceConfig | null> {
  const endpoint = customEndpoint || MASTER_REGISTRY_WEBHOOK_URL;
  try {
    const url = `${endpoint}?action=get_master_workspace&companyCode=${encodeURIComponent(companyCode)}&t=${Date.now()}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" }
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.workspace && data.workspace.sheetId) {
        return data.workspace as MasterWorkspaceConfig;
      }
    }
  } catch (err) {
    console.warn("Master registry fetch notice:", err);
  }
  return null;
}

/**
 * Automatically write/publish active spreadsheet link to Master Registry
 */
export async function publishActiveWorkspaceToMaster(
  config: MasterWorkspaceConfig,
  customEndpoint?: string
): Promise<void> {
  const endpoint = customEndpoint || MASTER_REGISTRY_WEBHOOK_URL;
  const encoded = encodeURIComponent(JSON.stringify(config));
  const sheetIdEnc = encodeURIComponent(config.sheetId || '');
  const sheetUrlEnc = encodeURIComponent(config.sheetUrl || '');
  const scriptUrlEnc = encodeURIComponent(config.scriptUrl || '');
  const deploymentIdEnc = encodeURIComponent(config.deploymentId || '');
  const updatedByEnc = encodeURIComponent(config.updatedBy || '');

  // 1. Send via GET with direct parameters + data payload (ensures compatibility with all Google Apps Script redirect mechanisms)
  const getUrl = `${endpoint}?action=register_master_workspace&companyCode=TRISHARTH-HQ&sheetId=${sheetIdEnc}&sheetUrl=${sheetUrlEnc}&scriptUrl=${scriptUrlEnc}&deploymentId=${deploymentIdEnc}&updatedBy=${updatedByEnc}&data=${encoded}&t=${Date.now()}`;
  
  fetch(getUrl, { method: "GET", mode: "no-cors" }).catch(() => {});

  // 2. Dual POST
  try {
    const payloadStr = JSON.stringify({
      action: "register_master_workspace",
      workspace: config
    });
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payloadStr
    });
  } catch (err) {
    console.warn("Master registry publish notice:", err);
  }
}

/**
 * Automatically log an employee Google login to Master Registry
 */
export async function logEmployeeLoginToMaster(
  emp: MasterEmployeeRecord,
  customEndpoint?: string
): Promise<void> {
  const endpoint = customEndpoint || MASTER_REGISTRY_WEBHOOK_URL;
  const encoded = encodeURIComponent(JSON.stringify(emp));
  const emailEnc = encodeURIComponent(emp.email || '');
  const nameEnc = encodeURIComponent(emp.name || '');
  const roleEnc = encodeURIComponent(emp.role || 'Employee');
  const codeEnc = encodeURIComponent(emp.companyCode || 'TRISHARTH-HQ');
  const platformEnc = encodeURIComponent(emp.platform || 'Web App');

  const getUrl = `${endpoint}?action=register_master_employee&email=${emailEnc}&name=${nameEnc}&role=${roleEnc}&companyCode=${codeEnc}&platform=${platformEnc}&data=${encoded}&t=${Date.now()}`;

  fetch(getUrl, { method: "GET", mode: "no-cors" }).catch(() => {});

  try {
    const payloadStr = JSON.stringify({
      action: "register_master_employee",
      employee: {
        ...emp,
        platform: emp.platform || "Web App"
      }
    });
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payloadStr
    });
  } catch (err) {}
}
