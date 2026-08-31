/**
 * =========================================================================
 * GOOGLE APPS SCRIPT BACKEND & AUTOMATED SHEET BUILDER
 * FOR UDHNA TEXTILE FACTORY & MOBILE WORKFLOW TRACKER
 * =========================================================================
 * 
 * SPREADSHEET ID: 1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU
 * 
 * 🚀 HOW TO UPDATE YOUR DEPLOYMENT (30 seconds):
 * 1. Open your Google Spreadsheet (1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU).
 * 2. Click: Extensions ➔ Apps Script.
 * 3. Replace all code with this file.
 * 4. Click: Deploy (top right) ➔ Manage deployments ➔ Edit (pencil icon) ➔ Version: "New version" ➔ Deploy!
 */

/**
 * AUTOMATED BUILDER: Builds the entire multi-tab factory spreadsheet system
 */
function setupSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const tabDefs = [
    {
      name: "Fabric Design Workflow",
      tabColor: "#1E88E5",
      headerColor: "#0D47A1",
      headers: [
        'Job No. (Folder)', 'Party Name', 'Chalan No.', 'Date', 'Design No. (D.no)',
        'Design Name', 'Fabric Type', 'Fabric Color', 'Total Pieces (Pcs)', 'Current Stage',
        'Step (1-10)', 'Stage Breakdown', 'Good Pieces', 'Alteration Pieces', 'Priority',
        'Due Date', 'Initial Inspection', 'Alteration Result', 'Alteration Reason',
        'Assigned Operator', 'Delivery Chalan No.', 'Date of Delivery', 'Bill No.',
        'Pieces Completed', 'Firm Name', 'Notes / Photos'
      ],
      sampleRows: []
    },
    {
      name: "Piece-Level Tracking",
      tabColor: "#FB8C00",
      headerColor: "#E65100",
      headers: [
        'Piece Tag (Unique ID)', 'Job No.', 'Lot / Branch ID', 'Piece #', 'Design No.',
        'Fabric Type', 'Fabric Color', 'Party Name', 'Current Stage', 'Stage Name',
        'Quality Status', 'Defect Reason', 'Alteration Notes', 'Assigned Operator', 'Chalan No.'
      ],
      sampleRows: []
    },
    {
      name: "Fabric & Color Matrix",
      tabColor: "#8E24AA",
      headerColor: "#4A148C",
      headers: [
        'Job No.', 'Party Name', 'Design No.', 'Fabric Type', 'Color Name',
        'Total Pcs', '1. Fabric Inward', '2. Chalan', '3. Insp-1', '4. Stitching',
        '5. Embroidery', '6. Dhaga Cut', '7. Insp-2', '8. Altering', '9. Folding',
        '10. Dispatch', 'Completed Pcs', 'In-Progress Pcs', 'Completion %', 'Due Date'
      ],
      sampleRows: []
    },
    {
      name: "Master Order Slips",
      tabColor: "#6A1B9A",
      headerColor: "#311B92",
      headers: [
        'Job No. / Folder ID', 'Party / Client Name', 'Chalan No.', 'Date of Entry', 'Total Pieces (Pcs)',
        'Fabric Columns', 'Color Variants Count', 'Breakdown Matrix Summary', 'Inward Notes', 'Calculation Notes',
        'Delivery Chalan No.', 'Delivery Date', 'Bill No.', 'Pieces Completed', 'Firm Name', 'Status'
      ],
      sampleRows: []
    },
    {
      name: "Live Inventory & Materials",
      tabColor: "#00897B",
      headerColor: "#004D40",
      headers: [
        'Item SKU Code', 'Material Name', 'Category', 'Size / Gauge', 'Color Name',
        'Vendor / Supplier', 'Current Stock', 'Unit', 'Min Threshold', 'Stock Health Status',
        'Location Bin', 'Lot / Batch Number', 'Unit Cost (₹)', 'Total Valuation (₹)', 'Burn Rate (units/h)', 'Last Updated'
      ],
      sampleRows: [
        ['ZR-GLD-01', 'Metallic Gold Zari 70D', 'Zari Threads', '70D', 'Metallic Gold', 'Surat Zari Mills', 1450, 'spools', 300, '=IF(G2<=0, "DEPLETED", IF(G2<=I2, "LOW STOCK ALERT", "STABLE"))', 'Rack A-01', 'LOT-ZR-441', 120, '=G2*M2', 15, new Date().toISOString().split("T")[0]],
        ['SQ-3MM-GLD', '3mm Flat Sequin Spool', 'Sequins', '3mm', 'Gloss Gold', 'Mehta Embellishments', 820, 'spools', 200, '=IF(G3<=0, "DEPLETED", IF(G3<=I3, "LOW STOCK ALERT", "STABLE"))', 'Rack A-04', 'LOT-SQ-108', 85, '=G3*M3', 10, new Date().toISOString().split("T")[0]],
        ['GEO-SLK-EMR', 'Silk Georgette Fabric Base', 'Fabric Rolls', '60 GSM', 'Emerald Green', 'Riddhi Textiles', 450, 'meters', 150, '=IF(G4<=0, "DEPLETED", IF(G4<=I4, "LOW STOCK ALERT", "STABLE"))', 'Bay B-12', 'LOT-FB-902', 240, '=G4*M4', 30, new Date().toISOString().split("T")[0]],
        ['VLV-9000-NVY', 'Micro Velvet 9000 Base', 'Fabric Rolls', '9000 Quality', 'Midnight Navy', 'Royal Velvet Mills', 320, 'meters', 100, '=IF(G5<=0, "DEPLETED", IF(G5<=I5, "LOW STOCK ALERT", "STABLE"))', 'Bay C-02', 'LOT-FB-881', 310, '=G5*M5', 20, new Date().toISOString().split("T")[0]]
      ]
    },
    {
      name: "Stock Transactions",
      tabColor: "#EF6C00",
      headerColor: "#BF360C",
      headers: [
        'Transaction ID', 'Date & Time', 'Item SKU / Name', 'Category', 'Type (IN/OUT/ADJUST)',
        'Quantity', 'Unit', 'Unit Cost (₹)', 'Total Cost (₹)', 'Operator / Incharge', 'Machine / Order Ref', 'Notes'
      ],
      sampleRows: [
        ['TX-1001', new Date().toISOString(), 'ZR-GLD-01 (Metallic Gold Zari)', 'Zari Threads', 'IN', 500, 'spools', 120, '=F2*H2', 'Warehouse Supervisor', 'PO-2026-90', 'Inward shipment from Surat Zari Mills'],
        ['TX-1002', new Date().toISOString(), 'GEO-SLK-EMR (Silk Georgette)', 'Fabric Rolls', 'OUT', 45, 'meters', 240, '=F3*H3', 'Ramesh Kumar', 'LOT-9035', 'Issued for embroidery frame mounting']
      ]
    },
    {
      name: "Dispatch & Shipments",
      tabColor: "#43A047",
      headerColor: "#1B5E20",
      headers: [
        'Dispatch No.', 'Party / Buyer Name', 'Status', 'Product / SKU Name', 'Quantity',
        'Unit', 'Unit Price (₹)', 'Subtotal (₹)', 'GST Tax (5%) (₹)', 'Total Invoice (₹)',
        'Amount Paid (₹)', 'Balance Due (₹)', 'Payment Status', 'Transporter', 'Vehicle / Tracking No.',
        'Ready Date', 'Dispatched Date', 'Invoice No.', 'Delivery Address'
      ],
      sampleRows: [
        [
          'DSP-2026-01', 'Surat Bridal Couture', 'READY', 'Bridal Lehanga Sets (Emerald)', 45,
          'sarees', 3200, '=E2*G2', '=H2*0.05', '=H2+I2',
          50000, '=J2-K2', '=IF(L2<=0, "PAID IN FULL", IF(K2>0, "PARTIAL", "UNPAID"))',
          'Shreeji Logistics', 'GJ-05-BX-4421', '2026-08-25', '2026-08-26', 'INV-2026-081', 'Ring Road Textile Market, Surat'
        ]
      ]
    },
    {
      name: "Party Invoices & Receivables",
      tabColor: "#2E7D32",
      headerColor: "#1B5E20",
      headers: ['Invoice No.', 'Party / Client Name', 'Invoice Date', 'Total Amount (₹)', 'Paid Amount (₹)', 'Balance Due (₹)', 'Payment Status', 'Due Date', 'Notes'],
      sampleRows: [['INV-2026-081', 'Surat Bridal Couture', '2026-08-25', 151200, 50000, '=D2-E2', 'PARTIAL', '2026-09-10', 'Advance received']]
    },
    {
      name: "Supplier Payables & Imports",
      tabColor: "#F57C00",
      headerColor: "#E65100",
      headers: ['Bill / PO No.', 'Supplier Name', 'Category', 'Total Bill (₹)', 'Paid (₹)', 'Balance Payable (₹)', 'Payment Status', 'Due Date', 'Notes'],
      sampleRows: [['PO-2026-90', 'Surat Zari Mills', 'Zari Threads', 60000, 30000, '=D2-E2', 'PARTIAL', '2026-09-05', '50% advance']]
    },
    {
      name: "Staff Payroll",
      tabColor: "#3949AB",
      headerColor: "#1A237E",
      headers: ['Employee ID', 'Employee Name', 'Role', 'Department', 'Monthly Salary (₹)', 'Piece Rate (₹/pc)', 'Pieces Done', 'Piece Earnings (₹)', 'Total Payout (₹)', 'Status'],
      sampleRows: [['EMP-01', 'Ramesh Kumar', 'Head Embroidery Operator', 'Embroidery Floor', 22000, 15, 120, '=F2*G2', '=E2+H2', 'ACTIVE']]
    },
    {
      name: "Expenses & Utilities",
      tabColor: "#D32F2F",
      headerColor: "#B71C1C",
      headers: ['Expense ID', 'Date', 'Category', 'Description', 'Amount (₹)', 'Payment Mode', 'Paid By', 'Receipt / Ref'],
      sampleRows: [['EXP-101', '2026-08-23', 'Electricity & Power', 'Monthly 3-Phase Machine Power Bill', 34500, 'Bank Transfer', 'Managing Director', 'DGVCL-AUG-26']]
    },
    {
      name: "Company Master Registry",
      tabColor: "#673AB7",
      headerColor: "#4527A0",
      headers: [
        'Company Name', 'Company Code', 'Owner Name', 'Owner Email',
        'Google Sheet ID', 'Apps Script Webhook', 'Created At', 'Status'
      ],
      sampleRows: [
        [
          'Trisharth', 'TRISHARTH-HQ', 'Atharva Balar', 'atharvabalar6@gmail.com',
          '1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU',
          'https://script.google.com/macros/s/AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q/exec',
          '2026-08-24', 'ACTIVE'
        ]
      ]
    }
  ];

  tabDefs.forEach(def => {
    let sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    try { sheet.setTabColor(def.tabColor); } catch (e) {}
    sheet.setFrozenRows(1);
    const headerRange = sheet.getRange(1, 1, 1, def.headers.length);
    headerRange.setValues([def.headers]);
    headerRange.setFontWeight("bold");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setBackground(def.headerColor);
    headerRange.setHorizontalAlignment("center");
    headerRange.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 38);

    for (let c = 1; c <= Math.min(def.headers.length, 25); c++) {
      sheet.autoResizeColumn(c);
      const width = sheet.getColumnWidth(c);
      if (width < 110) sheet.setColumnWidth(c, 120);
    }
  });

  const defaultSheet = ss.getSheetByName("Sheet1");
  if (defaultSheet && ss.getSheets().length > 1) {
    try { ss.deleteSheet(defaultSheet); } catch (e) {}
  }
}

