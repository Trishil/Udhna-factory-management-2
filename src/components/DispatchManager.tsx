// The project currently lacks React/JSX type declarations. Keep this runtime
// component buildable until those shared dependencies are installed.
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Package, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  IndianRupee, 
  Calendar, 
  ArrowRight, 
  Printer, 
  Share2, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Layers, 
  Send, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Receipt, 
  Check, 
  X, 
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { 
  DispatchOrder, 
  DispatchStatus, 
  DispatchPaymentStatus, 
  DispatchPaymentRecord, 
  RawMaterial, 
  Machine 
} from '../types';
import { 
  getStoredParties, 
  saveStoredParty, 
  getStoredTransporters, 
  saveStoredTransporter,
  getStoredUnits,
  saveStoredUnit,
  getStoredCategories,
  saveStoredCategory,
  getStoredColors,
  saveStoredColor,
  DEFAULT_UNITS
} from '../utils/inventoryPresets';

interface DispatchManagerProps {
  dispatchOrders: DispatchOrder[];
  materials: RawMaterial[];
  machines: Machine[];
  onCreateDispatch: (order: Omit<DispatchOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDispatch: (order: DispatchOrder) => void;
  onMarkAsDispatched: (orderId: string, dispatchData: {
    dispatchedDate: string;
    transporterName: string;
    vehicleOrTrackingNumber: string;
    deliveryAddress?: string;
    packagingDetails?: string;
    notes?: string;
  }) => void;
  onRecordDispatchPayment: (
    dispatchId: string,
    amount: number,
    paymentMode: string,
    transactionRef: string,
    notes?: string
  ) => void;
  onDeleteDispatch: (dispatchId: string) => void;
  onNavigateToFinance?: () => void;
}

export const DispatchManager: React.FC<DispatchManagerProps> = ({
  dispatchOrders,
  materials,
  machines,
  onCreateDispatch,
  onUpdateDispatch,
  onMarkAsDispatched,
  onRecordDispatchPayment,
  onDeleteDispatch,
  onNavigateToFinance
}) => {
  // Navigation & Filtering
  const [activeFilter, setActiveFilter] = useState<'all' | 'ready_to_dispatch' | 'dispatched' | 'delivered' | 'unpaid'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'party_name'>('date_desc');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DispatchOrder | null>(null);

  // Stats Calculations
  const stats = useMemo(() => {
    const readyOrders = dispatchOrders.filter(o => o.status === 'ready_to_dispatch');
    const dispatchedOrders = dispatchOrders.filter(o => o.status === 'dispatched' || o.status === 'in_transit');
    const deliveredOrders = dispatchOrders.filter(o => o.status === 'delivered');
    
    const readyValue = readyOrders.reduce((sum, o) => sum + (o.totalInvoiceAmount || 0), 0);
    const readyQty = readyOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
    const dispatchedValue = dispatchedOrders.reduce((sum, o) => sum + (o.totalInvoiceAmount || 0), 0);
    const dispatchedQty = dispatchedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);
    
    const totalInvoiced = dispatchOrders.reduce((sum, o) => sum + (o.totalInvoiceAmount || 0), 0);
    const totalCollected = dispatchOrders.reduce((sum, o) => sum + (o.amountPaid || 0), 0);
    const totalReceivable = dispatchOrders.reduce((sum, o) => sum + (o.balanceDue || 0), 0);

    return {
      readyCount: readyOrders.length,
      readyValue,
      readyQty,
      dispatchedCount: dispatchedOrders.length,
      dispatchedValue,
      dispatchedQty,
      deliveredCount: deliveredOrders.length,
      totalInvoiced,
      totalCollected,
      totalReceivable
    };
  }, [dispatchOrders]);

  // Filtered and Sorted Orders
  const filteredOrders = useMemo(() => {
    return dispatchOrders.filter(order => {
      // Status Filter
      if (activeFilter === 'ready_to_dispatch' && order.status !== 'ready_to_dispatch') return false;
      if (activeFilter === 'dispatched' && (order.status !== 'dispatched' && order.status !== 'in_transit')) return false;
      if (activeFilter === 'delivered' && order.status !== 'delivered') return false;
      if (activeFilter === 'unpaid' && (order.paymentStatus === 'paid' || order.balanceDue <= 0)) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNumber = order.dispatchNumber?.toLowerCase().includes(q) || order.orderNumber?.toLowerCase().includes(q) || order.invoiceNumber?.toLowerCase().includes(q);
        const matchParty = order.partyName?.toLowerCase().includes(q) || order.contactPerson?.toLowerCase().includes(q);
        const matchProduct = order.productName?.toLowerCase().includes(q) || order.category?.toLowerCase().includes(q) || order.colorName?.toLowerCase().includes(q);
        const matchTracking = order.vehicleOrTrackingNumber?.toLowerCase().includes(q) || order.transporterName?.toLowerCase().includes(q);
        if (!matchNumber && !matchParty && !matchProduct && !matchTracking) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') return new Date(b.createdAt || b.readyDate).getTime() - new Date(a.createdAt || a.readyDate).getTime();
      if (sortBy === 'date_asc') return new Date(a.createdAt || a.readyDate).getTime() - new Date(b.createdAt || b.readyDate).getTime();
      if (sortBy === 'amount_desc') return (b.totalInvoiceAmount || 0) - (a.totalInvoiceAmount || 0);
      if (sortBy === 'party_name') return (a.partyName || '').localeCompare(b.partyName || '');
      return 0;
    });
  }, [dispatchOrders, activeFilter, searchQuery, sortBy]);

