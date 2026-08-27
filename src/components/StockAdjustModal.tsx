import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Plus, Minus, ArrowRightLeft, Check, Sparkles, Layers, IndianRupee, CreditCard, Building2, Hash } from 'lucide-react';
import { RawMaterial, Machine, StockTransaction } from '../types';
import { generateUniqueBatchId } from '../utils/idGenerator';

export interface RestockFinancialLink {
  syncToFinance: boolean;
  financeMode: 'paid_expense' | 'supplier_payable' | 'none';
  unitCost: number;
  totalCost: number;
  supplierName: string;
  batchId: string;
  paymentDueDate?: string;
}

interface StockAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: RawMaterial[];
  machines: Machine[];
  initialMaterial?: RawMaterial | null;
  initialType?: 'restock' | 'consumption';
  onLogTransaction: (
    transaction: Omit<StockTransaction, 'id' | 'timestamp'>, 
    newStock: number,
    financialLink?: RestockFinancialLink
  ) => void;
}

export const StockAdjustModal: React.FC<StockAdjustModalProps> = ({
  isOpen,
  onClose,
  materials,
  machines,
  initialMaterial,
  initialType = 'restock',
  onLogTransaction
}) => {
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(initialMaterial?.id || materials[0]?.id || '');
  const [type, setType] = useState<'restock' | 'consumption' | 'transfer' | 'adjustment'>(initialType);
  const [quantity, setQuantity] = useState(500);
  const [unitCost, setUnitCost] = useState<number>(0.05);
  const [supplierName, setSupplierName] = useState<string>('');
  const [batchId, setBatchId] = useState<string>('');
  const [syncToFinance, setSyncToFinance] = useState<boolean>(true);
  const [financeMode, setFinanceMode] = useState<'paid_expense' | 'supplier_payable'>('supplier_payable');
  const [paymentDueDate, setPaymentDueDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  
  const [selectedMachineId, setSelectedMachineId] = useState(machines[0]?.id || '');
  const [designCode, setDesignCode] = useState('');
  const [operator, setOperator] = useState('Floor In-charge');
  const [notes, setNotes] = useState('');

  // Keep selectedMaterialId and type strictly synchronized with the clicked item only on open
  useEffect(() => {
    if (isOpen) {
      const target = initialMaterial || materials.find(m => m.id === selectedMaterialId) || materials[0];
      if (target) {
        setSelectedMaterialId(target.id);
        setUnitCost(target.unitCost || 0.05);
        setSupplierName(target.supplier || 'Primary Vendor');
        setBatchId(generateUniqueBatchId('BATCH'));
        setNotes(initialType === 'restock' ? `Batch restock of ${target.name}` : `Design consumption for ${target.name}`);
      }
      if (initialType) {
        setType(initialType);
      }
    }
  }, [isOpen, initialMaterial?.id, initialType]);

  const currentMat = materials.find(m => m.id === selectedMaterialId) || initialMaterial || materials[0];

  const handleMaterialChange = (matId: string) => {
    setSelectedMaterialId(matId);
    const m = materials.find(x => x.id === matId);
    if (m) {
      setUnitCost(m.unitCost || 0.05);
      setSupplierName(m.supplier || 'Primary Vendor');
    }
  };

  if (!isOpen) return null;

  const totalBatchCost = +(quantity * (unitCost || 0)).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMat || quantity <= 0) return;

    let delta = quantity;
    if (type === 'consumption') {
      delta = -quantity;
    } else if (type === 'adjustment') {
      // delta stays positive or negative as entered
    }

    const newStock = Math.max(0, currentMat.currentStock + delta);
    const targetMachine = machines.find(m => m.id === selectedMachineId);

    const financialLink: RestockFinancialLink | undefined = type === 'restock' && syncToFinance ? {
      syncToFinance: true,
      financeMode,
      unitCost,
      totalCost: totalBatchCost,
      supplierName: supplierName || currentMat.supplier || 'Supplier',
      batchId: batchId || currentMat.lotNumber || generateUniqueBatchId('BATCH'),
      paymentDueDate: financeMode === 'supplier_payable' ? paymentDueDate : undefined
    } : undefined;

    const finalNotes = type === 'consumption' && designCode
      ? `[Design: ${designCode}] ${notes.trim() || 'Manual design consumption'}`
      : (notes.trim() || `${type.toUpperCase()} of ${quantity} ${currentMat.unit} (Batch: ${batchId || 'N/A'})`);

    onLogTransaction({
      materialId: currentMat.id,
      materialName: currentMat.name,
      type,
      quantity: delta,
      unit: currentMat.unit,
      batchId: type === 'restock' ? (batchId || currentMat.lotNumber) : undefined,
      unitCost: type === 'restock' ? unitCost : currentMat.unitCost,
      totalCost: type === 'restock' ? totalBatchCost : undefined,
      supplierName: type === 'restock' ? (supplierName || currentMat.supplier) : undefined,
      machineId: (type === 'consumption' || type === 'transfer') ? targetMachine?.id : undefined,
      machineName: (type === 'consumption' || type === 'transfer') ? targetMachine?.name : undefined,
      operator: operator.trim() || 'Floor Supervisor',
      notes: finalNotes
    }, newStock, financialLink);

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div 
        id="modal-stock-adjust-container"
        className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-auto max-h-[92vh] flex flex-col overflow-hidden"
      >
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2.5 rounded-xl ${type === 'restock' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <span>{type === 'restock' ? 'Log Material Restock (Add Stock & Cost)' : type === 'consumption' ? 'Log Material Consumption' : 'Adjust Inventory Stock'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {type === 'restock' 
                  ? 'Unified entry: Adds stock and automatically connects to Finance & Accounts'
                  : 'Update warehouse stock balance and audit ledger'}
              </p>
            </div>
          </div>
          <button
            id="btn-close-stock-adjust"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
          
          {/* Action Type Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="btn-adjust-type-restock"
              type="button"
              onClick={() => setType('restock')}
              className={`py-2 px-3 rounded-lg font-bold border text-center transition-all ${
                type === 'restock'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-400 ring-2 ring-emerald-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              + Restock (Add)
            </button>

            <button
              id="btn-adjust-type-consumption"
              type="button"
              onClick={() => setType('consumption')}
              className={`py-2 px-3 rounded-lg font-bold border text-center transition-all ${
                type === 'consumption'
                  ? 'bg-amber-50 text-amber-800 border-amber-400 ring-2 ring-amber-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              - Consume
            </button>

            <button
              id="btn-adjust-type-transfer"
              type="button"
              onClick={() => setType('transfer')}
              className={`py-2 px-3 rounded-lg font-bold border text-center transition-all ${
                type === 'transfer'
                  ? 'bg-blue-50 text-blue-800 border-blue-400 ring-2 ring-blue-500/20'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Transfer Floor
            </button>
          </div>

          {/* Target Material with Auto-Selected Badge */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700 flex items-center space-x-1.5">
                <span>Target Raw Material *</span>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded uppercase font-mono">
                  {currentMat?.id || 'MAT'}
                </span>
              </label>
              {currentMat && (
                <span className="text-[10px] font-mono text-slate-500">
                  Bin: <b className="text-slate-700">{currentMat.locationBin}</b>
                </span>
              )}
            </div>

            <select
              id="select-target-material"
              value={selectedMaterialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-bold text-xs"
            >
              {materials.map(m => (
                <option key={m.id} value={m.id}>
                  {m.code ? `[${m.code}] ` : ''}{m.name} {m.size ? `(${m.size})` : ''} - Stock: {(m.currentStock ?? 0).toLocaleString()} {m.unit} | ₹{m.unitCost || 0}/{m.unit}
                </option>
              ))}
            </select>

            {currentMat && (
              <div className="mt-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex flex-col space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0 border border-slate-300 shadow-2xs"
                      style={{ backgroundColor: currentMat.colorCode || '#2563EB' }}
                    />
                    <div>
                      <span className="font-bold text-slate-800">{currentMat.name}</span>
                      {currentMat.code && (
                        <span className="ml-1.5 font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-800">
                          {currentMat.code}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-slate-500">In Stock: </span>
                    <span className="font-bold text-slate-900">{((currentMat.currentStock) ?? 0).toLocaleString()} {currentMat.unit}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium pt-1 border-t border-slate-200">
                  <span>Size: <strong className="text-indigo-700">{currentMat.size || 'N/A'}</strong> &bull; Color: <strong className="text-slate-700">{currentMat.colorName || 'Default'}</strong></span>
                  <span>Default Rate: <strong className="text-emerald-700 font-mono">₹{currentMat.unitCost}/{currentMat.unit}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity & Restock Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-semibold text-slate-700">Quantity to {type === 'restock' ? 'Add' : 'Deduct'} *</label>
                <span className="text-[11px] text-slate-500">
                  Unit: <b className="text-slate-800">{currentMat?.unit || 'pcs'}</b>
                </span>
              </div>
              <input
                id="input-adjust-quantity"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-bold text-sm"
              />
              {currentMat && (
                <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between font-mono">
                  <span>New Balance:</span>
                  <b className={`text-xs ${type === 'restock' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {type === 'restock' ? ((currentMat.currentStock ?? 0) + quantity).toLocaleString() : Math.max(0, (currentMat.currentStock ?? 0) - quantity).toLocaleString()} {currentMat.unit}
                  </b>
                </p>
              )}
            </div>

            {type === 'restock' ? (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-semibold text-slate-700">Unit Purchase Cost (₹) *</label>
                  <span className="text-[10px] text-emerald-700 font-bold font-mono">
                    Total: ₹{totalBatchCost.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                  <input
                    id="input-adjust-unit-cost"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={unitCost}
                    onChange={(e) => setUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 font-bold font-mono text-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Batch Financial Cost: <strong className="text-slate-800 font-mono">₹{totalBatchCost.toLocaleString('en-IN')}</strong>
                </p>
              </div>
            ) : (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estimated Unit Value</label>
                <div className="px-3 py-2 bg-slate-100 rounded-lg border border-slate-200 text-slate-700 font-mono font-bold text-xs">
                  ₹{currentMat?.unitCost || 0} / {currentMat?.unit || 'unit'} (Total: ₹{(quantity * (currentMat?.unitCost || 0)).toFixed(2)})
                </div>
              </div>
            )}
          </div>

          {/* Restock Batch Details & Automated Finance Sync */}
          {type === 'restock' && (
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5 font-bold text-emerald-950 text-xs">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  <span>Unified Finance Integration</span>
                </div>
                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-emerald-900">
                  <input
                    type="checkbox"
                    checked={syncToFinance}
                    onChange={(e) => setSyncToFinance(e.target.checked)}
                    className="h-3.5 w-3.5 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                  />
                  <span>Record in Finance automatically</span>
                </label>
              </div>

              {syncToFinance && (
                <div className="space-y-2.5 pt-1 text-xs border-t border-emerald-200/60 animate-in fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Supplier / Payee</label>
                      <input
                        type="text"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        placeholder="e.g. Apex Fibers Ltd"
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Batch / Lot ID</label>
                      <div className="flex items-center space-x-1">
                        <input
                          type="text"
                          value={batchId}
                          onChange={(e) => setBatchId(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setBatchId(generateUniqueBatchId('BATCH'))}
                          title="Generate new batch ID"
                          className="p-1.5 bg-emerald-200/80 hover:bg-emerald-300 rounded-lg text-emerald-900"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Accounting Entry Type</label>
                      <select
                        value={financeMode}
                        onChange={(e) => setFinanceMode(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      >
                        <option value="supplier_payable">📋 Supplier Accounts Payable (Credit/Due)</option>
                        <option value="paid_expense">💳 Paid Upfront (Debit Operating Expense)</option>
                      </select>
                    </div>

                    {financeMode === 'supplier_payable' && (
                      <div>
                        <label className="block font-semibold text-emerald-950 mb-1 text-[11px]">Payment Due Date</label>
                        <input
                          type="date"
                          value={paymentDueDate}
                          onChange={(e) => setPaymentDueDate(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-emerald-800 font-medium">
                    ✓ Both Inventory Stock &amp; Finance Accounts will receive the same Batch ID: <span className="font-mono font-bold text-emerald-950">{batchId || 'BATCH-AUTO'}</span>. No duplicate entry needed!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Design Reference & Manual Consumption Info (When Consumption Type) */}
          {type === 'consumption' && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between">
                <label className="font-bold text-amber-950 text-xs flex items-center space-x-1.5">
                  <span>Design / Pattern / Job Order Reference</span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 font-mono px-1.5 py-0.2 rounded font-bold">MANUAL LOG</span>
                </label>
                <span className="text-[10px] text-amber-700 font-medium">Design-based Run</span>
              </div>

              <input
                id="input-design-code"
                type="text"
                value={designCode}
                onChange={(e) => setDesignCode(e.target.value)}
                placeholder="e.g. DSG-104 - Zari Lace Border (or PO / Work Order #)"
                className="w-full px-3 py-2 bg-white border border-amber-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 placeholder:text-slate-400"
              />

              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] text-amber-800 font-semibold">Quick presets:</span>
                {['Design #101', 'Heavy Zari Border', 'Lace Trimming #4', 'Floral Cutdana #18', 'Sample Test Run'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDesignCode(preset)}
                    className="text-[10px] px-2 py-0.5 bg-white hover:bg-amber-100 border border-amber-200 text-amber-900 rounded font-medium transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>

              <p className="text-[10px] text-amber-800">
                💡 Deducts material accurately per actual physical design consumption without fixed machine assumptions.
              </p>
            </div>
          )}

          {/* Machine link if consumption/transfer */}
          {(type === 'consumption' || type === 'transfer') && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Production Unit / Line (Optional)</label>
              <select
                id="select-assigned-machine"
                value={selectedMachineId}
                onChange={(e) => setSelectedMachineId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
              >
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Operator & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operator / Signee</label>
              <input
                id="input-operator"
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PO / Reason Notes</label>
              <input
                id="input-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
                placeholder="e.g. PO-8842 from supplier"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-4 shrink-0">
            <button
              id="btn-cancel-stock-adjust"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-stock-adjust"
              type="submit"
              className={`px-5 py-2.5 rounded-lg text-xs font-bold text-white shadow-sm transition-colors flex items-center space-x-1.5 ${
                type === 'restock' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Check className="h-4 w-4" />
              <span>{type === 'restock' ? 'Confirm Stock & Sync Finance' : 'Confirm & Update Stock'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
