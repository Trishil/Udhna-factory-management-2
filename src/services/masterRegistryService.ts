/**
 * Universal Master Directory Client Service
 * Connects Web & Mobile apps to Master Registry Spreadsheet:
 * https://docs.google.com/spreadsheets/d/1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ/edit
 */

export const MASTER_REGISTRY_SPREADSHEET_ID = "1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ";
export const MASTER_REGISTRY_SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ/edit";
export const MASTER_REGISTRY_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q/exec";

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
  const endpoint = customEndpoint || config.scriptUrl || MASTER_REGISTRY_WEBHOOK_URL;
  const payload = {
    action: "register_master_workspace",
    sheetId: MASTER_REGISTRY_SPREADSHEET_ID,
    workspace: config
  };

  const payloadStr = JSON.stringify(payload);
  const encoded = encodeURIComponent(JSON.stringify(config));

  fetch(`${endpoint}?action=register_master_workspace&sheetId=${encodeURIComponent(MASTER_REGISTRY_SPREADSHEET_ID)}&data=${encoded}`, {
    method: "GET",
    mode: "no-cors"
  }).catch(() => {});

  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payloadStr
    });
  } catch (err) {
    console.warn("Master registry publish error:", err);
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
  const payload = {
    action: "register_master_employee",
    sheetId: MASTER_REGISTRY_SPREADSHEET_ID,
    employee: {
      ...emp,
      platform: "Web App"
    }
  };

  const payloadStr = JSON.stringify(payload);
  const encoded = encodeURIComponent(JSON.stringify(payload.employee));

  fetch(`${endpoint}?action=register_master_employee&sheetId=${encodeURIComponent(MASTER_REGISTRY_SPREADSHEET_ID)}&data=${encoded}`, {
    method: "GET",
    mode: "no-cors"
  }).catch(() => {});

  try {
    await fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: payloadStr
    });
  } catch (err) {}
}
