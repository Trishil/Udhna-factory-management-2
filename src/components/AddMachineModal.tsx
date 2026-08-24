import React, { useState } from 'react';
import { X, Cpu, Plus, Layers, Info, Maximize2, Sparkles } from 'lucide-react';
import { Machine, RawMaterial } from '../types';

interface AddMachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  materials: RawMaterial[];
  existingMachinesCount: number;
  onAddMachine: (newMachine: Omit<Machine, 'id'>) => void;
}

export const AddMachineModal: React.FC<AddMachineModalProps> = ({
  isOpen,
  onClose,
  materials,
  existingMachinesCount,
  onAddMachine
}) => {
  const nextMachineNumber = existingMachinesCount + 1;

  const [name, setName] = useState(`Machine #${nextMachineNumber} — Yuemei 25-Head Embroidery ${String.fromCharCode(64 + nextMachineNumber)}`);
  const [model, setModel] = useState('Yuemei 25-Head Multi-Head High-Speed Embroidery');
  const [feedLinesCount, setFeedLinesCount] = useState(16);
  const [maxRpm, setMaxRpm] = useState(1000);
  const [targetCount, setTargetCount] = useState(10);
  const [headCount, setHeadCount] = useState(25);
  const [headPitchMm, setHeadPitchMm] = useState(400);
  const [frameLengthMeters, setFrameLengthMeters] = useState(12.5);
  const [areaX, setAreaX] = useState(400);
  const [areaY, setAreaY] = useState(1200);
  const [operator, setOperator] = useState('Line Operator');
  const [notes, setNotes] = useState('25-Head Yuemei machine (400mm pitch, 12.5m frame, 400×1200mm area) commissioned on floor.');

  if (!isOpen) return null;

  const handleApplyYuemeiPreset = () => {
    setName(`Machine #${nextMachineNumber} — Yuemei 25-Head Embroidery ${String.fromCharCode(64 + nextMachineNumber)}`);
    setModel('Yuemei 25-Head Multi-Head High-Speed Embroidery');
    setFeedLinesCount(16);
    setMaxRpm(1000);
    setTargetCount(10);
    setHeadCount(25);
    setHeadPitchMm(400);
    setFrameLengthMeters(12.5);
    setAreaX(400);
    setAreaY(1200);
    setNotes('25-Head Yuemei machine (400mm pitch, 12.5m frame, 400×1200mm area) with 4-cassette bead/sequin feeders.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddMachine({
      name: name.trim(),
      model: model.trim() || 'Standard Production Unit',
      status: 'idle',
      activeJobName: 'Queue: Ready for task recipe assignment',
      rpm: 0,
      maxRpm: Number(maxRpm) || 1000,
      outputCount: 0,
      targetCount: Number(targetCount) || 10,
      operator: operator.trim() || 'Unassigned',
      temperatureCelsius: 24.5,
      uptimeHours: 0,
      efficiencyPercent: 95,
      feedLinesCount: Number(feedLinesCount) || 16,
      headCount: Number(headCount) || 25,
      headPitchMm: Number(headPitchMm) || 400,
      frameLengthMeters: Number(frameLengthMeters) || 12.5,
      embroideryAreaMm: {
        x: Number(areaX) || 400,
        y: Number(areaY) || 1200
      },
      lastMaintenance: new Date().toISOString().split('T')[0],
      notes
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add New Factory Machine</h3>
              <p className="text-xs text-slate-500">Commission equipment unit (Machine #{nextMachineNumber})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="mb-4 p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 flex items-center justify-between gap-2">
          <div className="flex items-center space-x-1.5 text-xs text-indigo-900">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span className="font-semibold">Quick Template:</span>
          </div>
          <button
            type="button"
            onClick={handleApplyYuemeiPreset}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1 shadow-2xs"
          >
            <Maximize2 className="h-3 w-3" />
            <span>Apply Yuemei 25-Head Specs</span>
          </button>
        </div>

        {/* Task-Driven Multi-Material Architecture Notice */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 flex items-start space-x-2.5 text-xs text-slate-700">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Yuemei 25-Head Specifications:</span> 400–500 mm head pitch, 10.5–13.5 m continuous X-axis frame, 400×1200 mm embroidery area with 4–5 cassette bead/sequin feeders.
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Machine Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Machine Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 font-medium"
              placeholder="e.g. Machine #5 — Yuemei 25-Head E"
            />
          </div>

          {/* Model & Feed Lines */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Model / Equipment Type</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
                placeholder="e.g. Yuemei 25-Head Multi-Head"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Feed Spindles / Input Channels</label>
              <input
                type="number"
                min="1"
                max="64"
                value={feedLinesCount}
                onChange={(e) => setFeedLinesCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              />
            </div>
          </div>

          {/* 25-Head Dimensions Grid */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider block">
              Frame Dimensions &amp; Pitch Specifications
            </span>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] text-slate-600 font-medium mb-1">Heads</label>
                <input
                  type="number"
                  value={headCount}
                  onChange={(e) => setHeadCount(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-medium mb-1">Pitch (mm)</label>
                <input
                  type="number"
                  value={headPitchMm}
                  onChange={(e) => setHeadPitchMm(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-600 font-medium mb-1">Frame X (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={frameLengthMeters}
                  onChange={(e) => setFrameLengthMeters(Number(e.target.value))}
                  className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Max RPM & Target Output */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Max Speed (RPM)</label>
              <input
                type="number"
                min="100"
                max="5000"
                step="50"
                value={maxRpm}
                onChange={(e) => setMaxRpm(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Target Rating (Units/Meters)</label>
              <input
                type="number"
                min="500"
                step="100"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              />
            </div>
          </div>

          {/* Operator */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Default Line Operator</label>
            <input
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900"
              placeholder="e.g. Alex Morgan"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Floor Notes & Commissioning Log</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              placeholder="Calibration details or location notes..."
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-6">
            <button
              id="btn-cancel-add-machine"
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-submit-add-machine"
              type="submit"
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center space-x-1.5"
            >
              <Plus className="h-4 w-4" />
              <span>Add Machine to Floor</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
