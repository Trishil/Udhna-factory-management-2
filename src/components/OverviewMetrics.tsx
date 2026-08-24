import React from 'react';
import { 
  Activity, 
  Boxes, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Gauge,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { Machine, RawMaterial } from '../types';

interface OverviewMetricsProps {
  machines: Machine[];
  materials: RawMaterial[];
  onFilterLowStock: () => void;
  onOpenPlanner: () => void;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  machines,
  materials,
  onFilterLowStock,
  onOpenPlanner
}) => {
  const totalMachines = machines.length;
  const runningMachines = machines.filter(m => m.status === 'running');
  const runningCount = runningMachines.length;
  const machineUtilization = totalMachines > 0 ? Math.round((runningCount / totalMachines) * 100) : 0;

  // Calculate live hourly material burn across all running machines
  const totalHourlyBurnRate = runningMachines.reduce((acc, m) => {
    if (m.activeTask && m.activeTask.materials?.length > 0) {
      return acc + m.activeTask.materials.reduce((sub, mat) => sub + (mat.rateOfConsumption || 0), 0);
    }
    const assignedMat = materials.find(mat => mat.id === m.currentMaterialId);
    return acc + (assignedMat ? assignedMat.consumptionRatePerHour : 150);
  }, 0);

  // Total inventory metrics
  const totalStockItems = materials.reduce((acc, m) => acc + m.currentStock, 0);
  const totalInventoryValue = materials.reduce((acc, m) => acc + (m.currentStock * m.unitCost), 0);
  const lowStockItems = materials.filter(m => m.currentStock <= m.minThreshold);

  const totalOutputToday = machines.reduce((acc, m) => acc + m.outputCount, 0);
  const totalTargetToday = machines.reduce((acc, m) => acc + m.targetCount, 0);
  const shiftProgressPercent = totalTargetToday > 0 ? Math.round((totalOutputToday / totalTargetToday) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      
      {/* 1. Machine Fleet Utilization */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Machine Fleet</span>
          <span className={`p-1 rounded ${runningCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
            <Gauge className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{runningCount} / {totalMachines}</span>
            <span className="text-xs font-bold text-emerald-600 font-mono">({machineUtilization}% Active)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {machines.filter(m => m.status === 'idle').length} idle, {machines.filter(m => m.status === 'maintenance' || m.status === 'stopped').length} servicing
          </p>
        </div>
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500" 
            style={{ width: `${machineUtilization}%` }}
          ></div>
        </div>
      </div>

      {/* 2. Raw Material Stock Value & Volume */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Raw Material Stock</span>
          <span className="p-1 rounded bg-blue-50 text-blue-600">
            <Boxes className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{materials.length} SKUs</span>
            <span className="text-xs text-slate-500 font-mono">({totalStockItems.toLocaleString()} units)</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Est. inventory value: <span className="font-bold text-slate-700 font-mono">₹{totalInventoryValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <button onClick={onOpenPlanner} className="flex items-center text-blue-600 font-bold hover:underline">
            MRP Job Planner <ArrowUpRight className="h-3 w-3 ml-0.5" />
          </button>
          <span className="text-[10px] text-slate-400">Strings &amp; Laces</span>
        </div>
      </div>

      {/* 3. Live Burn Rate */}
      <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Material Burn Rate</span>
          <span className="p-1 rounded bg-indigo-50 text-indigo-600">
            <Activity className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-800 font-mono">{totalHourlyBurnRate.toLocaleString()}</span>
            <span className="text-xs font-mono text-slate-500">m / hr</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Across {runningCount} active feeding lines
          </p>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span className="text-[10px] uppercase font-bold text-slate-400">Shift Target</span>
          <span className="font-mono font-bold text-slate-800">{shiftProgressPercent}% ({totalOutputToday.toLocaleString()}/{totalTargetToday.toLocaleString()})</span>
        </div>
      </div>

      {/* 4. Low Stock Alerts Card */}
      <div 
        onClick={lowStockItems.length > 0 ? onFilterLowStock : undefined}
        className={`rounded-lg p-4 border shadow-sm flex flex-col justify-between transition-all ${
          lowStockItems.length > 0 
            ? 'bg-amber-50/80 border-amber-300 cursor-pointer hover:bg-amber-100/60' 
            : 'bg-white border-slate-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${lowStockItems.length > 0 ? 'text-amber-800' : 'text-slate-500'}`}>
            Threshold Alerts
          </span>
          <span className={`p-1 rounded ${lowStockItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-50 text-emerald-600'}`}>
            {lowStockItems.length > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </span>
        </div>
        <div className="mt-2.5">
          <div className="flex items-baseline space-x-2">
            <span className={`text-2xl font-bold font-mono ${lowStockItems.length > 0 ? 'text-amber-900' : 'text-slate-800'}`}>
              {lowStockItems.length}
            </span>
            <span className={`text-xs font-semibold ${lowStockItems.length > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
              {lowStockItems.length > 0 ? 'SKUs Below Minimum' : 'All Stocks Healthy'}
            </span>
          </div>
          <p className="text-[11px] text-slate-600 mt-1 truncate">
            {lowStockItems.length > 0 
              ? `Reorder: ${lowStockItems.map(m => m.name.split(' ')[0]).join(', ')}`
              : 'Safety buffers maintained'}
          </p>
        </div>
        <div className="mt-3 text-[11px]">
          {lowStockItems.length > 0 ? (
            <span className="font-bold text-amber-800 hover:underline">Click to filter low stock &rarr;</span>
          ) : (
            <span className="text-emerald-600 font-semibold text-[10px] uppercase tracking-wider">Optimal Supply Level</span>
          )}
        </div>
      </div>

    </div>
  );
};
