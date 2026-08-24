import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  DollarSign, 
  Layers, 
  RotateCcw, 
  Archive, 
  Clock, 
  User, 
  Activity, 
  Flame, 
  ArrowRight,
  PackageCheck,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { Machine, RawMaterial, MachineTask, TaskMaterialInput } from '../types';

export interface TaskCompletionSummary {
  task: MachineTask;
  consumedBreakdown: Array<{
    materialId: string;
    materialName: string;
    quantityUsed: number;
    unit: string;
    unitCost: number;
    totalCost: number;
  }>;
  totalMaterialCost: number;
  outputProduced: number;
  notes?: string;
}

export interface TaskDiscardOptions {
  revertMaterials: boolean; // true = restore/refund material stocks; false = keep as scrap/consumed
  task: MachineTask;
  scrapCost: number;
  reason?: string;
}

interface FinishTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  materials: RawMaterial[];
  onCompleteTask: (machineId: string, summary: TaskCompletionSummary) => void;
  onDiscardTask: (machineId: string, options: TaskDiscardOptions) => void;
}

export const FinishTaskModal: React.FC<FinishTaskModalProps> = ({
  isOpen,
  onClose,
  machine,
  materials,
  onCompleteTask,
  onDiscardTask
}) => {
  if (!isOpen || !machine || !machine.activeTask) return null;

  const activeTask = machine.activeTask;

  // View state: 'review' | 'discard_prompt'
  const [viewStep, setViewStep] = useState<'review' | 'discard_prompt'>('review');
  const [finalOutputUnits, setFinalOutputUnits] = useState<number>(machine.outputCount || 0);
  const [completionNotes, setCompletionNotes] = useState<string>('');
  const [discardReason, setDiscardReason] = useState<string>('Task cancelled by operator');

  // Calculate material consumption and exact costs
  const consumedBreakdown = activeTask.materials.map(matInput => {
    const rawMat = materials.find(m => m.id === matInput.materialId);
    const unitCost = matInput.unitCost ?? (rawMat?.unitCost || 0.15);
    
    // Amount consumed so far (plus initial launch allocation if applicable)
    const initialAlloc = matInput.allocatedAtStart || Math.round(matInput.estimatedAmountUsed * 0.05);
    const trackedConsumed = matInput.consumedSoFar || 0;
    const totalQuantityUsed = Math.max(1, trackedConsumed + initialAlloc);
    const totalCost = Number((totalQuantityUsed * unitCost).toFixed(2));

    return {
      materialId: matInput.materialId,
      materialName: matInput.materialName || rawMat?.name || 'Raw Material',
      materialCode: matInput.materialCode || rawMat?.code || '',
      materialColorCode: matInput.materialColorCode || rawMat?.colorCode || '#2563EB',
      materialSize: matInput.materialSize || rawMat?.size || '',
      quantityUsed: totalQuantityUsed,
      estimated: matInput.estimatedAmountUsed,
      unit: matInput.unit || rawMat?.unit || 'meters',
      unitCost,
      totalCost
    };
  });

  const totalMaterialCost = Number(
    consumedBreakdown.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)
  );

  const costPerUnit = finalOutputUnits > 0
    ? Number((totalMaterialCost / finalOutputUnits).toFixed(2))
    : 0;

  // Duration formatted
  const getRuntimeMinutes = () => {
    if (!activeTask.startedAt) return 'Active session';
    const start = new Date(activeTask.startedAt).getTime();
    const now = Date.now();
    const diffMins = Math.max(1, Math.round((now - start) / 60000));
    if (diffMins < 60) return `${diffMins} mins`;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hrs}h ${mins}m`;
  };

  // Handlers
  const handleConfirmFinish = () => {
    const summary: TaskCompletionSummary = {
      task: {
        ...activeTask,
        currentOutputUnits: finalOutputUnits,
        status: 'completed',
        completedAt: new Date().toISOString(),
        totalMaterialCost
      },
      consumedBreakdown: consumedBreakdown.map(b => ({
        materialId: b.materialId,
        materialName: b.materialName,
        quantityUsed: b.quantityUsed,
        unit: b.unit,
        unitCost: b.unitCost,
        totalCost: b.totalCost
      })),
      totalMaterialCost,
      outputProduced: finalOutputUnits,
      notes: completionNotes.trim()
    };

    onCompleteTask(machine.id, summary);
    onClose();
  };

  const handleExecuteDiscard = (revertMaterials: boolean) => {
    const options: TaskDiscardOptions = {
      revertMaterials,
      task: {
        ...activeTask,
        status: 'discarded',
        completedAt: new Date().toISOString(),
        totalMaterialCost: revertMaterials ? 0 : totalMaterialCost
      },
      scrapCost: revertMaterials ? 0 : totalMaterialCost,
      reason: discardReason
    };

    onDiscardTask(machine.id, options);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className={`p-2.5 rounded-xl text-white shadow-xs ${
              viewStep === 'review' ? 'bg-blue-600' : 'bg-rose-600'
            }`}>
              {viewStep === 'review' ? (
                <PackageCheck className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  {viewStep === 'review' ? 'Finish Production Task' : 'Discard Production Task'}
                </h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {activeTask.taskCode}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {viewStep === 'review'
                  ? `Verify material consumption and financial accounting for ${machine.name}`
                  : `Select material stock handling method for discarded task on ${machine.name}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* STEP 1: REVIEW & FINISH / CHOOSE DISCARD */}
        {viewStep === 'review' && (
          <div className="space-y-4 text-xs">
            
            {/* Task Banner */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activeTask.title}</h4>
                  <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                    <span className="flex items-center space-x-1">
                      <User className="h-3.5 w-3.5 text-slate-400" />
                      <span>Operator: <strong>{activeTask.operator}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" />
                      <span>Runtime: <strong>{getRuntimeMinutes()}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Activity className="h-3.5 w-3.5 text-slate-400" />
                      <span>Machine: <strong>{machine.name.split('—')[0]}</strong></span>
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">Output Progress</span>
                  <span className="font-mono font-black text-sm text-emerald-700">
                    {machine.outputCount.toLocaleString()} / {machine.targetCount.toLocaleString()} {activeTask.targetUnitName}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${machine.targetCount > 0 
                      ? Math.min(100, Math.round((machine.outputCount / machine.targetCount) * 100)) 
                      : 0}%` 
                  }}
                />
              </div>
            </div>

            {/* Material Usage & Cost Accounting Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                  <Layers className="h-4 w-4 text-blue-600" />
                  <span>Calculated Material Consumption &amp; Cost Breakdown</span>
                </label>
                <span className="text-[11px] text-slate-500 font-mono">
                  {consumedBreakdown.length} Fed Materials
                </span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Material SKU / Name</th>
                      <th className="py-2.5 px-3 text-right">Quantity Consumed</th>
                      <th className="py-2.5 px-3 text-right">Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Total Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-mono">
                    {consumedBreakdown.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2 px-3">
                          <div className="flex items-center space-x-2 font-sans">
                            <span 
                              className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300" 
                              style={{ backgroundColor: item.materialColorCode }}
                            />
                            <div>
                              <span className="font-bold text-slate-800 block text-xs">{item.materialName}</span>
                              {item.materialCode && (
                                <span className="text-[10px] text-slate-500 font-mono">{item.materialCode}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-slate-800">
                          {item.quantityUsed.toLocaleString()} {item.unit}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          ₹{item.unitCost.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">
                          ₹{item.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold">
                    <tr>
                      <td colSpan={3} className="py-2.5 px-3 text-slate-700 text-right uppercase tracking-wider text-[10px]">
                        Total Material Production Cost:
                      </td>
                      <td className="py-2.5 px-3 text-right text-sm font-black text-emerald-800 font-mono">
                        ₹{totalMaterialCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Final Output Adjustment & Financial Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Final Output Produced ({activeTask.targetUnitName})
                </label>
                <input
                  type="number"
                  min="0"
                  value={finalOutputUnits}
                  onChange={(e) => setFinalOutputUnits(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="p-2.5 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Unit Cost of Production</span>
                  <span className="text-sm font-mono font-bold text-emerald-900">
                    ₹{costPerUnit.toFixed(2)} <span className="text-[10px] font-normal text-emerald-700">/ {activeTask.targetUnitName}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Total Expenditure</span>
                  <span className="text-sm font-mono font-bold text-emerald-900">
                    ₹{totalMaterialCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Optional Completion Notes */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Completion Notes / Quality Remark (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Batch inspected, standard tension verified, no yarn breakages"
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Action Buttons: Finish or Discard */}
            <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={() => setViewStep('discard_prompt')}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center justify-center space-x-1.5"
              >
                <Trash2 className="h-3.5 w-3.5 text-rose-600" />
                <span>Discard / Cancel Task...</span>
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200"
                >
                  Keep Running
                </button>

                <button
                  type="button"
                  onClick={handleConfirmFinish}
                  className="flex-1 sm:flex-none px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Mark Task Finished &amp; Settle Cost</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* STEP 2: DISCARD TASK PROMPT & MATERIAL HANDLING CHOICE */}
        {viewStep === 'discard_prompt' && (
          <div className="space-y-4 text-xs">
            
            {/* Warning Callout */}
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm">Discard Confirmation: {activeTask.taskCode}</p>
                <p className="text-[11px] text-amber-800 mt-1 leading-relaxed">
                  You are about to discard <strong>"{activeTask.title}"</strong> on {machine.name}. Please select how the materials used while this task was running should be accounted for.
                </p>
              </div>
            </div>

            {/* Two Actionable Choice Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              
              {/* Option A: Keep Deducted as Scrap / Test Run */}
              <div className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50/20 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-amber-700 font-bold">
                    <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <Flame className="h-4 w-4" />
                    </div>
                    <span className="text-xs">Keep Materials Deducted</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Treat the consumed materials as <strong>scrap / test burn waste</strong>. Inventory levels will remain deducted, and the expenditure of <strong>₹{totalMaterialCost.toLocaleString()}</strong> will be logged as production scrap.
                  </p>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-700">
                    Scrap Cost: <strong>₹{totalMaterialCost.toLocaleString()}</strong> ({consumedBreakdown.reduce((sum, i) => sum + i.quantityUsed, 0)} units total)
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteDiscard(false)}
                  className="w-full py-2.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <Archive className="h-3.5 w-3.5" />
                  <span>Discard &amp; Keep Scrap Deducted</span>
                </button>
              </div>

              {/* Option B: Reset & Restore Materials (Refund to Stock) */}
              <div className="p-4 bg-white rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-700 font-bold">
                    <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                      <RotateCcw className="h-4 w-4" />
                    </div>
                    <span className="text-xs">Reset &amp; Refund Materials</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    <strong>Refund and restore</strong> all material quantities back into stock to the exact level before this task was launched. Material costs will be reset to ₹0.00.
                  </p>
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 font-mono text-[10px] text-emerald-800">
                    Stock Restored: <strong>+{consumedBreakdown.reduce((sum, i) => sum + i.quantityUsed, 0)} units</strong> refunded to inventory
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleExecuteDiscard(true)}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Discard &amp; Refund All Materials</span>
                </button>
              </div>

            </div>

            {/* Discard Reason Input */}
            <div className="pt-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Reason for Discarding Task (Optional)
              </label>
              <input
                type="text"
                value={discardReason}
                onChange={(e) => setDiscardReason(e.target.value)}
                placeholder="e.g. Design specification changed / Line maintenance required"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            {/* Back Button */}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => setViewStep('review')}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200 flex items-center space-x-1"
              >
                <span>&larr; Back to Task Review</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
              >
                Cancel
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
