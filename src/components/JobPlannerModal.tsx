import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Play, 
  Plus, 
  Trash2, 
  Layers, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  DollarSign, 
  Gauge, 
  Sparkles,
  Info,
  PackageCheck,
  Gem,
  Sliders,
  RotateCcw,
  Maximize2,
  Zap,
  ShieldCheck,
  Calculator
} from 'lucide-react';
import { Machine, RawMaterial, MachineTask, TaskMaterialInput, MachineOperatingSpeedMode } from '../types';
import { 
  STANDARD_MACHINE_INPUTS_10, 
  STANDARD_MACHINE_INPUTS_11, 
  StandardMachineInputSlot,
  YUEMEI_25HEAD_SPECS,
  YUEMEI_FRAME_CONSUMPTION_STANDARDS,
  calculateYuemei25HeadConsumption,
  buildYuemei25HeadTaskMaterials
} from '../utils/inventoryPresets';

interface JobPlannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  machines: Machine[];
  materials: RawMaterial[];
  preSelectedMachineId?: string;
  onStartTask: (machineId: string, task: MachineTask) => void;
}

export const JobPlannerModal: React.FC<JobPlannerModalProps> = ({
  isOpen,
  onClose,
  machines,
  materials,
  preSelectedMachineId,
  onStartTask
}) => {
  if (!isOpen) return null;

  // Selected Target Machine
  const [selectedMachineId, setSelectedMachineId] = useState<string>(
    preSelectedMachineId && machines.some(m => m.id === preSelectedMachineId)
      ? preSelectedMachineId
      : machines[0]?.id || ''
  );

  // Task Details
  const defaultTaskNumber = Math.floor(1000 + Math.random() * 9000);
  const [taskCode, setTaskCode] = useState<string>(`TSK-${defaultTaskNumber}`);
  const [taskTitle, setTaskTitle] = useState<string>('Yuemei 25-Head Bridal/Lehenga Full-Frame Production Recipe');
  const [targetOutput, setTargetOutput] = useState<number>(5);
  const [targetUnitName, setTargetUnitName] = useState<string>('frames');
  const [operator, setOperator] = useState<string>('Marcus Vance');
  const [notes, setNotes] = useState<string>('25-Head Yuemei multi-material task with 4 bead/sequin cassettes & continuous fabric/stabilizer frame feed.');
  const [activeRecipeMode, setActiveRecipeMode] = useState<'10-inputs' | '11-inputs' | '25head-yuemei' | 'custom'>('25head-yuemei');

  // 25-Head Yuemei Specific States
  const [frameCount, setFrameCount] = useState<number>(5);
  const [stitchesPerHead, setStitchesPerHead] = useState<number>(125000);
  const [yuemeiSpeedMode, setYuemeiSpeedMode] = useState<MachineOperatingSpeedMode>('cutdana');
  const [headPitchMm, setHeadPitchMm] = useState<number>(400);

  // Helper to build recipe from standard slots
  const buildRecipeFromSlots = (slots: StandardMachineInputSlot[], outputUnits: number): TaskMaterialInput[] => {
    return slots.map(slot => {
      const matchingMat = materials.find(m => 
        m.category.toLowerCase().includes(slot.category.toLowerCase()) ||
        slot.category.toLowerCase().includes(m.category.toLowerCase()) ||
        (slot.isBeadInput && m.category.toLowerCase().includes('bead')) ||
        (slot.isBeadInput && m.category.toLowerCase().includes('sequin'))
      ) || materials.find(m => m.unit === slot.defaultUnit) || materials[0];

      const estAmount = slot.isBeadInput 
        ? Math.round(outputUnits * (slot.beadDeviceNumber === 4 ? 0.15 : 0.25)) || slot.defaultThreshold
        : Math.round(outputUnits * 1.05);

      if (matchingMat) {
        return {
          materialId: matchingMat.id,
          materialName: `[Slot ${slot.slotNumber}] ${matchingMat.name}`,
          materialCode: matchingMat.code || slot.defaultCodePrefix,
          materialCategory: slot.category,
          materialSize: matchingMat.size || slot.suggestedSizes[0],
          materialColorCode: matchingMat.colorCode || slot.suggestedColors[0]?.hex || '#2563EB',
          materialColorName: matchingMat.colorName || slot.suggestedColors[0]?.name || 'Standard',
          unit: matchingMat.unit || slot.defaultUnit,
          estimatedAmountUsed: Math.max(10, estAmount),
          rateOfConsumption: matchingMat.consumptionRatePerHour || slot.defaultBurnRate,
          consumedSoFar: 0,
          unitCost: matchingMat.unitCost || slot.defaultUnitCost
        };
      }

      return {
        materialId: `temp-${slot.slotKey}`,
        materialName: `[Slot ${slot.slotNumber}] ${slot.name}`,
        materialCode: `${slot.defaultCodePrefix}-STD`,
        materialCategory: slot.category,
        materialSize: slot.suggestedSizes[0],
        materialColorCode: slot.suggestedColors[0]?.hex || '#2563EB',
        materialColorName: slot.suggestedColors[0]?.name || 'Standard',
        unit: slot.defaultUnit,
        estimatedAmountUsed: Math.max(10, estAmount),
        rateOfConsumption: slot.defaultBurnRate,
        consumedSoFar: 0,
        unitCost: slot.defaultUnitCost
      };
    });
  };

  // Multi-Material Inputs State initialized with 25-Head Yuemei standard
  const [taskMaterials, setTaskMaterials] = useState<TaskMaterialInput[]>(() => {
    return buildYuemei25HeadTaskMaterials(materials, 5, 125000, 'cutdana');
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Sync machine selection when preSelectedMachineId changes
  useEffect(() => {
    if (preSelectedMachineId && machines.some(m => m.id === preSelectedMachineId)) {
      setSelectedMachineId(preSelectedMachineId);
      const mach = machines.find(m => m.id === preSelectedMachineId);
      if (mach && mach.operator) {
        setOperator(mach.operator);
      }
    }
  }, [preSelectedMachineId, machines]);

  const targetMachine = machines.find(m => m.id === selectedMachineId) || machines[0];

  // Live Yuemei 25-Head Calculation
  const yuemeiCalculation = useMemo(() => {
    return calculateYuemei25HeadConsumption(frameCount, stitchesPerHead, yuemeiSpeedMode);
  }, [frameCount, stitchesPerHead, yuemeiSpeedMode]);

  // Helper to load 25-Head Yuemei Recipe
  const handleLoadYuemei25HeadRecipe = (newFrames: number = frameCount, newStitches: number = stitchesPerHead, newMode: MachineOperatingSpeedMode = yuemeiSpeedMode) => {
    setActiveRecipeMode('25head-yuemei');
    setTargetOutput(newFrames);
    setTargetUnitName('frames');
    setTaskTitle(`Yuemei 25-Head (${newMode.toUpperCase()}) — ${newFrames} Frames (${(newStitches / 1000).toFixed(0)}k Stitches/Head)`);
    const generated = buildYuemei25HeadTaskMaterials(materials, newFrames, newStitches, newMode);
    setTaskMaterials(generated);
  };

  // Helper to load standard 10/11 slot recipe
  const handleLoadStandardRecipe = (slotCount: 10 | 11) => {
    const slots = slotCount === 11 ? STANDARD_MACHINE_INPUTS_11 : STANDARD_MACHINE_INPUTS_10;
    setActiveRecipeMode(slotCount === 11 ? '11-inputs' : '10-inputs');
    setTargetUnitName('meters');
    setTargetOutput(2000);
    setTaskTitle(
      slotCount === 11 
        ? '5-Bead/Sequin Extended 11-Input Embroidery Production'
        : 'Standard 10-Input Machine Embroidery & Beading Recipe'
    );
    setTaskMaterials(buildRecipeFromSlots(slots, 2000));
  };

  // Helper: Add a new material input row to the task
  const handleAddMaterialInput = (preferredCategory?: string) => {
    setActiveRecipeMode('custom');
    const usedIds = new Set(taskMaterials.map(m => m.materialId));
    let nextMat = materials.find(m => (!preferredCategory || m.category === preferredCategory) && !usedIds.has(m.id));
    if (!nextMat) {
      nextMat = materials.find(m => !usedIds.has(m.id)) || materials[0];
    }
    
    if (nextMat) {
      const isBead = nextMat.category.toLowerCase().includes('bead') || nextMat.category.toLowerCase().includes('sequin');
      const defaultEstimated = isBead ? 200 : Math.round(targetOutput * 1.05);
      const defaultRate = nextMat.consumptionRatePerHour || (isBead ? 20 : 50);

      setTaskMaterials(prev => [
        ...prev,
        {
          materialId: nextMat.id,
          materialName: `[Slot ${prev.length + 1}] ${nextMat.name}`,
          materialCode: nextMat.code,
          materialCategory: nextMat.category,
          materialSize: nextMat.size,
          materialColorCode: nextMat.colorCode,
          materialColorName: nextMat.colorName,
          unit: nextMat.unit,
          estimatedAmountUsed: defaultEstimated,
          rateOfConsumption: defaultRate,
          consumedSoFar: 0,
          unitCost: nextMat.unitCost || 50
        }
      ]);
    } else {
      setTaskMaterials(prev => [
        ...prev,
        {
          materialId: `custom-slot-${Date.now()}`,
          materialName: `[Slot ${prev.length + 1}] Custom Input Feed`,
          materialCode: `SLOT-${prev.length + 1}`,
          materialCategory: preferredCategory || 'Beads',
          materialSize: 'Standard',
          materialColorCode: '#2563EB',
          materialColorName: 'Default',
          unit: 'packets',
          estimatedAmountUsed: 100,
          rateOfConsumption: 25,
          consumedSoFar: 0,
          unitCost: 75
        }
      ]);
    }
  };

  // Helper: Deduct / Remove a material input row from the task
  const handleDeductMaterialInput = (indexToRemove: number) => {
    setActiveRecipeMode('custom');
    setTaskMaterials(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Helper: Update a specific material input row
  const handleUpdateMaterialRow = (
    index: number, 
    field: keyof TaskMaterialInput, 
    value: any
  ) => {
    setTaskMaterials(prev => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'materialId') {
        const rawMat = materials.find(m => m.id === value);
        if (rawMat) {
          item.materialId = rawMat.id;
          item.materialName = `[Slot ${index + 1}] ${rawMat.name}`;
          item.materialCode = rawMat.code;
          item.materialCategory = rawMat.category;
          item.materialSize = rawMat.size;
          item.materialColorCode = rawMat.colorCode;
          item.materialColorName = rawMat.colorName;
          item.unit = rawMat.unit;
          item.unitCost = rawMat.unitCost;
          if (!item.rateOfConsumption || item.rateOfConsumption === 120) {
            item.rateOfConsumption = rawMat.consumptionRatePerHour || 25;
          }
        }
      } else {
        (item as any)[field] = value;
      }

      updated[index] = item;
      return updated;
    });
  };

  // Analytics & Cost calculation
  const totalEstimatedCost = taskMaterials.reduce((sum, item) => {
    return sum + (item.estimatedAmountUsed * (item.unitCost || 0));
  }, 0);

  // Estimated task duration
  const estimatedHours = taskMaterials.reduce((maxH, item) => {
    if (item.rateOfConsumption > 0 && item.estimatedAmountUsed > 0) {
      const h = item.estimatedAmountUsed / item.rateOfConsumption;
      return Math.max(maxH, h);
    }
    return maxH;
  }, 0);

  // Stock sufficiency check
  const stockShortfalls = taskMaterials.map(input => {
    const rawMat = materials.find(m => m.id === input.materialId);
    const available = rawMat ? rawMat.currentStock : 0;
    const isSufficient = available >= input.estimatedAmountUsed;
    const shortfall = Math.max(0, input.estimatedAmountUsed - available);
    return {
      materialId: input.materialId,
      name: input.materialName || 'Material',
      unit: input.unit,
      available,
      estimated: input.estimatedAmountUsed,
      isSufficient,
      shortfall
    };
  });

  const hasAnyShortfall = stockShortfalls.some(s => !s.isSufficient);

  // Launch Task Form Submission
  const handleLaunchTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMachine) {
      setFormError('Please select a target factory machine.');
      return;
    }

    if (taskMaterials.length === 0) {
      setFormError('Please add at least one material input feed to this task recipe.');
      return;
    }

    // Validate material rows
    for (let i = 0; i < taskMaterials.length; i++) {
      const mat = taskMaterials[i];
      if (!mat.materialId) {
        setFormError(`Input Slot #${i + 1} has no raw material selected.`);
        return;
      }
      if (mat.estimatedAmountUsed <= 0) {
        setFormError(`Please enter a valid estimated amount used for Input Slot #${i + 1}.`);
        return;
      }
      if (mat.rateOfConsumption <= 0) {
        setFormError(`Please enter a valid rate of consumption for Input Slot #${i + 1}.`);
        return;
      }
    }

    setFormError(null);

    const newTask: MachineTask = {
      id: `task-${Date.now()}`,
      taskCode: taskCode.trim() || `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
      title: taskTitle.trim() || 'Standard Machine Production Recipe',
      targetOutputUnits: Number(targetOutput) || (activeRecipeMode === '25head-yuemei' ? frameCount : 2000),
      currentOutputUnits: 0,
      targetUnitName: targetUnitName.trim() || (activeRecipeMode === '25head-yuemei' ? 'frames' : 'meters'),
      materials: taskMaterials.map(m => {
        const rawMat = materials.find(mat => mat.id === m.materialId);
        const alloc = Math.round(m.estimatedAmountUsed * 0.05);
        return {
          ...m,
          initialStockAtStart: rawMat ? rawMat.currentStock : 0,
          allocatedAtStart: alloc,
          consumedSoFar: 0,
          unitCost: m.unitCost ?? (rawMat?.unitCost || 50)
        };
      }),
      operator: operator.trim() || targetMachine.operator || 'Line Operator',
      startedAt: new Date().toISOString(),
      estimatedHours: estimatedHours > 0 ? Number(estimatedHours.toFixed(1)) : 8.0,
      status: 'running',
      notes: notes.trim(),
      // 25-Head Yuemei Frame Dimensions & Telemetry
      machineHeadCount: 25,
      patternStitchesPerHead: stitchesPerHead,
      targetFramesCount: activeRecipeMode === '25head-yuemei' ? frameCount : undefined,
      completedFramesCount: 0,
      speedMode: yuemeiSpeedMode,
      frameLengthMeters: 12.5
    };

    onStartTask(targetMachine.id, newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-sm">
              <Play className="h-5 w-5 fill-current" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">Machine Production Recipe &amp; Work Order</h3>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                  {taskCode}
                </span>
              </div>
              <p className="text-xs text-slate-500">25-Head Yuemei frame dimensions, speed presets &amp; 10/11-feed automated material consumption</p>
            </div>
          </div>
          <button
            id="btn-close-task-planner"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Recipe Architecture Presets Banner with 25-Head Yuemei */}
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-blue-50 via-indigo-50/60 to-purple-50 border border-blue-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 shadow-2xs">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900">Standard Machine Input Presets</p>
              <p className="text-[11px] text-slate-600">Select preset recipe architecture or Yuemei 25-head full frame formula</p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-1.5 shrink-0">
            <button
              id="btn-load-25head-recipe"
              type="button"
              onClick={() => handleLoadYuemei25HeadRecipe(frameCount, stitchesPerHead, yuemeiSpeedMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
                activeRecipeMode === '25head-yuemei'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-600/30'
                  : 'bg-white text-indigo-700 hover:bg-indigo-100/70 border border-indigo-300'
              }`}
            >
              <Maximize2 className="h-3.5 w-3.5" />
              <span>25-Head Yuemei Full-Frame</span>
            </button>

            <button
              id="btn-load-10-input-recipe"
              type="button"
              onClick={() => handleLoadStandardRecipe(10)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
                activeRecipeMode === '10-inputs'
                  ? 'bg-blue-600 text-white ring-2 ring-blue-600/30'
                  : 'bg-white text-blue-700 hover:bg-blue-100/70 border border-blue-300'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>10-Input (4 Beads)</span>
            </button>

            <button
              id="btn-load-11-input-recipe"
              type="button"
              onClick={() => handleLoadStandardRecipe(11)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs ${
                activeRecipeMode === '11-inputs'
                  ? 'bg-purple-600 text-white ring-2 ring-purple-600/30'
                  : 'bg-white text-purple-700 hover:bg-purple-100/70 border border-purple-300'
              }`}
            >
              <Gem className="h-3.5 w-3.5 text-purple-400" />
              <span>11-Input (5 Beads)</span>
            </button>
          </div>
        </div>

        {/* 25-HEAD YUEMEI INTERACTIVE FRAME CALCULATOR & RUNNING SPEEDS PANEL */}
        {activeRecipeMode === '25head-yuemei' && (
          <div className="mb-4 bg-slate-900 text-white rounded-xl p-4 border border-slate-800 shadow-sm space-y-3.5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Calculator className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 flex items-center space-x-2">
                    <span>25-Head Yuemei Frame Dimensions &amp; Speed Controller</span>
                    <span className="text-[10px] font-mono font-bold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30">
                      25 HEADS
                    </span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Pitch: <strong>400–500 mm</strong> | X-Length: <strong>10.5–13.5 m</strong> | Embroidery Area: <strong>400 × 1200 mm</strong> (up to 1500 mm in Y)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-[11px] font-mono text-indigo-300">
                <span>Total Stitches: <strong>{yuemeiCalculation.totalStitchesAllHeads.toLocaleString()}</strong></span>
                <span>•</span>
                <span>Est. Cycle: <strong>~{yuemeiCalculation.estimatedHoursPerFrame} hrs / frame</strong></span>
              </div>
            </div>

            {/* Operating Speed Modes Selector */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300">
                Select Operating Speed Mode (RPM Profile &amp; Safety Limits):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Bead / Cutdana */}
                <button
                  type="button"
                  onClick={() => {
                    setYuemeiSpeedMode('cutdana');
                    handleLoadYuemei25HeadRecipe(frameCount, stitchesPerHead, 'cutdana');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    yuemeiSpeedMode === 'cutdana'
                      ? 'bg-blue-950/80 border-blue-400 ring-1 ring-blue-400 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center space-x-1 text-blue-300">
                      <span>💎 Bead / Cutdana</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded">
                      450 – 650 RPM
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Slower speed prevents glass tube shattering and hopper/feeder jamming.
                  </p>
                </button>

                {/* Sequin */}
                <button
                  type="button"
                  onClick={() => {
                    setYuemeiSpeedMode('sequin');
                    handleLoadYuemei25HeadRecipe(frameCount, stitchesPerHead, 'sequin');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    yuemeiSpeedMode === 'sequin'
                      ? 'bg-amber-950/80 border-amber-400 ring-1 ring-amber-400 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center space-x-1 text-amber-300">
                      <span>✨ Sequin Operation</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">
                      650 – 800 RPM
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    Optimized for continuous punched reel feed and pneumatic cutter.
                  </p>
                </button>

                {/* Plain Flat / Zari */}
                <button
                  type="button"
                  onClick={() => {
                    setYuemeiSpeedMode('flat_zari');
                    handleLoadYuemei25HeadRecipe(frameCount, stitchesPerHead, 'flat_zari');
                  }}
                  className={`p-2.5 rounded-lg border text-left transition-all ${
                    yuemeiSpeedMode === 'flat_zari'
                      ? 'bg-emerald-950/80 border-emerald-400 ring-1 ring-emerald-400 text-white'
                      : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs flex items-center space-x-1 text-emerald-300">
                      <span>🧵 Flat / Zari Stitching</span>
                    </span>
                    <span className="font-mono text-[10px] font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                      850 – 1000 RPM
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    High-speed flat fills, satin border stitches &amp; Kasab metallic zari.
                  </p>
                </button>
              </div>
            </div>

            {/* Frame Count & Pattern Density Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Full Frame Quantity (Across 25 Heads):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={frameCount}
                    onChange={(e) => {
                      const val = Math.max(1, Number(e.target.value));
                      setFrameCount(val);
                      handleLoadYuemei25HeadRecipe(val, stitchesPerHead, yuemeiSpeedMode);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">Frames</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Stitches Per Head (Bridal/Lace Avg):
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    min="10000"
                    max="500000"
                    step="5000"
                    value={stitchesPerHead}
                    onChange={(e) => {
                      const val = Math.max(1000, Number(e.target.value));
                      setStitchesPerHead(val);
                      handleLoadYuemei25HeadRecipe(frameCount, val, yuemeiSpeedMode);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-indigo-400 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">Stitches</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Frame Pitch &amp; Dimensions:
                </label>
                <div className="px-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-lg text-[11px] text-indigo-300 font-mono flex items-center justify-between">
                  <span>Pitch: {headPitchMm}mm</span>
                  <span>12.5m Frame</span>
                </div>
              </div>
            </div>

            {/* Quick Consumption Formula Reference Table */}
            <div className="bg-slate-950/80 rounded-lg p-2.5 border border-slate-800 text-[11px]">
              <div className="flex items-center justify-between mb-1.5 font-bold text-slate-200">
                <span className="flex items-center space-x-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Estimated Raw Material Consumption (25 Heads × {frameCount} Full Frame{frameCount > 1 ? 's' : ''}):</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">
                  Typical consumption per 1 full frame (100k–150k stitches/head)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 font-mono text-[10px]">
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">1. Base Fabric:</span>
                  <span className="text-blue-300 font-bold">{(12.5 * frameCount).toFixed(1)} m</span> (11–14m/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">2. Backing Paper:</span>
                  <span className="text-blue-300 font-bold">{(12.5 * frameCount).toFixed(1)} m</span> (11–14m/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">3. Bead 1 (Cutdana):</span>
                  <span className="text-amber-300 font-bold">{Math.round(425 * frameCount)} g</span> (250–600g/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">4. Bead 2 (Seed 2mm):</span>
                  <span className="text-amber-300 font-bold">{Math.round(350 * frameCount)} g</span> (200–500g/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">5. Bead 3 (Pearl 3-4mm):</span>
                  <span className="text-amber-300 font-bold">{Math.round(500 * frameCount)} g</span> (300–700g/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">6. Bead 4 (Flat Sequin):</span>
                  <span className="text-purple-300 font-bold">{Math.ceil(1.5 * frameCount)} rolls</span> (1–2 rolls/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">7. Bead 5 (Cup Sequin):</span>
                  <span className="text-purple-300 font-bold">{Math.ceil(1.5 * frameCount)} rolls</span> (1–2 rolls/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">8. Base Lace Ribbon:</span>
                  <span className="text-emerald-300 font-bold">{(12.5 * frameCount).toFixed(1)} m</span> (11–14m/frame)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">9. Top Needle Thread:</span>
                  <span className="text-emerald-300 font-bold">{Math.round(8000 * frameCount).toLocaleString()} m</span> (6–10k m)
                </div>
                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800">
                  <span className="text-slate-400 block">10. Bobbin Thread:</span>
                  <span className="text-emerald-300 font-bold">{Math.round(2750 * frameCount).toLocaleString()} m</span> (2–3.5k m)
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form Error Banner */}
        {formError && (
          <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-lg font-medium animate-in fade-in duration-150 flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleLaunchTask} className="space-y-4 text-xs">
          
          {/* SECTION 1: Task General Specifications */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600" />
                <span>1. Task Order &amp; Target Machine</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Machine *</label>
                <select
                  id="select-task-machine"
                  value={selectedMachineId}
                  onChange={(e) => {
                    setSelectedMachineId(e.target.value);
                    const mach = machines.find(m => m.id === e.target.value);
                    if (mach?.operator) setOperator(mach.operator);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-semibold"
                >
                  {machines.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name.split('—')[0].trim()} - {m.model} ({m.status.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Task Code / Work Order</label>
                <input
                  id="input-task-code"
                  type="text"
                  required
                  value={taskCode}
                  onChange={(e) => setTaskCode(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assigned Line Operator</label>
                <input
                  id="input-task-operator"
                  type="text"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  placeholder="e.g. Marcus Vance"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Task / Recipe Title *</label>
                <input
                  id="input-task-title"
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium"
                  placeholder="e.g. Net Base Heavy Zari & Cutdana Beaded Border"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Output</label>
                  <input
                    id="input-task-target-output"
                    type="number"
                    min="1"
                    step="50"
                    value={targetOutput}
                    onChange={(e) => setTargetOutput(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit</label>
                  <select
                    id="select-task-unit"
                    value={targetUnitName}
                    onChange={(e) => setTargetUnitName(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                  >
                    <option value="meters">meters</option>
                    <option value="pcs">pcs</option>
                    <option value="ribbons">ribbons</option>
                    <option value="cords">cords</option>
                    <option value="rolls">rolls</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: Multi-Material Inputs Recipe */}
          <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-bold text-blue-900 text-[11px] uppercase tracking-wider flex items-center space-x-1.5">
                  <PackageCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>2. Material Inputs Recipe ({taskMaterials.length} Fed Channels)</span>
                </span>
                <p className="text-[11px] text-blue-700">Configured machine input channels (Bead Devices 1-4/5, Base Fabric, Stabilizer, Threads &amp; Cording)</p>
              </div>

              {/* Add Feed Button */}
              <div className="flex items-center space-x-2">
                <button
                  id="btn-add-material-input-row"
                  type="button"
                  onClick={() => handleAddMaterialInput()}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs transition-colors flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Custom Feed Slot</span>
                </button>
              </div>
            </div>

            {/* List of Material Input Rows */}
            {taskMaterials.length === 0 ? (
              <div className="text-center py-8 bg-white/70 rounded-xl border border-dashed border-blue-300 p-4">
                <p className="text-xs text-slate-500 mb-2">No material feeds currently added to this task.</p>
                <button
                  type="button"
                  onClick={() => handleLoadStandardRecipe(10)}
                  className="px-4 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg"
                >
                  Load 10-Input Standard Recipe
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {taskMaterials.map((input, idx) => {
                  const rawMat = materials.find(m => m.id === input.materialId);
                  const availableStock = rawMat ? rawMat.currentStock : 0;
                  const isStockShort = rawMat && availableStock < input.estimatedAmountUsed;
                  const shortfall = rawMat ? Math.max(0, input.estimatedAmountUsed - availableStock) : 0;
                  const isBeadSlot = input.materialCategory?.toLowerCase().includes('bead') || 
                                     input.materialCategory?.toLowerCase().includes('sequin') ||
                                     input.materialName?.toLowerCase().includes('cutdana') ||
                                     input.materialName?.toLowerCase().includes('moti') ||
                                     input.materialName?.toLowerCase().includes('sitara');

                  return (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs ${
                        isBeadSlot 
                          ? 'bg-gradient-to-r from-amber-50/60 via-white to-amber-50/30 border-amber-200/90' 
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      {/* Material Select & Details */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex items-center justify-between">
                          <label className="font-semibold text-slate-700 text-[11px] flex items-center space-x-1.5">
                            <span className={`w-5 h-5 rounded-full text-[10px] font-bold inline-flex items-center justify-center ${
                              isBeadSlot 
                                ? 'bg-amber-500 text-white shadow-2xs' 
                                : 'bg-blue-100 text-blue-800'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-slate-900">
                              Input Slot #{idx + 1}: {input.materialCategory || 'Material'}
                            </span>
                            {isBeadSlot && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                💎 Bead Device
                              </span>
                            )}
                          </label>

                          {/* Live Availability Badge */}
                          {rawMat ? (
                            isStockShort ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center space-x-1">
                                <AlertTriangle className="h-3 w-3 text-amber-600" />
                                <span>Shortfall: {shortfall.toLocaleString()} {input.unit}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center space-x-1">
                                <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                <span>In Stock: {availableStock.toLocaleString()} {input.unit}</span>
                              </span>
                            )
                          ) : (
                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              Standard Preset Specification
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2">
                          <span 
                            className="w-3.5 h-3.5 rounded-full shrink-0 border border-slate-300 shadow-2xs"
                            style={{ backgroundColor: input.materialColorCode || '#2563EB' }}
                          />
                          {materials.length > 0 ? (
                            <select
                              id={`select-task-material-${idx}`}
                              value={input.materialId}
                              onChange={(e) => handleUpdateMaterialRow(idx, 'materialId', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-medium text-xs truncate"
                            >
                              <option value={input.materialId}>
                                {input.materialName} ({input.materialCategory})
                              </option>
                              {materials.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.code ? `[${m.code}] ` : ''}{m.name} {m.size ? `(${m.size})` : ''} - Stock: {m.currentStock.toLocaleString()} {m.unit} | {m.category}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={input.materialName}
                              onChange={(e) => handleUpdateMaterialRow(idx, 'materialName', e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium text-xs"
                            />
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1">
                          <span>Category: <strong className="text-slate-700">{input.materialCategory || 'General'}</strong></span>
                          <span>Size: <strong className="text-indigo-700">{input.materialSize || 'N/A'}</strong></span>
                          <span>Color: <strong className="text-slate-700">{input.materialColorName || 'Default'}</strong></span>
                          <span>Unit Cost: <strong className="text-emerald-700">₹{(input.unitCost || 0).toFixed(2)} / {input.unit}</strong></span>
                        </div>
                      </div>

                      {/* Estimated Amount Used & Rate of Consumption */}
                      <div className="flex items-center space-x-3 shrink-0">
                        {/* Estimated Amount Used */}
                        <div className="w-32">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                            Est. Amount Used
                          </label>
                          <div className="relative">
                            <input
                              id={`input-task-est-amount-${idx}`}
                              type="number"
                              min="1"
                              step="5"
                              value={input.estimatedAmountUsed}
                              onChange={(e) => handleUpdateMaterialRow(idx, 'estimatedAmountUsed', Number(e.target.value))}
                              className="w-full px-2 py-1.5 pr-12 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-bold text-xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none font-mono">
                              {input.unit}
                            </span>
                          </div>
                        </div>

                        {/* Rate of Consumption */}
                        <div className="w-28">
                          <label className="block text-[10px] font-bold text-slate-600 mb-0.5 truncate">
                            Burn Rate
                          </label>
                          <div className="relative">
                            <input
                              id={`input-task-burn-rate-${idx}`}
                              type="number"
                              min="1"
                              step="1"
                              value={input.rateOfConsumption}
                              onChange={(e) => handleUpdateMaterialRow(idx, 'rateOfConsumption', Number(e.target.value))}
                              className="w-full px-2 py-1.5 pr-8 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900 font-bold text-xs"
                            />
                            <span className="absolute right-2 top-1.5 text-[10px] text-slate-500 pointer-events-none font-mono">
                              /hr
                            </span>
                          </div>
                        </div>

                        {/* Deduct / Remove Row Button */}
                        <div className="pt-3">
                          <button
                            id={`btn-remove-material-row-${idx}`}
                            type="button"
                            onClick={() => handleDeductMaterialInput(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Remove this input feed slot"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recipe Analytics Summary Footer */}
            <div className="pt-2 border-t border-blue-200 flex flex-wrap items-center justify-between text-xs text-blue-950 font-semibold gap-2">
              <div className="flex items-center space-x-3">
                <span className="flex items-center space-x-1">
                  <Clock className="h-3.5 w-3.5 text-blue-600" />
                  <span>Est. Duration: <strong>{estimatedHours.toFixed(1)} hrs</strong></span>
                </span>
                <span>•</span>
                <span className="flex items-center space-x-1">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Est. Material Cost: <strong className="text-emerald-700">₹{totalEstimatedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</strong></span>
                </span>
              </div>

              {hasAnyShortfall && (
                <div className="text-[11px] text-amber-700 font-bold flex items-center space-x-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>One or more raw material feeds are below estimated usage</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 3: Task Analytics & Recipe Summary Card */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-inner space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Gauge className="h-3.5 w-3.5 text-blue-400" />
                <span>Task Execution &amp; Material Burn Forecast</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {targetMachine ? `${targetMachine.name.split('—')[0].trim()} (${targetMachine.model})` : 'Floor Machine'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-medium">Est. Duration</div>
                <div className="text-base font-black text-blue-400 font-mono flex items-center justify-center space-x-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{estimatedHours.toFixed(1)} hrs</span>
                </div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-medium">Material Feeds</div>
                <div className="text-base font-black text-slate-100 font-mono">
                  {taskMaterials.length} Channels
                </div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-medium">Total Batch Cost</div>
                <div className="text-base font-black text-emerald-400 font-mono">
                  ₹{totalEstimatedCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="bg-slate-800/80 p-2.5 rounded-lg border border-slate-700/60">
                <div className="text-[10px] text-slate-400 font-medium">Stock Status</div>
                <div className={`text-xs font-bold font-mono mt-0.5 ${hasAnyShortfall ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {hasAnyShortfall ? '⚠ Stock Low' : '✓ Available'}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Production Notes &amp; Frame Settings (Optional)</label>
            <input
              id="input-task-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-900"
              placeholder="e.g. Set frame tension for Georgette; inspect Bead Device #1 cutdana feeder cup height..."
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-6">
            <div className="text-[11px] text-slate-500">
              {hasAnyShortfall && (
                <span className="text-amber-600 font-medium flex items-center space-x-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>Some materials have low inventory, but task can proceed.</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                id="btn-cancel-task-planner"
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                id="btn-launch-task"
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-colors flex items-center space-x-1.5"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Task on Machine</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
