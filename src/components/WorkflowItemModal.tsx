import React, { useState, useEffect } from 'react';
import { 
  X, 
  Layers, 
  FileText, 
  Sparkles, 
  Tag, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Wrench, 
  PackageCheck, 
  ArrowRight, 
  ArrowLeft, 
  RotateCcw, 
  Clock, 
  MapPin, 
  Camera, 
  Edit2, 
  Trash2, 
  ExternalLink,
  Smartphone,
  ImageIcon,
  Database,
  Plus,
  Truck,
  Receipt,
  Building,
  Hash,
  Palette
} from 'lucide-react';
import { WorkflowItem, WorkflowStageId, WorkflowCustomMetadataField } from '../types';
import { 
  WORKFLOW_STAGES, 
  getNextStage, 
  getPreviousStage, 
  SUGGESTED_METADATA_KEYS,
  getStoredFabricTypes,
  addNewFabricType 
} from '../utils/workflowData';
import { DesignPhotoModal } from './DesignPhotoModal';
import { formatDirectImageUrl } from '../services/firebaseService';

interface WorkflowItemModalProps {
  item: WorkflowItem | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateStage: (itemId: string, newStage: WorkflowStageId, note?: string, qcResult?: 'good' | 'bad_return' | 'needs_alter' | 'passed') => void;
  onUpdateItem: (updatedItem: WorkflowItem) => void;
  onDeleteItem: (itemId: string) => void;
  onHandoverToDispatch?: (item: WorkflowItem) => void;
}

