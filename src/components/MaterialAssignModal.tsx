import React, { useState } from 'react';
import { X, ArrowRightLeft, Layers, Check, AlertTriangle } from 'lucide-react';
import { Machine, RawMaterial } from '../types';

interface MaterialAssignModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  materials: RawMaterial[];
  onAssignMaterial: (machineId: string, primaryMaterialId: string, secondaryMaterialId?: string) => void;
}

export const MaterialAssignModal: React.FC<MaterialAssignModalProps> = ({
  isOpen,
  onClose,
  machine,
  materials,
  onAssignMaterial
}) => {
  if (!isOpen || !machine) return null;

  const [selectedPrimary, setSelectedPrimary] = useState(machine.currentMaterialId || materials[0]?.id || '');
  const [selectedSecondary, setSelectedSecondary] = useState(machine.secondaryMaterialId || '');

  const primaryMat = materials.find(m => m.id === selectedPrimary);
  const secondaryMat = materials.find(m => m.id === selectedSecondary);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAssignMaterial(machine.id, selectedPrimary, selectedSecondary || undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <ArrowRightLeft className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Switch Material Feed</h3>
              <p className="text-xs text-slate-500">{machine.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Primary Material Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Primary Feed Raw Material *</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {materials.map(mat => {
                const isSelected = selectedPrimary === mat.id;
                const isLow = mat.currentStock <= mat.minThreshold;

                return (
                  <div
                    key={mat.id}
                    onClick={() => setSelectedPrimary(mat.id)}
                    className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-1 ring-blue-500/30'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span 
                        className="w-3 h-3 rounded-full shrink-0 border border-slate-300"
                        style={{ backgroundColor: mat.colorCode || '#2563EB' }}
                      ></span>
                      <div className="truncate">
                        <div className="flex items-center space-x-1.5 truncate">
                          <p className="font-bold text-slate-900 truncate">{mat.name}</p>
                          {mat.code && (
                            <span className="font-mono text-[9px] font-bold px-1 py-0.2 rounded bg-slate-100 text-slate-700">
                              {mat.code}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          {mat.category} {mat.size ? `• Size: ${mat.size}` : ''} {mat.colorName ? `• Color: ${mat.colorName}` : ''} • Bin: {mat.locationBin}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <span className="font-bold text-slate-800">{(mat.currentStock ?? 0).toLocaleString()} {mat.unit}</span>
                      {isLow && (
                        <span className="block text-[10px] font-bold text-amber-600">Low Stock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Optional Secondary Material */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Optional Auxiliary / Secondary Feed (e.g. Core string)</label>
            <select
              value={selectedSecondary}
              onChange={(e) => setSelectedSecondary(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
            >
              <option value="">-- None (Single Feed) --</option>
              {materials.map(mat => (
                <option key={mat.id} value={mat.id}>
                  {mat.name} ({mat.currentStock} {mat.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Warning notice if stock is low */}
          {primaryMat && primaryMat.currentStock <= primaryMat.minThreshold && (
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-start space-x-2 text-amber-800 text-[11px]">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <span className="font-bold">Caution:</span> Selected material has only {primaryMat.currentStock} {primaryMat.unit} left (below safety threshold of {primaryMat.minThreshold}).
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Check className="h-4 w-4" />
              <span>Connect Feed to Machine</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
