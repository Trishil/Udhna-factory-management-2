import React, { useState } from 'react';
import { Printer, X, FileText, Truck } from 'lucide-react';
import { DispatchOrder } from '../types';

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

  const handlePrint = () => {
    window.print();
  };

  const subtotal = order.subtotal || (order.quantity * (order.unitPrice || 0));
  const taxAmount = order.taxAmount || 0;
  const halfTax = taxAmount > 0 ? (taxAmount / 2) : 0;
  const halfPercent = order.taxPercent ? (order.taxPercent / 2) : 0;
  const isInterState = order.deliveryAddress && !order.deliveryAddress.toLowerCase().includes('gujarat');

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200 print:static print:p-0 print:m-0 print:bg-transparent print:overflow-visible print:block print:inset-auto">
      
      {/* Print Specific CSS Overrides */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 12mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #0f172a !important;
          }
          body * {
            visibility: hidden;
          }
          #invoice-print-area, #invoice-print-area * {
            visibility: visible;
          }
          #invoice-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .print-avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-6 print:m-0 print:p-0 print:w-full print:max-w-none print:shadow-none print:border-none print:rounded-none print:overflow-visible">
        
        {/* Modal Controls Toolbar (Hidden in Print) */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
          className="p-8 sm:p-10 bg-white text-slate-900 space-y-6 max-h-[85vh] overflow-y-auto print:max-h-none print:p-0 print:overflow-visible print:space-y-4 print:w-full"
        >
          
          {/* Header & Company Details */}
          <div className="border-b-2 border-slate-800 pb-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center font-black text-sm">
                    FO
                  </div>
                  <span className="text-xl font-black text-slate-900 tracking-tight uppercase">
                    FACTORY OPS MANUFACTURING
                  </span>
                </div>
                <p className="text-slate-600 text-xs font-medium">
                  Central Industrial Cordage, Technical Webbing &amp; Embroidery Plants
                </p>
                <p className="text-slate-500 text-[11px]">
                  Plot No. 42-45, GIDC Industrial Estate, Pandesara / Udhna, Surat, Gujarat - 394210, India
                </p>
                <div className="flex flex-wrap items-center gap-x-4 text-[11px] text-slate-600 pt-0.5 font-mono">
                  <span><strong>GSTIN:</strong> 24AAACF1234F1Z5</span>
                  <span><strong>State Code:</strong> 24 (Gujarat)</span>
                  <span><strong>CIN:</strong> U17111GJ2024PTC123456</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Email: dispatch@factoryops.com &bull; Phone: +91 98250 12345 / +91 98251 54321
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded font-black text-xs uppercase tracking-wider">
                  {docType === 'invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN & GATE PASS'}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold tracking-wider uppercase mt-1">
                  {copyType}
                </div>
                <div className="mt-3 font-mono text-xs text-right space-y-1">
                  <div className="font-bold text-slate-900 text-sm">
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
          <div className="grid grid-cols-2 gap-4 border border-slate-300 rounded-lg p-4 bg-slate-50/50">
            {/* Left: Consignee */}
            <div className="space-y-1.5 pr-3 border-r border-slate-200">
              <span className="text-[10px] uppercase font-black text-blue-700 tracking-wider block">
                Billed To / Consignee:
              </span>
              <div className="font-black text-sm text-slate-900 leading-tight">
                {order.partyName}
              </div>
              <div className="text-xs text-slate-600">
                <strong>Attention:</strong> {order.contactPerson || 'Purchasing / Stores In-charge'}
              </div>
              <div className="text-xs text-slate-600 leading-relaxed">
                <strong>Delivery Point:</strong> {order.deliveryAddress || 'Industrial Delivery Hub / Client Warehouse'}
              </div>
              <div className="text-xs font-mono text-slate-700">
                <strong>GSTIN / UIN:</strong> {order.gstNumber || 'URP (Unregistered Dealer)'}
              </div>
              {order.contactPhone && (
                <div className="text-xs text-slate-600 font-mono">
                  <strong>Phone:</strong> {order.contactPhone}
                </div>
              )}
            </div>

            {/* Right: Dispatch Logistics */}
            <div className="space-y-1.5 pl-3">
              <span className="text-[10px] uppercase font-black text-indigo-700 tracking-wider block">
                Transport &amp; Dispatch Logistics:
              </span>
              <div className="text-xs text-slate-900">
                <strong>Carrier / Transporter:</strong> {order.transporterName || 'Factory Dispatch Service / Logistics'}
              </div>
              <div className="text-xs font-mono text-slate-900">
                <strong>LR / Vehicle / Waybill No:</strong> {order.vehicleOrTrackingNumber || order.trackingNumber || 'Pending Waybill'}
              </div>
              <div className="text-xs text-slate-700">
                <strong>Packaging Details:</strong> {order.packagingDetails || 'Corrugated Boxes / Shrink Wrapped Bundles'}
              </div>
              <div className="text-xs text-slate-700">
                <strong>Order Status:</strong>{' '}
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold uppercase text-[10px]">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-xs text-slate-700">
                <strong>Payment Status:</strong>{' '}
                <span className={`inline-block px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                  order.paymentStatus === 'paid'
                    ? 'bg-emerald-100 text-emerald-800'
                    : order.paymentStatus === 'partial'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}>
                  {order.paymentStatus}
                </span>
                {order.paymentDueDate && (
                  <span className="ml-2 font-mono text-slate-500 text-[11px]">(Due: {order.paymentDueDate})</span>
                )}
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 text-[10px] uppercase font-black text-slate-700">
                  <th className="py-2.5 px-3 w-10 text-center">#</th>
                  <th className="py-2.5 px-3">Description of Goods &amp; Specifications</th>
                  <th className="py-2.5 px-3">Batch / Lot</th>
                  <th className="py-2.5 px-3 text-center">HSN</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                  <th className="py-2.5 px-3 text-right">GST %</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                <tr>
                  <td className="py-3 px-3 text-center font-mono text-slate-500">01</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900 text-sm">{order.productName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {order.category && <span className="font-medium text-slate-700">{order.category}</span>}
                      {order.size && <span> &bull; Size: <strong>{order.size}</strong></span>}
                      {order.colorName && <span> &bull; Color: <strong>{order.colorName}</strong></span>}
                      {order.linkedTaskCode && <span> &bull; Task Ref: <span className="font-mono">{order.linkedTaskCode}</span></span>}
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-slate-700">
                    {order.lotBatchNumber || 'N/A'}
                  </td>
                  <td className="py-3 px-3 font-mono text-[11px] text-center text-slate-600">
                    5808
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                    {(order.quantity ?? 0).toLocaleString('en-IN')} {order.unit}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    ₹{(order.unitPrice || 0).toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-slate-800">
                    {order.taxPercent || 0}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-sm">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Financial Breakdown, Bank Details & Amount in Words */}
          <div className="grid grid-cols-2 gap-6 pt-2 print-avoid-break">
            {/* Left Box: Amount in Words & Bank Details */}
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                <span className="text-[10px] uppercase font-black text-slate-500 block mb-0.5">
                  Amount in Words:
                </span>
                <p className="text-xs font-bold text-slate-900 italic leading-relaxed">
                  {numberToWordsINR(order.totalInvoiceAmount || 0)}
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-1">
                <span className="text-[10px] uppercase font-black text-slate-500 block">
                  Bank Details for RTGS / NEFT Transfer:
                </span>
                <div className="text-[11px] text-slate-700 font-mono space-y-0.5">
                  <div><strong>Bank Name:</strong> State Bank of India (SBI)</div>
                  <div><strong>Account Name:</strong> Factory Ops Manufacturing Pvt Ltd</div>
                  <div><strong>Account Number:</strong> 3892 0109 2837</div>
                  <div><strong>IFSC Code:</strong> SBIN0001234 (Udhna GIDC Branch)</div>
                </div>
              </div>

              {/* Recorded Payment History (if any) */}
              {order.paymentHistory && order.paymentHistory.length > 0 && (
                <div className="border border-slate-200 rounded-lg p-3">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                    Recorded Payment History:
                  </span>
                  <div className="space-y-1">
                    {order.paymentHistory.map((p, idx) => (
                      <div key={p.id || idx} className="text-[11px] font-mono text-slate-600 flex items-center justify-between bg-slate-100/70 px-2.5 py-1 rounded">
                        <span>{p.date} &bull; {p.paymentMode.toUpperCase()} ({p.transactionRef})</span>
                        <span className="font-bold text-emerald-700">+₹{p.amount.toLocaleString('en-IN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Box: Calculations Summary */}
            <div className="space-y-2 border border-slate-300 rounded-lg p-4 bg-slate-50/30">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Taxable Value (Subtotal):</span>
                <span className="font-mono font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
              </div>

              {isInterState ? (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Integrated GST (IGST {order.taxPercent || 0}%):</span>
                  <span className="font-mono">+₹{(taxAmount).toLocaleString('en-IN')}</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Central GST (CGST {halfPercent}%):</span>
                    <span className="font-mono">+₹{(halfTax).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>State GST (SGST {halfPercent}%):</span>
                    <span className="font-mono">+₹{(halfTax).toLocaleString('en-IN')}</span>
                  </div>
                </>
              )}

              {(order.shippingCharges || 0) > 0 && (
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Shipping &amp; Handling:</span>
                  <span className="font-mono">+₹{(order.shippingCharges || 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              {(order.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>Discount:</span>
                  <span className="font-mono">-₹{(order.discountAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}

              <div className="flex justify-between items-baseline font-black text-base text-slate-900 border-t-2 border-slate-800 pt-2">
                <span>Grand Total:</span>
                <span className="font-mono text-lg text-blue-900">
                  ₹{(order.totalInvoiceAmount || 0).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold text-xs pt-1 border-t border-slate-200">
                <span>Amount Paid:</span>
                <span className="font-mono">-₹{order.amountPaid.toLocaleString('en-IN')}</span>
              </div>

              <div className="flex justify-between text-rose-600 font-black text-sm border-t border-dashed border-slate-300 pt-1.5">
                <span>Balance Due:</span>
                <span className="font-mono">₹{order.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Terms, Declaration & Signatures */}
          <div className="pt-4 border-t border-slate-300 space-y-6 print-avoid-break">
            <div className="text-[10px] text-slate-500 leading-relaxed">
              <strong>Declaration:</strong> We declare that this invoice/challan shows the actual price of the goods described and that all particulars are true and correct. Goods once sold will not be taken back without prior written consent. Disputes subject to Surat jurisdiction only.
            </div>

            <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[11px]">
              <div>
                <div className="h-14 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Prepared By</span>
                <span className="text-[10px] text-slate-500">(Dispatch Officer)</span>
              </div>

              <div>
                <div className="h-14 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-700 block">Security Outward Clearance</span>
                <span className="text-[10px] text-slate-500">(Gate Pass Checked)</span>
              </div>

              <div>
                <div className="h-14 border-b border-dashed border-slate-400 mb-1" />
                <span className="font-bold text-slate-900 block">For Factory Ops Manufacturing</span>
                <span className="text-[10px] text-slate-500">(Authorized Signatory)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