/**
 * Universal GET & POST handler
 */
function doGet(e) {
  try {
    let ss = null;
    const targetSheetId = (e && e.parameter && e.parameter.sheetId) ? e.parameter.sheetId.trim() : null;
    if (targetSheetId) {
      try { 
        ss = SpreadsheetApp.openById(targetSheetId); 
      } catch (openErr) {
        return ContentService.createTextOutput(JSON.stringify({
          status: "error",
          message: "Could not open specified spreadsheet (" + targetSheetId + "). Please ensure the spreadsheet is shared with Editor permissions."
        })).setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (activeErr) {}
    }
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet not found or access denied."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 0. Master Registry Lookup (Single Universal Directory: 1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ)
    if (e && e.parameter && (e.parameter.action === "get_master_workspace" || e.parameter.action === "get_active_workspace")) {
      const code = (e.parameter.companyCode || e.parameter.code || "TRISHARTH-HQ").trim().toUpperCase();
      const ws = lookupMasterWorkspace(code);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", workspace: ws }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 0.1 Master Registry Save / Update Workspace
    if (e && e.parameter && (e.parameter.action === "register_master_workspace" || e.parameter.action === "update_master_workspace")) {
      let wsData = {};
      if (e.parameter.data) {
        try { wsData = JSON.parse(e.parameter.data); } catch(err1) {
          try { wsData = JSON.parse(decodeURIComponent(e.parameter.data)); } catch(err2) { wsData = {}; }
        }
      }
      if (!wsData.sheetId && e.parameter.sheetId) {
        wsData.sheetId = e.parameter.sheetId;
        wsData.sheetUrl = e.parameter.sheetUrl;
        wsData.scriptUrl = e.parameter.scriptUrl;
        wsData.deploymentId = e.parameter.deploymentId;
        wsData.companyCode = e.parameter.companyCode || e.parameter.code;
        wsData.updatedBy = e.parameter.updatedBy;
      }
      registerMasterWorkspace(wsData);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Master workspace updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 0.2 Master Registry Log Employee Login
    if (e && e.parameter && (e.parameter.action === "register_master_employee" || e.parameter.action === "log_employee")) {
      let empData = {};
      if (e.parameter.data) {
        try { empData = JSON.parse(e.parameter.data); } catch(err1) {
          try { empData = JSON.parse(decodeURIComponent(e.parameter.data)); } catch(err2) { empData = {}; }
        }
      }
      if (!empData.email && e.parameter.email) {
        empData.email = e.parameter.email;
        empData.name = e.parameter.name;
        empData.role = e.parameter.role;
        empData.companyCode = e.parameter.companyCode;
        empData.platform = e.parameter.platform;
      }
      registerMasterEmployee(empData);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Employee registered in master sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 1. Company Code Lookup
    if (e && e.parameter && e.parameter.action === "get_company" && e.parameter.code) {
      const code = e.parameter.code.trim().toUpperCase();
      const comp = lookupCompanyInSheet(ss, code);
      if (comp) {
        return ContentService.createTextOutput(JSON.stringify({ status: "success", found: true, company: comp }))
          .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ status: "error", found: false, message: "Company code not found" }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

  // 2. Company Registration via GET
  if (e && e.parameter && e.parameter.action === "register_company" && e.parameter.data) {
    try {
      const data = JSON.parse(decodeURIComponent(e.parameter.data));
      const registered = saveCompanyToSheet(ss, data);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", company: registered }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 3. Automated Cloud Spreadsheet Builder (Zero-OAuth required!)
  if (e && e.parameter && e.parameter.action === "create_company_sheet") {
    try {
      const compName = e.parameter.companyName || "New Textile Factory";
      const ownerEmail = e.parameter.ownerEmail || "";
      const code = (e.parameter.companyCode || ("CO-" + Math.floor(1000 + Math.random() * 9000))).toUpperCase();

      // Create a brand new Google Spreadsheet on Drive
      const newSs = SpreadsheetApp.create(compName + " — 10-Stage Production Master");
      
      // Format all 11 production tabs on the new sheet
      setupSpreadsheet(newSs);

      // Make the spreadsheet accessible to all company employees
      try {
        const file = DriveApp.getFileById(newSs.getId());
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.EDIT);
      } catch (shareErr) {}

      // Share with owner if email provided
      if (ownerEmail && ownerEmail.indexOf("@") > -1) {
        try {
          newSs.addEditor(ownerEmail);
        } catch(shareErr) {}
      }

      // Also share with company admins
      try {
        newSs.addEditor("drlaljirpatel@gmail.com");
        newSs.addEditor("trishilbalar@gmail.com");
        newSs.addEditor("atharvabalar6@gmail.com");
      } catch(adminShareErr) {}

      // Register into Company Master Registry
      const regData = {
        name: compName,
        code: code,
        ownerName: e.parameter.ownerName || "Factory Owner",
        ownerEmail: ownerEmail,
        sheetId: newSs.getId(),
        scriptUrl: ScriptApp.getService().getUrl() || "",
        createdAt: new Date().toISOString(),
        status: "ACTIVE"
      };
      saveCompanyToSheet(ss, regData);

      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetId: newSs.getId(),
        sheetUrl: newSs.getUrl(),
        companyCode: code,
        title: newSs.getName()
      })).setMimeType(ContentService.MimeType.JSON);
    } catch (err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 4. Format & Populate All 11 Tabs on any linked Google Spreadsheet
  if (e && e.parameter && e.parameter.action === "populate_sheet_tabs" && e.parameter.sheetId) {
    try {
      const targetSs = SpreadsheetApp.openById(e.parameter.sheetId);
      setupSpreadsheet(targetSs);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        sheetId: targetSs.getId(),
        sheetUrl: targetSs.getUrl(),
        title: targetSs.getName(),
        message: "All 11 production tabs successfully formatted and populated!"
      })).setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 4b. Handle Piece Unit Updates passed via GET query parameter
  if (e && e.parameter && (e.parameter.action === "update_pieces" || e.parameter.action === "save_pieces" || e.parameter.action === "save_piece") && e.parameter.data) {
    try {
      const pData = JSON.parse(decodeURIComponent(e.parameter.data));
      savePieceUnitsToSheet(ss, pData.pieces || pData.piece || pData);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Pieces updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 5. Handle workflow updates passed via GET query parameter
  if (e && e.parameter && (e.parameter.action === "update_stage" || e.parameter.action === "update_workflow_item") && e.parameter.data) {
    try {
      const item = JSON.parse(decodeURIComponent(e.parameter.data));
      saveWorkflowItemToSheet(ss, item);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 6. Handle dispatch updates passed via GET query parameter
  if (e && e.parameter && e.parameter.action === "update_dispatch" && e.parameter.data) {
    try {
      const dsp = JSON.parse(decodeURIComponent(e.parameter.data));
      saveDispatchOrderToSheet(ss, dsp);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Dispatch updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 7. Handle stock transactions passed via GET query parameter
  if (e && e.parameter && (e.parameter.action === "log_stock_transaction" || e.parameter.action === "update_stock") && e.parameter.data) {
    try {
      const tx = JSON.parse(decodeURIComponent(e.parameter.data));
      saveStockTransactionToSheet(ss, tx);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Stock updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 8. Handle Material Save / Update via GET query parameter
  if (e && e.parameter && (e.parameter.action === "save_material" || e.parameter.action === "update_material") && e.parameter.data) {
    try {
      const mat = JSON.parse(decodeURIComponent(e.parameter.data));
      saveMaterialToSheet(ss, mat);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Material saved" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 9. Handle Order Slip Save / Update via GET query parameter
  if (e && e.parameter && (e.parameter.action === "save_order_slip" || e.parameter.action === "update_order_slip") && e.parameter.data) {
    try {
      const slip = JSON.parse(decodeURIComponent(e.parameter.data));
      saveOrderSlipToSheet(ss, slip);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Order slip saved" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 10. Handle Full Batch State Sync via GET query parameter
  if (e && e.parameter && e.parameter.action === "sync_all_full" && e.parameter.data) {
    try {
      const batch = JSON.parse(decodeURIComponent(e.parameter.data));
      saveFullBatchStateToSheet(ss, batch);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Full state synchronized" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }
  // 9. Handle Material Delete via GET query parameter
  if (e && e.parameter && (e.parameter.action === "delete_material") && (e.parameter.id || e.parameter.sku || e.parameter.data)) {
    try {
      const idOrSku = e.parameter.id || e.parameter.sku || e.parameter.data;
      deleteMaterialFromSheet(ss, idOrSku);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Material deleted" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // 9b. Handle Order Slip Delete via GET query parameter
  if (e && e.parameter && (e.parameter.action === "delete_order_slip" || e.parameter.action === "delete_slip") && (e.parameter.id || e.parameter.jobNo || e.parameter.data)) {
    try {
      const idOrJob = e.parameter.id || e.parameter.jobNo || e.parameter.data;
      deleteOrderSlipFromSheet(ss, idOrJob);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Order slip and related lots deleted" }))
        .setMimeType(ContentService.MimeType.JSON);
    } catch(err) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  // Standard fetch: return full dataset across all production & floor tabs
  let wfSheet = ss.getSheetByName("Fabric Design Workflow");
  let wfData = [];
  if (wfSheet) {
    const range = wfSheet.getDataRange().getValues();
    wfData = range.length > 1 ? range.slice(1) : [];
  }

  let pcSheet = ss.getSheetByName("Piece-Level Tracking");
  let pcData = [];
  if (pcSheet) {
    const range = pcSheet.getDataRange().getValues();
    pcData = range.length > 1 ? range.slice(1) : [];
  }

  let slipSheet = ss.getSheetByName("Master Order Slips");
  let slipData = [];
  if (slipSheet) {
    const range = slipSheet.getDataRange().getValues();
    slipData = range.length > 1 ? range.slice(1) : [];
  }

  let invSheet = ss.getSheetByName("Live Inventory & Materials") || ss.getSheetByName("Live Inventory");
  let invData = [];
  if (invSheet) {
    const range = invSheet.getDataRange().getValues();
    invData = range.length > 1 ? range.slice(1) : [];
  }

  let dspSheet = ss.getSheetByName("Dispatch & Shipments");
  let dspData = [];
  if (dspSheet) {
    const range = dspSheet.getDataRange().getValues();
    dspData = range.length > 1 ? range.slice(1) : [];
  }

  let txSheet = ss.getSheetByName("Stock Transactions");
  let txData = [];
  if (txSheet) {
    const range = txSheet.getDataRange().getValues();
    txData = range.length > 1 ? range.slice(1) : [];
  }

  let partySheet = ss.getSheetByName("Party Invoices & Receivables") || ss.getSheetByName("Party Invoices");
  let partyData = [];
  if (partySheet) {
    const range = partySheet.getDataRange().getValues();
    partyData = range.length > 1 ? range.slice(1) : [];
  }

  let paySheet = ss.getSheetByName("Supplier Payables & Imports") || ss.getSheetByName("Supplier Payables");
  let payData = [];
  if (paySheet) {
    const range = paySheet.getDataRange().getValues();
    payData = range.length > 1 ? range.slice(1) : [];
  }

  let payrollSheet = ss.getSheetByName("Staff Payroll") || ss.getSheetByName("Payroll");
  let payrollData = [];
  if (payrollSheet) {
    const range = payrollSheet.getDataRange().getValues();
    payrollData = range.length > 1 ? range.slice(1) : [];
  }

  let expSheet = ss.getSheetByName("Expenses & Utilities") || ss.getSheetByName("Expenses");
  let expData = [];
  if (expSheet) {
    const range = expSheet.getDataRange().getValues();
    expData = range.length > 1 ? range.slice(1) : [];
  }

  const payload = {
    status: "success",
    timestamp: new Date().toISOString(),
    workflow: wfData,
    pieces: pcData,
    orderSlips: slipData,
    inventory: invData,
    dispatch: dspData,
    transactions: txData,
    partyInvoices: partyData,
    supplierPayables: payData,
    payroll: payrollData,
    expenses: expData
  };

  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message || String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    let body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (parseErr) {}
    }
    let ss = null;
    const targetSheetId = (body && body.sheetId) || (e && e.parameter && e.parameter.sheetId);
    if (targetSheetId) {
      try { ss = SpreadsheetApp.openById(targetSheetId); } catch (e) {}
    }
    if (!ss) {
      try { ss = SpreadsheetApp.getActiveSpreadsheet(); } catch (e) {}
    }
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet target not found or access denied."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (body.action === "register_master_workspace" || body.action === "update_master_workspace") {
      registerMasterWorkspace(body.workspace || body.data || body);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Master workspace updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "register_master_employee") {
      registerMasterEmployee(body.employee || body.data || body);
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Employee registered in master sheet" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "upload_photo") {
      const publicUrl = uploadPhotoToDrive(body.lotNumber, body.base64 || body.imageBase64, body.mimeType, body.stage);
      if (body.lotNumber && publicUrl) {
        let item = {
          lotNumber: body.lotNumber,
          currentStage: body.stage || "fabric",
          designImage: publicUrl,
          notes: body.notes || ""
        };
        saveWorkflowItemToSheet(ss, item);
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        url: publicUrl,
        message: "Photo uploaded to Google Drive successfully"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (body.action === "save_order_slip" || body.action === "update_order_slip") {
      saveOrderSlipToSheet(ss, body.slip || body.orderSlip || body.data || body);
    }

    if (body.action === "update_pieces" || body.action === "save_pieces" || body.action === "save_piece") {
      savePieceUnitsToSheet(ss, body.pieces || body.piece || body.data || body);
    }

    if (body.action === "update_stage" || body.action === "update_workflow_item") {
      saveWorkflowItemToSheet(ss, body.item || body);
    }

    if (body.action === "update_dispatch" || body.action === "save_dispatch") {
      saveDispatchOrderToSheet(ss, body.order || body.data || body);
    }

    if (body.action === "log_stock_transaction" || body.action === "update_stock") {
      saveStockTransactionToSheet(ss, body.tx || body.data || body);
    }

    if (body.action === "save_material" || body.action === "update_material") {
      saveMaterialToSheet(ss, body.material || body.mat || body.data || body);
    }

    if (body.action === "delete_material") {
      deleteMaterialFromSheet(ss, body.id || body.sku || body.data);
    }

    if (body.action === "delete_order_slip" || body.action === "delete_slip") {
      deleteOrderSlipFromSheet(ss, body.id || body.jobNo || body.data);
    }

    if (body.action === "sync_all_full") {
      saveFullBatchStateToSheet(ss, body);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Google Sheet updated successfully"
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.message || String(err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadPhotoToDrive(lotNumber, base64Data, mimeType, stage) {
  try {
    if (!base64Data) return "";
    const folderName = "Factory Design Photos";
    let folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
      try {
        folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (e) {}
    }

    let cleanBase64 = base64Data;
    if (base64Data.indexOf(",") > -1) {
      cleanBase64 = base64Data.split(",")[1];
    }

    const decoded = Utilities.base64Decode(cleanBase64);
    const safeLot = String(lotNumber || "LOT").replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeStage = String(stage || "photo").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = safeLot + "_" + safeStage + "_" + new Date().getTime() + ".jpg";
    const blob = Utilities.newBlob(decoded, mimeType || "image/jpeg", fileName);
    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (e) {}

    const fileId = file.getId();
    // Direct public viewable image link via Google CDN:
    return "https://lh3.googleusercontent.com/d/" + fileId;
  } catch (e) {
    Logger.log("Drive upload error: " + e.message);
    return "";
  }
}

function saveWorkflowItemToSheet(ss, item) {
  if (!item) return;
  let wfSheet = ss.getSheetByName("Fabric Design Workflow");
  if (!wfSheet) {
    setupSpreadsheet();
    wfSheet = ss.getSheetByName("Fabric Design Workflow");
  }

  const lotNumber = String(item.lotNumber || item.jobNo || "");
  const data = wfSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === lotNumber) {
      rowIndex = i + 1;
      break;
    }
  }

  const photoUrl = (item.photos && item.photos.length > 0 && item.photos[0].url) ? item.photos[0].url : (item.designImage || "");
  const noteText = item.notes || "";
  const finalNotesCol = photoUrl ? (noteText ? `${noteText} | Photo: ${photoUrl}` : `Photo: ${photoUrl}`) : noteText;

  if (rowIndex > 0) {
    const existingRow = data[rowIndex - 1];
    const newLot = item.lotNumber || item.jobNo || existingRow[0];
    const newClient = item.clientName || item.partyName || existingRow[1];
    const newChalan = item.challanSlip || item.chalanNumber || existingRow[2];
    const newDate = item.dueDate || existingRow[3];
    const newDesign = item.designNumber || existingRow[4];
    const newDesignName = item.designName || existingRow[5];
    const newFabric = item.fabricType || existingRow[6];
    const newColor = item.fabricColor || existingRow[7];
    const newQty = Number(item.quantity) || Number(item.pieces) || existingRow[8];
    const newStage = formatStageDisplayName(item.currentStage || existingRow[9]);
    const newStep = getStepNumber(item.currentStage || existingRow[9]);
    const newBreakdown = `${item.currentStage || existingRow[9]}: ${newQty} pcs`;
    const newGood = existingRow[12] || newQty;
    const newAlter = existingRow[13] || 0;
    const newPriority = item.isUrgent ? "URGENT" : ((item.priority || existingRow[14] || "NORMAL").toUpperCase());
    const newDue = item.dueDate || existingRow[15];
    const newQc = item.qualityStatus || existingRow[16] || "GOOD";
    const newAlterRes = existingRow[17] || "pending";
    const newAlterReason = existingRow[18] || "";
    const newOp = item.assignedOperator || existingRow[19] || "Floor Operator";
    const newDelChalan = existingRow[20] || "";
    const newDelDate = existingRow[21] || "";
    const newBill = existingRow[22] || "";
    const newComp = existingRow[23] || 0;
    const newFirm = existingRow[24] || "Udhna Factory";
    
    let prevNotes = String(existingRow[25] || "");
    let finalNote = finalNotesCol;
    if (!photoUrl && prevNotes.includes("http")) {
      finalNote = item.notes ? `${item.notes} | ${prevNotes.match(/Photo:\s*https?:\/\/[^\s|]+/)?.[0] || prevNotes}` : prevNotes;
    } else if (photoUrl && prevNotes && !prevNotes.includes(photoUrl)) {
      finalNote = `${prevNotes.replace(/\|?\s*Photo:\s*https?:\/\/[^\s|]+/gi, '').trim()} | Photo: ${photoUrl}`.trim();
    }

    const rowValues = [
      newLot, newClient, newChalan, newDate, newDesign,
      newDesignName, newFabric, newColor, newQty, newStage,
      newStep, newBreakdown, newGood, newAlter, newPriority,
      newDue, newQc, newAlterRes, newAlterReason, newOp,
      newDelChalan, newDelDate, newBill, newComp, newFirm,
      finalNote
    ];

    wfSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
    try { saveFabricColorMatrixToSheet(ss, item); } catch (e) {}
    try { if (item.individualPieces && item.individualPieces.length > 0) savePieceUnitsToSheet(ss, item.individualPieces); } catch (e) {}
    return;
  }

  const rowValues = [
    item.lotNumber || item.jobNo,
    item.clientName || item.partyName || "Direct Client",
    item.challanSlip || item.chalanNumber || "CHL-2026",
    item.dueDate || new Date().toISOString().split("T")[0],
    item.designNumber || "DSG-100",
    item.designName || "Textile Design",
    item.fabricType || "Silk Georgette",
    item.fabricColor || "Natural",
    Number(item.quantity) || Number(item.pieces) || 50,
    formatStageDisplayName(item.currentStage || "fabric"),
    getStepNumber(item.currentStage),
    `${item.currentStage}: ${item.quantity || item.pieces || 50} pcs`,
    Number(item.quantity) || Number(item.pieces) || 50,
    0,
    item.isUrgent ? "URGENT" : (item.priority || "NORMAL").toUpperCase(),
    item.dueDate || "",
    item.qualityStatus || "GOOD",
    "pending",
    "",
    "Floor Operator",
    "",
    "",
    "",
    0,
    "Udhna Factory",
    finalNotesCol
  ];

  wfSheet.appendRow(rowValues);
  try { saveFabricColorMatrixToSheet(ss, item); } catch (e) {}
  try { if (item.individualPieces && item.individualPieces.length > 0) savePieceUnitsToSheet(ss, item.individualPieces); } catch (e) {}
}

function formatStageDisplayName(stage) {
  const map = {
    'fabric': '1. Fabric Inward',
    'chalan': '2. Chalan (Slip)',
    'inspection': '3. Inspection (Good / Return)',
    'patta': '4. Stitching Patta',
    'stitching_patta': '4. Stitching Patta',
    'embroidery': '5. Embroidery Machine (25-Head)',
    'dhaga_cutting': '6. Dhaga Cutting',
    'inspection_alter': '7. Alter Inspection',
    'altering': '8. Altering / Rework',
    'folding': '9. Folding & Packing',
    'prepare_dispatch': '10. Prepare for Dispatch'
  };
  return map[String(stage).toLowerCase()] || stage;
}

function getStepNumber(stage) {
  const map = {
    'fabric': 1, 'chalan': 2, 'inspection': 3, 'patta': 4,
    'stitching_patta': 4, 'embroidery': 5, 'dhaga_cutting': 6,
    'inspection_alter': 7, 'altering': 8, 'folding': 9, 'prepare_dispatch': 10
  };
  return map[String(stage).toLowerCase()] || 1;
}

/**
 * =========================================================================
 * UNIVERSAL MASTER DIRECTORY (Spreadsheet ID: 1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ)
 * Automatically keeps all employees & devices connected to the latest active sheet.
 * =========================================================================
 */
const MASTER_REGISTRY_SPREADSHEET_ID = "1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ";

function getMasterRegistrySS() {
  try {
    return SpreadsheetApp.openById(MASTER_REGISTRY_SPREADSHEET_ID);
  } catch (e) {
    try { return SpreadsheetApp.getActiveSpreadsheet(); } catch (err) { return null; }
  }
}

/**
 * Reads active workspace configuration from Master Registry (1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ)
 */
function lookupMasterWorkspace(companyCode) {
  const cleanCode = String(companyCode || "TRISHARTH-HQ").trim().toUpperCase();
  const masterSS = getMasterRegistrySS();
  if (!masterSS) {
    return {
      name: "Trisharth",
      code: "TRISHARTH-HQ",
      sheetId: "1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU",
      sheetUrl: "https://docs.google.com/spreadsheets/d/1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU/edit",
      scriptUrl: "https://script.google.com/macros/s/AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q/exec",
      deploymentId: "AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q"
    };
  }

  let wsSheet = masterSS.getSheetByName("Company_Workspaces") || masterSS.getSheetByName("Sheet1");
  if (!wsSheet) {
    try {
      wsSheet = masterSS.insertSheet("Company_Workspaces");
      wsSheet.appendRow([
        'Company Code', 'Company Name', 'Active Sheet ID', 'Active Sheet URL',
        'Script Webhook URL', 'Deployment ID', 'Last Updated', 'Updated By Email'
      ]);
    } catch(e) {
      wsSheet = masterSS.getSheets()[0];
    }
  }

  const data = wsSheet.getDataRange().getValues();
  if (data.length > 1) {
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const rowCode = String(row[0] || "").trim().toUpperCase();
      if (rowCode === cleanCode || (cleanCode.includes("TRISHARTH") && rowCode.includes("TRISHARTH"))) {
        return {
          code: rowCode,
          name: String(row[1] || "Trisharth"),
          sheetId: String(row[2] || ""),
          sheetUrl: String(row[3] || (row[2] ? `https://docs.google.com/spreadsheets/d/${row[2]}/edit` : "")),
          scriptUrl: String(row[4] || ""),
          deploymentId: String(row[5] || ""),
          lastUpdated: String(row[6] || new Date().toISOString()),
          updatedBy: String(row[7] || "")
        };
      }
    }
  }

  return {
    name: "Trisharth",
    code: cleanCode,
    sheetId: "1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU",
    sheetUrl: "https://docs.google.com/spreadsheets/d/1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU/edit",
    scriptUrl: "https://script.google.com/macros/s/AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q/exec",
    deploymentId: "AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q"
  };
}

/**
 * Saves/Registers active workspace configuration to Master Registry (1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ)
 */
function registerMasterWorkspace(workspaceData) {
  const masterSS = getMasterRegistrySS();
  if (!masterSS) return false;

  let wsSheet = masterSS.getSheetByName("Company_Workspaces");
  if (!wsSheet) {
    try {
      wsSheet = masterSS.insertSheet("Company_Workspaces");
      wsSheet.appendRow([
        'Company Code', 'Company Name', 'Active Sheet ID', 'Active Sheet URL',
        'Script Webhook URL', 'Deployment ID', 'Last Updated', 'Updated By Email'
      ]);
    } catch(e) {
      wsSheet = masterSS.getSheets()[0];
    }
  }

  const code = String(workspaceData.companyCode || workspaceData.code || "TRISHARTH-HQ").trim().toUpperCase();
  const name = workspaceData.companyName || workspaceData.name || "Trisharth";
  const sheetId = String(workspaceData.sheetId || "").trim();
  const sheetUrl = workspaceData.sheetUrl || (sheetId ? `https://docs.google.com/spreadsheets/d/${sheetId}/edit` : "");
  const scriptUrl = workspaceData.scriptUrl || "";
  const deploymentId = workspaceData.deploymentId || "";
  const lastUpdated = new Date().toISOString();
  const updatedBy = workspaceData.updatedBy || workspaceData.ownerEmail || "";

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
  return true;
}

/**
 * Logs an employee sign-in or registration into Master Registry (1t3kPLZw_SKIxt-fEdYGR_Mdl8qA8gDTFBCGFU5hsSoQ)
 */
function registerMasterEmployee(empData) {
  const masterSS = getMasterRegistrySS();
  if (!masterSS) return false;

  let empSheet = masterSS.getSheetByName("Registered_Employees");
  if (!empSheet) {
    try {
      empSheet = masterSS.insertSheet("Registered_Employees");
      empSheet.appendRow([
        'Email', 'Full Name', 'Role', 'Company Code', 'Last Login Timestamp', 'Platform'
      ]);
    } catch(e) {
      empSheet = masterSS.getSheets()[0];
    }
  }

  const email = String(empData.email || "").trim().toLowerCase();
  if (!email) return false;
  const name = empData.name || empData.fullName || email.split('@')[0];
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
  return true;
}

/**
 * Company Registry Management in Google Sheets
 */
function lookupCompanyInSheet(ss, companyCode) {
  if (!companyCode) return null;
  const cleanCode = String(companyCode).trim().toUpperCase();

  // Trisharth built-in HQ
  if (cleanCode === "TRISHARTH-HQ" || cleanCode === "TRISHARTH") {
    return {
      name: "Trisharth",
      code: "TRISHARTH-HQ",
      ownerName: "Atharva Balar",
      ownerEmail: "atharvabalar6@gmail.com",
      sheetId: "1EmktCF7d0DjqxnF04Eh1AiQJd6RHOy5GoAMpNvz0sFU",
      scriptUrl: "https://script.google.com/macros/s/AKfycbxlA7_cP7FeIuXjJrqgj9TdVvtu5ok0WRlRU-n5JaS2OS2d16xVVW9QMG500Atqlwxc2Q/exec",
      isPrimary: true
    };
  }

  const regSheet = ss.getSheetByName("Company Master Registry");
  if (!regSheet) return null;

  const data = regSheet.getDataRange().getValues();
  if (data.length <= 1) return null;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowCode = String(row[1] || "").trim().toUpperCase();
    if (rowCode === cleanCode) {
      return {
        name: String(row[0] || ""),
        code: rowCode,
        ownerName: String(row[2] || ""),
        ownerEmail: String(row[3] || ""),
        sheetId: String(row[4] || ""),
        scriptUrl: String(row[5] || ""),
        createdAt: String(row[6] || ""),
        status: String(row[7] || "ACTIVE"),
        isPrimary: false
      };
    }
  }
  return null;
}

function saveCompanyToSheet(ss, companyData) {
  let regSheet = ss.getSheetByName("Company Master Registry");
  if (!regSheet) {
    regSheet = ss.insertSheet("Company Master Registry");
    regSheet.appendRow([
      'Company Name', 'Company Code', 'Owner Name', 'Owner Email',
      'Google Sheet ID', 'Apps Script Webhook', 'Created At', 'Status'
    ]);
  }

  const name = companyData.name || companyData.companyName || "New Company";
  const code = (companyData.code || companyData.companyCode || name.slice(0, 4) + "-" + Math.floor(1000 + Math.random() * 9000)).toUpperCase();
  const ownerName = companyData.ownerName || "Factory Owner";
  const ownerEmail = companyData.ownerEmail || "";
  const sheetId = companyData.sheetId || ss.getId();
  const scriptUrl = companyData.scriptUrl || "";
  const createdAt = new Date().toISOString().split("T")[0];
  const status = "ACTIVE";

  // Check if exists, update if found
  const data = regSheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1] || "").trim().toUpperCase() === code) {
      regSheet.getRange(i + 1, 1, 1, 8).setValues([[name, code, ownerName, ownerEmail, sheetId, scriptUrl, createdAt, status]]);
      return { name, code, ownerName, ownerEmail, sheetId, scriptUrl, createdAt, status };
    }
  }

  regSheet.appendRow([name, code, ownerName, ownerEmail, sheetId, scriptUrl, createdAt, status]);
  return { name, code, ownerName, ownerEmail, sheetId, scriptUrl, createdAt, status };
}

/**
 * Save / Update Dispatch Orders in "Dispatch & Shipments" tab
 */
function saveDispatchOrderToSheet(ss, dsp) {
  if (!dsp) return;
  let sheet = ss.getSheetByName("Dispatch & Shipments");
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName("Dispatch & Shipments");
  }

  const dspNumber = String(dsp.dispatchNumber || dsp.id || "").trim();
  const cleanDsp = dspNumber.toLowerCase().replace(/^dsp-/, '');
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const rowDsp = String(data[i][0] || "").trim();
    const cleanRowDsp = rowDsp.toLowerCase().replace(/^dsp-/, '');
    if (rowDsp.toLowerCase() === dspNumber.toLowerCase() || cleanRowDsp === cleanDsp) {
      rowIndex = i + 1;
      break;
    }
  }

  const qty = Number(dsp.quantity) || 1;
  const unitPrice = Number(dsp.unitPrice) || 0;
  const subtotal = Number(dsp.subtotal) || (qty * unitPrice);
  const tax = Number(dsp.taxAmount) || Math.round(subtotal * 0.05);
  const total = Number(dsp.totalInvoiceAmount) || (subtotal + tax);
  const paid = Number(dsp.amountPaid) || 0;
  const balance = total - paid;
  const statusStr = String(dsp.status || "ready_to_dispatch").toUpperCase().replace(/_/g, " ");

  const rowValues = [
    dspNumber.toUpperCase().startsWith('DSP-') ? dspNumber : `DSP-${dspNumber}`,
    dsp.partyName || "Direct Buyer",
    statusStr,
    dsp.productName || "Finished Fabric",
    qty,
    dsp.unit || "sarees",
    unitPrice,
    subtotal,
    tax,
    total,
    paid,
    balance,
    paid >= total ? "PAID IN FULL" : paid > 0 ? "PARTIAL" : "UNPAID",
    dsp.transporterName || "",
    dsp.trackingNumber || "",
    dsp.readyDate || new Date().toISOString().split("T")[0],
    dsp.dispatchedDate || "",
    dsp.invoiceNumber || "",
    dsp.deliveryAddress || ""
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Save / Log Stock Transactions & Update "Live Inventory & Materials" tab
 */
function saveStockTransactionToSheet(ss, tx) {
  if (!tx) return;
  
  // 1. Append transaction row to "Stock Transactions"
  let txSheet = ss.getSheetByName("Stock Transactions");
  if (txSheet) {
    const txId = tx.id || ("TX-" + Date.now());
    const dateStr = tx.timestamp || new Date().toISOString();
    const qty = Number(tx.quantity) || 0;
    const unitCost = Number(tx.unitCost) || 0;
    const totalCost = Number(tx.totalCost) || (qty * unitCost);

    txSheet.appendRow([
      txId,
      dateStr,
      `${tx.sku || tx.itemSku || ''} (${tx.name || tx.itemName || ''})`,
      tx.category || "General",
      String(tx.type || "IN").toUpperCase(),
      qty,
      tx.unit || "meters",
      unitCost,
      totalCost,
      tx.operator || "Floor Operator",
      tx.orderRef || tx.machineOrOrderRef || "",
      tx.notes || ""
    ]);
  }

  // 2. Update stock level in "Live Inventory & Materials"
  let invSheet = ss.getSheetByName("Live Inventory & Materials") || ss.getSheetByName("Live Inventory");
  if (invSheet) {
    const cleanTarget = String(tx.sku || tx.itemSku || tx.name || tx.itemName || '').trim().toLowerCase().replace(/^mat-/, '');
    const targetName = String(tx.name || tx.itemName || '').trim().toLowerCase();
    const invData = invSheet.getDataRange().getValues();

    for (let i = 1; i < invData.length; i++) {
      const rowSku = String(invData[i][0] || "").trim().toLowerCase();
      const rowName = String(invData[i][1] || "").trim().toLowerCase();

      if (rowSku === cleanTarget || rowName === targetName || (rowSku && cleanTarget.includes(rowSku)) || (rowName && targetName.includes(rowName))) {
        let newStock = (typeof tx.currentStock === 'number' && !isNaN(tx.currentStock)) 
          ? tx.currentStock 
          : Number(invData[i][6]) || 0;

        if (typeof tx.currentStock !== 'number' || isNaN(tx.currentStock)) {
          if (String(tx.type).toUpperCase() === "OUT") {
            newStock = Math.max(0, newStock - (Number(tx.quantity) || 0));
          } else {
            newStock = newStock + (Number(tx.quantity) || 0);
          }
        }

        invSheet.getRange(i + 1, 7).setValue(newStock);
        invSheet.getRange(i + 1, 16).setValue(new Date().toISOString().split("T")[0]);
        break;
      }
    }
  }
}

/**
 * Save / Update or Create New Material in "Live Inventory & Materials" tab
 */
function saveMaterialToSheet(ss, mat) {
  if (!mat) return;
  let sheet = ss.getSheetByName("Live Inventory & Materials") || ss.getSheetByName("Live Inventory");
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName("Live Inventory & Materials");
  }

  const code = String(mat.code || mat.sku || mat.id || ("SKU-" + Date.now().toString().slice(-4))).trim();
  const cleanCode = code.toLowerCase().replace(/^mat-/, '');
  const matName = String(mat.name || "Raw Material").trim();
  const category = String(mat.category || "Fabric Rolls");
  const size = String(mat.size || "Standard");
  const color = String(mat.colorName || mat.color || "Default");
  const supplier = String(mat.supplier || mat.vendor || "Surat Textile Market");
  const currentStock = Number(mat.currentStock) || 0;
  const unit = String(mat.unit || "meters").toLowerCase();
  const minThreshold = Number(mat.minThreshold) || 100;
  const locationBin = String(mat.locationBin || "Bay A-01");
  const lotNumber = String(mat.lotNumber || ("LOT-MAT-" + Date.now().toString().slice(-4)));
  const unitCost = Number(mat.unitCost) || 0;
  const burnRate = Number(mat.consumptionRatePerHour || mat.burnRate) || 10;
  const today = new Date().toISOString().split("T")[0];

  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const rowSku = String(data[i][0] || "").trim().toLowerCase();
    const cleanRowSku = rowSku.replace(/^mat-/, '');
    const rowName = String(data[i][1] || "").trim().toLowerCase();

    if (rowSku === cleanCode || cleanRowSku === cleanCode || rowName === matName.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  const rowNum = rowIndex > 0 ? rowIndex : (data.length + 1);
  const rowValues = [
    code.toUpperCase().startsWith("SKU-") || code.toUpperCase().startsWith("MAT-") || code.includes("-") ? code : `SKU-${code}`,
    matName,
    category,
    size,
    color,
    supplier,
    currentStock,
    unit,
    minThreshold,
    `=IF(G${rowNum}<=0, "DEPLETED", IF(G${rowNum}<=I${rowNum}, "LOW STOCK ALERT", "STABLE"))`,
    locationBin,
    lotNumber,
    unitCost,
    `=G${rowNum}*M${rowNum}`,
    burnRate,
    today
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

/**
 * Delete Material from "Live Inventory & Materials" tab
 */
function deleteMaterialFromSheet(ss, matIdOrSku) {
  if (!matIdOrSku) return;
  let sheet = ss.getSheetByName("Live Inventory & Materials") || ss.getSheetByName("Live Inventory");
  if (!sheet) return;

  const target = String(matIdOrSku).trim().toLowerCase().replace(/^mat-/, '');
  const data = sheet.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    const rowSku = String(data[i][0] || "").trim().toLowerCase().replace(/^mat-/, '');
    const rowName = String(data[i][1] || "").trim().toLowerCase();
    if (rowSku === target || rowName === target) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

/**
 * Delete Order Slip and all related lot rows from Spreadsheet
 */
function deleteOrderSlipFromSheet(ss, slipIdOrJobNo) {
  if (!slipIdOrJobNo) return;
  const target = String(slipIdOrJobNo).trim().toLowerCase().replace(/^slip-/, '');

  // 1. Delete from Master Order Slips
  let slipSheet = ss.getSheetByName("Master Order Slips");
  if (slipSheet) {
    const slipData = slipSheet.getDataRange().getValues();
    for (let i = slipData.length - 1; i >= 1; i--) {
      const rowJob = String(slipData[i][0] || "").trim().toLowerCase().replace(/^slip-/, '');
      if (rowJob === target || rowJob.includes(target) || target.includes(rowJob)) {
        slipSheet.deleteRow(i + 1);
      }
    }
  }

  // 2. Delete matching rows from Fabric Design Workflow
  let wfSheet = ss.getSheetByName("Fabric Design Workflow");
  if (wfSheet) {
    const wfData = wfSheet.getDataRange().getValues();
    for (let i = wfData.length - 1; i >= 1; i--) {
      const rowJob = String(wfData[i][0] || "").trim().toLowerCase().replace(/^slip-/, '');
      const rowChalan = String(wfData[i][2] || "").trim().toLowerCase();
      if (rowJob === target || rowJob.includes(target) || target.includes(rowJob) || rowChalan === target) {
        wfSheet.deleteRow(i + 1);
      }
    }
  }

  // 3. Delete matching rows from Fabric & Color Matrix
  let matrixSheet = ss.getSheetByName("Fabric & Color Matrix");
  if (matrixSheet) {
    const matData = matrixSheet.getDataRange().getValues();
    for (let i = matData.length - 1; i >= 1; i--) {
      const rowJob = String(matData[i][0] || "").trim().toLowerCase().replace(/^slip-/, '');
      if (rowJob === target || rowJob.includes(target) || target.includes(rowJob)) {
        matrixSheet.deleteRow(i + 1);
      }
    }
  }

  // 4. Delete matching rows from Piece-Level Tracking
  let pieceSheet = ss.getSheetByName("Piece-Level Tracking");
  if (pieceSheet) {
    const pcData = pieceSheet.getDataRange().getValues();
    for (let i = pcData.length - 1; i >= 1; i--) {
      const rowJob = String(pcData[i][1] || "").trim().toLowerCase().replace(/^slip-/, '');
      if (rowJob === target || rowJob.includes(target) || target.includes(rowJob)) {
        pieceSheet.deleteRow(i + 1);
      }
    }
  }
}

/**
 * Save / Update Master Order Slips in "Master Order Slips" tab
 */
function saveOrderSlipToSheet(ss, slip) {
  if (!slip) return;
  let sheet = ss.getSheetByName("Master Order Slips");
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName("Master Order Slips");
  }
  const jobNo = String(slip.jobNo || slip.id || "").trim();
  if (!jobNo) return;
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === jobNo.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  const fabricColsStr = (slip.fabricColumns || []).join(", ");
  const colorBreakdownStr = (slip.colorRows || []).map(function(cr) {
    const fabBreak = Object.keys(cr.fabricQuantities || {})
      .map(function(f) { return f + ": " + cr.fabricQuantities[f]; })
      .join(", ");
    return "[" + cr.colorName + ": " + (fabBreak || "None") + "]";
  }).join("; ");

  const row = [
    jobNo,
    slip.partyName || "Direct Client",
    slip.chalanNo || "N/A",
    slip.date || new Date().toISOString().split("T")[0],
    Number(slip.totalPcs) || 0,
    fabricColsStr || "Standard Kali",
    (slip.colorRows && slip.colorRows.length) || 0,
    colorBreakdownStr || "Standard Breakdown",
    slip.inwardChallanNotes || "",
    slip.calculationNotes || "",
    slip.deliveryChalanNo || "Pending",
    slip.deliveryDate || "Pending",
    slip.billNo || "Pending",
    Number(slip.piecesCompleted) || 0,
    slip.firmName || "Udhna Textile",
    (slip.status || "ACTIVE").toUpperCase(),
    slip.createdAt || new Date().toISOString(),
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

/**
 * Save / Update Piece-Level Tracking in "Piece-Level Tracking" tab with high-speed bulk batch writing
 */
function savePieceUnitsToSheet(ss, pieces) {
  if (!pieces) return;
  const piecesList = Array.isArray(pieces) ? pieces : [pieces];
  if (piecesList.length === 0) return;

  let sheet = ss.getSheetByName("Piece-Level Tracking");
  if (!sheet) {
    setupSpreadsheet();
    sheet = ss.getSheetByName("Piece-Level Tracking");
  }
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const tagToRow = {};
  for (let i = 1; i < data.length; i++) {
    const tag = String(data[i][0] || "").trim().toLowerCase();
    if (tag) tagToRow[tag] = i + 1;
  }

  const rowsToUpdate = []; // { rowNum: number, row: any[] }
  const newRows = [];      // any[][]

  const nowIso = new Date().toISOString();

  const defectPieces = piecesList.filter(function(p) {
    if (!p) return false;
    const stageStr = String(p.currentStage || "").toLowerCase();
    const statusStr = String(p.status || "").toLowerCase();
    return stageStr.includes("alter") || 
      stageStr.includes("insp-2") ||
      statusStr.includes("alter") || 
      statusStr.includes("rework") || 
      statusStr.includes("reject") || 
      (p.defectReason && String(p.defectReason).trim() !== "" && String(p.defectReason).toLowerCase() !== "none") ||
      (p.alterNotes && String(p.alterNotes).trim() !== "");
  });

  defectPieces.forEach(function(p) {
    const pieceTag = String(p.pieceTag || p.id || "").trim();
    if (!pieceTag) return;
    const tagKey = pieceTag.toLowerCase();
    const stageStr = String(p.currentStage || "fabric");
    const statusStr = String(p.status || "good").toUpperCase();

    const row = [
      pieceTag,
      p.jobNo || "LOT-9000",
      p.lotNumber || p.jobNo || "LOT-9000",
      Number(p.pieceNumber) || 1,
      p.designNumber || "DSG-100",
      p.fabricType || "Silk Georgette",
      p.fabricColor || "Natural",
      p.partyName || "Direct Client",
      getStepNumber(stageStr),
      formatStageDisplayName(stageStr),
      statusStr,
      p.defectReason || "None",
      p.alterNotes || "",
      p.assignedOperator || "Floor Lead",
      p.chalanNo || "N/A",
      p.lastUpdated || nowIso,
      nowIso
    ];

    if (tagToRow[tagKey]) {
      rowsToUpdate.push({ rowNum: tagToRow[tagKey], row: row });
    } else {
      newRows.push(row);
      tagToRow[tagKey] = data.length + newRows.length;
    }
  });

  // Fast Bulk Write for existing updated rows
  rowsToUpdate.forEach(function(item) {
    try {
      sheet.getRange(item.rowNum, 1, 1, item.row.length).setValues([item.row]);
    } catch(e) {}
  });

  // Super-Fast Bulk Batch Append with automatic row expansion
  if (newRows.length > 0) {
    const startRow = sheet.getLastRow() + 1;
    const requiredTotalRows = startRow + newRows.length;
    const currentMaxRows = sheet.getMaxRows();
    if (requiredTotalRows > currentMaxRows) {
      sheet.insertRowsAfter(currentMaxRows, (requiredTotalRows - currentMaxRows) + 100);
    }
    sheet.getRange(startRow, 1, newRows.length, newRows[0].length).setValues(newRows);
  }
}

/**
 * Save / Update Fabric & Color Matrix in "Fabric & Color Matrix" tab
 */
function saveFabricColorMatrixToSheet(ss, item) {
  if (!item) return;
  let matrixSheet = ss.getSheetByName("Fabric & Color Matrix");
  if (!matrixSheet) {
    setupSpreadsheet();
    matrixSheet = ss.getSheetByName("Fabric & Color Matrix");
  }
  if (!matrixSheet) return;

  const lotNumber = String(item.lotNumber || item.jobNo || "").trim();
  if (!lotNumber) return;
  const data = matrixSheet.getDataRange().getValues();
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === lotNumber.toLowerCase()) {
      rowIndex = i + 1;
      break;
    }
  }

  const pcs = Number(item.quantity) || Number(item.pieces) || 0;
  const stage = String(item.currentStage || "fabric").toLowerCase();
  const b = item.stagePieceBreakdown || {};

  const s1 = b['fabric'] !== undefined ? b['fabric'] : (stage.includes('fabric') || stage === '1' ? pcs : 0);
  const s2 = b['chalan'] !== undefined ? b['chalan'] : (stage.includes('chalan') || stage === '2' ? pcs : 0);
  const s3 = b['inspection'] !== undefined ? b['inspection'] : (stage.includes('insp-1') || (stage.includes('inspection') && !stage.includes('alter')) || stage === '3' ? pcs : 0);
  const s4 = b['stitching_patta'] !== undefined ? b['stitching_patta'] : (stage.includes('patta') || stage.includes('stitching') || stage === '4' ? pcs : 0);
  const s5 = b['embroidery'] !== undefined ? b['embroidery'] : (stage.includes('embroidery') || stage === '5' ? pcs : 0);
  const s6 = b['dhaga_cutting'] !== undefined ? b['dhaga_cutting'] : (stage.includes('dhaga') || stage.includes('cutting') || stage === '6' ? pcs : 0);
  const s7 = b['inspection_alter'] !== undefined ? b['inspection_alter'] : (stage.includes('insp-2') || stage.includes('alter inspection') || stage === '7' ? pcs : 0);
  const s8 = b['altering'] !== undefined ? b['altering'] : (stage.includes('altering') || stage.includes('rework') || stage === '8' ? pcs : 0);
  const s9 = b['folding'] !== undefined ? b['folding'] : (stage.includes('folding') || stage.includes('packing') || stage === '9' ? pcs : 0);
  const s10 = b['prepare_dispatch'] !== undefined ? b['prepare_dispatch'] : (stage.includes('dispatch') || stage === '10' ? pcs : 0);

  const completed = s10;
  const inProgress = s1 + s2 + s3 + s4 + s5 + s6 + s7 + s8 + s9;
  const compPct = pcs > 0 ? ((completed / pcs) * 100).toFixed(1) + '%' : '0%';

  const rowValues = [
    lotNumber,
    item.partyName || item.clientName || "Direct Client",
    item.designNumber || "DSG-100",
    item.fabricType || "Silk Georgette",
    item.fabricColor || "Natural",
    pcs,
    s1, s2, s3, s4, s5, s6, s7, s8, s9, s10,
    completed,
    inProgress,
    compPct,
    item.dueDate || "N/A",
    new Date().toISOString()
  ];

  if (rowIndex > 0) {
    matrixSheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    matrixSheet.appendRow(rowValues);
  }
}

/**
 * Full state synchronization from web/mobile app
 */
function saveFullBatchStateToSheet(ss, payload) {
  // 1. Sync Master Order Slips tab
  if (payload.orderSlips && Array.isArray(payload.orderSlips)) {
    let slipSheet = ss.getSheetByName("Master Order Slips");
    if (slipSheet) {
      const lastRow = slipSheet.getLastRow();
      if (lastRow > 1) {
        slipSheet.getRange(2, 1, lastRow - 1, slipSheet.getLastColumn() || 16).clearContent();
      }
      payload.orderSlips.forEach(function(s) { saveOrderSlipToSheet(ss, s); });
    }
  }

  // 2. Sync Fabric Design Workflow tab
  if (payload.workflow && Array.isArray(payload.workflow)) {
    let wfSheet = ss.getSheetByName("Fabric Design Workflow");
    if (wfSheet) {
      const lastRow = wfSheet.getLastRow();
      if (lastRow > 1) {
        wfSheet.getRange(2, 1, lastRow - 1, wfSheet.getLastColumn() || 26).clearContent();
      }
      payload.workflow.forEach(function(w) { saveWorkflowItemToSheet(ss, w); });
    }

    // Also sync Fabric & Color Matrix
    let matSheet = ss.getSheetByName("Fabric & Color Matrix");
    if (matSheet) {
      const lastRow = matSheet.getLastRow();
      if (lastRow > 1) {
        matSheet.getRange(2, 1, lastRow - 1, matSheet.getLastColumn() || 20).clearContent();
      }
      payload.workflow.forEach(function(w) { saveFabricColorMatrixRowToSheet(ss, w); });
    }
  }

  // 3. Sync Piece-Level Tracking tab
  if (payload.pieces && Array.isArray(payload.pieces)) {
    savePieceUnitsToSheet(ss, payload.pieces);
  }

  // 4. Sync Inventory
  if (payload.inventory && Array.isArray(payload.inventory)) {
    payload.inventory.forEach(function(m) { saveMaterialToSheet(ss, m); });
  }

  // 5. Sync Dispatch
  if (payload.dispatch && Array.isArray(payload.dispatch)) {
    payload.dispatch.forEach(function(d) { saveDispatchOrderToSheet(ss, d); });
  }
}


