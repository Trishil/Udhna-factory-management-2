import { OrderSlip } from '../types';
import { TRISHARTH_LOGO_BASE64 } from '../assets/logoBase64';

/**
 * Cleanly prints a single-page, high-precision factory Order Slip (Job Sheet)
 * formatted for A4 portrait printing. Uses an isolated hidden iframe so that
 * no surrounding modal UI, buttons, inputs, or web app chrome are printed.
 */
export const printOrderSlipDocument = (
  slip: OrderSlip,
  firmNameOverride?: string
): void => {
  if (!slip) return;

  // Sanitize firm name
  const rawFirm = firmNameOverride || slip.firmName || 'TRISHARTH';
  const firmName = !rawFirm.includes('S V ART') ? rawFirm : 'TRISHARTH';

  const jobNo = slip.jobNo || '—';
  const partyName = slip.partyName || '—';
  const date = slip.date || '';
  const chalanNo = slip.chalanNo || '—';
  const fabricColumns = slip.fabricColumns && slip.fabricColumns.length > 0
    ? slip.fabricColumns
    : ['Kali', 'Kurti', 'Lass'];
  const colorRows = slip.colorRows || [];

  // Calculate totals
  const colTotals: Record<string, number> = {};
  fabricColumns.forEach(c => { colTotals[c] = 0; });

  const rowTotals = colorRows.map(row => {
    let rowSum = 0;
    fabricColumns.forEach(c => {
      const q = Number(row.fabricQuantities?.[c]) || 0;
      colTotals[c] = (colTotals[c] || 0) + q;
      rowSum += q;
    });
    return rowSum;
  });

  const grandTotal = rowTotals.reduce((a, b) => a + b, 0);

  // Hidden print iframe
  let printFrame = document.getElementById('order-slip-print-frame') as HTMLIFrameElement;
  if (!printFrame) {
    printFrame = document.createElement('iframe');
    printFrame.id = 'order-slip-print-frame';
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.opacity = '0';
    printFrame.style.pointerEvents = 'none';
    document.body.appendChild(printFrame);
  }

  const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
  if (!frameDoc) {
    window.print();
    return;
  }

  const tableHeadColsHtml = fabricColumns
    .map(c => `<th style="border: 1px solid #475569; padding: 4px 5px; text-align: center; font-size: 9.5px; font-weight: 800; background: #e2e8f0; text-transform: uppercase;">${c}</th>`)
    .join('');

  const tableRowsHtml = colorRows.map((row, idx) => {
    const rTotal = rowTotals[idx];
    const fabricCellsHtml = fabricColumns.map(col => {
      const val = Number(row.fabricQuantities?.[col]) || 0;
      return `<td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: center; font-family: monospace; font-weight: 700; font-size: 10px; background: ${val > 0 ? '#f8fafc' : '#ffffff'};">${val > 0 ? val : '—'}</td>`;
    }).join('');

    const swatchHtml = row.colorHex 
      ? `<span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; border: 1px solid #475569; background-color: ${row.colorHex}; vertical-align: middle; margin-right: 5px;"></span>` 
      : '';

    return `
      <tr style="break-inside: avoid; page-break-inside: avoid;">
        <td style="border: 1px solid #94a3b8; padding: 3px 4px; text-align: center; font-size: 9.5px; font-weight: 700; color: #475569;">${idx + 1}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9.5px; font-weight: 700; color: #0f172a; white-space: nowrap;">
          ${swatchHtml}<span>${row.colorName || `Color ${idx + 1}`}</span>
        </td>
        ${fabricCellsHtml}
        <td style="border: 1px solid #94a3b8; padding: 3px 6px; font-family: monospace; font-size: 9.5px; font-weight: 700; color: #0f172a;">${row.designNumber || '—'}</td>
        <td style="border: 1px solid #94a3b8; padding: 3px 6px; font-size: 9px; color: #334155;">${row.notes || '—'}</td>
        <td style="border: 1px solid #475569; padding: 3px 4px; text-align: center; font-family: monospace; font-size: 10.5px; font-weight: 900; background: #f1f5f9;">${rTotal}</td>
      </tr>
    `;
  }).join('');

  const tableFootColsHtml = fabricColumns
    .map(c => `<td style="border: 1px solid #475569; padding: 4px 4px; text-align: center; font-family: monospace; font-size: 10.5px; font-weight: 900; background: #e2e8f0;">${colTotals[c] || 0}</td>`)
    .join('');

  const calcNotesText = (slip.calculationNotes || '').trim();
  const inwardNotesText = (slip.inwardChallanNotes || '').trim();

  frameDoc.open();
  frameDoc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Order_Slip_${jobNo.replace(/[^a-zA-Z0-9_-]/g, '_')}_${partyName.replace(/[^a-zA-Z0-9_-]/g, '_')}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #0f172a;
            background: #ffffff;
            font-size: 10px;
            line-height: 1.25;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .sheet-container {
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .border-dark {
            border: 1.5px solid #0f172a;
          }
          .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
        </style>
      </head>
      <body>
        <div class="sheet-container">
          
          <!-- TOP HEADER -->
          <div style="border-bottom: 2px solid #0f172a; padding-bottom: 6px; margin-bottom: 6px;" class="avoid-break">
            <table style="width: 100%;">
              <tr>
                <!-- Auspicious traditional prefix -->
                <td style="width: 15%; vertical-align: middle;">
                  <span style="font-family: serif; font-size: 17px; font-weight: 900; color: #b45309; letter-spacing: 1px;">श्री ૧૫</span>
                </td>

                <!-- Company Title & Logo -->
                <td style="width: 70%; text-align: center; vertical-align: middle;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                    <img src="${TRISHARTH_LOGO_BASE64}" style="height: 32px; width: auto; object-fit: contain;" alt="Logo" />
                    <div style="font-family: serif; font-size: 21px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; color: #0f172a; line-height: 1.1;">
                      ${firmName}
                    </div>
                  </div>
                  <div style="font-size: 8px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; color: #475569; margin-top: 2px;">
                    TEXTILE EMBROIDERY WORKS &bull; FACTORY PRODUCTION JOB CARD
                  </div>
                </td>

                <!-- Sheet Badge -->
                <td style="width: 15%; text-align: right; vertical-align: middle;">
                  <div style="display: inline-block; border: 1.5px solid #0f172a; border-radius: 4px; padding: 3px 7px; background: #f8fafc; font-family: monospace; font-size: 11px; font-weight: 900; letter-spacing: 0.5px;">
                    ORDER SHEET
                  </div>
                </td>
              </tr>
            </table>
          </div>

          <!-- PRIMARY ORDER METADATA -->
          <div style="border: 1.5px solid #0f172a; border-radius: 5px; background: #f8fafc; padding: 6px 10px; margin-bottom: 7px;" class="avoid-break">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 40%; padding: 2px 4px; vertical-align: top;">
                  <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block;">2) Party Name:</span>
                  <span style="font-size: 13px; font-weight: 900; color: #0f172a;">${partyName}</span>
                </td>
                <td style="width: 20%; padding: 2px 4px; vertical-align: top;">
                  <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block;">3) Job No.:</span>
                  <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #0f172a;">${jobNo}</span>
                </td>
                <td style="width: 20%; padding: 2px 4px; vertical-align: top;">
                  <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block;">4) Date:</span>
                  <span style="font-family: monospace; font-size: 12px; font-weight: 800; color: #0f172a;">${date || '—'}</span>
                </td>
                <td style="width: 20%; padding: 2px 4px; vertical-align: top;">
                  <span style="font-size: 8.5px; font-weight: 800; text-transform: uppercase; color: #64748b; display: block;">5) Chalan No.:</span>
                  <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #0f172a;">${chalanNo}</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 4px 0 4px; border-top: 1px dashed #cbd5e1;" colspan="2">
                  <span style="font-size: 9px; color: #475569;">Manufacturing Firm: <strong>${firmName}</strong></span>
                </td>
                <td style="padding: 4px 4px 0 4px; border-top: 1px dashed #cbd5e1; text-align: right;" colspan="2">
                  <span style="font-size: 9px; color: #475569; margin-right: 6px;">Total Production Ordered:</span>
                  <span style="font-family: monospace; font-size: 13px; font-weight: 900; color: #b45309; background: #fef3c7; border: 1px solid #fde68a; padding: 2px 6px; border-radius: 3px;">
                    ${grandTotal.toLocaleString()} PCS
                  </span>
                </td>
              </tr>
            </table>
          </div>

          <!-- FABRIC TYPE & COLOR PIECE MATRIX -->
          <div style="margin-bottom: 7px;" class="avoid-break">
            <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #1e293b; margin-bottom: 3px; display: flex; justify-content: space-between;">
              <span>Fabric Type &amp; Color Piece Matrix</span>
              <span style="font-family: monospace; color: #64748b;">(${colorRows.length} Colorways &bull; ${fabricColumns.length} Fabric Components)</span>
            </div>
            
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #0f172a;">
              <thead>
                <tr>
                  <th style="border: 1px solid #475569; padding: 4px 3px; width: 26px; text-align: center; font-size: 9px; font-weight: 900; background: #e2e8f0;">SR</th>
                  <th style="border: 1px solid #475569; padding: 4px 6px; width: 145px; text-align: left; font-size: 9.5px; font-weight: 900; background: #e2e8f0; text-transform: uppercase;">1) COLOUR / SWATCH</th>
                  ${tableHeadColsHtml}
                  <th style="border: 1px solid #475569; padding: 4px 6px; width: 85px; text-align: left; font-size: 9.5px; font-weight: 900; background: #e2e8f0;">8) D.NO</th>
                  <th style="border: 1px solid #475569; padding: 4px 6px; width: 120px; text-align: left; font-size: 9.5px; font-weight: 900; background: #e2e8f0;">9) NOTE</th>
                  <th style="border: 1px solid #475569; padding: 4px 4px; width: 48px; text-align: center; font-size: 9.5px; font-weight: 900; background: #cbd5e1;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${tableRowsHtml}
              </tbody>
              <tfoot>
                <tr style="border-top: 2px solid #0f172a;">
                  <td style="border: 1px solid #475569; padding: 4px 6px; font-size: 9.5px; font-weight: 900; background: #e2e8f0; text-align: right;" colspan="2">
                    TOTAL PIECES:
                  </td>
                  ${tableFootColsHtml}
                  <td style="border: 1px solid #475569; padding: 4px 6px; background: #e2e8f0; text-align: center; font-size: 9px; color: #64748b;">—</td>
                  <td style="border: 1px solid #475569; padding: 4px 6px; background: #e2e8f0; text-align: center; font-size: 9px; color: #64748b;">—</td>
                  <td style="border: 1.5px solid #0f172a; padding: 4px 4px; text-align: center; font-family: monospace; font-size: 11.5px; font-weight: 900; background: #fef08a; color: #0f172a;">
                    ${grandTotal}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- PRODUCTION CALCULATIONS & INWARD CHALLAN BREAKDOWN -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 7px; margin-bottom: 7px;" class="avoid-break">
            <!-- Left: Formula Calculations -->
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 8px; background: #fafafa;">
              <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin-bottom: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
                Production Calculations / Formula Notes:
              </div>
              <div style="font-family: monospace; font-size: 9px; line-height: 1.35; white-space: pre-wrap; color: #0f172a; min-height: 40px;">${calcNotesText || 'None recorded'}</div>
            </div>

            <!-- Right: Inward Challan / Lot Breakup -->
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 5px 8px; background: #fafafa;">
              <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; margin-bottom: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px;">
                Inward Challan / Lot Breakup:
              </div>
              <div style="font-family: monospace; font-size: 9px; line-height: 1.35; white-space: pre-wrap; color: #0f172a; min-height: 40px;">${inwardNotesText || 'None recorded'}</div>
            </div>
          </div>

          <!-- AFTER COMPLETION & DELIVERY DISPATCH SECTION -->
          <div style="border: 1px solid #94a3b8; border-radius: 4px; padding: 5px 8px; background: #f0fdf4; margin-bottom: 7px;" class="avoid-break">
            <div style="font-size: 8.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #166534; margin-bottom: 3px; border-bottom: 1px solid #bbf7d0; padding-bottom: 2px;">
              After Completion &amp; Dispatch Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
              <tr>
                <td style="padding: 2px 4px;">10) D.Ch.No: <strong>${slip.deliveryChalanNo || '____________'}</strong></td>
                <td style="padding: 2px 4px;">11) Date: <strong>${slip.deliveryDate || '____________'}</strong></td>
                <td style="padding: 2px 4px;">12) Bill No: <strong>${slip.billNo || '____________'}</strong></td>
                <td style="padding: 2px 4px;">Bill Date: <strong>${slip.billDate || '____________'}</strong></td>
                <td style="padding: 2px 4px; text-align: right;">13) Pcs Completed: <strong>${slip.piecesCompleted ? `${slip.piecesCompleted} Pcs` : '____________'}</strong></td>
              </tr>
            </table>
          </div>

          <!-- SIGNATURES & VERIFICATION BLOCK -->
          <div style="border-top: 1.5px solid #0f172a; padding-top: 12px; margin-top: 4px;" class="avoid-break">
            <table style="width: 100%; text-align: center; font-size: 9px;">
              <tr>
                <td style="width: 33%; vertical-align: bottom;">
                  <div style="border-bottom: 1px dotted #64748b; width: 70%; margin: 0 auto 4px auto; height: 16px;"></div>
                  <span style="font-weight: 800; text-transform: uppercase; color: #334155;">Prepared By (Master)</span>
                </td>
                <td style="width: 33%; vertical-align: bottom;">
                  <div style="border-bottom: 1px dotted #64748b; width: 70%; margin: 0 auto 4px auto; height: 16px;"></div>
                  <span style="font-weight: 800; text-transform: uppercase; color: #334155;">Checked By (Quality QC)</span>
                </td>
                <td style="width: 33%; vertical-align: bottom;">
                  <div style="border-bottom: 1px dotted #64748b; width: 70%; margin: 0 auto 4px auto; height: 16px;"></div>
                  <span style="font-weight: 900; text-transform: uppercase; color: #0f172a;">For ${firmName} (Authorized)</span>
                </td>
              </tr>
            </table>
          </div>

          <!-- FOOTER -->
          <div style="text-align: center; font-size: 7.5px; color: #94a3b8; margin-top: 6px; letter-spacing: 0.5px;" class="avoid-break">
            Trisharth Textile Intelligence &bull; Multi-Stage Embroidery Factory System &bull; Physical Job Slip
          </div>

        </div>
      </body>
    </html>
  `);
  frameDoc.close();

  setTimeout(() => {
    try {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
    } catch (err) {
      console.error('Error printing through iframe, falling back to window.print():', err);
      window.print();
    }
  }, 200);
};
