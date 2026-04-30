'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Send, Trash2, Plus } from 'lucide-react';

// --- Type Definitions ---
interface ReadonlyAccount {
  id: string;
  type: string;
  amount: number;
}

interface MutableAccount {
  id: string;
  type: string;
  amount: string; 
}

interface SectionCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

// --- Constants ---
const PREDEFINED_ACCOUNT_TYPES = [
  'Share Account',
  'Special Deposit',
  'Retirement Fund',
  'Welfare Fund',
];

const INITIAL_READONLY_ACCOUNTS: ReadonlyAccount[] = [
  { id: 'ro1', type: 'Share Account', amount: 500 },
  { id: 'ro2', type: 'Special Deposit', amount: 1000 },
];

const INITIAL_MUTABLE_ACCOUNTS: MutableAccount[] = [
  { id: 'm1', type: 'Share Account', amount: '500' },
  { id: 'm2', type: 'Special Deposit', amount: '1000' },
];

// --- Utility: Format Currency ---
const formatCurrency = (amount: number): string => {
  return `LKR ${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
};

export default function RemittanceChangePage() {
  const [mounted, setMounted] = useState(false);
  const [mutableAccounts, setMutableAccounts] = useState<MutableAccount[]>(INITIAL_MUTABLE_ACCOUNTS);

  // Fix Hydration Mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // -- Calculations --
  const totalCurrentRemittance = INITIAL_READONLY_ACCOUNTS.reduce((sum, acc) => sum + acc.amount, 0);
  const totalNewRemittance = mutableAccounts.reduce((sum, acc) => sum + (parseFloat(acc.amount) || 0), 0);

  // -- Handlers --
  const addAccount = () => {
    setMutableAccounts([...mutableAccounts, { id: Date.now().toString(), type: 'Share Account', amount: '0' }]);
  };

  const removeAccount = (id: string) => {
    setMutableAccounts(mutableAccounts.filter(acc => acc.id !== id));
  };

  const handleUpdate = (id: string, field: keyof MutableAccount, value: string) => {
    setMutableAccounts(mutableAccounts.map(acc => acc.id === id ? { ...acc, [field]: value } : acc));
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] p-8 text-slate-800 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-[#8A4C27]">New Remittance Change Request</h1>
              <span className="bg-[#EAEBED] px-2 py-0.5 rounded text-[12px] text-slate-600 font-mono">
                Johnathan Doe (MB-2023001)
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-6 py-2 border border-slate-300 rounded-lg bg-white font-semibold">Cancel</button>
            <button className="px-6 py-2 bg-[#8A4C27] text-white rounded-lg flex items-center gap-2 font-semibold">
              <Send size={18} /> Submit Request
            </button>
          </div>
        </header>

        {/* Section 1: Current Remittance */}
        <SectionCard title="Current Monthly Remittance" subtitle="Current salary deductions on record">
          <div className="space-y-3">
            {INITIAL_READONLY_ACCOUNTS.map(account => (
              <div key={account.id} className="grid grid-cols-2 bg-[#E9E9E9] p-5 rounded-lg border border-slate-200">
                <ReadonlyField label="Account Type" value={account.type} />
                <ReadonlyField label="Amount (LKR)" value={account.amount.toLocaleString()} />
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 pt-4 border-t font-bold">
            <span>Total Monthly Deduction:</span>
            <span>{formatCurrency(totalCurrentRemittance)}</span>
          </div>
        </SectionCard>

        {/* Section 2: New Remittance */}
        <SectionCard 
          title="New Monthly Remittance" 
          subtitle="Configure updated salary deductions"
          action={
            <button onClick={addAccount} className="px-4 py-2 bg-[#8A4C27] text-white rounded-lg flex items-center gap-2 text-sm font-semibold">
              <Plus size={16} /> Add Account
            </button>
          }
        >
          <div className="space-y-4">
            {mutableAccounts.map(account => (
              <div key={account.id} className="flex items-center gap-4 p-4 border rounded-xl bg-white shadow-sm">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Account Type *</label>
                    <select 
                      className="border p-2 rounded-md bg-white text-sm"
                      value={account.type}
                      onChange={(e) => handleUpdate(account.id, 'type', e.target.value)}
                    >
                      {PREDEFINED_ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Amount (LKR) *</label>
                    <input 
                      type="text" 
                      className="border p-2 rounded-md text-sm"
                      value={account.amount}
                      onChange={(e) => handleUpdate(account.id, 'amount', e.target.value)}
                    />
                  </div>
                </div>
                <button onClick={() => removeAccount(account.id)} className="p-2 text-red-500 bg-red-50 rounded-md mt-4 border border-red-100">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-6 pt-4 border-t font-bold">
            <span>New Total Monthly Deduction:</span>
            <span>{formatCurrency(totalNewRemittance)}</span>
          </div>
        </SectionCard>

        {/* Section 3: Notes */}
        <SectionCard title="Important Notes" subtitle="">
          <ul className="list-disc ml-5 space-y-2 text-sm text-slate-600">
            <li>Changes to remittance amounts will take effect from the following month</li>
            <li>Ensure sufficient salary balance for deductions</li>
            <li>Contact HR department for any payroll-related queries</li>
          </ul>
        </SectionCard>

        {/* Section 4: Documents */}
        <SectionCard title="Required Documents" subtitle="Supporting documents for remittance changes">
          <ul className="list-disc ml-5 space-y-2 text-sm text-slate-600 mb-6">
            <li>Completed Remittance Change Form</li>
            <li>Current Payslip (for verification)</li>
          </ul>
          <div className="border-2 border-dashed border-slate-200 rounded-xl py-10 bg-slate-50 text-center text-slate-400 italic text-sm">
            Document upload functionality (Mock)
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

// --- Helper Components ---
const SectionCard = ({ title, subtitle, children, action }: SectionCardProps) => (
  <section className="bg-white p-8 rounded-xl border shadow-sm">
    <div className="flex justify-between items-start mb-6">
      <div>
        <h2 className="text-lg font-bold text-[#8A4C27]">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const ReadonlyField = ({ label, value }: { label: string; value: string }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase">{label}</label>
    <span className="text-sm font-medium">{value}</span>
  </div>
);