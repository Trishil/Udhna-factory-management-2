import React, { useState, useMemo } from 'react';
import { 
  Truck, 
  Search, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Package, 
  ArrowRight, 
  MapPin,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { DispatchOrder, DispatchStatus } from '../../types';

interface MobileDispatchViewProps {
  orders: DispatchOrder[];
  onUpdateStatus: (orderId: string, newStatus: DispatchStatus) => void;
  onOpenCreateDispatch?: () => void;
  onSelectOrder?: (order: DispatchOrder) => void;
}

export const MobileDispatchView: React.FC<MobileDispatchViewProps> = ({
  orders,
  onUpdateStatus,
  onOpenCreateDispatch,
  onSelectOrder
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Status counts
  const readyCount = orders.filter(o => o.status === 'ready_to_dispatch').length;
  const dispatchedCount = orders.filter(o => o.status === 'dispatched').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        order.partyName.toLowerCase().includes(q) ||
        order.dispatchNumber.toLowerCase().includes(q) ||
        (order.orderNumber || '').toLowerCase().includes(q) ||
        (order.productName || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const getStatusBadge = (status: DispatchStatus) => {
    switch (status) {
      case 'ready_to_dispatch':
        return {
          label: 'Ready to Dispatch',
          bg: 'bg-amber-50 text-amber-900 border-amber-200',
          icon: Clock
        };
      case 'dispatched':
        return {
          label: 'In Transit',
          bg: 'bg-blue-50 text-blue-900 border-blue-200',
          icon: Truck
        };
      case 'delivered':
        return {
          label: 'Delivered',
          bg: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          icon: CheckCircle2
        };
      default:
        return {
          label: status,
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: Package
        };
    }
  };

  return (
    <div className="space-y-4 pb-20">
      
      {/* Metric summary */}
      <div className="grid grid-cols-3 gap-2">
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ready_to_dispatch' ? 'all' : 'ready_to_dispatch')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'ready_to_dispatch' ? 'bg-amber-100 border-amber-400' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-amber-800 uppercase block">Ready</span>
          <span className="text-base font-black text-amber-900 font-mono mt-0.5 block">{readyCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'dispatched' ? 'all' : 'dispatched')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'dispatched' ? 'bg-blue-100 border-blue-400' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-blue-800 uppercase block">In Transit</span>
          <span className="text-base font-black text-blue-900 font-mono mt-0.5 block">{dispatchedCount}</span>
        </div>

        <div 
          onClick={() => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered')}
          className={`p-3 rounded-2xl border transition-all cursor-pointer shadow-xs ${
            statusFilter === 'delivered' ? 'bg-emerald-100 border-emerald-400' : 'bg-white border-slate-200'
          }`}
        >
          <span className="text-[10px] font-bold text-emerald-800 uppercase block">Delivered</span>
          <span className="text-base font-black text-emerald-900 font-mono mt-0.5 block">{deliveredCount}</span>
        </div>
      </div>

      {/* Search & Action Bar */}
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search challan, party, PO..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
          </div>

          {onOpenCreateDispatch && (
            <button
              type="button"
              onClick={onOpenCreateDispatch}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-xs shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New</span>
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
          {['all', 'ready_to_dispatch', 'dispatched', 'delivered'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-lg font-bold transition-all shrink-0 capitalize ${
                statusFilter === st 
                  ? 'bg-slate-900 text-white shadow-xs' 
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {st === 'all' ? 'All Orders' : st.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-3">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <Truck className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">No dispatch orders found</p>
            <p className="text-xs text-slate-500">Move items to 'Prepare Dispatch' stage in Workflow to generate challans.</p>
          </div>
        ) : (
          filteredOrders.map(order => {
            const badge = getStatusBadge(order.status);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3"
              >
                {/* Header: Party & Challan */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{order.partyName}</span>
                    <p className="text-xs font-mono text-slate-500 mt-0.5">
                      {order.dispatchNumber} {order.orderNumber ? `• PO: ${order.orderNumber}` : ''}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border flex items-center space-x-1 ${badge.bg}`}>
                    <BadgeIcon className="h-3 w-3" />
                    <span>{badge.label}</span>
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Quantity</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      {order.quantity} {order.unit}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Invoice Amount</span>
                    <span className="font-black text-slate-900 font-mono text-sm">
                      ₹{order.totalInvoiceAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Transporter / Vehicle Row */}
                {(order.transporterName || order.vehicleOrTrackingNumber) && (
                  <div className="flex items-center space-x-1.5 text-xs text-slate-600">
                    <Truck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {order.transporterName} {order.vehicleOrTrackingNumber ? `(${order.vehicleOrTrackingNumber})` : ''}
                    </span>
                  </div>
                )}

                {/* Action Buttons Row */}
                <div className="flex items-center space-x-2 pt-1">
                  {order.status === 'ready_to_dispatch' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'dispatched')}
                      className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>Dispatch Now</span>
                    </button>
                  )}

                  {order.status === 'dispatched' && (
                    <button
                      type="button"
                      onClick={() => onUpdateStatus(order.id, 'delivered')}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center space-x-1.5 transition-all active:scale-95"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Confirm Delivery</span>
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <div className="flex-1 py-1.5 px-3 bg-slate-100 text-slate-600 rounded-xl text-xs font-semibold text-center">
                      Delivered & Settled
                    </div>
                  )}

                  {onSelectOrder && (
                    <button
                      type="button"
                      onClick={() => onSelectOrder(order)}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                    >
                      Details
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