  // Handlers for modal actions
  const handleOpenDispatchModal = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setIsDispatchModalOpen(true);
  };

  const handleOpenPaymentModal = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setIsPaymentModalOpen(true);
  };

  const handleOpenInvoiceModal = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setIsInvoiceModalOpen(true);
  };

  const handleOpenDeleteConfirm = (order: DispatchOrder) => {
    setSelectedOrder(order);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (selectedOrder) {
      onDeleteDispatch(selectedOrder.id);
      setIsDeleteConfirmOpen(false);
      setSelectedOrder(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Title Bar */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-slate-900 rounded-xl text-white shadow-xs shrink-0">
                <Truck className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight text-slate-900 flex items-center gap-2">
                  <span>Dispatch &amp; Finished Goods Shipments</span>
                  <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 uppercase">
                    Finance Synchronized
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage factory dispatch holding, track outbound consignments, and automatically sync buyer payments with the Finance Tab.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5 shrink-0">
            {onNavigateToFinance && (
              <button
                type="button"
                onClick={onNavigateToFinance}
                className="flex items-center space-x-2 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-all shadow-2xs"
              >
                <Receipt className="h-4 w-4 text-slate-500" />
                <span>View Finance Ledger</span>
              </button>
            )}

            <button
              id="btn-create-new-dispatch"
              type="button"
              onClick={() => {
                setSelectedOrder(null);
                setIsCreateModalOpen(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>+ New Dispatch Order</span>
            </button>
          </div>
        </div>

        {/* Real-time KPI Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-5">
          
          {/* Card 1: Ready to Dispatch */}
          <div 
            onClick={() => setActiveFilter('ready_to_dispatch')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'ready_to_dispatch'
                ? 'bg-amber-50 border-amber-300 shadow-xs ring-1 ring-amber-400/50'
                : 'bg-amber-50/60 border-amber-200/80 hover:bg-amber-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-amber-800 flex items-center gap-1.5 text-[11px] uppercase">
                <Package className="h-3.5 w-3.5 text-amber-600" />
                <span>Ready to Dispatch</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold">
                {stats.readyCount} Consignments
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-amber-950 mt-1">
              ₹{stats.readyValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-amber-700 flex items-center justify-between mt-1 font-medium">
              <span>{stats.readyQty.toLocaleString()} units on floor</span>
              <span>Awaiting Pickup &rarr;</span>
            </div>
          </div>

          {/* Card 2: Dispatched & In Transit */}
          <div 
            onClick={() => setActiveFilter('dispatched')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'dispatched'
                ? 'bg-slate-100 border-slate-300 shadow-xs ring-1 ring-slate-400/50'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/60'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase">
                <Truck className="h-3.5 w-3.5 text-slate-600" />
                <span>Dispatched / Transit</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">
                {stats.dispatchedCount} Active
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-slate-900 mt-1">
              ₹{stats.dispatchedValue.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
              <span>{stats.dispatchedQty.toLocaleString()} units shipped</span>
              <span>Tracking Active &rarr;</span>
            </div>
          </div>

          {/* Card 3: Payments Received */}
          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5 text-[11px] uppercase">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Payments Collected</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold">
                Inflow (₹)
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-emerald-950 mt-1">
              ₹{stats.totalCollected.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-emerald-700 flex items-center justify-between mt-1 font-medium">
              <span>From {dispatchOrders.length} total orders</span>
              <span>Synced in Finance</span>
            </div>
          </div>

          {/* Card 4: Outstanding Receivables */}
          <div 
            onClick={() => setActiveFilter('unpaid')}
            className={`p-4 rounded-xl border transition-all cursor-pointer ${
              activeFilter === 'unpaid'
                ? 'bg-rose-50 border-rose-300 shadow-xs ring-1 ring-rose-400/50'
                : 'bg-rose-50/60 border-rose-200/80 hover:bg-rose-50'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-rose-800 flex items-center gap-1.5 text-[11px] uppercase">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>Pending Receivables</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-100 text-rose-900 font-bold">
                Due from Buyers
              </span>
            </div>
            <div className="text-2xl font-black font-mono text-rose-950 mt-1">
              ₹{stats.totalReceivable.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-rose-700 flex items-center justify-between mt-1 font-medium">
              <span>{dispatchOrders.filter(o => o.balanceDue > 0).length} orders unpaid</span>
              <span>Collect &rarr;</span>
            </div>
          </div>

        </div>
      </div>

      {/* Control Bar: Filters, Search & Sorting */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            All Orders ({dispatchOrders.length})
          </button>
          
          <button
            type="button"
            onClick={() => setActiveFilter('ready_to_dispatch')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'ready_to_dispatch'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Ready to Dispatch ({stats.readyCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('dispatched')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'dispatched'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
            }`}
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Dispatched ({stats.dispatchedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('delivered')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'delivered'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Delivered ({stats.deliveredCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter('unpaid')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'unpaid'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
            }`}
          >
            <IndianRupee className="h-3.5 w-3.5" />
            <span>Payment Due ({dispatchOrders.filter(o => o.balanceDue > 0).length})</span>
          </button>
        </div>

        {/* Search and Sort */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Party, SKU, DSP #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-44 sm:w-56"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="amount_desc">Highest Amount</option>
            <option value="party_name">Party (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Main Dispatch Orders Table / Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        
        {filteredOrders.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100">
              <Truck className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">No Dispatch Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {searchQuery || activeFilter !== 'all'
                ? 'No consignments match your active search or filter criteria.'
                : 'Create your first finished goods dispatch consignment to track packaging, transport logistics, and customer payments.'}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm inline-flex items-center space-x-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Dispatch Order</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50/90 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Dispatch # / Date</th>
                  <th className="py-3 px-4">Party / Buyer</th>
                  <th className="py-3 px-4">Product &amp; Batch</th>
                  <th className="py-3 px-3 text-right">Qty &amp; Rate</th>
                  <th className="py-3 px-3 text-right">Total Invoice</th>
                  <th className="py-3 px-3 text-right">Payment Status</th>
                  <th className="py-3 px-3">Logistics Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.map(order => {
                  const isReady = order.status === 'ready_to_dispatch';
                  const isDispatched = order.status === 'dispatched' || order.status === 'in_transit';
                  const isDelivered = order.status === 'delivered';
                  const isFullyPaid = order.paymentStatus === 'paid' || order.balanceDue <= 0;

                  return (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                      
                      {/* 1. Dispatch Number & Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 text-xs">
                            {order.dispatchNumber}
                          </span>
                          {order.orderNumber && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({order.orderNumber})
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1.5 mt-0.5 font-mono">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span>{order.dispatchedDate || order.readyDate || order.createdAt?.split('T')[0]}</span>
                        </div>
                        {order.linkedTaskCode && (
                          <span className="inline-block mt-1 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-mono font-semibold">
                            Task: {order.linkedTaskCode}
                          </span>
                        )}
                      </td>

                      {/* 2. Party / Buyer */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <Building2 className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate max-w-[180px]">{order.partyName}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-[180px] mt-0.5">
                          {order.contactPerson || order.contactPhone || order.deliveryAddress || 'Client Order'}
                        </div>
                      </td>

                      {/* 3. Product & Batch */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center space-x-1.5">
                          {order.colorCode && (
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                              style={{ backgroundColor: order.colorCode }}
                            />
                          )}
                          <span className="truncate max-w-[200px]">{order.productName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center space-x-2">
                          {order.category && <span>{order.category}</span>}
                          {order.size && <span>&bull; {order.size}</span>}
                          {order.lotBatchNumber && (
                            <span className="text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded font-bold">
                              {order.lotBatchNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Qty & Rate */}
                      <td className="py-3.5 px-3 text-right font-mono whitespace-nowrap">
                        <div className="font-bold text-slate-900">
                          {order.quantity.toLocaleString()} {order.unit}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          @ ₹{order.unitPrice || 0} / {order.unit}
                        </div>
                      </td>

                      {/* 5. Total Invoice */}
                      <td className="py-3.5 px-3 text-right font-mono whitespace-nowrap">
                        <div className="font-black text-sm text-slate-900">
                          ₹{order.totalInvoiceAmount.toLocaleString('en-IN')}
                        </div>
                        {order.taxAmount > 0 && (
                          <div className="text-[10px] text-slate-500">
                            Incl. GST {order.taxPercent}% (₹{order.taxAmount.toLocaleString('en-IN')})
                          </div>
                        )}
                      </td>

                      {/* 6. Payment Status */}
                      <td className="py-3.5 px-3 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isFullyPaid
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : order.amountPaid > 0
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {isFullyPaid ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Paid in Full</span>
                              </>
                            ) : order.amountPaid > 0 ? (
                              <>
                                <Clock className="h-3 w-3" />
                                <span>Partially Paid</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="h-3 w-3" />
                                <span>Payment Unpaid</span>
                              </>
                            )}
                          </span>

                          <div className="text-[11px] font-mono mt-1">
                            <span className="text-emerald-700 font-bold">
                              ₹{order.amountPaid.toLocaleString('en-IN')}
                            </span>
                            {order.balanceDue > 0 && (
                              <span className="text-rose-600 font-bold ml-1">
                                (Due: ₹{order.balanceDue.toLocaleString('en-IN')})
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 7. Logistics Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                          isReady
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isDispatched
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : isDelivered
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {isReady ? (
                            <>
                              <Package className="h-3.5 w-3.5 text-amber-700" />
                              <span>Ready to Dispatch</span>
                            </>
                          ) : isDispatched ? (
                            <>
                              <Truck className="h-3.5 w-3.5 text-blue-700 animate-pulse" />
                              <span>Dispatched</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                              <span>Delivered</span>
                            </>
                          )}
                        </span>

                        {order.transporterName && (
                          <div className="text-[10px] text-slate-500 mt-1 font-mono truncate max-w-[140px]">
                            {order.transporterName}
                            {order.vehicleOrTrackingNumber && ` (${order.vehicleOrTrackingNumber})`}
                          </div>
                        )}
                      </td>

                      {/* 8. Action Buttons */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1.5">
                          
                          {/* Ready: Dispatch Button */}
                          {isReady && (
                            <button
                              type="button"
                              onClick={() => handleOpenDispatchModal(order)}
                              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1 transition-all"
                              title="Mark as Dispatched & Enter Logistics"
                            >
                              <Truck className="h-3.5 w-3.5" />
                              <span>Dispatch Now</span>
                            </button>
                          )}

                          {/* Record Payment Button */}
                          {!isFullyPaid && (
                            <button
                              type="button"
                              onClick={() => handleOpenPaymentModal(order)}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center space-x-1 transition-all"
                              title="Record Payment from Buyer & Sync to Finance"
                            >
                              <IndianRupee className="h-3.5 w-3.5" />
                              <span>Collect ₹</span>
                            </button>
                          )}

                          {/* View Invoice & Challan */}
                          <button
                            type="button"
                            onClick={() => handleOpenInvoiceModal(order)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                            title="Print Tax Invoice & Delivery Challan"
                          >
                            <FileText className="h-3.5 w-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleOpenDeleteConfirm(order)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors"
                            title="Delete Dispatch Order"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL 1: CREATE NEW DISPATCH ORDER */}
      {isCreateModalOpen && (
        <CreateDispatchModal
          materials={materials}
          machines={machines}
          onClose={() => setIsCreateModalOpen(false)}
          onSubmit={(newOrder) => {
            onCreateDispatch(newOrder);
            setIsCreateModalOpen(false);
          }}
        />
      )}

      {/* MODAL 2: DISPATCH SHIPMENT (READY -> DISPATCHED) */}
      {isDispatchModalOpen && selectedOrder && (
        <DispatchShipmentModal
          order={selectedOrder}
          onClose={() => {
            setIsDispatchModalOpen(false);
            setSelectedOrder(null);
          }}
          onSubmit={(dispatchData) => {
            onMarkAsDispatched(selectedOrder.id, dispatchData);
            setIsDispatchModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* MODAL 3: RECORD CUSTOMER PAYMENT (SYNC TO FINANCE) */}
      {isPaymentModalOpen && selectedOrder && (
        <RecordPaymentModal
          order={selectedOrder}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
          onSubmit={(amount, mode, ref, notes) => {
            onRecordDispatchPayment(selectedOrder.id, amount, mode, ref, notes);
            setIsPaymentModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* MODAL 4: INVOICE & DELIVERY CHALLAN PREVIEW */}
      {isInvoiceModalOpen && selectedOrder && (
        <InvoiceAndChallanModal
          order={selectedOrder}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedOrder(null);
          }}
        />
      )}

      {/* MODAL 5: DELETE CONFIRMATION */}
      {isDeleteConfirmOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Dispatch Order</h3>
            <p className="text-xs text-slate-600 mt-2">
              Are you sure you want to remove dispatch consignment <span className="font-mono font-bold text-slate-900">{selectedOrder.dispatchNumber}</span> ({selectedOrder.partyName})? This will also remove the corresponding party receivable invoice in Finance.
            </p>
            <div className="flex items-center justify-end space-x-2.5 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteConfirmOpen(false);
                  setSelectedOrder(null);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
              >
                Delete Consignment
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// ==========================================
// SUB-MODAL 1: CREATE NEW DISPATCH ORDER
// ==========================================
interface CreateDispatchModalProps {
  materials: RawMaterial[];
  machines: Machine[];
  onClose: () => void;
  onSubmit: (order: Omit<DispatchOrder, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

const CreateDispatchModal: React.FC<CreateDispatchModalProps> = ({
  materials,
  machines,
  onClose,
  onSubmit
}) => {
  // Parties & Presets
  const [partiesList, setPartiesList] = useState<string[]>(() => getStoredParties());
  const [isAddingNewParty, setIsAddingNewParty] = useState(false);
  const [newPartyInput, setNewPartyInput] = useState('');

  // Form State
  const [partyName, setPartyName] = useState(partiesList[0] || 'Nike Footwear Hub');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  
  // Product details
  const [productSource, setProductSource] = useState<'custom' | 'material'>('custom');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(materials[0]?.id || '');
  const [productName, setProductName] = useState('4mm Emerald Green Braided Cord');
  const [category, setCategory] = useState('Strings');
  const [size, setSize] = useState('4mm');
  const [colorName, setColorName] = useState('Emerald Green');
  const [colorCode, setColorCode] = useState('#059669');
  const [lotBatchNumber, setLotBatchNumber] = useState(`LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`);
  
  // Quantities & Pricing
  const [quantity, setQuantity] = useState<number>(5000);
  const [unit, setUnit] = useState<string>('meters');
  const [unitPrice, setUnitPrice] = useState<number>(14.50);
  const [taxPercent, setTaxPercent] = useState<number>(12); // Default GST 12%
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  
  // Status & Initial Payment
  const [initialStatus, setInitialStatus] = useState<DispatchStatus>('ready_to_dispatch');
  const [advancePaid, setAdvancePaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [transporterName, setTransporterName] = useState('');
  const [vehicleOrTrackingNumber, setVehicleOrTrackingNumber] = useState('');
  const [packagingDetails, setPackagingDetails] = useState('');
  const [notes, setNotes] = useState('');

  // Calculations
  const subtotal = useMemo(() => +(quantity * unitPrice).toFixed(2), [quantity, unitPrice]);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = useMemo(() => +(discountedSubtotal * (taxPercent / 100)).toFixed(2), [discountedSubtotal, taxPercent]);
  const totalInvoiceAmount = useMemo(() => +(discountedSubtotal + taxAmount + shippingCharges).toFixed(2), [discountedSubtotal, taxAmount, shippingCharges]);
  const balanceDue = Math.max(0, +(totalInvoiceAmount - advancePaid).toFixed(2));

  // Handle Material Source Selection
  const handleSelectMaterialSource = (matId: string) => {
    setSelectedMaterialId(matId);
    const mat = materials.find(m => m.id === matId);
    if (mat) {
      setProductName(mat.name);
      setCategory(mat.category || 'Strings');
      setSize(mat.size || '');
      setColorName(mat.colorName || '');
      setColorCode(mat.colorCode || '#2563EB');
      setUnit(mat.unit || 'meters');
      setLotBatchNumber(mat.lotNumber || `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 899)}`);
      // Standard markup over raw material unit cost
      if (mat.unitCost) {
        setUnitPrice(+(mat.unitCost * 1.6).toFixed(2));
      }
    }
  };

  const handleAddNewPartySubmit = () => {
    if (!newPartyInput.trim()) return;
    const updated = saveStoredParty(newPartyInput.trim());
    setPartiesList(updated);
    setPartyName(newPartyInput.trim());
    setNewPartyInput('');
    setIsAddingNewParty(false);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      alert('Please enter or select a buyer party name.');
      return;
    }
    if (!productName.trim()) {
      alert('Please specify the product name.');
      return;
    }
    if (quantity <= 0) {
      alert('Quantity must be greater than 0.');
      return;
    }

    const dspNumber = `DSP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const today = new Date().toISOString().split('T')[0];

    const paymentHistory: DispatchPaymentRecord[] = [];
    if (advancePaid > 0) {
      paymentHistory.push({
        id: `pay-${Date.now()}`,
        date: today,
        amount: advancePaid,
        paymentMode,
        transactionRef: `ADV-${Math.floor(100000 + Math.random() * 900000)}`,
        notes: `Initial advance payment received at order dispatch booking.`
      });
    }

    const newOrder: Omit<DispatchOrder, 'id' | 'createdAt' | 'updatedAt'> = {
      dispatchNumber: dspNumber,
      orderNumber: orderNumber.trim() || undefined,
      partyName: partyName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      deliveryAddress: deliveryAddress.trim() || undefined,
      productName: productName.trim(),
      category,
      size,
      colorName,
      colorCode,
      lotBatchNumber,
      linkedMaterialId: productSource === 'material' ? selectedMaterialId : undefined,
      quantity,
      unit,
      unitPrice,
      subtotal,
      taxPercent,
      taxAmount,
      discountAmount,
      shippingCharges,
      totalInvoiceAmount,
      status: initialStatus,
      readyDate: today,
      dispatchedDate: initialStatus === 'dispatched' ? today : undefined,
      transporterName: transporterName.trim() || undefined,
      vehicleOrTrackingNumber: vehicleOrTrackingNumber.trim() || undefined,
      packagingDetails: packagingDetails.trim() || undefined,
      notes: notes.trim() || undefined,
      invoiceNumber,
      amountPaid: advancePaid,
      balanceDue,
      paymentStatus: balanceDue <= 0 ? 'paid' : advancePaid > 0 ? 'partial' : 'unpaid',
      paymentDueDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      paymentHistory
    };

    onSubmit(newOrder);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-600 rounded-xl text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Dispatch Consignment</h2>
              <p className="text-xs text-slate-400">Add finished goods to the dispatch holding area and sync sales invoice with Finance.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleFormSubmit} className="p-6 space-y-5 text-xs">
          
          {/* Section 1: Buyer Party & Customer Info */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <span>Buyer / Party Information</span>
              </span>
              
              {!isAddingNewParty ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNewParty(true)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                >
                  + Add New Buyer Party
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNewParty(false)}
                  className="text-[11px] text-slate-500 hover:text-slate-700 font-medium"
                >
                  Cancel
                </button>
              )}
            </div>

            {isAddingNewParty && (
              <div className="flex items-center space-x-2 bg-indigo-50 p-2 rounded-lg border border-indigo-200">
                <input
                  type="text"
                  placeholder="Enter Party / Buyer Name..."
                  value={newPartyInput}
                  onChange={(e) => setNewPartyInput(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs focus:outline-none font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewPartySubmit}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs"
                >
                  Save &amp; Select
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Select Party *</label>
                <select
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20"
                >
                  {partiesList.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Contact Person / Phone</label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Shah (+91 98200...)"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Client PO / Order Ref</label>
                <input
                  type="text"
                  placeholder="e.g. PO-NK-9042"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Delivery Destination / Warehouse Address</label>
              <input
                type="text"
                placeholder="e.g. Nike Logistics Hub, Plot 42, GIDC Industrial Estate, Surat, Gujarat"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 text-xs"
              />
            </div>
          </div>

          {/* Section 2: Product & Goods Specifications */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Package className="h-4 w-4 text-indigo-600" />
                <span>Finished Goods &amp; Item Details</span>
              </span>

              <div className="flex items-center space-x-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => setProductSource('custom')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    productSource === 'custom'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Custom Goods
                </button>
                <button
                  type="button"
                  onClick={() => setProductSource('material')}
                  className={`px-2 py-1 rounded font-bold transition-all ${
                    productSource === 'material'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  From Warehouse Inventory
                </button>
              </div>
            </div>

            {productSource === 'material' && materials.length > 0 && (
              <div>
                <label className="block text-slate-700 font-bold mb-1">Pick Finished SKU from Inventory</label>
                <select
                  value={selectedMaterialId}
                  onChange={(e) => handleSelectMaterialSource(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-300 rounded-lg text-slate-900 font-bold"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.currentStock.toLocaleString()} {m.unit} in stock - Lot: {m.lotNumber || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-bold mb-1">Product Description *</label>
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                  placeholder="e.g. 4mm Emerald Green Braided Polyester Drawstring"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Batch / Lot Number</label>
                <input
                  type="text"
                  value={lotBatchNumber}
                  onChange={(e) => setLotBatchNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
                  placeholder="e.g. LOT-2026-891"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Unit *</label>
                <select
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
                >
                  {getStoredUnits().map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Selling Rate (₹ per {unit}) *</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">GST Tax Rate (%)</label>
                <select
                  value={taxPercent}
                  onChange={(e) => setTaxPercent(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold font-mono"
                >
                  <option value={0}>0% (Tax Exempt)</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST (Textiles/Cordage)</option>
                  <option value={18}>18% GST (Standard)</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Pricing Summary & Live Financial Calculation */}
          <div className="bg-indigo-950 text-white p-4 rounded-xl shadow-inner border border-indigo-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                <Receipt className="h-4 w-4 text-emerald-400" />
                <span>Live Consignment Invoice Calculation</span>
              </span>
              <span className="text-[10px] font-mono text-indigo-200">
                Rate: ₹{unitPrice} / {unit}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-indigo-800/80">
              <div>
                <span className="text-slate-400 block text-[10px]">Subtotal (Base)</span>
                <span className="font-mono font-bold text-sm text-white">
                  ₹{subtotal.toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-400 block font-mono">
                  {quantity.toLocaleString()} {unit} &times; ₹{unitPrice}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">GST Tax ({taxPercent}%)</span>
                <span className="font-mono font-bold text-sm text-indigo-300">
                  +₹{taxAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Total Bill Amount</span>
                <span className="font-mono font-black text-base text-emerald-400">
                  ₹{totalInvoiceAmount.toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Advance Payment (₹)</span>
                <input
                  type="number"
                  min="0"
                  max={totalInvoiceAmount}
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Math.min(totalInvoiceAmount, Math.max(0, Number(e.target.value))))}
                  className="w-full px-2 py-1 bg-slate-900 border border-indigo-700 rounded text-emerald-400 font-mono font-bold text-xs mt-0.5"
                  placeholder="0"
                />
              </div>
            </div>

            {advancePaid > 0 && (
              <div className="flex items-center justify-between pt-2 border-t border-indigo-900 text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-slate-300 font-medium">Advance Mode:</span>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-0.5 text-xs font-bold"
                  >
                    <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                    <option value="upi">UPI / QR Payment</option>
                    <option value="cheque">Cheque</option>
                    <option value="cash">Cash Receipt</option>
                  </select>
                </div>
                <div className="font-mono text-rose-300 font-bold">
                  Remaining Balance Due: ₹{balanceDue.toLocaleString('en-IN')}
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Initial Status & Logistics Note */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Initial Dispatch Status</label>
              <select
                value={initialStatus}
                onChange={(e) => setInitialStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              >
                <option value="ready_to_dispatch">Ready to Dispatch (Holding Area on Floor)</option>
                <option value="dispatched">Dispatched (Vehicle Loaded / Handed to Courier)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Packaging / Box Details</label>
              <input
                type="text"
                placeholder="e.g. 5 Corrugated Cartons, 120 kg total weight"
                value={packagingDetails}
                onChange={(e) => setPackagingDetails(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            <div className="text-[11px] text-slate-500 flex items-center space-x-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>Automatically synchronizes sales invoice and payment record in Finance tab</span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md shadow-indigo-500/20"
              >
                Create Consignment &amp; Invoices
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 2: DISPATCH SHIPMENT MODAL
// ==========================================
interface DispatchShipmentModalProps {
  order: DispatchOrder;
  onClose: () => void;
  onSubmit: (dispatchData: {
    dispatchedDate: string;
    transporterName: string;
    vehicleOrTrackingNumber: string;
    deliveryAddress?: string;
    packagingDetails?: string;
    notes?: string;
  }) => void;
}

const DispatchShipmentModal: React.FC<DispatchShipmentModalProps> = ({
  order,
  onClose,
  onSubmit
}) => {
  const [transportersList, setTransportersList] = useState<string[]>(() => getStoredTransporters());
  const [isAddingNewTransporter, setIsAddingNewTransporter] = useState(false);
  const [newTransporterInput, setNewTransporterInput] = useState('');

  const [dispatchedDate, setDispatchedDate] = useState(new Date().toISOString().split('T')[0]);
  const [transporterName, setTransporterName] = useState(order.transporterName || transportersList[0] || 'VRL Logistics');
  const [vehicleOrTrackingNumber, setVehicleOrTrackingNumber] = useState(order.vehicleOrTrackingNumber || '');
  const [deliveryAddress, setDeliveryAddress] = useState(order.deliveryAddress || '');
  const [packagingDetails, setPackagingDetails] = useState(order.packagingDetails || '4 Cartons, Shrink Wrapped');
  const [notes, setNotes] = useState(order.notes || '');

  const handleAddNewTransporter = () => {
    if (!newTransporterInput.trim()) return;
    const updated = saveStoredTransporter(newTransporterInput.trim());
    setTransportersList(updated);
    setTransporterName(newTransporterInput.trim());
    setNewTransporterInput('');
    setIsAddingNewTransporter(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transporterName.trim()) {
      alert('Please specify the transporter or courier service.');
      return;
    }

    onSubmit({
      dispatchedDate,
      transporterName: transporterName.trim(),
      vehicleOrTrackingNumber: vehicleOrTrackingNumber.trim(),
      deliveryAddress: deliveryAddress.trim() || undefined,
      packagingDetails: packagingDetails.trim() || undefined,
      notes: notes.trim() || undefined
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="px-6 py-4 bg-amber-600 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-700/80 rounded-xl text-white">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Mark Consignment as Dispatched</h2>
              <p className="text-xs text-amber-100">Log transporter waybill, vehicle number, and dispatch date.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-amber-200 hover:text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Order Summary Info Box */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-mono font-bold text-slate-900">{order.dispatchNumber}</div>
              <div className="text-[11px] text-slate-600 font-semibold">{order.partyName}</div>
              <div className="text-[10px] text-slate-400">{order.productName} ({order.quantity.toLocaleString()} {order.unit})</div>
            </div>
            <div className="text-right">
              <div className="font-mono font-black text-sm text-slate-900">₹{order.totalInvoiceAmount.toLocaleString('en-IN')}</div>
              <div className={`text-[10px] font-bold uppercase ${order.balanceDue <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {order.balanceDue <= 0 ? 'Paid' : `Due: ₹${order.balanceDue.toLocaleString('en-IN')}`}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Dispatch Date *</label>
            <input
              type="date"
              value={dispatchedDate}
              onChange={(e) => setDispatchedDate(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-bold"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-700 font-bold">Transporter / Courier *</label>
              {!isAddingNewTransporter ? (
                <button
                  type="button"
                  onClick={() => setIsAddingNewTransporter(true)}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-bold hover:underline"
                >
                  + New Transporter
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddingNewTransporter(false)}
                  className="text-[11px] text-slate-500"
                >
                  Cancel
                </button>
              )}
            </div>

            {isAddingNewTransporter && (
              <div className="flex items-center space-x-2 mb-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                <input
                  type="text"
                  placeholder="Transporter Name (e.g. Mahavir Courier)"
                  value={newTransporterInput}
                  onChange={(e) => setNewTransporterInput(e.target.value)}
                  className="flex-1 px-3 py-1 bg-white border border-amber-300 rounded text-xs font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddNewTransporter}
                  className="px-3 py-1 bg-amber-600 text-white rounded font-bold text-xs"
                >
                  Save
                </button>
              </div>
            )}

            <select
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
            >
              {transportersList.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Waybill / LR Number / Vehicle No.</label>
            <input
              type="text"
              placeholder="e.g. LR-984021 / GJ-05-BX-8492"
              value={vehicleOrTrackingNumber}
              onChange={(e) => setVehicleOrTrackingNumber(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Packaging &amp; Box Count</label>
            <input
              type="text"
              placeholder="e.g. 4 Corrugated Boxes (80 kg total)"
              value={packagingDetails}
              onChange={(e) => setPackagingDetails(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Delivery Destination</label>
            <input
              type="text"
              placeholder="Delivery destination address"
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-md shadow-amber-600/20"
            >
              Confirm Dispatch
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 3: RECORD CUSTOMER PAYMENT MODAL
// ==========================================
interface RecordPaymentModalProps {
  order: DispatchOrder;
  onClose: () => void;
  onSubmit: (amount: number, paymentMode: string, transactionRef: string, notes?: string) => void;
}

const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  order,
  onClose,
  onSubmit
}) => {
  const [amount, setAmount] = useState<number>(order.balanceDue || 0);
  const [paymentMode, setPaymentMode] = useState<string>('bank_transfer');
  const [transactionRef, setTransactionRef] = useState<string>(`PAY-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`);
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      alert('Payment amount must be greater than 0.');
      return;
    }
    if (amount > (order.balanceDue || order.totalInvoiceAmount)) {
      if (!confirm(`The entered amount (₹${amount}) exceeds the remaining balance due (₹${order.balanceDue}). Proceed?`)) {
        return;
      }
    }

    onSubmit(
      amount,
      paymentMode,
      transactionRef.trim() || `TX-${Date.now()}`,
      notes.trim() || `Payment received for dispatch ${order.dispatchNumber}`
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-800 rounded-xl text-white">
              <IndianRupee className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Record Customer Payment</h2>
              <p className="text-xs text-emerald-100">Directly sync payment receipt to the Finance Ledger and settle buyer receivable.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {/* Summary Box */}
          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800">Buyer Account</span>
              <div className="font-bold text-slate-900 text-sm">{order.partyName}</div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Dispatch: {order.dispatchNumber} &bull; Inv: {order.invoiceNumber || 'N/A'}
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500">Balance Due</span>
              <div className="font-mono font-black text-base text-rose-600">
                ₹{order.balanceDue.toLocaleString('en-IN')}
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                Total: ₹{order.totalInvoiceAmount.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-slate-600 font-bold mb-1.5 text-[11px]">Quick Amount Presets</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAmount(order.balanceDue)}
                className="px-2.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg font-mono font-bold text-[11px] border border-emerald-300 transition-all text-center"
              >
                Full Due (₹{order.balanceDue.toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(order.balanceDue * 0.5))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-bold text-[11px] border border-slate-300 transition-all text-center"
              >
                50% (₹{Math.round(order.balanceDue * 0.5).toLocaleString('en-IN')})
              </button>
              <button
                type="button"
                onClick={() => setAmount(Math.round(order.balanceDue * 0.25))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-mono font-bold text-[11px] border border-slate-300 transition-all text-center"
              >
                25% (₹{Math.round(order.balanceDue * 0.25).toLocaleString('en-IN')})
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Payment Amount Received (₹) *</label>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono font-black text-sm focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold"
              >
                <option value="bank_transfer">Bank Transfer (NEFT/RTGS)</option>
                <option value="upi">UPI / QR Code</option>
                <option value="cheque">Cheque</option>
                <option value="cash">Cash Receipt</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">UTR / Reference / Cheque No.</label>
            <input
              type="text"
              placeholder="e.g. UTR-2026-8940214"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-mono"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">Payment Notes / Remark</label>
            <input
              type="text"
              placeholder="e.g. Received via HDFC Bank NEFT"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900"
            />
          </div>

          {/* Direct Finance Sync Notice */}
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-900 flex items-start space-x-2">
            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed">
              <strong>Finance Tab Synchronization:</strong> This payment will be instantly posted to the Finance Ledger, updating total cash inflow and clearing this party's balance invoice.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20"
            >
              Record Payment &amp; Sync
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

// ==========================================
// SUB-MODAL 4: INVOICE & DELIVERY CHALLAN PREVIEW
// ==========================================
interface InvoiceAndChallanModalProps {
  order: DispatchOrder;
  onClose: () => void;
}

const InvoiceAndChallanModal: React.FC<InvoiceAndChallanModalProps> = ({
  order,
  onClose
}) => {
  const [docType, setDocType] = useState<'invoice' | 'challan'>('invoice');

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Controls Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => setDocType('invoice')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docType === 'invoice'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tax Invoice
              </button>
              <button
                type="button"
                onClick={() => setDocType('challan')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  docType === 'challan'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Delivery Challan &amp; Gate Pass
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs transition-all"
            >
              <Printer className="h-4 w-4" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Document Printable View */}
        <div className="p-8 bg-white text-slate-900 space-y-6 text-xs max-h-[80vh] overflow-y-auto print:max-h-none print:p-0">
          
          {/* Header & Company Details */}
          <div className="flex items-start justify-between border-b border-slate-300 pb-5">
            <div>
              <div className="text-xl font-black text-slate-900 tracking-tight uppercase">
                FACTORY OPS MANUFACTURING
              </div>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Central Industrial Cordage &amp; Textile Plant, GIDC Industrial Estate
              </p>
              <p className="text-slate-500 text-[11px]">
                GSTIN: 24AAACF1234F1Z5 &bull; CIN: U17111GJ2024PTC123456
              </p>
              <p className="text-slate-500 text-[11px]">
                Email: dispatch@factoryops.com &bull; Phone: +91 98250 12345
              </p>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-black uppercase text-slate-800">
                {docType === 'invoice' ? 'TAX INVOICE' : 'DELIVERY CHALLAN & GATE PASS'}
              </div>
              <div className="mt-2 font-mono text-[11px]">
                <div className="font-bold text-slate-900">
                  {docType === 'invoice' ? `INV #: ${order.invoiceNumber || order.dispatchNumber}` : `CHALLAN #: ${order.dispatchNumber}`}
                </div>
                <div className="text-slate-500">Date: {order.dispatchedDate || order.readyDate}</div>
                {order.orderNumber && (
                  <div className="text-slate-600">PO Ref: {order.orderNumber}</div>
                )}
              </div>
            </div>
          </div>

          {/* Buyer and Transport Info Grid */}
          <div className="grid grid-cols-2 gap-6 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Billed / Dispatched To:
              </span>
              <div className="font-black text-sm text-slate-900">{order.partyName}</div>
              <div className="text-slate-600 mt-1">{order.contactPerson || 'Purchasing Department'}</div>
              <div className="text-slate-600">{order.deliveryAddress || 'Industrial Delivery Point'}</div>
              {order.contactPhone && <div className="text-slate-500">Ph: {order.contactPhone}</div>}
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Transport &amp; Shipment Details:
              </span>
              <div className="font-bold text-slate-900">{order.transporterName || 'Factory Dispatch / Transport'}</div>
              <div className="font-mono text-slate-600 mt-0.5">
                LR / Vehicle: {order.vehicleOrTrackingNumber || 'Pending Waybill'}
              </div>
              <div className="text-slate-600 mt-0.5">
                Packaging: {order.packagingDetails || 'Standard Cartons'}
              </div>
              <div className="text-slate-500 mt-0.5">
                Status: <span className="font-bold uppercase text-slate-800">{order.status.replace(/_/g, ' ')}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800 text-[10px] uppercase font-black text-slate-700">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">Batch / Lot</th>
                  <th className="py-2 text-right">Quantity</th>
                  <th className="py-2 text-right">Rate (₹)</th>
                  <th className="py-2 text-right">GST %</th>
                  <th className="py-2 text-right">Total (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="py-3">
                    <div className="font-bold text-slate-900">{order.productName}</div>
                    <div className="text-[10px] text-slate-500">
                      {order.category} {order.size && `&bull; Size: ${order.size}`} {order.colorName && `&bull; Color: ${order.colorName}`}
                    </div>
                  </td>
                  <td className="py-3 font-mono text-[11px] text-slate-600">
                    {order.lotBatchNumber || 'N/A'}
                  </td>
                  <td className="py-3 text-right font-mono font-bold">
                    {order.quantity.toLocaleString()} {order.unit}
                  </td>
                  <td className="py-3 text-right font-mono">
                    ₹{order.unitPrice || 0}
                  </td>
                  <td className="py-3 text-right font-mono">
                    {order.taxPercent || 0}%
                  </td>
                  <td className="py-3 text-right font-mono font-black text-slate-900">
                    ₹{order.totalInvoiceAmount.toLocaleString('en-IN')}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Calculations Summary */}
          <div className="flex justify-end pt-2">
            <div className="w-64 space-y-1.5 text-right font-mono">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span>₹{order.subtotal?.toLocaleString('en-IN') || order.totalInvoiceAmount.toLocaleString('en-IN')}</span>
              </div>
              {order.taxAmount > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>GST ({order.taxPercent}%):</span>
                  <span>+₹{order.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-sm text-slate-900 border-t border-slate-300 pt-1.5">
                <span>Grand Total:</span>
                <span>₹{order.totalInvoiceAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-bold text-[11px]">
                <span>Amount Paid:</span>
                <span>-₹{order.amountPaid.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-rose-600 font-bold text-xs border-t border-dashed border-slate-300 pt-1">
                <span>Balance Due:</span>
                <span>₹{order.balanceDue.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Payment History Log */}
          {order.paymentHistory && order.paymentHistory.length > 0 && (
            <div className="pt-2 border-t border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                Recorded Payments Log:
              </span>
              <div className="space-y-1">
                {order.paymentHistory.map((p, idx) => (
                  <div key={p.id || idx} className="text-[11px] font-mono text-slate-600 flex items-center justify-between bg-slate-50 px-3 py-1 rounded">
                    <span>{p.date} &bull; {p.paymentMode.toUpperCase()} ({p.transactionRef})</span>
                    <span className="font-bold text-emerald-700">+₹{p.amount.toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signatures & Gate Pass Clearance */}
          <div className="grid grid-cols-3 gap-6 pt-10 border-t border-slate-300 text-center text-[10px]">
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Prepared By (Dispatch Officer)</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Security Gate Clearance</span>
            </div>
            <div>
              <div className="h-10 border-b border-dashed border-slate-400 mb-1" />
              <span className="font-bold text-slate-700">Receiver / Customer Sign</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
