import React, { useState } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  FileText, 
  Printer, 
  Sparkles, 
  Layers, 
  Palette, 
  Download, 
  Calendar,
  Building,
  Hash,
  Info,
  Wrench,
  PackageCheck
} from 'lucide-react';
import { OrderSlip, OrderSlipColorRow, WorkflowItem } from '../types';
import { 
  DEFAULT_FABRIC_TYPES, 
  addNewFabricType, 
  getOrGenerateIndividualPieces, 
  getOrderSlipCompletedPieces,
  getOrderSlipStageDistribution 
} from '../utils/workflowData';

interface OrderSlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSlip: (slip: OrderSlip, generatedItems: WorkflowItem[]) => void;
  existingSlip?: OrderSlip | null;
  items?: WorkflowItem[];
  onDeleteSlip?: (slipId: string, jobNo?: string) => void;
}

export const OrderSlipModal: React.FC<OrderSlipModalProps> = ({
  isOpen,
  onClose,
  onSaveSlip,
  existingSlip,
  items = [],
  onDeleteSlip
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Slip Header states
  const [jobNo, setJobNo] = useState(existingSlip?.jobNo || '06/05');
  const [date, setDate] = useState(existingSlip?.date || todayStr);
  const [chalanNo, setChalanNo] = useState(existingSlip?.chalanNo || '227');
  const [partyName, setPartyName] = useState(existingSlip?.partyName || 'Jaishri');
  const [firmName, setFirmName] = useState(existingSlip?.firmName || 'Trisharth');

  // Columns: Fabric types in the slip matrix
  const [fabricColumns, setFabricColumns] = useState<string[]>(
    existingSlip?.fabricColumns || ['Kali', 'Kurti', 'Lass']
  );
  const [newColumnInput, setNewColumnInput] = useState('');
  const [showAddColumnInput, setShowAddColumnInput] = useState(false);

  // Rows: Colors & quantities
  const [colorRows, setColorRows] = useState<OrderSlipColorRow[]>(
    existingSlip?.colorRows || [
      {
        id: 'r1',
        colorName: 'Color 1 (Rust / Orange)',
        colorHex: '#ea580c',
        designNumber: '9014 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Kali 3.30 = 39.50'
      },
      {
        id: 'r2',
        colorName: 'Color 2 (Cyan / Peacock Blue)',
        colorHex: '#0284c7',
        designNumber: '9012 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Kurti 2 = 24'
      },
      {
        id: 'r3',
        colorName: 'Color 3 (Ochre / Mustard Yellow)',
        colorHex: '#ca8a04',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 79, 'Kurti': 24, 'Lass': 12 },
        notes: 'Lass 1 = 12'
      },
      {
        id: 'r4',
        colorName: 'Color 4 (Magenta / Rose Pink)',
        colorHex: '#db2777',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'DP = 2.60 = 31.20'
      },
      {
        id: 'r5',
        colorName: 'Color 5 (Olive / Mehndi Green)',
        colorHex: '#65a30d',
        designNumber: '9014 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Lass .75 = 8.50'
      },
      {
        id: 'r6',
        colorName: 'Color 6 (Silver / Steel Grey)',
        colorHex: '#64748b',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'BL 1.30 = 16'
      }
    ]
  );

  // Bottom notes & calculations
  const [calculationNotes, setCalculationNotes] = useState(
    existingSlip?.calculationNotes ||
    'Kali 3.30 = 39.50 | Kurti 2 = 24 | Lass 1 = 12 | Magi 0.50 = 6 | Total = 81.50\nDP = 2.60 = 31.20 | Lass .75 = 8.50 | BL 1.30 = 16 | Total = 56'
  );
  const [inwardChallanNotes, setInwardChallanNotes] = useState(
    existingSlip?.inwardChallanNotes ||
    'Ch 227: 12x6x2 = 24x6 | Ch 226: 11x6x2 = 22x6 | Total = 46x6'
  );

  // Delivery & After-Completion fields
  const [deliveryChalanNo, setDeliveryChalanNo] = useState(existingSlip?.deliveryChalanNo || '96');
  const [deliveryDate, setDeliveryDate] = useState(existingSlip?.deliveryDate || '');
  const [billNo, setBillNo] = useState(existingSlip?.billNo || '');
  const [billDate, setBillDate] = useState(existingSlip?.billDate || '');

  // Calculate live completion from linked pieces if existing slip
  const livePieceCompletedCount = existingSlip && items.length > 0 
    ? getOrderSlipCompletedPieces(existingSlip, items) 
    : (existingSlip?.piecesCompleted || 0);

  const [piecesCompleted, setPiecesCompleted] = useState<number>(livePieceCompletedCount);

  // Live stage distribution from individual pieces
  const liveStageDist = existingSlip && items.length > 0
    ? getOrderSlipStageDistribution(existingSlip, items)
    : null;

  if (!isOpen) return null;

  // Calculate total ordered pieces across entire matrix
  const totalOrderedPcs = colorRows.reduce((acc, row) => {
    const rowSum = Object.values(row.fabricQuantities).reduce<number>((a, b) => a + (Number(b) || 0), 0);
    return acc + rowSum;
  }, 0);

  // Add column
  const handleAddFabricColumn = () => {
    if (!newColumnInput.trim()) return;
    const colName = newColumnInput.trim();
    if (!fabricColumns.includes(colName)) {
      setFabricColumns(prev => [...prev, colName]);
      addNewFabricType(colName);
    }
    setNewColumnInput('');
    setShowAddColumnInput(false);
  };

  // Remove column
  const handleRemoveFabricColumn = (colName: string) => {
    setFabricColumns(prev => prev.filter(c => c !== colName));
    setColorRows(prev => prev.map(r => {
      const q = { ...r.fabricQuantities };
      delete q[colName];
      return { ...r, fabricQuantities: q };
    }));
  };

  // Add color row
  const handleAddColorRow = () => {
    const nextIndex = colorRows.length + 1;
    const newRow: OrderSlipColorRow = {
      id: `r-${Date.now()}-${nextIndex}`,
      colorName: `Color ${nextIndex}`,
      colorHex: '#3b82f6',
      designNumber: colorRows[0]?.designNumber || 'DSG-101',
      fabricQuantities: {},
      notes: ''
    };
    fabricColumns.forEach(col => {
      newRow.fabricQuantities[col] = 0;
    });
    setColorRows(prev => [...prev, newRow]);
  };

  // Update cell quantity
  const handleUpdateQuantity = (rowId: string, colName: string, val: number) => {
    setColorRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return {
        ...r,
        fabricQuantities: {
          ...r.fabricQuantities,
          [colName]: Math.max(0, val)
        }
      };
    }));
  };

  // Update row meta
  const handleUpdateRowMeta = (rowId: string, field: 'colorName' | 'colorHex' | 'designNumber' | 'notes', val: string) => {
    setColorRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      return { ...r, [field]: val };
    }));
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    setColorRows(prev => prev.filter(r => r.id !== rowId));
  };

  // Load preset sample slips
  const handleLoadPresetJaishri = () => {
    setJobNo('06/05');
    setDate('2026-07-05');
    setChalanNo('227');
    setPartyName('Jaishri');
    setFirmName('S V ART & CREATION');
    setFabricColumns(['Kali', 'Kurti', 'Lass']);
    setColorRows([
      {
        id: 'r1',
        colorName: 'Color 1 (Rust / Orange)',
        colorHex: '#ea580c',
        designNumber: '9014 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Kali 3.30 = 39.50'
      },
      {
        id: 'r2',
        colorName: 'Color 2 (Cyan / Peacock Blue)',
        colorHex: '#0284c7',
        designNumber: '9012 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Kurti 2 = 24'
      },
      {
        id: 'r3',
        colorName: 'Color 3 (Ochre / Mustard Yellow)',
        colorHex: '#ca8a04',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 79, 'Kurti': 24, 'Lass': 12 },
        notes: 'Lass 1 = 12'
      },
      {
        id: 'r4',
        colorName: 'Color 4 (Magenta / Rose Pink)',
        colorHex: '#db2777',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'DP = 2.60 = 31.20'
      },
      {
        id: 'r5',
        colorName: 'Color 5 (Olive / Mehndi Green)',
        colorHex: '#65a30d',
        designNumber: '9014 Kali 8',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'Lass .75 = 8.50'
      },
      {
        id: 'r6',
        colorName: 'Color 6 (Silver / Steel Grey)',
        colorHex: '#64748b',
        designNumber: 'D.No 31',
        fabricQuantities: { 'Kali': 96, 'Kurti': 24, 'Lass': 12 },
        notes: 'BL 1.30 = 16'
      }
    ]);
    setCalculationNotes('Kali 3.30 = 39.50 | Kurti 2 = 24 | Lass 1 = 12 | Magi 0.50 = 6 | Total = 81.50\nDP = 2.60 = 31.20 | Lass .75 = 8.50 | BL 1.30 = 16 | Total = 56');
    setInwardChallanNotes('Ch 227: 12x6x2 = 24x6 | Ch 226: 11x6x2 = 22x6 | Total = 46x6');
    setDeliveryChalanNo('96');
    setPiecesCompleted(780);
  };

  const handleLoadPresetBLFashion = () => {
    setJobNo('2');
    setDate('2026-10-01');
    setChalanNo('XYZ');
    setPartyName('BL. FASHION');
    setFirmName('S V ART & CREATION');
    setFabricColumns(['Kali', 'Dupatta', 'Blouse front', 'Blouse Back', 'Lace']);
    setColorRows([
      {
        id: 'r1',
        colorName: 'Color 1 (Wine Maroon)',
        colorHex: '#881337',
        designNumber: 'Suit 28',
        fabricQuantities: { 'Kali': 10, 'Dupatta': 10, 'Blouse front': 10, 'Blouse Back': 10, 'Lace': 10 },
        notes: 'Heavy neck zari'
      },
      {
        id: 'r2',
        colorName: 'Color 2 (Emerald Green)',
        colorHex: '#047857',
        designNumber: 'Suit 28',
        fabricQuantities: { 'Kali': 10, 'Dupatta': 10, 'Blouse front': 10, 'Blouse Back': 10, 'Lace': 10 },
        notes: 'All borders matching'
      }
    ]);
    setCalculationNotes('Suit 28 full 5-component set matching');
    setDeliveryChalanNo('DCH-441');
    setPiecesCompleted(40);
  };

  // Submit and generate workflow items
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const slipId = existingSlip?.id || `slip-${Date.now()}`;
    const slipObj: OrderSlip = {
      id: slipId,
      jobNo: jobNo.trim() || 'JOB-01',
      date: date || todayStr,
      chalanNo: chalanNo.trim() || 'CH-01',
      partyName: partyName.trim() || 'Direct Client',
      totalPcs: totalOrderedPcs,
      fabricColumns,
      colorRows,
      calculationNotes,
      inwardChallanNotes,
      deliveryChalanNo,
      deliveryDate,
      billNo,
      billDate,
      piecesCompleted,
      firmName,
      status: piecesCompleted >= totalOrderedPcs && totalOrderedPcs > 0 ? 'completed' : 'in_progress',
      createdAt: existingSlip?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Generate individual workflow items for each cell with quantity > 0
    const generatedItems: WorkflowItem[] = [];
    colorRows.forEach((row, rIdx) => {
      fabricColumns.forEach((colName, cIdx) => {
        const qty = Number(row.fabricQuantities[colName]) || 0;
        if (qty > 0) {
          const itemId = `wf-${slipId}-${rIdx}-${cIdx}`;
          const itemDNo = row.designNumber || 'DSG-101';
          
          const newItem: WorkflowItem = {
            id: itemId,
            lotNumber: `LOT-${jobNo}-${rIdx + 1}`,
            jobNo: jobNo,
            designNumber: itemDNo,
            designName: `${partyName} ${colName} (${row.colorName})`,
            fabricType: colName,
            fabricColor: row.colorName,
            colorSwatchHex: row.colorHex,
            partyOrClientName: partyName,
            partyName: partyName,
            date: date,
            createdDate: date,
            chalanNumber: chalanNo,
            pieces: qty,
            quantity: qty,
            unit: 'pieces',
            currentStage: 'embroidery',
            priority: 'normal',
            initialInspectionResult: 'good',
            assignedOperator: 'Floor Supervisor',
            notes: row.notes || calculationNotes || 'Generated from S V ART & CREATION slip',
            deliveryChalanNumber: deliveryChalanNo,
            deliveryDate: deliveryDate,
            billNumber: billNo,
            piecesCompleted: piecesCompleted > 0 ? Math.min(qty, Math.round((piecesCompleted / totalOrderedPcs) * qty)) : 0,
            firmName: firmName,
            orderSlipId: slipId,
            orderCalculationNotes: calculationNotes,
            challanBreakdownNotes: inwardChallanNotes,
            stageHistory: [
              {
                stageId: 'fabric',
                stageName: '1. Fabric',
                enteredAt: new Date().toISOString(),
                notes: `Inward recorded from Slip ${chalanNo}`
              },
              {
                stageId: 'chalan',
                stageName: '2. Chalan (Slip)',
                enteredAt: new Date().toISOString(),
                notes: `Order Slip issued with ${qty} pcs`
              },
              {
                stageId: 'embroidery',
                stageName: '5. Embroidery',
                enteredAt: new Date().toISOString(),
                notes: 'Active in production matrix'
              }
            ]
          };

          // Generate individual piece units connected to this slip
          newItem.individualPieces = getOrGenerateIndividualPieces(newItem);
          generatedItems.push(newItem);
        }
      });
    });

    onSaveSlip(slipObj, generatedItems);
    onClose();
  };

  const handlePrintSlip = () => {
    window.print();
  };

  return (
    <div 
      id="modal-order-slip-root"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-300 my-4 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Top Bar */}
        <div className="p-4 bg-white border-b border-slate-200 text-slate-900 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-slate-900 rounded-xl text-white shadow-xs">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center space-x-2 text-slate-900">
                <span>{firmName} — Party Order Slip (Grid Matrix)</span>
              </h2>
              <p className="text-xs text-slate-500">
                Multi-Color &amp; Multi-Fabric production job card matching the physical factory order sheet
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleLoadPresetJaishri}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
            >
              Load Jaishri (06/05)
            </button>
            <button
              type="button"
              onClick={handleLoadPresetBLFashion}
              className="px-2.5 py-1 text-[11px] font-semibold bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg transition-colors border border-slate-200"
            >
              Load BL. Fashion (Job 2)
            </button>
            <button
              type="button"
              onClick={handlePrintSlip}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              title="Print Order Slip"
            >
              <Printer className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body - Replicating Paper Sheet */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Live Piece Tracker Synchronization Banner */}
          {existingSlip && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-slate-900 text-white shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div>
                  <div className="font-extrabold text-slate-900 flex items-center space-x-2">
                    <span>Individual Piece Tracker Connected</span>
                    <span className="px-2 py-0.2 rounded-full bg-slate-200 text-slate-800 text-[10px] font-bold font-mono">
                      {livePieceCompletedCount} / {totalOrderedPcs} Pcs Completed
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Piece-level status changes in the tracker automatically update this party slip &amp; Google Sheet.
                  </p>
                </div>
              </div>

              {liveStageDist && (
                <div className="flex items-center space-x-2 flex-wrap gap-1">
                  {liveStageDist.prepare_dispatch > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-bold font-mono text-[10px] border border-emerald-200">
                      ✅ {liveStageDist.prepare_dispatch} in Dispatch
                    </span>
                  )}
                  {liveStageDist.altering > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-900 font-bold font-mono text-[10px] border border-rose-200">
                      ⚠️ {liveStageDist.altering} in Altering
                    </span>
                  )}
                  {liveStageDist.embroidery > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 font-bold font-mono text-[10px] border border-slate-200">
                      🧵 {liveStageDist.embroidery} in Embroidery
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Slip Header Card (Paper Layout) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            
            <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-3 gap-2 text-center sm:text-left">
              <div className="text-sm font-bold text-slate-800 font-serif">
                श्री ૧૫
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Enter Firm / Company Name"
                  className="text-xl sm:text-2xl font-black tracking-wider text-slate-900 uppercase font-serif text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-800 focus:outline-none transition-colors"
                />
              </div>
              <div className="text-xs font-bold text-slate-400 font-mono uppercase">
                Order Sheet
              </div>
            </div>

            {/* Header Form Inputs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 text-xs">
              
              <div className="col-span-2 sm:col-span-2 lg:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  2) Party Name:
                </label>
                <input
                  type="text"
                  required
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder="e.g. Jaishri / BL. FASHION"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 text-slate-900 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
                  3) Job No.:
                </label>
                <input
                  type="text"
                  required
                  value={jobNo}
                  onChange={(e) => setJobNo(e.target.value)}
                  placeholder="e.g. 06/05 or 2"
                  className="w-full px-3 py-2 text-xs font-bold font-mono bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
                  4) Date:
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-800 uppercase tracking-wider mb-1">
                  5) Chalan No. (Ch. NO.):
                </label>
                <input
                  type="text"
                  value={chalanNo}
                  onChange={(e) => setChalanNo(e.target.value)}
                  placeholder="e.g. 227 or XYZ"
                  className="w-full px-3 py-2 text-xs font-bold font-mono bg-white border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
              </div>

            </div>

            <div className="flex items-center justify-between pt-2 text-xs font-bold text-slate-700">
              <div>
                Firm: <span className="font-bold text-slate-900">{firmName}</span>
              </div>
              <div className="px-3 py-1 bg-amber-200/80 rounded-lg text-amber-950 font-black font-mono">
                Total Ordered: {totalOrderedPcs.toLocaleString()} Pcs
              </div>
            </div>

          </div>

          {/* Matrix Grid Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Layers className="h-4 w-4 text-blue-600" />
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Fabric Type &amp; Color Piece Matrix
                </h3>
              </div>
              
              <div className="flex items-center space-x-2">
                {!showAddColumnInput ? (
                  <button
                    type="button"
                    onClick={() => setShowAddColumnInput(true)}
                    className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors flex items-center space-x-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>+ Add Fabric Column</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-1.5">
                    <input
                      type="text"
                      placeholder="Fabric (e.g. Odhani)"
                      value={newColumnInput}
                      onChange={(e) => setNewColumnInput(e.target.value)}
                      className="px-2 py-1 text-xs bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 w-32"
                    />
                    <button
                      type="button"
                      onClick={handleAddFabricColumn}
                      className="px-2 py-1 text-xs font-bold bg-blue-600 text-white rounded-lg"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddColumnInput(false)}
                      className="px-1.5 py-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleAddColorRow}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Add Color Row</span>
                </button>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="border-2 border-slate-300 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-800 font-black uppercase text-[11px]">
                      <th className="py-2.5 px-3 min-w-[170px] border-r border-slate-300">
                        1) Colour / Swatch
                      </th>
                      {fabricColumns.map(col => (
                        <th key={col} className="py-2.5 px-3 text-center min-w-[100px] border-r border-slate-300 bg-blue-50/50">
                          <div className="flex items-center justify-between space-x-1">
                            <span className="font-bold truncate" title={col}>{col}</span>
                            {fabricColumns.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveFabricColumn(col)}
                                className="text-slate-400 hover:text-rose-600 text-[10px]"
                                title="Remove column"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </th>
                      ))}
                      <th className="py-2.5 px-3 min-w-[120px] border-r border-slate-300">
                        8) D.No
                      </th>
                      <th className="py-2.5 px-3 min-w-[140px] border-r border-slate-300">
                        9) Note
                      </th>
                      <th className="py-2.5 px-2 text-center w-10">
                        Del
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y border-slate-300">
                    {colorRows.map((row, rIdx) => (
                      <tr key={row.id} className="hover:bg-slate-50">
                        
                        {/* Color name & Hex swatch */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <div className="flex items-center space-x-2">
                            <input
                              type="color"
                              value={row.colorHex || '#3b82f6'}
                              onChange={(e) => handleUpdateRowMeta(row.id, 'colorHex', e.target.value)}
                              className="h-6 w-6 rounded-md border border-slate-300 cursor-pointer p-0 shrink-0"
                              title="Pick Swatch Color"
                            />
                            <input
                              type="text"
                              value={row.colorName}
                              onChange={(e) => handleUpdateRowMeta(row.id, 'colorName', e.target.value)}
                              placeholder={`Color ${rIdx + 1}`}
                              className="w-full px-2 py-1 text-xs font-bold bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                            />
                          </div>
                        </td>

                        {/* Quantity Cells */}
                        {fabricColumns.map(col => {
                          const val = row.fabricQuantities[col] ?? 0;
                          return (
                            <td key={col} className="py-2 px-3 text-center border-r border-slate-200 bg-blue-50/20">
                              <input
                                type="number"
                                min={0}
                                value={val || ''}
                                onChange={(e) => handleUpdateQuantity(row.id, col, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-full text-center py-1 px-1 text-xs font-mono font-bold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                          );
                        })}

                        {/* Design No */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.designNumber || ''}
                            onChange={(e) => handleUpdateRowMeta(row.id, 'designNumber', e.target.value)}
                            placeholder="e.g. 9014 Kali 8"
                            className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                          />
                        </td>

                        {/* Notes */}
                        <td className="py-2 px-3 border-r border-slate-200">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => handleUpdateRowMeta(row.id, 'notes', e.target.value)}
                            placeholder="Note..."
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          {colorRows.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete Row"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Bottom Calculations and Inward Challans (Matching the bottom of sheet) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Calculation Notes */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                Production Calculations / Formula Notes:
              </label>
              <textarea
                rows={3}
                value={calculationNotes}
                onChange={(e) => setCalculationNotes(e.target.value)}
                placeholder="e.g. Kali 3.30 = 39.50 | Kurti 2 = 24 | Lass 1 = 12..."
                className="w-full p-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Inward Challan Breakdown */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2">
              <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                Inward Challan / Lot Breakup:
              </label>
              <textarea
                rows={3}
                value={inwardChallanNotes}
                onChange={(e) => setInwardChallanNotes(e.target.value)}
                placeholder="e.g. Ch 227: 12x6x2 = 24x6 | Ch 226: 11x6x2 = 22x6..."
                className="w-full p-2 text-xs font-mono bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

          </div>

          {/* After Completion & Delivery Section (Bottom Right in slip) */}
          <div className="p-4 bg-emerald-50/40 rounded-xl border-2 border-emerald-200 space-y-3">
            <div className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="h-4 w-4 text-emerald-600" />
              <span>After Completion &amp; Dispatch Details</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  10) D.Ch.No (Delivery):
                </label>
                <input
                  type="text"
                  value={deliveryChalanNo}
                  onChange={(e) => setDeliveryChalanNo(e.target.value)}
                  placeholder="e.g. 96"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  11) Date of Delivery:
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  12) Bill No.:
                </label>
                <input
                  type="text"
                  value={billNo}
                  onChange={(e) => setBillNo(e.target.value)}
                  placeholder="e.g. BILL-901"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  Bill Date:
                </label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  13) Pcs Completed:
                </label>
                <input
                  type="number"
                  min={0}
                  max={totalOrderedPcs || 9999}
                  value={piecesCompleted || ''}
                  onChange={(e) => setPiecesCompleted(parseInt(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg text-emerald-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-700 mb-1">
                  14) Firm Name:
                </label>
                <input
                  type="text"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>

              {existingSlip && onDeleteSlip && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete Order Slip "${partyName} (Job ${jobNo})"? This will remove the slip and all generated lots from the system and Google Sheets.`)) {
                      onDeleteSlip(existingSlip.id, existingSlip.jobNo);
                      onClose();
                    }
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition-all flex items-center space-x-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete Slip</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg transition-all flex items-center space-x-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Save &amp; Generate 10-Stage Workflow Jobs</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
