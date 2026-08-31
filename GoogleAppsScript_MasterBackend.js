/**
 * =========================================================================
 * TEXFLOW UNIVERSAL MASTER REGISTRY BACKEND (PURE BACKEND ROUTER)
 * MASTER SPREADSHEET ID: 1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ
 * =========================================================================
 * 
 * This dedicated Apps Script runs exclusively on your Master Registry Sheet.
 * It serves as the single source of truth for:
 * 1. Active Production Spreadsheet Links & Webhooks (Company_Workspaces)
 * 2. Employee Directory & Google Account Logins (Registered_Employees)
 * 
 * 🚀 DEPLOYMENT INSTRUCTIONS (1-TIME SETUP):
 * 1. Open your Master Spreadsheet: https://docs.google.com/spreadsheets/d/1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ/edit
 * 2. Click: Extensions ➔ Apps Script
 * 3. Replace all code with this file.
 * 4. Click: Deploy ➔ New deployment (or Manage deployments ➔ Edit ➔ New version)
 *    - Type: Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 5. Click Deploy!
 */

const MASTER_REGISTRY_SPREADSHEET_ID = "1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ";

/**
 * Initializes the Master Registry tabs with beautiful headers and formatting
 */
function setupMasterRegistry() {
  const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(MASTER_REGISTRY_SPREADSHEET_ID);
  
  // 1. Company Workspaces Tab
  let wsSheet = ss.getSheetByName("Company_Workspaces");
  if (!wsSheet) {
    wsSheet = ss.insertSheet("Company_Workspaces");
  }
  wsSheet.clear();
  const wsHeaders = [
    "Company Code", "Company Name", "Active Sheet ID", "Active Sheet URL",
    "Script Webhook URL", "Deployment ID", "Last Updated", "Updated By Email"
  ];
  wsSheet.getRange(1, 1, 1, wsHeaders.length).setValues([wsHeaders]);
  wsSheet.getRange(1, 1, 1, wsHeaders.length)
    .setBackground("#1E3A8A")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  wsSheet.setFrozenRows(1);

  // Default seed entry for Trisharth HQ
  wsSheet.appendRow([
    "TRISHARTH-HQ",
    "Trisharth Textile Factory",
    "1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU",
    "https://docs.google.com/spreadsheets/d/1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU/edit",
    "https://script.google.com/macros/s/AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh/exec",
    "AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh",
    new Date().toISOString(),
    "atharvabalar6@gmail.com"
  ]);

  // 2. Registered Employees Tab
  let empSheet = ss.getSheetByName("Registered_Employees");
  if (!empSheet) {
    empSheet = ss.insertSheet("Registered_Employees");
  }
  empSheet.clear();
  const empHeaders = [
    "Email", "Full Name", "Role", "Company Code", "Last Login Timestamp", "Platform"
  ];
  empSheet.getRange(1, 1, 1, empHeaders.length).setValues([empHeaders]);
  empSheet.getRange(1, 1, 1, empHeaders.length)
    .setBackground("#047857")
    .setFontColor("#FFFFFF")
    .setFontWeight("bold");
  empSheet.setFrozenRows(1);

  // Seed Owners
  empSheet.appendRow(["trishilbalar@gmail.com", "Trishil Balar", "Owner / Operations Head", "TRISHARTH-HQ", new Date().toISOString(), "Web / Mobile"]);
  empSheet.appendRow(["atharvabalar6@gmail.com", "Atharva Balar", "Owner / Managing Director", "TRISHARTH-HQ", new Date().toISOString(), "Web / Mobile"]);

  return "Master Registry tabs setup successfully!";
}

