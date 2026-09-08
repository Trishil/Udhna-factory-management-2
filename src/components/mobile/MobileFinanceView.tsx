import React, { useState } from 'react';
import { 
  Wallet, 
  IndianRupee, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Zap, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search,
  CreditCard
} from 'lucide-react';
import { 
  EmployeeRecord, 
  ElectricityUsageRecord, 
  OperationalExpense, 
  PartyInvoice, 
  SupplierPayable 
} from '../../types';

interface MobileFinanceViewProps {
  employees: EmployeeRecord[];
  electricityRecords: ElectricityUsageRecord[];
  expenses: OperationalExpense[];
  partyInvoices: PartyInvoice[];
  supplierPayables: SupplierPayable[];
  onAddExpense: (expense: any) => void;
  onPaySalary: (employeeId: string) => void;
  onPayElectricityBill: (recordId: string) => void;
}

export const MobileFinanceView: React.FC<MobileFinanceViewProps> = ({
  employees,
  electricityRecords,
  expenses,
  partyInvoices,
  supplierPayables,
  onAddExpense,
  onPaySalary,
  onPayElectricityBill
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'invoices' | 'expenses' | 'payroll' | 'electricity'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');

  // Computations
  const totalInvoiced = partyInvoices.reduce((acc, inv) => acc + (inv.totalAmount || 0), 0);
  const totalPaid = partyInvoices.reduce((acc, inv) => acc + (inv.amountReceived || 0), 0);
  const totalBalanceDue = partyInvoices.reduce((acc, inv) => acc + (inv.balanceDue || 0), 0);
  const totalExpenses = expenses.reduce((acc, exp) => acc + (exp.amount || 0), 0);
  const totalPayroll = employees.reduce((acc, emp) => acc + (emp.baseSalary || 0), 0);

  return (
    <div className="space-y-4 pb-20">
      
      {/* Financial Overview Cards */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center space-x-1.5 text-emerald-800 text-[10px] font-bold uppercase">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Total Invoiced</span>
          </div>
          <span className="text-base font-black text-emerald-950 font-mono mt-1 block">
            ₹{totalInvoiced.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
            Collected: ₹{totalPaid.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center space-x-1.5 text-rose-800 text-[10px] font-bold uppercase">
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Total Expenses</span>
          </div>
          <span className="text-base font-black text-rose-950 font-mono mt-1 block">
            ₹{totalExpenses.toLocaleString('en-IN')}
          </span>
          <span className="text-[10px] text-rose-700 font-semibold block mt-0.5">
            Due: ₹{totalBalanceDue.toLocaleString('en-IN')}
          </span>
        </div>
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex bg-slate-200/80 p-1 rounded-xl shadow-inner text-xs font-bold gap-1 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('invoices')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeSubTab === 'invoices' ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-600'
          }`}
        >
          Invoices ({partyInvoices.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('expenses')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeSubTab === 'expenses' ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-600'
          }`}
        >
          Expenses ({expenses.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('payroll')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeSubTab === 'payroll' ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-600'
          }`}
        >
          Payroll ({employees.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('electricity')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all whitespace-nowrap ${
            activeSubTab === 'electricity' ? 'bg-white text-slate-950 shadow-xs font-black' : 'text-slate-600'
          }`}
        >
          Power ({electricityRecords.length})
        </button>
      </div>

      {/* INVOICES LIST */}
      {activeSubTab === 'invoices' && (
        <div className="space-y-3">
          {partyInvoices.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <FileText className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No party invoices yet</p>
              <p className="text-xs text-slate-500">Invoices generated upon dispatch will appear here.</p>
            </div>
          ) : (
            partyInvoices.map(inv => (
              <div key={inv.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{inv.partyName}</span>
                    <span className="text-xs font-mono text-slate-500 block mt-0.5">
                      Inv #{inv.invoiceNumber} • {inv.issueDate}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    inv.balanceDue <= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}>
                    {inv.balanceDue <= 0 ? 'Paid' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Total</span>
                    <span className="font-black text-slate-900 font-mono text-sm">₹{inv.totalAmount}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Paid</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">₹{inv.amountReceived}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Balance</span>
                    <span className="font-bold text-rose-700 font-mono text-sm">₹{inv.balanceDue}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EXPENSES LIST */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-3">
          {expenses.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <Wallet className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No expenses recorded</p>
              <p className="text-xs text-slate-500">Operational costs, repairs, and fuel will appear here.</p>
            </div>
          ) : (
            expenses.map(exp => (
              <div key={exp.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs flex items-center justify-between">
                <div>
                  <span className="font-black text-slate-900 text-xs block">{exp.title}</span>
                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {exp.category} • {exp.date}
                  </span>
                </div>
                <span className="font-black font-mono text-sm text-rose-700">
                  -₹{exp.amount.toLocaleString('en-IN')}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* PAYROLL LIST */}
      {activeSubTab === 'payroll' && (
        <div className="space-y-3">
          {employees.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <Users className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No employee records</p>
              <p className="text-xs text-slate-500">Staff salary records and wages will appear here.</p>
            </div>
          ) : (
            employees.map(emp => (
              <div key={emp.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{emp.name}</span>
                    <span className="text-xs text-slate-500 font-medium">{emp.role} • {emp.department}</span>
                  </div>
                  <span className="font-black font-mono text-sm text-slate-900">
                    ₹{emp.baseSalary.toLocaleString('en-IN')}/mo
                  </span>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => onPaySalary(emp.id)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    Pay Salary
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ELECTRICITY / POWER */}
      {activeSubTab === 'electricity' && (
        <div className="space-y-3">
          {electricityRecords.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <Zap className="h-10 w-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700 text-sm">No electricity bills recorded</p>
              <p className="text-xs text-slate-500">Monthly factory meter records will appear here.</p>
            </div>
          ) : (
            electricityRecords.map(elec => (
              <div key={elec.id} className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-black text-slate-900 text-sm block">{elec.month}</span>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      {elec.totalKwhConsumed} kWh @ ₹{elec.tariffPerKwh}/unit
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                    elec.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}>
                    {elec.paymentStatus === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="font-black font-mono text-sm text-slate-900">
                    Total: ₹{elec.totalBillAmount.toLocaleString('en-IN')}
                  </span>
                  {elec.paymentStatus !== 'paid' && (
                    <button
                      type="button"
                      onClick={() => onPayElectricityBill(elec.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs"
                    >
                      Pay Bill
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
};
