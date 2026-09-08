import React, { useState } from 'react';
import { Printer, X } from 'lucide-react';
import { DispatchOrder } from '../types';

export interface InvoiceAndChallanModalProps {
  order: DispatchOrder;
  initialDocType?: 'invoice' | 'challan';
  onClose: () => void;
}

export const InvoiceAndChallanModal: React.FC<InvoiceAndChallanModalProps> = ({
  order,
  initialDocType = 'invoice',
  onClose
}) => {
  const [docType, setDocType] = useState<'invoice' | 'challan'>(initialDocType);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Controls Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docType === 'invoice'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setDocType('challan')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docType === 'challan'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Delivery Challan &amp; Gate Pass
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document Printable View */}
        <div className="p-8 bg-white text-slate-900 space-y-6 text-xs max-h-[80vh] overflow-y-auto print:max-h-none print:p-0">
          
          {/* Header & Company Details */}
          <div className="flex items-start justify-between border-b border-slate-300 pb-5">
            <div>
              <div className="text-xl font-black text-slate-900 tracking-tight uppercase">
                FACTORY OPS MANUFACTURING
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Central Industrial Cordage &amp; Textile Plant, GIDC Industrial Estate
              </p>
              <p className="text-slate-500 text-[11px]">
                GSTIN: 24AAACF1234F1Z5 &bull; CIN: U17111GJ2024PTC123456
              </p>
              <p className="text-slate-500 text-[11px]">
                Email: dispatch@factoryops.com &bull; Phone: +91 98250 12345
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase text-slate-800">
                {docType === 'invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN & GATE PASS'}
              </div>
              <div className="mt-2 font-mono text-[11px]">
                <div className="font-bold text-slate-900">
                  {docType === 'invoice' ? `INV #: ${order.invoiceNumber || order.dispatchNumber}` : `CHALLAN #: ${order.dispatchNumber}`}
                </div>
                <div className="text-slate-500">Date: {order.dispatchedDate || order.readyDate}</div>
                {order.orderNumber && (
                  <div className="text-slate-600">PO Ref: {order.orderNumber}</div>
                )}
              </div>
            </div>
          </div>

          {/* Buyer and Transport Info Grid */}
          <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Billed / Dispatched To:
              </span>
              <div className="font-black text-sm text-slate-900">{order.partyName}</div>
              <div className="text-slate-600 mt-1">{order.contactPerson || 'Purchasing Department'}</div>
              <div className="text-slate-600">{order.deliveryAddress || 'Industrial Delivery Point'}</div>
              {order.contactPhone && <div className="text-slate-500">Ph: {order.contactPhone}</div>}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Transport &amp; Shipment Details:
              </span>
              <div className="font-bold text-slate-900">{order.transporterName || 'Factory Dispatch / Transport'}</div>
              <div className="font-mono text-slate-600 mt-0.5">
                LR / Vehicle: {order.vehicleOrTrackingNumber || 'Pending Waybill'}
              </div>
              <div className="text-slate-600 mt-0.5">
                Packaging: {order.packagingDetails || 'Standard Cartons'}
              </div>
              <div className="text-slate-500 mt-0.5">
                Status: <span className="font-bold uppercase text-slate-800">{order.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[10px] uppercase font-black text-slate-700">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">Batch / Lot</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Rate (₹)</th>
                  <th className="py-2 text-right">GST %</th>
                  <th className="py-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3">
                    <div className="font-bold text-slate-900">{order.productName}</div>
                    <div className="text-[10px] text-slate-500">
                      {order.category} {order.size && `&bull; Size: ${order.size}`} {order.colorName && `&bull; Color: ${order.colorName}`}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-slate-600">
                    {order.lotBatchNumber || 'N/A'}
                  </td>
                  <td className="py-3 text-right font-mono font-bold">
                    {(order.quantity ?? 0).toLocaleString()} {order.unit}
                  </td>
                  <td className="py-3 text-right font-mono">
                    ₹{order.unitPrice || 0}
                  </td>
                  <td className="py-3 text-right font-mono">
                    {order.taxPercent || 0}%
                  </td>
                  <td className="py-3 text-right font-mono font-black text-slate-900">
                    ₹{(order.totalInvoiceAmount ?? 0).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{(order.subtotal || order.totalInvoiceAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              {(order.taxAmount || 0) > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({order.taxPercent || 0}%):</span>
                  <span>+₹{(order.taxAmount || 0).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                <span>Grand Total:</span>
                <span>₹{(order.totalInvoiceAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                <span>Amount Paid:</span>
                <span>-₹{order.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-xs border-t border-dashed border-slate-300 pt-1">
                <span>Balance Due:</span>
                <span>₹{order.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payment History Log */}
          {order.paymentHistory && order.paymentHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Recorded Payments Log:
              </span>
              <div className="space-y-1">
                {order.paymentHistory.map((p, idx) => (
                  <div key={p.id || idx} className="text-[11px] font-mono text-slate-600 flex items-center justify-between bg-slate-50 px-3 py-1 rounded">
                    <span>{p.date} &bull; {p.paymentMode.toUpperCase()} ({p.transactionRef})</span>
                    <span className="font-bold text-emerald-700">+₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures & Gate Pass Clearance */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-300 text-center text-[10px]">
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Prepared By (Dispatch Officer)</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Security Gate Clearance</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Receiver / Customer Sign</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

