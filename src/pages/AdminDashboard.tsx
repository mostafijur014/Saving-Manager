import React, { useState, useEffect } from 'react';
import { useData, Member } from '../hooks/useData';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { calculateInterest, formatCurrency } from '../utils/calculations';
import { 
  Plus, Edit2, Trash2, Settings as SettingsIcon, 
  CheckCircle, XCircle, AlertCircle, Download, Save, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard = () => {
  const { members, transactions, settings, loading, error } = useData();
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data))
      .catch(err => console.error('Health check failed:', err));
  }, []);

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  
  // Member Form State
  const [memberForm, setMemberForm] = useState({
    name: '',
    memberId: '',
    monthlyContribution: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    interestRate: 5,
    duration: 12
  });

  // Sync settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        interestRate: settings.interestRate,
        duration: settings.duration
      });
    }
  }, [settings]);

  // Auto-clear status message
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full"></div></div>;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-900 mb-2">Database Connection Error</h2>
          <p className="text-red-700 max-w-2xl mx-auto">{error}</p>
          <div className="mt-6 flex flex-col items-center gap-2 text-sm text-red-600">
            <p>1. Ensure the <strong>Cloud Firestore API</strong> is enabled in Google Cloud Console.</p>
            <p>2. Ensure you have <strong>created a Firestore database</strong> in the Firebase Console.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      name: memberForm.name,
      memberId: memberForm.memberId,
      monthlyContribution: Number(memberForm.monthlyContribution),
      status: memberForm.status,
      totalDeposited: editingMember ? editingMember.totalDeposited : 0,
      lastPaymentDate: editingMember ? editingMember.lastPaymentDate : '',
      createdAt: editingMember ? editingMember.createdAt : new Date().toISOString()
    };

    try {
      const url = editingMember ? `/api/admin/members/${editingMember.id}` : '/api/admin/members';
      const method = editingMember ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic admin:savings2026'
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) throw new Error('Failed to save member');

      setStatusMessage({ type: 'success', text: `Member ${editingMember ? 'updated' : 'added'} successfully` });
      setIsMemberModalOpen(false);
      setEditingMember(null);
      setMemberForm({ name: '', memberId: '', monthlyContribution: '', status: 'Active' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error saving member' });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const response = await fetch(`/api/admin/members/${memberToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Basic admin:savings2026'
        }
      });
      if (!response.ok) throw new Error('Failed to delete member');
      setStatusMessage({ type: 'success', text: 'Member deleted successfully' });
      setIsConfirmDeleteOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error deleting member' });
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const amount = Number(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setStatusMessage({ type: 'error', text: 'Please enter a valid amount' });
      return;
    }

    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    try {
      const currentTotal = Number(member.totalDeposited) || 0;
      const response = await fetch('/api/admin/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic admin:savings2026'
        },
        body: JSON.stringify({
          memberId: selectedMemberId,
          amount,
          date: now.toISOString(),
          month,
          newTotal: currentTotal + amount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process deposit');
      }

      setStatusMessage({ type: 'success', text: 'Deposit confirmed successfully' });
      setIsDepositModalOpen(false);
      setDepositAmount('');
      setSelectedMemberId('');
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Error processing deposit' });
    }
  };

  const handleUpdateSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic admin:savings2026'
        },
        body: JSON.stringify({
          interestRate: Number(settingsForm.interestRate),
          duration: Number(settingsForm.duration),
          updatedAt: new Date().toISOString()
        })
      });

      if (!response.ok) throw new Error('Failed to update settings');
      setStatusMessage({ type: 'success', text: 'Settings updated successfully' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error updating settings' });
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'ID', 'Monthly Contribution', 'Total Deposited', 'Status'];
    const rows = members.map(m => [m.name, m.memberId, m.monthlyContribution, m.totalDeposited, m.status]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "members_data.csv";
    link.click();
  };

  // Chart Data: Last 6 months collection
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }).reverse();

  const chartData = last6Months.map(month => ({
    month,
    amount: transactions.filter(t => t.month === month).reduce((sum, t) => sum + t.amount, 0)
  }));

  const totalDeposited = members.reduce((sum, m) => sum + m.totalDeposited, 0);
  
  // Calculate total interest by summing individual member interests
  const memberCalculations = members.map(m => calculateInterest(
    m.totalDeposited,
    settings.interestRate,
    settings.duration
  ));
  
  const totalInterest = memberCalculations.reduce((sum, c) => sum + c.interestEarned, 0);
  const totalFinal = totalDeposited + totalInterest;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {healthStatus && !healthStatus.dbInitialized && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700">
          <div className="flex items-center font-bold mb-1">
            <AlertCircle className="w-5 h-5 mr-2" />
            Server Database Error
          </div>
          <p className="text-sm">The server failed to initialize the database: {healthStatus.dbInitError || 'Unknown error'}</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage members, deposits, and system settings.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => { setEditingMember(null); setMemberForm({ name: '', memberId: '', monthlyContribution: '', status: 'Active' }); setIsMemberModalOpen(true); }}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Member
          </button>
          <button 
            onClick={() => setIsDepositModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-sm"
          >
            <span className="w-4 h-4 mr-2 flex items-center justify-center font-bold">৳</span> New Deposit
          </button>
          <button 
            onClick={exportToCSV}
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
          >
            <Download className="w-4 h-4 mr-2" /> Export
          </button>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex items-center mb-4">
          <SettingsIcon className="w-5 h-5 text-gray-400 mr-2" />
          <h2 className="text-lg font-semibold text-gray-900">Global Interest Settings</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Interest Rate (%)</label>
            <input 
              type="number" 
              value={settingsForm.interestRate} 
              onChange={(e) => setSettingsForm({...settingsForm, interestRate: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Duration (Months)</label>
            <input 
              type="number" 
              value={settingsForm.duration} 
              onChange={(e) => setSettingsForm({...settingsForm, duration: Number(e.target.value)})}
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <button 
            onClick={handleUpdateSettings}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-600 font-semibold rounded-xl hover:bg-indigo-100 transition-all"
          >
            <Save className="w-4 h-4 mr-2" /> Save Settings
          </button>
        </div>
      </div>

      {/* Stats and Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6">Monthly Collection Growth</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af'}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb'}}
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === chartData.length - 1 ? '#4f46e5' : '#c7d2fe'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="bg-indigo-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-200">
            <p className="text-indigo-100 text-sm font-medium">Total Final Balance</p>
            <h4 className="text-3xl font-bold mt-1">{formatCurrency(totalFinal)}</h4>
            <div className="mt-4 pt-4 border-t border-indigo-500 flex justify-between items-center text-sm">
              <span>Interest Earned</span>
              <span className="font-bold">+{formatCurrency(totalInterest)}</span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-500 text-sm font-medium">Active Members</p>
            <h4 className="text-3xl font-bold mt-1 text-gray-900">{members.filter(m => m.status === 'Active').length} / {members.length}</h4>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Member Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mr-3">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-xs text-gray-500">{member.memberId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(member.monthlyContribution)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {formatCurrency(member.totalDeposited)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {member.lastPaymentDate ? new Date(member.lastPaymentDate).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { setEditingMember(member); setMemberForm({ name: member.name, memberId: member.memberId, monthlyContribution: String(member.monthlyContribution), status: member.status }); setIsMemberModalOpen(true); }}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => { setMemberToDelete(member.id); setIsConfirmDeleteOpen(true); }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Member Modal */}
      <AnimatePresence>
        {isMemberModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">{editingMember ? 'Edit Member' : 'Add New Member'}</h3>
                <button onClick={() => setIsMemberModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleSaveMember} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input 
                    required 
                    type="text" 
                    value={memberForm.name} 
                    onChange={(e) => setMemberForm({...memberForm, name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unique ID</label>
                  <input 
                    required 
                    type="text" 
                    value={memberForm.memberId} 
                    onChange={(e) => setMemberForm({...memberForm, memberId: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Contribution</label>
                  <input 
                    required 
                    type="number" 
                    value={memberForm.monthlyContribution} 
                    onChange={(e) => setMemberForm({...memberForm, monthlyContribution: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={memberForm.status} 
                    onChange={(e) => setMemberForm({...memberForm, status: e.target.value as 'Active' | 'Inactive'})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsMemberModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-semibold">Save Member</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Deposit Modal */}
      <AnimatePresence>
        {isDepositModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Log New Deposit</h3>
                <button onClick={() => setIsDepositModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6" /></button>
              </div>
              <form onSubmit={handleDeposit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Member</label>
                  <select 
                    required 
                    value={selectedMemberId} 
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Choose a member...</option>
                    {members.filter(m => m.status === 'Active').map(m => (
                      <option key={m.id} value={m.id}>{m.name} ({m.memberId})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="h-4 w-4 text-gray-400 font-bold flex items-center justify-center">৳</span>
                    </div>
                    <input 
                      required 
                      type="number" 
                      value={depositAmount} 
                      onChange={(e) => setDepositAmount(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" 
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="button" onClick={() => setIsDepositModalOpen(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50">Cancel</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 font-semibold">Confirm Deposit</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {isConfirmDeleteOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden p-6"
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Confirm Delete</h3>
                <p className="text-gray-500 mb-6">Are you sure you want to delete this member? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setIsConfirmDeleteOpen(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleDeleteMember}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Status Messages */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-lg z-50 flex items-center space-x-2 ${
              statusMessage.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {statusMessage.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{statusMessage.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
