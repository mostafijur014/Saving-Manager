import React, { useState, useEffect } from 'react';
import { useData, Member } from '../hooks/useData';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { calculateInterest, formatCurrency } from '../utils/calculations';
import { 
  Plus, Edit2, Trash2, Settings as SettingsIcon, 
  CheckCircle, XCircle, AlertCircle, Download, Save, X,
  Calendar, Clock, Phone, ChevronDown, ChevronUp,
  AlertTriangle, PiggyBank, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const AdminDashboard = () => {
  const { members, transactions, settings, loading, error } = useData();

  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMonth, setDepositMonth] = useState(new Date().toISOString().slice(0, 7));
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Member Form State
  const [memberForm, setMemberForm] = useState({
    name: '',
    memberId: '',
    phone: '',
    monthlyContribution: '',
    status: 'Active' as 'Active' | 'Inactive'
  });

  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    interestRate: 5,
    duration: 12,
    startDate: new Date().toISOString().slice(0, 7),
    announcement: '',
    showAnnouncement: false,
    announcementSpeed: 40,
    tagline1: '',
    tagline2: '',
    showContactPersons: true,
    contactPerson1: { name: '', role: '', phone: '', email: '', imageUrl: '' },
    contactPerson2: { name: '', role: '', phone: '', email: '', imageUrl: '' }
  });

  const [expandedSections, setExpandedSections] = useState({
    interest: true,
    announcement: false,
    branding: false,
    contact: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Sync settings form when data loads
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        interestRate: settings.interestRate,
        duration: settings.duration,
        startDate: settings.startDate || new Date().toISOString().slice(0, 7),
        announcement: settings.announcement || '',
        showAnnouncement: settings.showAnnouncement || false,
        announcementSpeed: settings.announcementSpeed || 40,
        tagline1: settings.tagline1 || '',
        tagline2: settings.tagline2 || '',
        showContactPersons: settings.showContactPersons !== undefined ? settings.showContactPersons : true,
        contactPerson1: settings.contactPerson1 || { name: '', role: '', phone: '', email: '', imageUrl: '' },
        contactPerson2: settings.contactPerson2 || { name: '', role: '', phone: '', email: '', imageUrl: '' }
      });
    }
  }, [settings]);

  const getMonthsSinceStart = () => {
    if (!settings.startDate) return 0;
    const start = new Date(settings.startDate + '-01');
    const now = new Date();
    return (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1;
  };

  const expectedMonths = getMonthsSinceStart();

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
      phone: memberForm.phone,
      monthlyContribution: Number(memberForm.monthlyContribution),
      status: memberForm.status,
      totalDeposited: editingMember ? editingMember.totalDeposited : 0,
      lastPaymentDate: editingMember ? editingMember.lastPaymentDate : '',
      createdAt: editingMember ? editingMember.createdAt : new Date().toISOString()
    };

    try {
      if (editingMember) {
        await updateDoc(doc(db, 'members', editingMember.id), data);
      } else {
        await addDoc(collection(db, 'members'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }

      setStatusMessage({ type: 'success', text: `Member ${editingMember ? 'updated' : 'added'} successfully` });
      setIsMemberModalOpen(false);
      setEditingMember(null);
      setMemberForm({ name: '', memberId: '', phone: '', monthlyContribution: '', status: 'Active' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error saving member: ' + (err instanceof Error ? err.message : 'Unknown error') });
    }
  };

  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'members', memberToDelete));
      setStatusMessage({ type: 'success', text: 'Member deleted successfully' });
      setIsConfirmDeleteOpen(false);
      setMemberToDelete(null);
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error deleting member: ' + (err instanceof Error ? err.message : 'Unknown error') });
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
    const month = depositMonth;

    try {
      const currentTotal = Number(member.totalDeposited) || 0;
      const newTotal = currentTotal + amount;

      // 1. Add Transaction
      await addDoc(collection(db, 'transactions'), {
        memberId: selectedMemberId,
        amount,
        date: now.toISOString(),
        month,
        createdAt: serverTimestamp()
      });

      // 2. Update Member
      await updateDoc(doc(db, 'members', selectedMemberId), {
        totalDeposited: newTotal,
        lastPaymentDate: now.toISOString()
      });

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
      const settingsColl = collection(db, 'settings');
      const data = {
        interestRate: Number(settingsForm.interestRate),
        duration: Number(settingsForm.duration),
        announcement: settingsForm.announcement,
        showAnnouncement: settingsForm.showAnnouncement,
        announcementSpeed: Number(settingsForm.announcementSpeed),
        tagline1: settingsForm.tagline1,
        tagline2: settingsForm.tagline2,
        showContactPersons: settingsForm.showContactPersons,
        contactPerson1: settingsForm.contactPerson1,
        contactPerson2: settingsForm.contactPerson2,
        updatedAt: new Date().toISOString()
      };

      if (settings && (settings as any).id) {
        await updateDoc(doc(db, 'settings', (settings as any).id), {
          ...data,
          startDate: settingsForm.startDate
        });
      } else {
        // Find existing settings doc if any
        const { getDocs, query, limit } = await import('firebase/firestore');
        const q = query(settingsColl, limit(1));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
          await addDoc(settingsColl, {
            ...data,
            startDate: settingsForm.startDate
          });
        } else {
          await updateDoc(doc(db, 'settings', snapshot.docs[0].id), {
            ...data,
            startDate: settingsForm.startDate
          });
        }
      }
      
      setStatusMessage({ type: 'success', text: 'Settings updated successfully' });
    } catch (err) {
      console.error(err);
      setStatusMessage({ type: 'error', text: 'Error updating settings: ' + (err instanceof Error ? err.message : 'Unknown error') });
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
    amount: transactions
      .filter(t => t.month === month && members.some(m => m.id === t.memberId))
      .reduce((sum, t) => sum + t.amount, 0)
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
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500">Manage members, deposits, and system settings.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100">
              <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-400 leading-none">Group Started</p>
                <p className="text-sm font-bold text-indigo-700">{new Date(settings.startDate + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm">
              <Clock className="w-4 h-4 text-indigo-600 mr-2" />
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400 leading-none">Current Time</p>
                <p className="text-sm font-bold text-gray-700">
                  {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} • {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => { setEditingMember(null); setMemberForm({ name: '', memberId: '', phone: '', monthlyContribution: '', status: 'Active' }); setIsMemberModalOpen(true); }}
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
      </div>

      {/* Settings Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-8 overflow-hidden">
        {/* Global Interest Settings Header */}
        <div 
          className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => toggleSection('interest')}
        >
          <div className="flex items-center">
            <SettingsIcon className="w-5 h-5 text-indigo-500 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Global Interest Settings</h2>
          </div>
          {expandedSections.interest ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>

        <AnimatePresence>
          {expandedSections.interest && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="px-6 pb-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
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
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Start Month</label>
                  <input 
                    type="month" 
                    value={settingsForm.startDate} 
                    onChange={(e) => setSettingsForm({...settingsForm, startDate: e.target.value})}
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
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Announcement Bar Section */}
        <div className="border-t border-gray-100">
          <div 
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('announcement')}
          >
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
              <h3 className="text-md font-semibold text-gray-900">Announcement Bar</h3>
            </div>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settingsForm.showAnnouncement}
                  onChange={(e) => setSettingsForm({...settingsForm, showAnnouncement: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              {expandedSections.announcement ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>

          <AnimatePresence>
            {expandedSections.announcement && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6"
              >
                <div className="flex gap-4">
                  <div className="flex-grow">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Announcement Text</label>
                    <textarea 
                      value={settingsForm.announcement} 
                      onChange={(e) => setSettingsForm({...settingsForm, announcement: e.target.value})}
                      placeholder="Enter announcement text here..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 min-h-[80px]"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Speed (Sec)</label>
                    <input 
                      type="number" 
                      min="5"
                      max="200"
                      value={settingsForm.announcementSpeed} 
                      onChange={(e) => setSettingsForm({...settingsForm, announcementSpeed: Number(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Higher = Slower</p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Branding & Taglines Section */}
        <div className="border-t border-gray-100">
          <div 
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('branding')}
          >
            <div className="flex items-center">
              <PiggyBank className="w-5 h-5 text-indigo-500 mr-2" />
              <h3 className="text-md font-semibold text-gray-900">Branding & Taglines</h3>
            </div>
            {expandedSections.branding ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>

          <AnimatePresence>
            {expandedSections.branding && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Primary Tagline (Main Title)</label>
                    <input 
                      type="text" 
                      value={settingsForm.tagline1} 
                      onChange={(e) => setSettingsForm({...settingsForm, tagline1: e.target.value})}
                      placeholder="e.g., Together Dreams"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase mb-1">Secondary Tagline (Subtitle)</label>
                    <input 
                      type="text" 
                      value={settingsForm.tagline2} 
                      onChange={(e) => setSettingsForm({...settingsForm, tagline2: e.target.value})}
                      placeholder="e.g., Collective savings, strong future"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contact Persons Section */}
        <div className="border-t border-gray-100">
          <div 
            className="p-6 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('contact')}
          >
            <div className="flex items-center">
              <Users className="w-5 h-5 text-indigo-500 mr-2" />
              <h3 className="text-md font-semibold text-gray-900">Contact Persons (Public Page Bottom)</h3>
            </div>
            <div className="flex items-center gap-4">
              <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <input 
                  type="checkbox" 
                  className="sr-only peer"
                  checked={settingsForm.showContactPersons}
                  onChange={(e) => setSettingsForm({...settingsForm, showContactPersons: e.target.checked})}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
              {expandedSections.contact ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </div>
          </div>

          <AnimatePresence>
            {expandedSections.contact && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="px-6 pb-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Contact Person 1 */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Left Card (Person 1)</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name</label>
                        <input 
                          type="text" 
                          value={settingsForm.contactPerson1.name} 
                          onChange={(e) => setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, name: e.target.value}})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Role</label>
                        <input 
                          type="text" 
                          value={settingsForm.contactPerson1.role} 
                          onChange={(e) => setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, role: e.target.value}})}
                          placeholder="e.g., Manager"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</label>
                          <input 
                            type="text" 
                            value={settingsForm.contactPerson1.phone} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, phone: e.target.value}})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                          <input 
                            type="email" 
                            value={settingsForm.contactPerson1.email} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, email: e.target.value}})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Image URL or Upload</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={settingsForm.contactPerson1.imageUrl} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, imageUrl: e.target.value}})}
                            placeholder="https://..."
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center">
                            Upload
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSettingsForm({...settingsForm, contactPerson1: {...settingsForm.contactPerson1, imageUrl: reader.result as string}});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {settingsForm.contactPerson1.imageUrl && (
                          <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border border-gray-200">
                            <img src={settingsForm.contactPerson1.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Contact Person 2 */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Right Card (Person 2)</h4>
                    <div className="grid grid-cols-1 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Name</label>
                        <input 
                          type="text" 
                          value={settingsForm.contactPerson2.name} 
                          onChange={(e) => setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, name: e.target.value}})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Role</label>
                        <input 
                          type="text" 
                          value={settingsForm.contactPerson2.role} 
                          onChange={(e) => setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, role: e.target.value}})}
                          placeholder="e.g., Assistant Manager"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Phone</label>
                          <input 
                            type="text" 
                            value={settingsForm.contactPerson2.phone} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, phone: e.target.value}})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Email</label>
                          <input 
                            type="email" 
                            value={settingsForm.contactPerson2.email} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, email: e.target.value}})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Image URL or Upload</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={settingsForm.contactPerson2.imageUrl} 
                            onChange={(e) => setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, imageUrl: e.target.value}})}
                            placeholder="https://..."
                            className="flex-grow px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                          <label className="cursor-pointer bg-white border border-gray-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center">
                            Upload
                            <input 
                              type="file" 
                              className="hidden" 
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSettingsForm({...settingsForm, contactPerson2: {...settingsForm.contactPerson2, imageUrl: reader.result as string}});
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                        {settingsForm.contactPerson2.imageUrl && (
                          <div className="mt-2 w-12 h-12 rounded-full overflow-hidden border border-gray-200">
                            <img src={settingsForm.contactPerson2.imageUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div className="px-6 pb-6 pt-2 flex justify-end">
            <button 
              onClick={handleUpdateSettings}
              className="inline-flex items-center justify-center px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
            >
              <Save className="w-5 h-5 mr-2" /> Save All Settings
            </button>
          </div>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monthly</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Months Paid</th>
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
                  <td className="px-6 py-4 whitespace-nowrap">
                    {member.phone ? (
                      <a 
                        href={`tel:${member.phone}`}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                      >
                        <Phone className="w-3 h-3 mr-1" /> {member.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-gray-400 italic">No phone</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(member.monthlyContribution)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                    {formatCurrency(member.totalDeposited)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {transactions.filter(t => t.memberId === member.id).map(t => (
                        <span key={t.id} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded border border-indigo-100">
                          {t.month.split('-')[1]}/{t.month.split('-')[0].slice(2)}
                        </span>
                      ))}
                      {transactions.filter(t => t.memberId === member.id).length === 0 && (
                        <span className="text-xs text-gray-400 italic">No payments</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {(() => {
                      const paidCount = transactions.filter(t => t.memberId === member.id).length;
                      const isBehind = paidCount < expectedMonths;
                      return (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          !isBehind ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {isBehind ? `${expectedMonths - paidCount} Months Due` : 'Up to Date'}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={() => { 
                        setEditingMember(member); 
                        setMemberForm({ 
                          name: member.name, 
                          memberId: member.memberId, 
                          phone: member.phone || '',
                          monthlyContribution: String(member.monthlyContribution), 
                          status: member.status 
                        }); 
                        setIsMemberModalOpen(true); 
                      }}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input 
                    type="tel" 
                    value={memberForm.phone} 
                    onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                    placeholder="e.g., +8801700000000"
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Select Month</label>
                  <input 
                    required 
                    type="month" 
                    value={depositMonth} 
                    onChange={(e) => setDepositMonth(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-indigo-500 focus:border-indigo-500" 
                  />
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
