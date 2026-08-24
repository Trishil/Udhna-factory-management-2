import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  Gauge, 
  Flame, 
  Activity, 
  Wrench, 
  User, 
  Layers, 
  Check, 
  Trash2, 
  Play, 
  PauseCircle,
  Sliders,
  PackageCheck,
  Clock,
  Maximize2,
  Zap,
  ShieldCheck,
  Info
} from 'lucide-react';
import { Machine, RawMaterial, MachineStatus, MachineOperatingSpeedMode } from '../types';
import { YUEMEI_25HEAD_SPECS } from '../utils/inventoryPresets';

interface MachineDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine: Machine | null;
  materials: RawMaterial[];
  onUpdateMachine: (updated: Machine) => void;
  onDeleteMachine: (machineId: string, machineName?: string, machineModel?: string) => void;
  onOpenStartTask?: (machineId: string) => void;
  onOpenFinishTask?: (machine: Machine) => void;
}

export const MachineDetailModal: React.FC<MachineDetailModalProps> = ({
  isOpen,
  onClose,
  machine,
  materials,
  onUpdateMachine,
  onDeleteMachine,
  onOpenStartTask,
  onOpenFinishTask
}) => {
  if (!isOpen || !machine) return null;

  const [name, setName] = useState(machine.name);
  const [model, setModel] = useState(machine.model || 'Yuemei 25-Head Multi-Head High-Speed Embroidery & Beading Machine');
  const [status, setStatus] = useState<MachineStatus>(machine.status);
  const [rpm, setRpm] = useState(machine.rpm);
  const [maxRpm, setMaxRpm] = useState(machine.maxRpm || 1000);
  const [operator, setOperator] = useState(machine.operator);
  const [activeJobName, setActiveJobName] = useState(machine.activeJobName);
  const [outputCount, setOutputCount] = useState(machine.outputCount);
  const [targetCount, setTargetCount] = useState(machine.targetCount);
  const [feedLinesCount, setFeedLinesCount] = useState(machine.feedLinesCount || 16);
  const [headCount, setHeadCount] = useState<number>(machine.headCount || 25);
  const [headPitchMm, setHeadPitchMm] = useState<number>(machine.headPitchMm || 400);
  const [frameLengthMeters, setFrameLengthMeters] = useState<number>(machine.frameLengthMeters || 12.5);
  const [areaX, setAreaX] = useState<number>(machine.embroideryAreaMm?.x || 400);
  const [areaY, setAreaY] = useState<number>(machine.embroideryAreaMm?.y || 1200);
  const [speedMode, setSpeedMode] = useState<MachineOperatingSpeedMode>(
    machine.activeTask?.speedMode || 'cutdana'
  );
  const [notes, setNotes] = useState(machine.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const activeTask = machine.activeTask;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateMachine({
      ...machine,
      name,
      model,
      status,
      rpm: status === 'running' ? Number(rpm) : 0,
      maxRpm: Number(maxRpm),
      operator,
      activeJobName,
      outputCount: Number(outputCount),
      targetCount: Number(targetCount),
      feedLinesCount: Number(feedLinesCount),
      headCount: Number(headCount),
      headPitchMm: Number(headPitchMm),
      frameLengthMeters: Number(frameLengthMeters),
      embroideryAreaMm: {
        x: Number(areaX),
        y: Number(areaY)
      },
      notes
    });
    onClose();
  };

  const handleTriggerDelete = () => {
    onDeleteMachine(machine.id, machine.name, machine.model);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-slate-100 text-slate-800 border border-slate-200">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{machine.name}</h3>
              <p className="text-xs text-slate-500">Equipment Telemetry &amp; Task Configuration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ACTIVE TASK MULTI-MATERIAL SUMMARY */}
        {activeTask && machine.status === 'running' && (
          <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200/90 mb-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 flex items-center space-x-1.5">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <span>Active Task: {activeTask.taskCode} — {activeTask.title}</span>
              </span>
              <div className="flex items-center space-x-2">
                {onOpenStartTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenStartTask(machine.id);
                    }}
                    className="text-[11px] font-bold text-blue-700 hover:underline flex items-center space-x-1"
                  >
                    <Sliders className="h-3 w-3" />
                    <span>Modify Recipe</span>
                  </button>
                )}
                {onOpenFinishTask && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFinishTask(machine);
                    }}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center space-x-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                  >
                    <PackageCheck className="h-3 w-3" />
                    <span>Finish / Settle Task</span>
                  </button>
                )}
              </div>
            </div>

            <div className="text-[11px] text-blue-800">
              Fed Materials: <strong>{activeTask.materials.length} Inputs</strong> | Output Target: <strong>{machine.outputCount.toLocaleString()} / {machine.targetCount.toLocaleString()} {activeTask.targetUnitName || 'meters'}</strong>
            </div>

            <div className="space-y-1.5 pt-1">
              {activeTask.materials.map((mat, idx) => (
                <div key={idx} className="bg-white p-2 rounded-lg border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span 
                      className="w-2.5 h-2.5 rounded-full border border-slate-300"
                      style={{ backgroundColor: mat.materialColorCode || '#2563EB' }}
                    />
                    <span className="font-bold text-slate-800 text-[11px]">
                      {mat.materialName || 'Material'} {mat.materialSize ? `(${mat.materialSize})` : ''}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-600 flex items-center space-x-2">
                    <span>Est: <strong>{mat.estimatedAmountUsed} {mat.unit}</strong></span>
                    <span className="text-blue-700 font-bold bg-blue-50 px-1 rounded">Rate: {mat.rateOfConsumption} {mat.unit}/h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4 text-xs">
          
          {/* Status buttons */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Machine Operational Status</label>
            <div className="grid grid-cols-4 gap-2">
              {(['running', 'idle', 'maintenance', 'stopped'] as MachineStatus[]).map(st => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatus(st);
                    if (st === 'running' && rpm === 0) setRpm(Math.round(maxRpm * 0.75));
                  }}
                  className={`py-2 px-1 rounded-lg font-bold border text-center uppercase tracking-wider text-[10px] transition-all ${
                    status === st
                      ? st === 'running'
                        ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                        : st === 'idle'
                        ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                        : st === 'maintenance'
                        ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                        : 'bg-rose-600 text-white border-rose-700 shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Machine Name & Model */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Model / Type</label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
          </div>

          {/* Speed & RPM Slider */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-700 flex items-center space-x-1">
                <Gauge className="h-4 w-4 text-blue-600" />
                <span>Operating Speed (RPM)</span>
              </span>
              <span className="font-bold text-slate-900 text-sm">{rpm} / {maxRpm} RPM</span>
            </div>
            <input
              type="range"
              min="0"
              max={maxRpm}
              step="50"
              value={rpm}
              onChange={(e) => setRpm(Number(e.target.value))}
              disabled={status !== 'running'}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono">
              <span>0 (Idle)</span>
              <span>Cutdana (450–650)</span>
              <span>Sequin (650–800)</span>
              <span>Zari (850–1000)</span>
            </div>
          </div>

          {/* 25-HEAD YUEMEI FRAME DIMENSIONS & CONFIG */}
          <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 flex items-center space-x-1.5 text-xs">
                <Maximize2 className="h-4 w-4 text-indigo-600" />
                <span>25-Head Yuemei Frame &amp; Area Specifications</span>
              </span>
              <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                25 HEAD CONFIG
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-700 text-[10px] mb-1">Head Count</label>
                <input
                  type="number"
                  value={headCount}
                  onChange={(e) => setHeadCount(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900 font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-[10px] mb-1">Pitch (mm/head)</label>
                <input
                  type="number"
                  value={headPitchMm}
                  onChange={(e) => setHeadPitchMm(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-[10px] mb-1">Frame Length (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={frameLengthMeters}
                  onChange={(e) => setFrameLengthMeters(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 text-[10px] mb-1">Embroidery Area</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    value={areaX}
                    onChange={(e) => setAreaX(Number(e.target.value))}
                    className="w-12 px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900 text-center"
                  />
                  <span className="text-slate-400">×</span>
                  <input
                    type="number"
                    value={areaY}
                    onChange={(e) => setAreaY(Number(e.target.value))}
                    className="w-12 px-1.5 py-1.5 bg-white border border-slate-200 rounded-lg font-mono text-xs text-slate-900 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-500 bg-white/70 p-2 rounded-lg border border-indigo-100 flex items-start space-x-1.5">
              <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
              <span>
                Standard Yuemei 25-Head: <strong>400–500 mm pitch</strong>, <strong>10.5–13.5 m total X-axis frame</strong>, and <strong>400×1200 mm</strong> head embroidery area (up to 1500 mm Y for bridal lehengas).
              </span>
            </div>
          </div>

          {/* Active Job Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Active Job Order / Batch</label>
            <input
              type="text"
              value={activeJobName}
              onChange={(e) => setActiveJobName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
            />
          </div>

          {/* Output & Target */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Shift Output</label>
              <input
                type="number"
                value={outputCount}
                onChange={(e) => setOutputCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Target</label>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Feed Spindles</label>
              <input
                type="number"
                value={feedLinesCount}
                onChange={(e) => setFeedLinesCount(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
          </div>

          {/* Operator & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Operator</label>
              <input
                type="text"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Last Maintenance</label>
              <input
                type="text"
                readOnly
                value={machine.lastMaintenance}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-mono"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Maintenance &amp; Shift Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-100 mt-6 space-y-3">
            {showDeleteConfirm ? (
              <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-150">
                <div className="text-xs text-rose-800 font-medium">
                  <strong>Remove this machine?</strong> This unit will be decommissioned and unsynced from Google Sheets.
                </div>
                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    id="btn-cancel-inline-delete-machine"
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded-md text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-confirm-inline-delete-machine"
                    type="button"
                    onClick={handleTriggerDelete}
                    className="px-3 py-1.5 rounded-md text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-2xs transition-colors flex items-center space-x-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Confirm Remove</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <button
                  id="btn-remove-machine"
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Remove Machine</span>
                </button>

                <div className="flex items-center space-x-2">
                  <button
                    id="btn-cancel-machine-detail"
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-save-machine-changes"
                    type="submit"
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center space-x-1.5"
                  >
                    <Check className="h-4 w-4" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            )}
          </div>

        </form>

      </div>
    </div>
  );
};