/**
 * Handle HTTP GET Requests
 */
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(MASTER_REGISTRY_SPREADSHEET_ID);
    const action = e && e.parameter ? e.parameter.action : "get_master_workspace";

    // 1. Get Active Workspace Config
    if (action === "get_master_workspace" || action === "get_active_workspace" || action === "get_workspace") {
      const code = (e && e.parameter && (e.parameter.companyCode || e.parameter.code) ? e.parameter.companyCode || e.parameter.code : "TRISHARTH-HQ").trim().toUpperCase();
      const ws = getWorkspaceRecord(ss, code);
      return createJsonResponse({ status: "success", workspace: ws });
    }

    // 2. Register / Update Active Workspace Config
    if (action === "register_master_workspace" || action === "update_master_workspace" || action === "set_active_sheet") {
      let data = {};
      if (e && e.parameter && e.parameter.data) {
        try {
          data = JSON.parse(e.parameter.data);
        } catch (err1) {
          try { data = JSON.parse(decodeURIComponent(e.parameter.data)); } catch (err2) { data = {}; }
        }
      }
      if (!data.sheetId && e && e.parameter && e.parameter.sheetId) {
        data.sheetId = e.parameter.sheetId;
        data.sheetUrl = e.parameter.sheetUrl;
        data.scriptUrl = e.parameter.scriptUrl;
        data.deploymentId = e.parameter.deploymentId;
        data.companyCode = e.parameter.companyCode || e.parameter.code;
        data.updatedBy = e.parameter.updatedBy;
      }
      const updated = saveWorkspaceRecord(ss, data);
      return createJsonResponse({ status: "success", workspace: updated, message: "Active workspace updated in master registry" });
    }

    // 3. Register Employee Login
    if (action === "register_master_employee" || action === "log_employee") {
      let emp = {};
      if (e && e.parameter && e.parameter.data) {
        try {
          emp = JSON.parse(e.parameter.data);
        } catch (err1) {
          try { emp = JSON.parse(decodeURIComponent(e.parameter.data)); } catch (err2) { emp = {}; }
        }
      }
      if (!emp.email && e && e.parameter && e.parameter.email) {
        emp.email = e.parameter.email;
        emp.name = e.parameter.name;
        emp.role = e.parameter.role;
        emp.companyCode = e.parameter.companyCode;
        emp.platform = e.parameter.platform;
      }
      saveEmployeeRecord(ss, emp);
      return createJsonResponse({ status: "success", message: "Employee logged in master registry" });
    }

    // 4. List All Registered Employees
    if (action === "list_employees") {
      const employees = listAllEmployees(ss);
      return createJsonResponse({ status: "success", employees: employees });
    }

    return createJsonResponse({
      status: "online",
      service: "TexFlow Master Registry Router",
      spreadsheetId: MASTER_REGISTRY_SPREADSHEET_ID,
      activeWorkspace: getWorkspaceRecord(ss, "TRISHARTH-HQ")
    });

  } catch (err) {
    return createJsonResponse({ status: "error", message: err.message });
  }
}

/**
 * Handle HTTP POST Requests
 */
function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(MASTER_REGISTRY_SPREADSHEET_ID);
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try { body = JSON.parse(e.postData.contents); } catch(err) { body = {}; }
    }

    const action = body.action || (e && e.parameter ? e.parameter.action : "");

    if (action === "register_master_workspace" || action === "update_master_workspace" || action === "set_active_sheet") {
      const wsData = body.workspace || body.data || body;
      const updated = saveWorkspaceRecord(ss, wsData);
      return createJsonResponse({ status: "success", workspace: updated });
    }

    if (action === "register_master_employee" || action === "log_employee") {
      const empData = body.employee || body.data || body;
      saveEmployeeRecord(ss, empData);
      return createJsonResponse({ status: "success", message: "Employee registered in master sheet" });
    }

    return createJsonResponse({ status: "success", message: "Master Registry POST received" });
  } catch(err) {
    return createJsonResponse({ status: "error", message: err.message });
  }
}

// ---------------------------------------------------------------------------
// MASTER REGISTRY INTERNAL DATA HELPERS
// ---------------------------------------------------------------------------