export const WorkflowItemModal: React.FC<WorkflowItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onUpdateStage,
  onUpdateItem,
  onDeleteItem,
  onHandoverToDispatch
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'completion' | 'photos' | 'history' | 'edit'>('details');
  const [operatorNote, setOperatorNote] = useState('');
  const [operatorName, setOperatorName] = useState(item?.assignedOperator || 'Floor Supervisor');
  const [alterReason, setAlterReason] = useState(item?.alterationReason || '');
  const [isPhotoCaptureOpen, setIsPhotoCaptureOpen] = useState(false);

  // Edit form states
  const [editDesignNumber, setEditDesignNumber] = useState(item?.designNumber || '');
  const [editDesignName, setEditDesignName] = useState(item?.designName || '');
  const [editJobNo, setEditJobNo] = useState(item?.jobNo || item?.lotNumber || '');
  const [editLotNumber, setEditLotNumber] = useState(item?.lotNumber || '');
  const [editChalanNumber, setEditChalanNumber] = useState(item?.chalanNumber || '');
  const [editFabricType, setEditFabricType] = useState(item?.fabricType || 'Kali');
  const [editFabricColor, setEditFabricColor] = useState(item?.fabricColor || '');
  const [editPartyName, setEditPartyName] = useState(item?.partyName || item?.partyOrClientName || '');
  const [editDate, setEditDate] = useState(item?.date || item?.createdDate || '');
  const [editPieces, setEditPieces] = useState(item?.pieces || item?.quantity || 100);
  const [editPriority, setEditPriority] = useState(item?.priority || 'normal');
  const [editDueDate, setEditDueDate] = useState(item?.dueDate || '');
  const [editNotes, setEditNotes] = useState(item?.notes || '');
  const [editCustomFields, setEditCustomFields] = useState<WorkflowCustomMetadataField[]>(
    item?.customMetadata || []
  );

  // After Completion specific form states
  const [compDeliveryChalanNo, setCompDeliveryChalanNo] = useState(item?.deliveryChalanNo || '');
  const [compDateOfDelivery, setCompDateOfDelivery] = useState(item?.dateOfDelivery || '');
  const [compBillNo, setCompBillNo] = useState(item?.billNo || '');
  const [compPiecesCompleted, setCompPiecesCompleted] = useState<number>(item?.piecesCompleted ?? (item?.pieces || item?.quantity || 100));
  const [compFirmName, setCompFirmName] = useState(item?.firmName || '');
  const [compSavedSuccess, setCompSavedSuccess] = useState(false);

  // Fabric types
  const [fabricTypesList, setFabricTypesList] = useState<string[]>(() => getStoredFabricTypes());
  const [newFabricInput, setNewFabricInput] = useState('');
  const [showNewFabricInput, setShowNewFabricInput] = useState(false);

  useEffect(() => {
    if (item) {
      setEditDesignNumber(item.designNumber);
      setEditDesignName(item.designName || '');
      setEditJobNo(item.jobNo || item.lotNumber || '');
      setEditLotNumber(item.lotNumber);
      setEditChalanNumber(item.chalanNumber || '');
      setEditFabricType(item.fabricType);
      setEditFabricColor(item.fabricColor || '');
      setEditPartyName(item.partyName || item.partyOrClientName || '');
      setEditDate(item.date || item.createdDate || '');
      setEditPieces(item.pieces || item.quantity);
      setEditPriority(item.priority);
      setEditDueDate(item.dueDate || '');
      setEditNotes(item.notes || '');
      setEditCustomFields(item.customMetadata || []);
      setOperatorName(item.assignedOperator || 'Floor Supervisor');
      setAlterReason(item.alterationReason || '');

      // Completion fields
      setCompDeliveryChalanNo(item.deliveryChalanNo || '');
      setCompDateOfDelivery(item.dateOfDelivery || '');
      setCompBillNo(item.billNo || '');
      setCompPiecesCompleted(item.piecesCompleted ?? (item.pieces || item.quantity || 100));
      setCompFirmName(item.firmName || '');
      setCompSavedSuccess(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleAddEditCustomField = (presetKey?: string) => {
    setEditCustomFields(prev => [...prev, { key: presetKey || '', value: '' }]);
  };

  const handleRemoveEditCustomField = (index: number) => {
    setEditCustomFields(prev => prev.filter((_, i) => i !== index));
  };

  const handleEditCustomFieldChange = (index: number, field: 'key' | 'value', val: string) => {
    setEditCustomFields(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleAddNewFabricType = () => {
    if (!newFabricInput.trim()) return;
    const updated = addNewFabricType(newFabricInput.trim());
    setFabricTypesList(updated);
    setEditFabricType(newFabricInput.trim());
    setNewFabricInput('');
    setShowNewFabricInput(false);
  };

  const currentStageDef = WORKFLOW_STAGES.find(s => s.id === item.currentStage) || WORKFLOW_STAGES[0];
  const nextStageId = getNextStage(item.currentStage);
  const prevStageId = getPreviousStage(item.currentStage);
  const nextStageDef = nextStageId ? WORKFLOW_STAGES.find(s => s.id === nextStageId) : null;
  const prevStageDef = prevStageId ? WORKFLOW_STAGES.find(s => s.id === prevStageId) : null;

  const handleAdvanceStage = () => {
    if (nextStageId) {
      onUpdateStage(item.id, nextStageId, operatorNote.trim() || undefined);
      setOperatorNote('');
    }
  };

  const handleRollbackStage = () => {
    if (prevStageId) {
      onUpdateStage(item.id, prevStageId, operatorNote.trim() || 'Rolled back to previous stage');
      setOperatorNote('');
    }
  };

  // Save changes from Edit tab
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();

    const validCustomMetadata = editCustomFields
      .map(f => ({ key: f.key.trim(), value: f.value.trim() }))
      .filter(f => f.key.length > 0 && f.value.length > 0);

    const pcsVal = Math.max(1, Math.round(Number(editPieces) || 1));

    const updated: WorkflowItem = {
      ...item,
      designNumber: editDesignNumber.trim(),
      designName: editDesignName.trim() || undefined,
      lotNumber: editLotNumber.trim() || item.lotNumber,
      jobNo: editJobNo.trim() || editLotNumber.trim() || item.jobNo,
      partyName: editPartyName.trim() || undefined,
      partyOrClientName: editPartyName.trim() || undefined,
      date: editDate || item.date,
      chalanNumber: editChalanNumber.trim() || undefined,
      fabricType: editFabricType.trim(),
      fabricColor: editFabricColor.trim() || undefined,
      pieces: pcsVal,
      quantity: pcsVal,
      priority: editPriority,
      dueDate: editDueDate || undefined,
      notes: editNotes.trim() || undefined,
      customMetadata: validCustomMetadata.length > 0 ? validCustomMetadata : undefined,
    };

    onUpdateItem(updated);
    setActiveTab('details');
  };

  // Save changes from After Completion tab
  const handleSaveCompletionFields = (e: React.FormEvent) => {
    e.preventDefault();

    const updated: WorkflowItem = {
      ...item,
      deliveryChalanNo: compDeliveryChalanNo.trim() || undefined,
      dateOfDelivery: compDateOfDelivery || undefined,
      billNo: compBillNo.trim() || undefined,
      piecesCompleted: Number(compPiecesCompleted) || undefined,
      firmName: compFirmName.trim() || undefined,
    };

    onUpdateItem(updated);
    setCompSavedSuccess(true);
    setTimeout(() => setCompSavedSuccess(false), 3000);
  };

  const isCompletedStage = item.currentStage === 'prepare_dispatch';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-6">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl text-white shadow-xs ${currentStageDef?.color?.badge || 'bg-blue-600'}`}>
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono font-black text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                  {item.jobNo || item.lotNumber}
                </span>
                <span className="text-xs font-bold text-slate-300">
                  {item.fabricType}
                </span>
                {item.fabricColor && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold">
                    {item.fabricColor}
                  </span>
                )}
              </div>
              <h2 className="text-base font-black tracking-wide text-white mt-0.5">
                D.no: {item.designNumber} {item.designName ? `— ${item.designName}` : ''}
              </h2>
            </div>
          </div>

          <button
            id="btn-close-item-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex items-center justify-between px-6 border-b border-slate-200 bg-slate-50 text-xs font-bold">
          <div className="flex space-x-2">
            <button
              id="tab-btn-details"
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Job Details</span>
            </button>

            <button
              id="tab-btn-completion"
              type="button"
              onClick={() => setActiveTab('completion')}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'completion'
                  ? 'border-emerald-600 text-emerald-700 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-emerald-600" />
              <span>After Completion / Delivery</span>
              {(item.deliveryChalanNo || item.billNo || item.firmName) && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>

            <button
              id="tab-btn-photos"
              type="button"
              onClick={() => setActiveTab('photos')}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'photos'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Photos ({item.photos?.length || (item.designImage ? 1 : 0)})</span>
            </button>

            <button
              id="tab-btn-history"
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'history'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Stage Timeline</span>
            </button>

            <button
              id="tab-btn-edit"
              type="button"
              onClick={() => setActiveTab('edit')}
              className={`py-3 px-3.5 border-b-2 transition-all flex items-center space-x-1.5 ${
                activeTab === 'edit'
                  ? 'border-blue-600 text-blue-600 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Edit2 className="h-3.5 w-3.5" />
              <span>Edit Metadata</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-slate-500">
              Stage {WORKFLOW_STAGES.findIndex(s => s.id === item.currentStage) + 1} of 10
            </span>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="p-6 max-h-[75vh] overflow-y-auto space-y-6">
          
          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <>
              {/* Photo & Design Banner Card */}
              <div className="rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden shadow-sm">
                <div className="flex flex-col sm:flex-row items-stretch">
                  
                  {/* Photo Preview Container */}
                  <div 
                    onClick={() => setIsPhotoCaptureOpen(true)}
                    className="sm:w-64 bg-slate-900 flex items-center justify-center cursor-pointer relative group overflow-hidden border-b sm:border-b-0 sm:border-r border-slate-800 min-h-[160px]"
                  >
                    {item.designImage ? (
                      <>
                        <img
                          src={formatDirectImageUrl(item.designImage)}
                          alt={item.designNumber}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 max-h-48"
                        />
                        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-xs text-[10px] font-mono text-emerald-400 font-bold border border-emerald-500/30 flex items-center space-x-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          <span>Image Attached</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 text-center text-slate-400">
                        <ImageIcon className="h-10 w-10 text-slate-600 mb-2" />
                        <span className="text-xs font-bold text-slate-300">No Photo Captured</span>
                        <span className="text-[10px] text-slate-500 mt-0.5">Click to attach fabric design photo</span>
                      </div>
                    )}
                  </div>

                  {/* Header Actions & Meta */}
                  <div className="p-5 flex-1 flex flex-col justify-between w-full space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono font-black text-blue-400 bg-blue-950 px-2 py-0.5 rounded border border-blue-800">
                            Job: {item.jobNo || item.lotNumber}
                          </span>
                          <span className="text-xs font-bold text-slate-300">
                            Type: {item.fabricType}
                          </span>
                        </div>
                        <h3 className="text-lg font-black tracking-wide text-white mt-1">
                          {item.designNumber} {item.designName ? `— ${item.designName}` : ''}
                        </h3>
                      </div>

                      <button
                        id="btn-trigger-capture-photo"
                        type="button"
                        onClick={() => setIsPhotoCaptureOpen(true)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition-all hover:scale-[1.02]"
                      >
                        <Camera className="h-4 w-4" />
                        <span>{item.designImage ? 'Add / Retake Photo' : 'Capture Photo'}</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Stage: <strong className="text-white">{currentStageDef?.name}</strong>
                      </div>
                      <div className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        Pieces: <strong className="text-white">{item.pieces || item.quantity} pcs</strong>
                      </div>
                      {item.photos && item.photos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setActiveTab('photos')}
                          className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-200 border border-indigo-700/50 hover:bg-indigo-900 transition-colors flex items-center space-x-1"
                        >
                          <Camera className="h-3 w-3 text-indigo-400" />
                          <span>View all {item.photos.length} photos</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Standard 10 Metadata Summary Grid */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span>Fabric Metadata &amp; Order Specifications</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* 1) Color */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">1) Color</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5">{item.fabricColor || '—'}</p>
                  </div>

                  {/* 2) Party Name */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">2) Party Name</span>
                    <p className="text-xs font-black text-slate-800 mt-0.5 truncate">{item.partyName || item.partyOrClientName || '—'}</p>
                  </div>

                  {/* 3) Job No. */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">3) Job No.</span>
                    <p className="text-xs font-mono font-black text-blue-700 mt-0.5">{item.jobNo || item.lotNumber}</p>
                  </div>

                  {/* 4) Date */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">4) Date</span>
                    <p className="text-xs font-mono font-bold text-slate-800 mt-0.5">{item.date || item.createdDate || '—'}</p>
                  </div>

                  {/* 5) Chalan no. */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">5) Chalan No. (Ch. NO.)</span>
                    <p className="text-xs font-mono font-bold text-blue-600 mt-0.5">{item.chalanNumber || '—'}</p>
                  </div>

                  {/* 6) Pcs (integer) */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">6) Pieces (Pcs)</span>
                    <p className="text-xs font-mono font-black text-emerald-700 mt-0.5">
                      {item.pieces || item.quantity} pcs
                    </p>
                  </div>

                  {/* 8) Design no. (D.no) */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">8) Design No. (D.no)</span>
                    <p className="text-xs font-black text-slate-900 mt-0.5">{item.designNumber}</p>
                  </div>

                  {/* 10) Type of fabric */}
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">10) Fabric Type</span>
                    <p className="text-xs font-bold text-indigo-700 mt-0.5">{item.fabricType}</p>
                  </div>
                </div>

                {/* 9) Note of any kind */}
                {item.notes && (
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-0.5">
                    <span className="font-bold text-slate-400 text-[10px] uppercase block">9) Notes / Special Instructions</span>
                    <p className="text-slate-800">{item.notes}</p>
                  </div>
                )}
              </div>

              {/* Stage Specific Action Cards */}
              
              {/* STAGE 3: Initial Inspection Point */}
              {item.currentStage === 'inspection' && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <h4 className="text-sm font-bold text-amber-950">Quality Inspection Gate</h4>
                    </div>
                    <span className="text-xs font-mono font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      STAGE 3 QC
                    </span>
                  </div>
                  <p className="text-xs text-amber-800">
                    Verify fabric weave density, stains, color variance, and meterage accuracy before releasing to stitching patta.
                  </p>

                  <div className="flex flex-wrap gap-2.5 pt-2">
                    <button
                      id="btn-inspect-accept-good"
                      type="button"
                      onClick={() => onUpdateStage(item.id, 'stitching_patta', 'Fabric inspected & accepted (Good condition)', 'good')}
                      className="flex-1 min-w-[180px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>GOOD (Accept) ➔ Move to Patta</span>
                    </button>

                    <button
                      id="btn-inspect-reject-bad"
                      type="button"
                      onClick={() => onUpdateStage(item.id, 'fabric', 'Fabric defective — returned to vendor', 'bad_return')}
                      className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>BAD (Return to Supplier)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* STAGE 7: Inspection for Alter Point */}
              {item.currentStage === 'inspection_alter' && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="h-5 w-5 text-yellow-700" />
                      <h4 className="text-sm font-bold text-yellow-950">Post-Embroidery Alter Inspection</h4>
                    </div>
                    <span className="text-xs font-mono font-bold bg-yellow-200 text-yellow-900 px-2 py-0.5 rounded">
                      STAGE 7 QC
                    </span>
                  </div>
                  <p className="text-xs text-yellow-800">
                    Check for skipped stitches, broken dori/cording, misaligned sequences, or thread fuzz.
                  </p>

                  <div className="space-y-2">
                    <input
                      type="text"
                      value={alterReason}
                      onChange={(e) => setAlterReason(e.target.value)}
                      placeholder="Enter alteration reason if defect found (e.g. 5 pieces missing border zari)"
                      className="w-full px-3 py-2 bg-white border border-yellow-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-yellow-500/30"
                    />

                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        id="btn-alter-passed"
                        type="button"
                        onClick={() => onUpdateStage(item.id, 'folding', 'Inspection passed with 0 defects', 'passed')}
                        className="flex-1 min-w-[180px] flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>PASSED (No Alter) ➔ Move to Folding</span>
                      </button>

                      <button
                        id="btn-alter-flag"
                        type="button"
                        onClick={() => onUpdateStage(item.id, 'altering', alterReason.trim() || 'Defect found — routed to altering', 'needs_alter')}
                        className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>FLAG FOR ALTERING ➔ Route to Alter</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STAGE 8: Altering Process */}
              {item.currentStage === 'altering' && (
                <div className="bg-rose-50 border border-rose-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-rose-950">Active Rework / Altering</h4>
                    <span className="text-xs font-mono font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                      STAGE 8 REPAIR
                    </span>
                  </div>
                  {item.alterationReason && (
                    <div className="bg-white p-2.5 rounded-lg border border-rose-200 text-xs font-semibold text-rose-900">
                      Reason: {item.alterationReason}
                    </div>
                  )}
                  <button
                    id="btn-alter-complete"
                    type="button"
                    onClick={() => onUpdateStage(item.id, 'folding', 'Altering and repair completed successfully', 'passed')}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-md transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>ALTERING COMPLETED ➔ Send to Folding &amp; Press</span>
                  </button>
                </div>
              )}

              {/* STAGE 10: Prepare for Dispatch Handover */}
              {item.currentStage === 'prepare_dispatch' && (
                <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <PackageCheck className="h-5 w-5 text-emerald-700" />
                      <h4 className="text-sm font-bold text-emerald-950">Ready for Dispatch &amp; Completion Invoicing</h4>
                    </div>
                    <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                      STAGE 10 COMPLETE
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Product has finished all manufacturing stages. You can now fill in the <strong>After Completion Details</strong> (Delivery Chalan, Bill No, Completed Pieces, Firm Name) and export to Dispatch or Google Sheets.
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab('completion')}
                      className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl font-bold text-xs shadow-md flex items-center space-x-1.5"
                    >
                      <Truck className="h-4 w-4" />
                      <span>Fill After Completion Details ➔</span>
                    </button>

                    {onHandoverToDispatch && (
                      <button
                        id="btn-handover-dispatch"
                        type="button"
                        onClick={() => onHandoverToDispatch(item)}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md flex items-center space-x-1.5"
                      >
                        <PackageCheck className="h-4 w-4" />
                        <span>Create Dispatch Order</span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual Stage Transition & Notes */}
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                  <RotateCcw className="h-3.5 w-3.5 text-blue-600" />
                  <span>Manual Stage Movement &amp; Shift Note</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Operator / In-charge</label>
                    <input
                      type="text"
                      value={operatorName}
                      onChange={(e) => setOperatorName(e.target.value)}
                      placeholder="e.g. Ramesh Bhai / QC Desk"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Shift / Quality Note</label>
                    <input
                      type="text"
                      value={operatorNote}
                      onChange={(e) => setOperatorNote(e.target.value)}
                      placeholder="e.g. Completed 120 pieces, perfect finish"
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    disabled={!prevStageDef}
                    onClick={handleRollbackStage}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                      prevStageDef
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        : 'opacity-40 cursor-not-allowed bg-slate-50 text-slate-400'
                    }`}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Prev: {prevStageDef?.shortName || 'None'}</span>
                  </button>

                  <button
                    type="button"
                    disabled={!nextStageDef}
                    onClick={handleAdvanceStage}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-black shadow-xs transition-all ${
                      nextStageDef
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'opacity-40 cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                  >
                    <span>Move to Next: {nextStageDef?.shortName || 'Finished'}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Custom Metadata & Storage Information Section */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center space-x-1.5">
                        <span>Storage &amp; Custom Metadata</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Physical bin/shelf coordinates, roll barcodes, and custom textile specs
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-edit-metadata-shortcut"
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded transition-colors flex items-center space-x-1"
                  >
                    <Edit2 className="h-3 w-3" />
                    <span>Edit Metadata</span>
                  </button>
                </div>

                {item.customMetadata && item.customMetadata.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {item.customMetadata.map((meta, idx) => {
                      const isLocation = /storage|location|rack|shelf|bin|warehouse/i.test(meta.key);
                      return (
                        <div
                          key={`view-meta-${idx}`}
                          className={`p-2.5 rounded-lg border flex items-start space-x-2 transition-all ${
                            isLocation 
                              ? 'bg-blue-50/70 border-blue-200 text-blue-950' 
                              : 'bg-white border-slate-200 text-slate-800 shadow-2xs'
                          }`}
                        >
                          <div className="mt-0.5">
                            {isLocation ? (
                              <MapPin className="h-3.5 w-3.5 text-blue-600" />
                            ) : (
                              <Tag className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              {meta.key}
                            </span>
                            <span className="block text-xs font-bold text-slate-900 break-words">
                              {meta.value}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-500 flex items-center justify-between">
                    <span>No custom storage or metadata added yet.</span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('edit');
                        handleAddEditCustomField('Storage Location');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>Add Storage Location</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* TAB 2: AFTER COMPLETION (Delivery, Bill, Pcs completed, Firm name) */}
          {activeTab === 'completion' && (
            <form onSubmit={handleSaveCompletionFields} className="space-y-5">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center space-x-2">
                  <Truck className="h-5 w-5 text-emerald-700" />
                  <h3 className="text-sm font-bold text-emerald-950">
                    After Completion &amp; Dispatch Details
                  </h3>
                </div>
                <p className="text-xs text-emerald-800">
                  Log delivery documents, invoicing numbers, completed piece counts, and dispatching firm info. These fields synchronize directly with Google Sheets.
                </p>
              </div>

              {compSavedSuccess && (
                <div className="p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-900 flex items-center space-x-2 animate-in fade-in">
                  <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                  <span>After Completion metadata saved successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* 10) Delivery Chalan No. */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                    <span>10) Delivery Chalan No. (Ch. no.)</span>
                  </label>
                  <input
                    id="input-comp-delivery-chalan"
                    type="text"
                    value={compDeliveryChalanNo}
                    onChange={(e) => setCompDeliveryChalanNo(e.target.value)}
                    placeholder="e.g. DEL-CH-2026-092"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 11) Date of delivery */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                    <span>11) Date of Delivery</span>
                  </label>
                  <input
                    id="input-comp-date-delivery"
                    type="date"
                    value={compDateOfDelivery}
                    onChange={(e) => setCompDateOfDelivery(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 12) Bill no. */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                    <span>12) Bill No. / Invoice No.</span>
                  </label>
                  <input
                    id="input-comp-bill-no"
                    type="text"
                    value={compBillNo}
                    onChange={(e) => setCompBillNo(e.target.value)}
                    placeholder="e.g. INV-2026-4401"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-emerald-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                {/* 13) Pieces completed */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                    <span>13) Pieces Completed (Pcs)</span>
                  </label>
                  <input
                    id="input-comp-pieces-completed"
                    type="number"
                    min="0"
                    step="1"
                    value={compPiecesCompleted}
                    onChange={(e) => setCompPiecesCompleted(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Original Order: {item.pieces || item.quantity} pcs
                  </span>
                </div>

                {/* 14) Firm name */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center space-x-1">
                    <span>14) Firm Name (Executing Factory / Unit)</span>
                  </label>
                  <input
                    id="input-comp-firm-name"
                    type="text"
                    value={compFirmName}
                    onChange={(e) => setCompFirmName(e.target.value)}
                    placeholder="e.g. Radhe Silk Mills Pvt Ltd / Unit-2 Embroidery Works"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Back to Details
                </button>
                <button
                  id="btn-save-completion-metadata"
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Save Completion Details</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: PHOTOS & CLOUD GALLERY */}
          {activeTab === 'photos' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-xl">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-lg bg-blue-600">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Design Photos &amp; Cloud Storage</h4>
                    <p className="text-xs text-slate-400">
                      High-resolution photos snapped via mobile app or web, stored securely on cloud
                    </p>
                  </div>
                </div>

                <button
                  id="btn-add-new-photo-tab"
                  type="button"
                  onClick={() => setIsPhotoCaptureOpen(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Attach New Photo</span>
                </button>
              </div>

              {/* Photos Grid */}
              {item.photos && item.photos.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {item.photos.map((photo, idx) => (
                    <div 
                      key={photo.id || idx}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:shadow-md transition-shadow"
                    >
                      <div className="relative aspect-video bg-slate-950 flex items-center justify-center">
                        <img 
                          src={formatDirectImageUrl(photo.url)} 
                          alt={photo.caption || `Design photo ${idx + 1}`} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 text-white font-mono text-[9px] font-bold backdrop-blur-xs flex items-center space-x-1">
                          {(photo.source || photo.deviceSource) === 'android_app' ? (
                            <Smartphone className="h-2.5 w-2.5 text-emerald-400" />
                          ) : (
                            <Camera className="h-2.5 w-2.5 text-blue-400" />
                          )}
                          <span>{(photo.source || photo.deviceSource) === 'android_app' ? 'Android App' : 'Web Upload'}</span>
                        </span>

                        {(photo.stageCaptured || photo.stageCapturedAt) && (
                          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-blue-600/90 text-white font-mono text-[9px] font-bold">
                            Stage: {photo.stageCaptured || photo.stageCapturedAt}
                          </span>
                        )}
                      </div>

                      <div className="p-3 space-y-2">
                        {photo.caption && (
                          <p className="text-xs font-bold text-slate-800 line-clamp-2">
                            {photo.caption}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>By: {photo.takenBy || photo.capturedBy || 'Operator'}</span>
                          <span>{new Date(photo.timestamp).toLocaleDateString()}</span>
                        </div>

                        {photo.metadata && photo.metadata.length > 0 && (
                          <div className="pt-2 border-t border-slate-100 space-y-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400">Attached Metadata</span>
                            <div className="grid grid-cols-2 gap-1 text-[10px]">
                              {photo.metadata.map((m, mIdx) => (
                                <div key={mIdx} className="bg-slate-50 p-1 rounded border border-slate-200 truncate">
                                  <strong className="text-slate-500">{m.key}: </strong>
                                  <span className="text-slate-800 font-semibold">{m.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : item.designImage ? (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs p-4 flex flex-col sm:flex-row items-center gap-4">
                  <div className="w-full sm:w-48 h-36 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                    <img 
                      src={formatDirectImageUrl(item.designImage)} 
                      alt={item.designNumber}
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div className="space-y-2 text-xs flex-1">
                    <h5 className="font-bold text-slate-900 text-sm">Primary Design Preview</h5>
                    <p className="text-slate-500">
                      This photo is attached to this fabric job and displayed across Kanban cards and reports.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsPhotoCaptureOpen(true)}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold"
                    >
                      Capture Additional Photos with Metadata
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-10 border-2 border-dashed border-slate-300 rounded-xl text-center space-y-3 bg-slate-50">
                  <Camera className="h-10 w-10 text-slate-400 mx-auto" />
                  <div>
                    <h5 className="text-xs font-bold text-slate-700">No Photos Attached Yet</h5>
                    <p className="text-[11px] text-slate-500">
                      Snap a photo using your camera or upload a design picture here with storage coordinates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPhotoCaptureOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                  >
                    + Snap / Upload Photo Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: STAGE TIMELINE */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stage Transition Timeline ({item.stageHistory?.length || 0} Events)
              </h4>

              <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                {(item.stageHistory || []).map((hist, idx) => {
                  const sDef = WORKFLOW_STAGES.find(s => s.id === hist.stageId);
                  return (
                    <div key={idx} className="relative">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                        idx === (item.stageHistory.length - 1) ? 'bg-blue-600 ring-4 ring-blue-100' : 'bg-slate-400'
                      }`} />

                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900">
                            {hist.stageName || sDef?.name || hist.stageId}
                          </span>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(hist.enteredAt).toLocaleString()}
                          </span>
                        </div>

                        {hist.operatorName && (
                          <div className="text-[11px] text-slate-600 flex items-center space-x-1">
                            <User className="h-3 w-3 text-slate-400" />
                            <span>Operator: <strong>{hist.operatorName}</strong></span>
                          </div>
                        )}

                        {hist.notes && (
                          <p className="text-xs text-slate-700 bg-white p-2 rounded border border-slate-200 mt-1">
                            {hist.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: EDIT METADATA FORM */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 8) Design no. (D.no) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">8) Design No. (D.no) *</label>
                  <input
                    type="text"
                    required
                    value={editDesignNumber}
                    onChange={(e) => setEditDesignNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                {/* 3) Job No. */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">3) Job No. *</label>
                  <input
                    type="text"
                    required
                    value={editJobNo}
                    onChange={(e) => {
                      setEditJobNo(e.target.value);
                      setEditLotNumber(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                {/* 4) Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">4) Date</label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 2) Party Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">2) Party Name</label>
                  <input
                    type="text"
                    value={editPartyName}
                    onChange={(e) => setEditPartyName(e.target.value)}
                    placeholder="e.g. Vandana Silk Mills"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                {/* 5) Chalan no. */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">5) Chalan No. (Ch. NO.)</label>
                  <input
                    type="text"
                    value={editChalanNumber}
                    onChange={(e) => setEditChalanNumber(e.target.value)}
                    placeholder="e.g. CH-2026-804"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-blue-700 focus:bg-white"
                  />
                </div>

                {/* 1) Color */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">1) Color / Shade</label>
                  <input
                    type="text"
                    value={editFabricColor}
                    onChange={(e) => setEditFabricColor(e.target.value)}
                    placeholder="e.g. Crimson Red / Gold"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* 10) Fabric Type Selection */}
              <div className="p-3.5 bg-blue-50/50 border border-blue-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-blue-950 flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-blue-600" />
                    <span>10) Type of Fabric (Material)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowNewFabricInput(!showNewFabricInput)}
                    className="text-xs font-bold text-blue-700 hover:underline"
                  >
                    {showNewFabricInput ? 'Cancel' : '+ Add a new type'}
                  </button>
                </div>

                {showNewFabricInput && (
                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="text"
                      value={newFabricInput}
                      onChange={(e) => setNewFabricInput(e.target.value)}
                      placeholder="New fabric type name..."
                      className="flex-1 px-2.5 py-1.5 bg-white border border-blue-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddNewFabricType}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                    >
                      Save Type
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {fabricTypesList.map(type => {
                    const isSelected = editFabricType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditFabricType(type)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-white text-slate-700 border border-slate-200 hover:bg-blue-50/50'
                        }`}
                      >
                        {type}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 6) Pcs (integer) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">6) Pieces (Pcs)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={editPieces}
                    onChange={(e) => setEditPieces(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  >
                    <option value="low">Low Priority</option>
                    <option value="normal">Normal</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">🔥 Urgent Rush</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Target Due Date</label>
                  <input
                    type="date"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* 9) Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">9) Note of Any Kind</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Special instructions, stitch counts, design remarks..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white"
                />
              </div>

              {/* Custom Metadata & Storage Edit Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
                      <Database className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <h4 className="text-xs font-bold text-slate-900">
                          Custom Metadata &amp; Storage Details
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-full flex items-center space-x-1">
                          <Sparkles className="h-2.5 w-2.5" />
                          <span>Persistent</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Define storage locations, shelf IDs, batch tags, and other custom attributes
                      </p>
                    </div>
                  </div>

                  <button
                    id="btn-add-metadata-field-edit"
                    type="button"
                    onClick={() => handleAddEditCustomField()}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Metadata</span>
                  </button>
                </div>

                {/* Quick Add Suggestion Chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">Quick Add:</span>
                  {SUGGESTED_METADATA_KEYS.slice(0, 6).map(sugKey => {
                    const alreadyExists = editCustomFields.some(f => f.key.toLowerCase() === sugKey.toLowerCase());
                    return (
                      <button
                        key={sugKey}
                        type="button"
                        onClick={() => {
                          if (!alreadyExists) {
                            handleAddEditCustomField(sugKey);
                          }
                        }}
                        disabled={alreadyExists}
                        className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors flex items-center space-x-1 ${
                          alreadyExists
                            ? 'bg-slate-200/70 text-slate-400 cursor-not-allowed'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700'
                        }`}
                      >
                        <Plus className="h-2.5 w-2.5" />
                        <span>{sugKey}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Fields List */}
                {editCustomFields.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {editCustomFields.map((field, idx) => {
                      const isLocation = /storage|location|rack|shelf|bin|warehouse/i.test(field.key);
                      return (
                        <div 
                          key={`edit-custom-field-${idx}`} 
                          className="flex items-center space-x-2 bg-white p-2 rounded-xl border border-slate-200 shadow-2xs group hover:border-slate-300 transition-all"
                        >
                          <div className="text-slate-400 pl-1">
                            {isLocation ? (
                              <MapPin className="h-3.5 w-3.5 text-blue-500" />
                            ) : (
                              <Tag className="h-3.5 w-3.5 text-slate-400" />
                            )}
                          </div>

                          <div className="w-5/12">
                            <input
                              type="text"
                              value={field.key}
                              onChange={(e) => handleEditCustomFieldChange(idx, 'key', e.target.value)}
                              placeholder="Field Name (e.g. Storage Location)"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <div className="flex-1">
                            <input
                              type="text"
                              value={field.value}
                              onChange={(e) => handleEditCustomFieldChange(idx, 'value', e.target.value)}
                              placeholder="Value (e.g. Rack B-4, Bin 12)"
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveEditCustomField(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove field"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-2.5 bg-white rounded-lg border border-dashed border-slate-200 text-xs text-slate-500">
                    <span>No custom metadata fields.</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-1.5"
                >
                  <span>Save Metadata Changes</span>
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete fabric job "${item.designNumber}" (${item.jobNo || item.lotNumber})?`)) {
                onDeleteItem(item.id);
                onClose();
              }
            }}
            className="flex items-center space-x-1 text-rose-600 hover:text-rose-800 text-xs font-bold transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete Job</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>

      {/* Embedded Photo Capture & Upload Modal */}
      <DesignPhotoModal
        item={item}
        isOpen={isPhotoCaptureOpen}
        onClose={() => setIsPhotoCaptureOpen(false)}
        onUpdateItem={(updated) => {
          onUpdateItem(updated);
          setIsPhotoCaptureOpen(false);
        }}
      />
    </div>
  );
};
