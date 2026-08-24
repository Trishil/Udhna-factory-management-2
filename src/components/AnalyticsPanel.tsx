import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { RawMaterial } from '../types';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  IndianRupee, 
  AlertTriangle, 
  Boxes, 
  Layers, 
  ChevronDown, 
  ChevronUp,
  Filter
} from 'lucide-react';

interface AnalyticsPanelProps {
  materials: RawMaterial[];
  onSelectLowStockFilter?: () => void;
  onSelectCategory?: (category: string) => void;
}

const PIE_COLORS = ['#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED', '#DB2777', '#0891B2', '#4F46E5', '#10B981', '#F59E0B'];

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({
  materials,
  onSelectLowStockFilter,
  onSelectCategory
}) => {
  const [selectedChartMode, setSelectedChartMode] = useState<'all' | 'low_stock' | 'valuation'>('all');
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Summary Metrics
  const totalSkus = materials.length;
  const totalStockUnits = materials.reduce((acc, m) => acc + m.currentStock, 0);
  const totalStockValue = materials.reduce((acc, m) => acc + (m.currentStock * m.unitCost), 0);
  const lowStockItems = materials.filter(m => m.currentStock <= m.minThreshold);

  // Filter materials based on chart mode
  const filteredMaterials = selectedChartMode === 'low_stock' 
    ? lowStockItems 
    : materials;

  // Data for Stock vs Threshold Bar Chart
  const stockChartData = filteredMaterials.slice(0, 18).map(m => {
    const isBelowThreshold = m.currentStock <= m.minThreshold;
    return {
      name: (m.code ? `[${m.code}] ` : '') + (m.name.length > 14 ? m.name.slice(0, 14) + '...' : m.name),
      fullName: m.name,
      code: m.code || '',
      category: m.category,
      'Current Stock': m.currentStock,
      'Safety Threshold': m.minThreshold,
      'Total Value (₹)': Math.round(m.currentStock * m.unitCost),
      unit: m.unit,
      isLow: isBelowThreshold
    };
  });

  // Data for Category Breakdown (Volume & Valuation)
  const categoryMap: { [key: string]: { volume: number; value: number; count: number } } = {};
  materials.forEach(m => {
    const cat = m.category || 'Other';
    if (!categoryMap[cat]) {
      categoryMap[cat] = { volume: 0, value: 0, count: 0 };
    }
    categoryMap[cat].volume += m.currentStock;
    categoryMap[cat].value += (m.currentStock * m.unitCost);
    categoryMap[cat].count += 1;
  });

  const categoryPieData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    value: categoryMap[cat].volume,
    valuation: Math.round(categoryMap[cat].value),
    itemCount: categoryMap[cat].count
  }));

  const categoryValuationData = Object.keys(categoryMap).map(cat => ({
    name: cat,
    'Valuation (₹)': Math.round(categoryMap[cat].value),
    volume: categoryMap[cat].volume,
    itemCount: categoryMap[cat].count
  }));

  return (
    <section id="stock-analytics-section" className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      
      {/* Panel Header & Summary Bar */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-800">
                Stock &amp; Inventory Telemetry Graphs
              </h2>
              <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                LIVE VISUALIZER
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Interactive visualization of stock balances, safety threshold buffers, and valuation
            </p>
          </div>
        </div>

        {/* View Controls & Collapse Toggle */}
        <div className="flex items-center space-x-2 w-full md:w-auto justify-between md:justify-end">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              id="btn-chart-mode-all"
              type="button"
              onClick={() => {
                setSelectedChartMode('all');
                setIsCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all ${
                selectedChartMode === 'all'
                  ? 'bg-white shadow-2xs text-blue-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All SKUs ({materials.length})
            </button>
            <button
              id="btn-chart-mode-lowstock"
              type="button"
              onClick={() => {
                setSelectedChartMode('low_stock');
                setIsCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all flex items-center space-x-1 ${
                selectedChartMode === 'low_stock'
                  ? 'bg-amber-500 shadow-2xs text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <AlertTriangle className="h-3 w-3" />
              <span>Low Stock ({lowStockItems.length})</span>
            </button>
            <button
              id="btn-chart-mode-valuation"
              type="button"
              onClick={() => {
                setSelectedChartMode('valuation');
                setIsCollapsed(false);
              }}
              className={`px-2.5 py-1 rounded-md font-bold text-xs transition-all flex items-center space-x-1 ${
                selectedChartMode === 'valuation'
                  ? 'bg-emerald-600 shadow-2xs text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <IndianRupee className="h-3 w-3" />
              <span>Valuation ₹</span>
            </button>
          </div>

          <button
            id="btn-toggle-collapse-graphs"
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition-colors"
            title={isCollapsed ? "Expand Graphs" : "Collapse Graphs"}
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Quick KPI summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/50 border-b border-slate-100 text-xs">
        <div className="p-3.5 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-100/70 text-blue-700">
            <Boxes className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total SKUs</span>
            <p className="text-base font-bold text-slate-800 font-mono">{totalSkus}</p>
          </div>
        </div>

        <div className="p-3.5 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-100/70 text-indigo-700">
            <Layers className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Physical Volume</span>
            <p className="text-base font-bold text-slate-800 font-mono">{totalStockUnits.toLocaleString()} units</p>
          </div>
        </div>

        <div className="p-3.5 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-100/70 text-emerald-700">
            <IndianRupee className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Inventory Valuation</span>
            <p className="text-base font-bold text-emerald-700 font-mono">₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>

        <div className="p-3.5 flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${lowStockItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Reorder Alerts</span>
            <p className={`text-base font-bold font-mono ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-slate-700'}`}>
              {lowStockItems.length} items
            </p>
          </div>
        </div>
      </div>

      {/* Main Charts Body */}
      {!isCollapsed && (
        <div className="p-5 space-y-6 animate-in fade-in duration-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* Chart 1: Stock vs Safety Threshold Bar Chart */}
            <div className="lg:col-span-2 bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-blue-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {selectedChartMode === 'low_stock' 
                      ? 'Low Stock Items vs Safety Thresholds' 
                      : selectedChartMode === 'valuation'
                      ? 'Stock Volume vs Total Financial Value (₹)'
                      : 'Stock Balances vs Minimum Safety Threshold'}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedChartMode === 'low_stock' ? 'URGENT REORDERS' : 'WAREHOUSE UNITS'}
                </span>
              </div>

              {stockChartData.length === 0 ? (
                <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-xs">
                  <Boxes className="h-8 w-8 mb-2 text-slate-300" />
                  <p>No material data matching the current filter.</p>
                </div>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockChartData} margin={{ top: 10, right: 15, left: -5, bottom: 50 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="name" 
                        angle={-25} 
                        textAnchor="end" 
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 600 }} 
                        interval={0} 
                        height={55}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0F172A', 
                          borderRadius: '8px', 
                          color: '#FFF', 
                          fontSize: '11px', 
                          border: '1px solid #334155',
                          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                        }} 
                        formatter={(val: any, name: any) => [
                          name === 'Total Value (₹)' ? `₹${Number(val).toLocaleString('en-IN')}` : `${Number(val).toLocaleString()} units`,
                          name
                        ]}
                      />
                      <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '12px', fontSize: '11px' }} />
                      <Bar 
                        dataKey="Current Stock" 
                        fill="#2563EB" 
                        radius={[4, 4, 0, 0]} 
                      />
                      {selectedChartMode !== 'valuation' ? (
                        <Bar 
                          dataKey="Safety Threshold" 
                          fill="#F59E0B" 
                          radius={[4, 4, 0, 0]} 
                        />
                      ) : (
                        <Bar 
                          dataKey="Total Value (₹)" 
                          fill="#10B981" 
                          radius={[4, 4, 0, 0]} 
                        />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                <span className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
                  <span>Current Physical Units</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ml-2"></span>
                  <span>Safety Reorder Level</span>
                </span>
                <span className="font-mono text-[10px] text-slate-400">
                  Showing top {stockChartData.length} items
                </span>
              </div>
            </div>

            {/* Chart 2: Category Composition Donut */}
            <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <PieIcon className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Category Composition
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {categoryPieData.length} CATEGORIES
                </span>
              </div>

              <div className="h-72 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryPieData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0F172A', 
                        borderRadius: '8px', 
                        color: '#FFF', 
                        fontSize: '11px', 
                        border: '1px solid #334155' 
                      }}
                      formatter={(value: any, _, props: any) => [
                        `${Number(value).toLocaleString()} units (₹${(props.payload.valuation || 0).toLocaleString('en-IN')})`, 
                        props.payload.name
                      ]}
                    />
                    <Legend 
                      layout="horizontal" 
                      verticalAlign="bottom" 
                      align="center"
                      wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Stock breakdown by category</span>
                <span className="font-bold text-slate-700 font-mono">{totalStockUnits.toLocaleString()} total</span>
              </div>
            </div>

          </div>

          {/* Category Valuation Bar Chart (When in Valuation Mode) */}
          {selectedChartMode === 'valuation' && (
            <div className="bg-slate-50/60 rounded-xl border border-slate-200/80 p-4 animate-in fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <IndianRupee className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Capital Valuation by Category (INR ₹)
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  TOTAL: ₹{totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryValuationData} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#334155', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748B' }} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderRadius: '8px', color: '#FFF', fontSize: '11px', border: '1px solid #334155' }}
                      formatter={(val: any) => [`₹${Number(val).toLocaleString('en-IN')}`, 'Valuation']}
                    />
                    <Bar dataKey="Valuation (₹)" fill="#059669" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

        </div>
      )}

    </section>
  );
};