function getWorkspaceRecord(ss, companyCode) {
  const cleanCode = String(companyCode || "TRISHARTH-HQ").trim().toUpperCase();
  let wsSheet = ss.getSheetByName("Company_Workspaces") || ss.getSheets()[0];
  if (!wsSheet) {
    setupMasterRegistry();
    wsSheet = ss.getSheetByName("Company_Workspaces");
  }

  const data = wsSheet.getDataRange().getValues();
  if (data && data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCode = String(row[0] || "").trim().toUpperCase();
      if (rowCode === cleanCode || (cleanCode.includes("TRISHARTH") && rowCode.includes("TRISHARTH"))) {
        return {
          code: rowCode,
          name: String(row[1] || "Trisharth"),
          sheetId: String(row[2] || ""),
          sheetUrl: String(row[3] || (row[2] ? "https://docs.google.com/spreadsheets/d/" + row[2] + "/edit" : "")),
          scriptUrl: String(row[4] || ""),
          deploymentId: String(row[5] || ""),
          lastUpdated: String(row[6] || new Date().toISOString()),
          updatedBy: String(row[7] || "")
        };
      }
    }
  }

  return {
    code: cleanCode,
    name: "Trisharth",
    sheetId: "1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU/edit",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh/exec",
    deploymentId: "AKfycbxsRItplGQYqm4_v_exT4Xe9nyPRIhRk4CSz2Dosnxt4hmNUmA4cKlJCW33Ff_yXuBh",
    lastUpdated: new Date().toISOString(),
    updatedBy: "admin@trisharth.com"
  };
}

function saveWorkspaceRecord(ss, wsData) {
  let wsSheet = ss.getSheetByName("Company_Workspaces");
  if (!wsSheet) {
    setupMasterRegistry();
    wsSheet = ss.getSheetByName("Company_Workspaces");
  }

  const code = String(wsData.companyCode || wsData.code || "TRISHARTH-HQ").trim().toUpperCase();
  const name = wsData.companyName || wsData.name || "Trisharth";
  const sheetId = String(wsData.sheetId || "").trim();
  const sheetUrl = wsData.sheetUrl || (sheetId ? "https://docs.google.com/spreadsheets/d/" + sheetId + "/edit" : "");
  const scriptUrl = wsData.scriptUrl || "";
  const deploymentId = wsData.deploymentId || "";
  const lastUpdated = new Date().toISOString();
  const updatedBy = wsData.updatedBy || wsData.ownerEmail || "";

  const data = wsSheet.getDataRange().getValues();
  let foundRowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || "").trim().toUpperCase() === code) {
      foundRowIdx = i + 1;
      break;
    }
  }

  const rowValues = [code, name, sheetId, sheetUrl, scriptUrl, deploymentId, lastUpdated, updatedBy];
  if (foundRowIdx > 0) {
    wsSheet.getRange(foundRowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    wsSheet.appendRow(rowValues);
  }

  return {
    code: code,
    name: name,
    sheetId: sheetId,
    sheetUrl: sheetUrl,
    scriptUrl: scriptUrl,
    deploymentId: deploymentId,
    lastUpdated: lastUpdated,
    updatedBy: updatedBy
  };
}

function saveEmployeeRecord(ss, empData) {
  let empSheet = ss.getSheetByName("Registered_Employees");
  if (!empSheet) {
    setupMasterRegistry();
    empSheet = ss.getSheetByName("Registered_Employees");
  }

  const email = String(empData.email || "").trim().toLowerCase();
  if (!email) return;
  const name = empData.name || empData.fullName || email.split("@")[0];
  const role = empData.role || "Employee";
  const code = String(empData.companyCode || "TRISHARTH-HQ").trim().toUpperCase();
  const timestamp = new Date().toISOString();
  const platform = empData.platform || "Web / Mobile";

  const data = empSheet.getDataRange().getValues();
  let foundRowIdx = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || "").trim().toLowerCase() === email) {
      foundRowIdx = i + 1;
      break;
    }
  }

  const rowValues = [email, name, role, code, timestamp, platform];
  if (foundRowIdx > 0) {
    empSheet.getRange(foundRowIdx, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    empSheet.appendRow(rowValues);
  }
}

function listAllEmployees(ss) {
  const empSheet = ss.getSheetByName("Registered_Employees");
  if (!empSheet) return [];
  const data = empSheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const list = [];
  for (let i = 1; i < data.length; i++) {
    list.push({
      email: data[i][0],
      name: data[i][1],
      role: data[i][2],
      companyCode: data[i][3],
      lastLogin: data[i][4],
      platform: data[i][5]
    });
  }
  return list;
}

function createJsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
