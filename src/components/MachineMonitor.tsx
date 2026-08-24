import React from 'react';
import { 
  Settings, 
  Play, 
  Square, 
  Wrench, 
  PauseCircle, 
  Layers, 
  Flame, 
  User, 
  Clock, 
  Gauge, 
  Plus, 
  AlertCircle, 
  CheckCircle,
  MoreVertical,
  Activity,
  ArrowRightLeft,
  Trash2,
  PackageCheck,
  Zap,
  CheckCircle2,
  StopCircle,
  Sliders
} from 'lucide-react';
import { Machine, RawMaterial, MachineStatus, MachineTask } from '../types';

interface MachineMonitorProps {
  machines: Machine[];
  materials: RawMaterial[];
  onToggleStatus: (machineId: string, newStatus: MachineStatus) => void;
  onOpenAssignMaterial: (machine: Machine) => void;
  onOpenMachineDetail: (machine: Machine) => void;
  onOpenAddMachine: () => void;
  onOpenStartTask?: (machineId?: string) => void;
  onStopTask?: (machineId: string) => void;
  onOpenFinishTask?: (machine: Machine) => void;
  onDeleteMachine?: (machineId: string, machineName?: string, machineModel?: string) => void;
}

export const MachineMonitor: React.FC<MachineMonitorProps> = ({
  machines,
  materials,
  onToggleStatus,
  onOpenAssignMaterial,
  onOpenMachineDetail,
  onOpenAddMachine,
  onOpenStartTask,
  onStopTask,
  onOpenFinishTask,
  onDeleteMachine
}) => {
  return (
    <section id="machines-section" className="mb-8">
      
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center space-x-2">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Machine Floor &amp; Active Task Execution
          </h2>
          <span className="text-[10px] font-mono font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
            {machines.length} UNITS
          </span>
          <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
            {machines.filter(m => m.status === 'running').length} ACTIVE TASKS
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenStartTask && (
            <button
              id="btn-start-task-top"
              onClick={() => onOpenStartTask()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>+ Start New Task Order</span>
            </button>
          )}

          <button
            id="btn-add-machine-grid"
            onClick={onOpenAddMachine}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Machine</span>
          </button>
        </div>
      </div>

      {/* Grid of Machines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {machines.map((machine, index) => {
          const isRunning = machine.status === 'running';
          const isIdle = machine.status === 'idle';
          const isMaintenance = machine.status === 'maintenance';
          const isStopped = machine.status === 'stopped';

          const activeTask = machine.activeTask;
          const taskMaterials = activeTask?.materials || [];

          const outputPercent = machine.targetCount > 0 
            ? Math.min(100, Math.round((machine.outputCount / machine.targetCount) * 100)) 
            : 0;

          const machineNum = (index + 1).toString().padStart(2, '0');

          return (
            <div 
              key={machine.id}
              id={`machine-card-${machine.id}`}
              className={`bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                isRunning 
                  ? 'border-t-4 border-t-emerald-500' 
                  : isIdle
                  ? 'border-t-4 border-t-blue-500'
                  : isMaintenance
                  ? 'border-t-4 border-t-orange-500'
                  : 'border-t-4 border-t-slate-400'
              }`}
            >
              
              {/* Card Top: Machine Unit & Status Header */}
              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="flex items-center space-x-1.5">
                      <span className="text-sm font-bold text-slate-800 tracking-tight uppercase">
                        MACHINE {machineNum}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded font-bold">
                        {machine.headCount || 25}H ({machine.headPitchMm || 400}mm)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">
                      {machine.model || 'Yuemei 25-Head Multi-Head Embroidery'}
                    </p>
                    <div className="flex items-center space-x-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
                      <span>Area: {machine.embroideryAreaMm ? `${machine.embroideryAreaMm.x}×${machine.embroideryAreaMm.y}mm` : '400×1200mm'}</span>
                      <span>•</span>
                      <span>Frame: {machine.frameLengthMeters || 12.5}m</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      isRunning 
                        ? 'bg-emerald-100 text-emerald-700 font-black flex items-center space-x-1' 
                        : isIdle 
                        ? 'bg-blue-100 text-blue-700' 
                        : isMaintenance 
                        ? 'bg-orange-100 text-orange-700' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />}
                      <span>{machine.status}</span>
                    </span>

                    <button
                      id={`btn-settings-${machine.id}`}
                      onClick={() => onOpenMachineDetail(machine)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                      title="Machine Settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* TASK & MULTI-MATERIAL RECIPE SECTION */}
                {isRunning && activeTask ? (
                  <div className="mt-2.5 bg-slate-50/90 rounded-xl p-3 border border-slate-200 space-y-2">
                    
                    {/* Active Task Name & Code */}
                    <div className="flex items-start justify-between gap-1.5 border-b border-slate-200/80 pb-2">
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                            {activeTask.taskCode}
                          </span>
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            {activeTask.operator}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate mt-0.5" title={activeTask.title}>
                          {activeTask.title}
                        </h4>
                      </div>

                      {/* Manage Task Button */}
                      {onOpenStartTask && (
                        <button
                          onClick={() => onOpenStartTask(machine.id)}
                          className="shrink-0 p-1 text-blue-600 hover:bg-blue-50 rounded text-[10px] font-bold flex items-center space-x-0.5"
                          title="Edit Task Recipe / Materials"
                        >
                          <Sliders className="h-3 w-3" />
                        </button>
                      )}
                    </div>

                    {/* Fed Materials List (Multi-Material Channels) */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                        <span>Fed Materials ({taskMaterials.length})</span>
                        <span>Burn Rate</span>
                      </div>

                      <div className="space-y-1.5">
                        {taskMaterials.map((mat, mIdx) => {
                          const raw = materials.find(m => m.id === mat.materialId);
                          const currentStock = raw ? raw.currentStock : 0;
                          const isLow = raw ? raw.currentStock <= raw.minThreshold : false;
                          const progress = mat.estimatedAmountUsed > 0 
                            ? Math.min(100, Math.round(((mat.consumedSoFar || 0) / mat.estimatedAmountUsed) * 100))
                            : 0;

                          return (
                            <div 
                              key={mIdx}
                              className="bg-white p-2 rounded-lg border border-slate-200/90 text-xs shadow-2xs space-y-1"
                            >
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center space-x-1.5 min-w-0">
                                  <span 
                                    className="w-2.5 h-2.5 rounded-full shrink-0 border border-slate-300"
                                    style={{ backgroundColor: mat.materialColorCode || '#2563EB' }}
                                  />
                                  <span className="font-bold text-slate-800 text-[11px] truncate">
                                    {mat.materialName || 'Material'}
                                  </span>
                                  {mat.materialSize && (
                                    <span className="text-[10px] font-mono text-indigo-600 font-bold">
                                      ({mat.materialSize})
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded shrink-0">
                                  {mat.rateOfConsumption} {mat.unit}/h
                                </span>
                              </div>

                              {/* Progress & Stock */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5">
                                <span>Used: <strong className="text-slate-700">{mat.consumedSoFar || 0}</strong> / {mat.estimatedAmountUsed} {mat.unit}</span>
                                <span className={isLow ? 'text-amber-600 font-bold' : 'text-slate-500'}>
                                  Stock: {currentStock.toLocaleString()} {mat.unit}
                                </span>
                              </div>

                              {/* Progress mini bar */}
                              <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Target Output Progress Bar with Running Pulse Animation */}
                    <div className="pt-2 border-t border-slate-200/90 mt-2 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200/80">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <div className="flex items-center space-x-1.5 font-bold text-emerald-900">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          <span className="uppercase tracking-wider text-[10px]">Active Task Progress</span>
                        </div>
                        <span className="font-mono font-black text-emerald-700 bg-emerald-100/90 px-1.5 py-0.5 rounded text-[11px]">
                          {outputPercent}%
                        </span>
                      </div>

                      {/* Main Visual Progress Bar with Running Pulse & Striped Shimmer */}
                      <div className="relative w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner p-0.5">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full transition-all duration-500 relative overflow-hidden animate-pulse shadow-sm" 
                          style={{ width: `${Math.max(3, outputPercent)}%` }}
                        >
                          {/* Inner glowing shimmer sweep */}
                          <div className="absolute inset-0 bg-white/25 w-full h-full animate-[pulse_1.5s_cubic-bezier(0.4,0,0.6,1)_infinite]" />
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-emerald-800 font-mono mt-1.5 font-medium">
                        <span>
                          <strong className="text-slate-900 font-bold">{machine.outputCount.toLocaleString()}</strong> / {machine.targetCount.toLocaleString()} {activeTask.targetUnitName || 'units'}
                        </span>
                        <span className="text-slate-500">
                          {Math.max(0, machine.targetCount - machine.outputCount).toLocaleString()} {activeTask.targetUnitName || 'units'} left
                        </span>
                      </div>
                    </div>

                  </div>
                ) : (
                  /* IDLE / READY FOR TASK STATE */
                  <div className="mt-2.5 bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-center space-y-2.5">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
                      <PackageCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {isMaintenance ? 'Under Maintenance' : 'Ready for Task Recipe'}
                      </h4>
                      <p className="text-[10px] text-slate-500">
                        {isMaintenance ? 'Machine is currently being serviced.' : 'Assign multi-material inputs and launch production task.'}
                      </p>
                    </div>

                    {onOpenStartTask && !isMaintenance && (
                      <button
                        id={`btn-assign-task-${machine.id}`}
                        onClick={() => onOpenStartTask(machine.id)}
                        className="w-full py-2 px-3 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Task on Machine</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Telemetry Mini-Grid & Speed Mode */}
                <div className="space-y-1.5 mt-3 pt-2 border-t border-slate-100 font-mono text-[10px]">
                  {/* Speed Mode Indicator */}
                  {machine.activeTask?.speedMode && (
                    <div className="flex items-center justify-between bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[10px]">
                      <span className="text-slate-500 font-sans font-bold flex items-center space-x-1">
                        <span>
                          {machine.activeTask.speedMode === 'cutdana' ? '💎 Cutdana Mode' : machine.activeTask.speedMode === 'sequin' ? '✨ Sequin Mode' : '🧵 Flat/Zari Mode'}
                        </span>
                      </span>
                      <span className={`px-1.5 py-0.2 rounded font-bold ${
                        machine.activeTask.speedMode === 'cutdana' ? 'bg-blue-100 text-blue-700' :
                        machine.activeTask.speedMode === 'sequin' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {machine.activeTask.speedMode === 'cutdana' ? '450–650 RPM' : machine.activeTask.speedMode === 'sequin' ? '650–800 RPM' : '850–1000 RPM'}
                      </span>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-slate-400 text-[9px] block">SPEED</span>
                      <span className="font-bold text-slate-800">{isRunning ? `${machine.rpm} RPM` : '0 RPM'}</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-slate-400 text-[9px] block">TEMP</span>
                      <span className="font-bold text-slate-800">{machine.temperatureCelsius}&deg;C</span>
                    </div>
                    <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                      <span className="text-slate-400 text-[9px] block">EFFICIENCY</span>
                      <span className="font-bold text-slate-800">{isRunning ? `${machine.efficiencyPercent}%` : '—'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Footer Action Buttons */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-1.5">
                {isRunning ? (
                  <>
                    <button
                      id={`btn-pause-${machine.id}`}
                      onClick={() => onToggleStatus(machine.id, 'idle')}
                      className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors shadow-2xs"
                      title="Pause current task"
                    >
                      <PauseCircle className="h-3.5 w-3.5" />
                      <span>Pause Task</span>
                    </button>

                    {(onOpenFinishTask || onStopTask) && (
                      <button
                        id={`btn-stop-${machine.id}`}
                        onClick={() => {
                          if (onOpenFinishTask && machine.activeTask) {
                            onOpenFinishTask(machine);
                          } else if (onStopTask) {
                            onStopTask(machine.id);
                          }
                        }}
                        className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-2xs flex items-center space-x-1"
                        title="Finish or Discard Task"
                      >
                        <StopCircle className="h-3.5 w-3.5 text-rose-400" />
                        <span>Finish</span>
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {machine.activeTask ? (
                      <>
                        <button
                          id={`btn-resume-${machine.id}`}
                          onClick={() => onToggleStatus(machine.id, 'running')}
                          disabled={isMaintenance}
                          className="flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Resume Task</span>
                        </button>
                        {onOpenFinishTask && (
                          <button
                            id={`btn-finish-paused-${machine.id}`}
                            onClick={() => onOpenFinishTask(machine)}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-slate-900 text-white transition-colors shadow-2xs flex items-center space-x-1"
                            title="Finish or Discard Task"
                          >
                            <StopCircle className="h-3.5 w-3.5 text-rose-400" />
                            <span>Finish</span>
                          </button>
                        )}
                      </>
                    ) : (
                      onOpenStartTask && (
                        <button
                          id={`btn-start-${machine.id}`}
                          onClick={() => onOpenStartTask(machine.id)}
                          disabled={isMaintenance}
                          className={`flex-1 flex items-center justify-center space-x-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors shadow-2xs ${
                            isMaintenance
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Start Task</span>
                        </button>
                      )
                    )}
                  </>
                )}

                <button
                  onClick={() => onToggleStatus(machine.id, isMaintenance ? 'idle' : 'maintenance')}
                  className={`p-1.5 rounded-lg border text-xs transition-colors ${
                    isMaintenance 
                      ? 'bg-orange-100 text-orange-800 border-orange-300' 
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                  }`}
                  title="Maintenance Toggle"
                >
                  <Wrench className="h-3.5 w-3.5" />
                </button>

                <button
                  id={`btn-machine-specs-${machine.id}`}
                  onClick={() => onOpenMachineDetail(machine)}
                  className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                  title="Configure machine parameters"
                >
                  Specs
                </button>

                {onDeleteMachine && (
                  <button
                    id={`btn-delete-machine-${machine.id}`}
                    onClick={() => onDeleteMachine(machine.id, machine.name, machine.model)}
                    className="p-1.5 rounded-lg border text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-slate-200 hover:border-rose-200 transition-colors"
                    title="Remove Machine from Floor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

            </div>
          );
        })}

        {/* Add Machine Card */}
        <div 
          onClick={onOpenAddMachine}
          className="bg-white border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/20 rounded-xl p-5 flex flex-col items-center justify-center text-center cursor-pointer transition-all group min-h-[300px] shadow-sm"
        >
          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 group-hover:border-blue-300 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-600 transition-all mb-2">
            <Plus className="h-5 w-5" />
          </div>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider group-hover:text-blue-600">Add Machine #{machines.length + 1}</h3>
          <p className="text-[11px] text-slate-400 max-w-xs mt-1">
            Commission equipment unit ready to execute multi-material tasks
          </p>
        </div>

      </div>
    </section>
  );
};
