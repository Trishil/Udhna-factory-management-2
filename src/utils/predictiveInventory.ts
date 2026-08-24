import { RawMaterial, Machine, PredictiveStockMetric } from '../types';

/**
 * Calculates predictive inventory metrics estimating when each material will hit zero
 * based on current floor machine run rates and active multi-material task feeds.
 */
export function calculatePredictiveInventory(
  materials: RawMaterial[],
  machines: Machine[]
): PredictiveStockMetric[] {
  return materials.map(mat => {
    let totalBurnRate = 0;
    const activeMachineNames: string[] = [];
    const activeTaskCodes: string[] = [];

    machines.forEach(mach => {
      if (mach.status === 'running') {
        if (mach.activeTask && mach.activeTask.materials && mach.activeTask.materials.length > 0) {
          const taskMat = mach.activeTask.materials.find(tm => tm.materialId === mat.id);
          if (taskMat) {
            const burnRate = Number(taskMat.rateOfConsumption) || Number(mat.consumptionRatePerHour) || 100;
            totalBurnRate += burnRate;
            const machShortName = mach.name.split('—')[0].trim();
            if (!activeMachineNames.includes(machShortName)) {
              activeMachineNames.push(machShortName);
            }
            if (mach.activeTask.taskCode && !activeTaskCodes.includes(mach.activeTask.taskCode)) {
              activeTaskCodes.push(mach.activeTask.taskCode);
            }
          }
        } else if (mach.currentMaterialId === mat.id) {
          const burnRate = Number(mat.consumptionRatePerHour) || 60;
          totalBurnRate += burnRate;
          const machShortName = mach.name.split('—')[0].trim();
          if (!activeMachineNames.includes(machShortName)) {
            activeMachineNames.push(machShortName);
          }
        }
      }
    });

    const hoursRemaining = totalBurnRate > 0 ? (mat.currentStock / totalBurnRate) : null;
    let depletionStatus: 'critical' | 'warning' | 'normal' | 'idle' = 'idle';
    let formattedTimeRemaining = 'No active draw';

    if (totalBurnRate > 0) {
      if (hoursRemaining !== null) {
        if (hoursRemaining <= 0 || mat.currentStock <= 0) {
          depletionStatus = 'critical';
          formattedTimeRemaining = 'Depleted (0h)';
        } else if (hoursRemaining <= 2) {
          depletionStatus = 'critical';
          formattedTimeRemaining = `${hoursRemaining.toFixed(1)}h remaining`;
        } else if (hoursRemaining <= 6) {
          depletionStatus = 'warning';
          formattedTimeRemaining = `${hoursRemaining.toFixed(1)}h remaining`;
        } else {
          depletionStatus = 'normal';
          formattedTimeRemaining = `${hoursRemaining.toFixed(1)}h remaining`;
        }
      }
    }

    const estimatedDepletionDate = (hoursRemaining !== null && hoursRemaining > 0 && hoursRemaining < 1000)
      ? new Date(Date.now() + hoursRemaining * 3600 * 1000)
      : null;

    return {
      materialId: mat.id,
      materialName: mat.name,
      materialCode: mat.code,
      category: mat.category,
      currentStock: mat.currentStock,
      unit: mat.unit,
      unitCost: mat.unitCost,
      minThreshold: mat.minThreshold,
      totalBurnRatePerHour: totalBurnRate,
      activeMachineCount: activeMachineNames.length,
      activeMachineNames,
      activeTaskCodes,
      hoursRemaining,
      estimatedDepletionDate,
      depletionStatus,
      formattedTimeRemaining
    };
  });
}
