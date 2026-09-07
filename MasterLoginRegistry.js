/**
 * MASTER LOGIN & EMPLOYEE REGISTRY ENGINE
 * Spreadsheet ID: 1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ
 * 
 * Purpose:
 * Exclusively manages company tenant directory, employee Google logins, and audit logs.
 * Production data is stored in the real-time Cloud Database (Firestore) and NOT in spreadsheets.
 */

function doGet(e) {
  return handleMasterRequest(e);
}

function doPost(e) {
  return handleMasterRequest(e);
}

function handleMasterRequest(e) {
  try {
    let params = (e && e.parameter) || {};
    let postBody = {};
    if (e && e.postData && e.postData.contents) {
      try {
        postBody = JSON.parse(e.postData.contents);
      } catch (err) {
        postBody = {};
      }
    }

    const action = params.action || postBody.action || "ping";
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // Ensure Master Tabs exist
    setupMasterSheets(ss);

    // Route 1: Register / Log Employee Google Login
    if (action === "register_master_employee" || action === "log_employee_login") {
      const email = params.email || postBody.email || "";
      const name = params.name || postBody.name || "Employee";
      const companyCode = params.companyCode || postBody.companyCode || "TRISHARTH-HQ";
      const role = params.role || postBody.role || "Operator";
      const device = params.device || postBody.device || "Web Browser";

      const empSheet = ss.getSheetByName("Registered_Employees");
      if (empSheet && email) {
        empSheet.appendRow([
          new Date().toISOString(),
          name,
          email,
          companyCode,
          role,
          device,
          "ACTIVE"
        ]);
      }

      return jsonResponse({
        status: "success",
        message: "Employee login recorded in Master Sheet",
        email: email,
        companyCode: companyCode
      });
    }

    // Route 2: Get Company Workspace Details
    if (action === "get_master_workspace") {
      const companyCode = (params.companyCode || postBody.companyCode || "TRISHARTH-HQ").trim().toUpperCase();
      const wsSheet = ss.getSheetByName("Company_Workspaces");
      const data = wsSheet.getDataRange().getValues();

      for (let i = 1; i < data.length; i++) {
        const rowCode = String(data[i][2] || "").trim().toUpperCase();
        if (rowCode === companyCode) {
          return jsonResponse({
            status: "success",
            workspace: {
              id: String(data[i][0] || "ws-default"),
              name: String(data[i][1] || "Trisharth"),
              code: rowCode,
              ownerEmail: String(data[i][3] || ""),
              createdAt: String(data[i][4] || ""),
              status: String(data[i][5] || "active")
            }
          });
        }
      }

      // Default fallback
      return jsonResponse({
        status: "success",
        workspace: {
          id: "trisharth",
          name: "Trisharth",
          code: "TRISHARTH-HQ",
          ownerEmail: "trishilbalar@gmail.com",
          status: "active"
        }
      });
    }

    // Route 3: Register a New Tenant Company Workspace
    if (action === "register_master_workspace") {
      const code = (params.companyCode || postBody.companyCode || "").trim().toUpperCase();
      const name = params.companyName || postBody.companyName || "New Company";
      const ownerEmail = params.ownerEmail || postBody.ownerEmail || "";

      if (!code) {
        return jsonResponse({ status: "error", message: "Company code is required" });
      }

      const wsSheet = ss.getSheetByName("Company_Workspaces");
      const data = wsSheet.getDataRange().getValues();
      let rowIndex = -1;

      for (let i = 1; i < data.length; i++) {
        if (String(data[i][2] || "").trim().toUpperCase() === code) {
          rowIndex = i + 1;
          break;
        }
      }

      if (rowIndex > 0) {
        wsSheet.getRange(rowIndex, 2).setValue(name);
        wsSheet.getRange(rowIndex, 4).setValue(ownerEmail);
      } else {
        wsSheet.appendRow([
          "ws_" + code.toLowerCase().replace(/[^a-z0-9]/g, "_"),
          name,
          code,
          ownerEmail,
          new Date().toISOString(),
          "active"
        ]);
      }

      return jsonResponse({
        status: "success",
        message: "Company workspace registered in Master Sheet",
        companyCode: code
      });
    }

    // Route 4: List All Registered Employees
    if (action === "list_employees") {
      const empSheet = ss.getSheetByName("Registered_Employees");
      const data = empSheet.getDataRange().getValues();
      const employees = [];
      for (let i = 1; i < data.length; i++) {
        if (data[i][2]) {
          employees.push({
            timestamp: data[i][0],
            name: data[i][1],
            email: data[i][2],
            companyCode: data[i][3],
            role: data[i][4],
            device: data[i][5],
            status: data[i][6]
          });
        }
      }
      return jsonResponse({ status: "success", employees: employees });
    }

    // Ping / Default
    return jsonResponse({
      status: "success",
      message: "Master Login Registry Endpoint Online",
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    return jsonResponse({
      status: "error",
      message: err.message || String(err)
    });
  }
}

function setupMasterSheets(ss) {
  // 1. Company_Workspaces Tab
  let wsSheet = ss.getSheetByName("Company_Workspaces");
  if (!wsSheet) {
    wsSheet = ss.insertSheet("Company_Workspaces");
    wsSheet.appendRow(["Company ID", "Company Name", "Company Code", "Owner Email", "Created At", "Status"]);
    wsSheet.getRange("A1:F1").setBackground("#1E3A8A").setFontColor("#FFFFFF").setFontWeight("bold");
    wsSheet.setFrozenRows(1);
    // Seed default Trisharth workspace
    wsSheet.appendRow(["trisharth", "Trisharth", "TRISHARTH-HQ", "trishilbalar@gmail.com", new Date().toISOString(), "active"]);
  }

  // 2. Registered_Employees Tab
  let empSheet = ss.getSheetByName("Registered_Employees");
  if (!empSheet) {
    empSheet = ss.insertSheet("Registered_Employees");
    empSheet.appendRow(["Timestamp", "Employee Name", "Email ID", "Company Code", "Role", "Device Source", "Status"]);
    empSheet.getRange("A1:G1").setBackground("#065F46").setFontColor("#FFFFFF").setFontWeight("bold");
    empSheet.setFrozenRows(1);
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
