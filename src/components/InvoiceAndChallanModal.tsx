import React, { useState } from 'react';
import { Printer, X, FileText, Truck } from 'lucide-react';
import { DispatchOrder } from '../types';
import { TRISHARTH_LOGO_BASE64 } from '../assets/logoBase64';

export interface InvoiceAndChallanModalProps {
  order: DispatchOrder;
  initialDocType?: 'invoice' | 'challan';
  onClose: () => void;
}

// Convert amount in INR to words (Indian numbering: Lakh, Crore)
function numberToWordsINR(num: number): string {
  if (!num || isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    if (n === 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + inWords(n % 10000000) : '');
  };

  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);

  let result = 'Rupees ' + inWords(integerPart);
  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart) + ' Paise';
  }
  result += ' Only';
  return result;
}

export const InvoiceAndChallanModal: React.FC<InvoiceAndChallanModalProps> = ({
  order,
  initialDocType = 'invoice',
  onClose
}) => {
  const [docType, setDocType] = useState<'invoice' | 'challan'>(initialDocType);
  const [copyType, setCopyType] = useState<'ORIGINAL FOR RECIPIENT' | 'DUPLICATE FOR TRANSPORTER' | 'TRIPLICATE FOR SUPPLIER'>('ORIGINAL FOR RECIPIENT');

  const subtotal = order.subtotal || (order.quantity * (order.unitPrice || 0));
  const taxAmount = order.taxAmount || 0;
  const halfTax = taxAmount > 0 ? (taxAmount / 2) : 0;
  const halfPercent = order.taxPercent ? (order.taxPercent / 2) : 0;
  const isInterState = order.deliveryAddress && !order.deliveryAddress.toLowerCase().includes('gujarat');

  // Print function using isolated iframe: guarantees starting on Page 1 and fitting exactly 1 A4 page
  const handlePrint = () => {
    let printFrame = document.getElementById('invoice-print-frame') as HTMLIFrameElement;
    if (!printFrame) {
      printFrame = document.createElement('iframe');
      printFrame.id = 'invoice-print-frame';
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    const printElement = document.getElementById('invoice-print-area');
    if (!printElement) {
      window.print();
      return;
    }

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${docType === 'invoice' ? 'Tax_Invoice' : 'Delivery_Challan'}_${order.invoiceNumber || order.dispatchNumber}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 10mm;
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
              font-size: 10.5px;
              line-height: 1.3;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-wrapper {
              width: 100%;
              max-width: 100%;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 4px 6px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
            }
            .grid-3 {
              display: grid;
              grid-template-columns: 1fr 1fr 1fr;
              gap: 16px;
            }
            .border-box {
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px;
            }
            .avoid-break {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${printElement.innerHTML}
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
        window.print();
      }
    }, 200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6">
        
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'invoice'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tax Invoice</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('challan')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  docType === 'challan'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Delivery Challan &amp; Gate Pass</span>
              </button>
            </div>

            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as any)}
              className="bg-slate-800 text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="ORIGINAL FOR RECIPIENT">Original (Recipient)</option>
              <option value="DUPLICATE FOR TRANSPORTER">Duplicate (Transporter)</option>
              <option value="TRIPLICATE FOR SUPPLIER">Triplicate (Supplier)</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div
          id="invoice-print-area"
          className="p-6 sm:p-8 bg-white text-slate-900 space-y-4 max-h-[85vh] overflow-y-auto w-full text-[11px]"
        >
          
          {/* Header & Company Details */}
          <div className="border-b-2 border-slate-800 pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-3">
                  <img
                    src={TRISHARTH_LOGO_BASE64}
                    alt="Trisharth Textile"
                    className="h-11 w-auto object-contain shrink-0"
                  />
                  <div>
                    <span className="text-lg font-black text-slate-900 tracking-tight uppercase block leading-none">
                      TRISHARTH TEXTILE
                    </span>
                    <p className="text-slate-600 text-[11px] font-medium mt-0.5">
                      Industrial Cordage, Technical Webbing &amp; Embroidery Fabrics
                    </p>
                  </div>
                </div>
                <p className="text-slate-500 text-[10px]">
                  Plot No. 42-45, GIDC Industrial Estate, Pandesara / Udhna, Surat, Gujarat - 394210, India
                </p>
                <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-600 font-mono">
                  <span><strong>GSTIN:</strong> 24AAACF1234F1Z5</span>
                  <span><strong>State Code:</strong> 24 (Gujarat)</span>
                  <span><strong>CIN:</strong> U17111GJ2024PTC123456</span>
                </div>
                <div className="text-[10px] text-slate-500">
                  Email: dispatch@trisharthtextile.com &bull; Phone: +91 98250 12345 / +91 98251 54321
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-2.5 py-0.5 bg-slate-900 text-white rounded font-black text-[11px] uppercase tracking-wider">
                  {docType === 'invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN & GATE PASS'}
                </div>
                <div className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase mt-0.5">
                  {copyType}
                </div>
                <div className="mt-2 font-mono text-[11px] text-right space-y-0.5">
                  <div className="font-bold text-slate-900 text-xs">
                    {docType === 'invoice'
                      ? `INV #: ${order.invoiceNumber || order.dispatchNumber}`
                      : `CHALLAN #: ${order.dispatchNumber}`}
                  </div>
                  <div className="text-slate-600">
                    <strong>Date:</strong> {order.dispatchedDate || order.readyDate || new Date().toISOString().split('T')[0]}
                  </div>
                  <div className="text-slate-600">
                    <strong>PO Ref:</strong> {order.orderNumber || 'Direct Factory Order'}
                  </div>
                  <div className="text-slate-600">
                    <strong>Place of Supply:</strong> {isInterState ? 'Inter-State (IGST)' : 'Gujarat - 24 (CGST + SGST)'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consignee (Bill To / Ship To) and Logistics Details Grid */}
          <div className="grid grid-cols-2 gap-3 border border-slate-300 rounded-lg p-3 bg-slate-50/50">
            {/* Left: Consignee */}
            <div className="space-y-1 pr-2 border-r border-slate-200 text-[10.5px]">
              <span className="text-[9.5px] uppercase font-black text-blue-700 tracking-wider block">
                Billed To / Consignee:
              </span>
              <div className="font-black text-xs text-slate-900 leading-tight">
                {order.partyName}
              </div>
              <div className="text-slate-600">
                <strong>Attention:</strong> {order.contactPerson || 'Purchasing / Stores In-charge'}
              </div>
              <div className="text-slate-600 leading-tight">
                <strong>Delivery Point:</strong> {order.deliveryAddress || 'Industrial Delivery Hub / Client Warehouse'}
              </div>
              <div className="font-mono text-slate-700">
                <strong>GSTIN / UIN:</strong> {order.gstNumber || 'URP (Unregistered Dealer)'}
              </div>
              {order.contactPhone && (
                <div className="text-slate-600 font-mono">
                  <strong>Phone:</strong> {order.contactPhone}
                </div>
              )}
            </div>

            {/* Right: Dispatch Logistics */}
            <div className="space-y-1 pl-2 text-[10.5px]">
              <span className="text-[9.5px] uppercase font-black text-indigo-700 tracking-wider block">
                Transport &amp; Dispatch Logistics:
              </span>
              <div className="text-slate-900">
                <strong>Carrier / Transporter:</strong> {order.transporterName || 'Factory Dispatch Service / Logistics'}
              </div>
              <div className="font-mono text-slate-900">
                <strong>LR / Vehicle / Waybill:</strong> {order.vehicleOrTrackingNumber || order.trackingNumber || 'Pending Waybill'}
              </div>
              <div className="text-slate-700">
                <strong>Packaging:</strong> {order.packagingDetails || 'Corrugated Boxes / Shrink Wrapped Bundles'}
              </div>
              <div className="text-slate-700">
                <strong>Order Status:</strong>{' '}
                <span className="inline-block px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold uppercase text-[9px]">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-slate-700">
                <strong>Payment:</strong>{' '}
                <span className={`inline-block px-1.5 py-0.2 rounded font-bold uppercase text-[9px] ${
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.paymentStatus === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {order.paymentStatus}
                </span>
                {order.paymentDueDate && (
                  <span className="ml-1.5 font-mono text-slate-500 text-[10px]">(Due: {order.paymentDueDate})</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[9.5px] uppercase font-black text-slate-700">
                  <th className="py-2 px-2.5 w-8 text-center">#</th>
                  <th className="py-2 px-2.5">Description of Goods &amp; Specifications</th>
                  <th className="py-2 px-2.5">Batch / Lot</th>
                  <th className="py-2 px-2.5 text-center">HSN</th>
                  <th className="py-2 px-2.5 text-right">Quantity</th>
                  <th className="py-2 px-2.5 text-right">Rate (₹)</th>
                  <th className="py-2 px-2.5 text-right">GST %</th>
                  <th className="py-2 px-2.5 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-[11px]">
                <tr>
                  <td className="py-2 px-2.5 text-center font-mono text-slate-500">01</td>
                  <td className="py-2 px-2.5">
                    <div className="font-bold text-slate-900 text-xs">{order.productName}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {order.category && <span className="font-medium text-slate-700">{order.category}</span>}
                      {order.size && <span> &bull; Size: <strong>{order.size}</strong></span>}
                      {order.colorName && <span> &bull; Color: <strong>{order.colorName}</strong></span>}
                      {order.linkedTaskCode && <span> &bull; Task: <span className="font-mono">{order.linkedTaskCode}</span></span>}
                    </div>
                  </td>
                  <td className="py-2 px-2.5 font-mono text-[10px] text-slate-700">
                    {order.lotBatchNumber || 'N/A'}
                  </td>
                  <td className="py-2 px-2.5 font-mono text-[10px] text-center text-slate-600">
                    5808
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900">
                    {(order.quantity ?? 0).toLocaleString('en-IN')} {order.unit}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                    ₹{(order.unitPrice || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono text-slate-800">
                    {order.taxPercent || 0}%
                  </td>
                  <td className="py-2 px-2.5 text-right font-mono font-black text-slate-900 text-xs">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown, Bank Details & Amount in Words */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            {/* Left Box: Amount in Words & Bank Details */}
            <div className="space-y-2.5">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                <span className="text-[9px] uppercase font-black text-slate-500 block mb-0.5">
                  Amount in Words:
                </span>
                <p className="text-[10.5px] font-bold text-slate-900 italic leading-snug">
                  {numberToWordsINR(order.totalInvoiceAmount || 0)}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-0.5">
                <span className="text-[9px] uppercase font-black text-slate-500 block mb-0.5">
                  Bank Details for RTGS / NEFT:
                </span>
                <div className="text-[10px] text-slate-700 font-mono space-y-0.5">
                  <div><strong>Bank:</strong> State Bank of India (SBI) &bull; <strong>Branch:</strong> Udhna GIDC</div>
                  <div><strong>A/c Name:</strong> Trisharth Textile</div>
                  <div><strong>A/c No:</strong> 3892 0109 2837 &bull; <strong>IFSC:</strong> SBIN0001234</div>
                </div>
              </div>

              {/* Recorded Payment History (if any) */}
              {order.paymentHistory && order.paymentHistory.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-2">
                  <span className="text-[9px] uppercase font-bold text-slate-500 block mb-1">
                    Recorded Payment History:
                  </span>
                  <div className="space-y-1">
                    {order.paymentHistory.map((p, idx) => (
                      <div key={p.id || idx} className="text-[10px] font-mono text-slate-600 flex items-center justify-between bg-slate-100/70 px-2 py-0.5 rounded">
                        <span>{p.date} &bull; {p.paymentMode.toUpperCase()} ({p.transactionRef})</span>
                        <span className="font-bold text-emerald-700">+₹{p.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Calculations Summary */}
            <div className="space-y-1.5 border border-slate-300 rounded-lg p-3 bg-slate-50/30 text-[11px]">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Value (Subtotal):</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-slate-600">
                  <span>Integrated GST (IGST {order.taxPercent || 0}%):</span>
                  <span className="font-mono">+₹{(taxAmount).toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>Central GST (CGST {halfPercent}%):</span>
                    <span className="font-mono">+₹{(halfTax).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>State GST (SGST {halfPercent}%):</span>
                    <span className="font-mono">+₹{(halfTax).toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {(order.shippingCharges || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Shipping &amp; Handling:</span>
                  <span className="font-mono">+₹{(order.shippingCharges || 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{(order.discountAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline font-black text-sm text-slate-900 border-t-2 border-slate-800 pt-1.5">
                <span>Grand Total:</span>
                <span className="font-mono text-base text-blue-900">
                  ₹{(order.totalInvoiceAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold text-[10.5px] pt-1 border-t border-slate-200">
                <span>Amount Paid:</span>
                <span className="font-mono">-₹{order.amountPaid.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-rose-600 font-black text-xs border-t border-dashed border-slate-300 pt-1">
                <span>Balance Due:</span>
                <span className="font-mono">₹{order.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Terms, Declaration & Signatures */}
          <div className="pt-2 border-t border-slate-300 space-y-3">
            <div className="text-[9px] text-slate-500 leading-tight">
              <strong>Declaration:</strong> We declare that this invoice/challan shows the actual price of the goods described and that all particulars are true and correct. Goods once sold will not be taken back without prior written consent. Disputes subject to Surat jurisdiction only.
            </div>

            <div className="grid grid-cols-3 gap-4 pt-1 text-center text-[10px]">
              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Prepared By</span>
                <span className="text-[9px] text-slate-500">(Dispatch Officer)</span>
              </div>

              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Security Outward Clearance</span>
                <span className="text-[9px] text-slate-500">(Gate Pass Checked)</span>
              </div>

              <div>
                <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-900 block">For Trisharth Textile</span>
                <span className="text-[9px] text-slate-500">(Authorized Signatory)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

