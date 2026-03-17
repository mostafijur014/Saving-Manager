import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { calculateInterest, formatCurrency } from '../utils/calculations';
import { Users, TrendingUp, PiggyBank, Wallet, Search, Filter, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

export const PublicView = () => {
  const { members, settings, loading, error } = useData();
  const [searchTerm, setSearchTerm] = useState('');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
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

  const totalDeposited = members.reduce((sum, m) => sum + m.totalDeposited, 0);
  
  // Calculate total interest by summing individual member interests
  const memberCalculations = members.map(m => calculateInterest(
    m.totalDeposited,
    settings.interestRate,
    settings.duration
  ));
  
  const totalInterest = memberCalculations.reduce((sum, c) => sum + c.interestEarned, 0);
  const totalFinal = totalDeposited + totalInterest;

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.memberId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: 'Total Members', value: members.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Deposited', value: formatCurrency(totalDeposited), icon: PiggyBank, color: 'bg-green-500' },
    { label: 'Interest Earned', value: formatCurrency(totalInterest), icon: TrendingUp, color: 'bg-amber-500' },
    { label: 'Final Balance', value: formatCurrency(totalFinal), icon: Wallet, color: 'bg-indigo-600' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-10 text-center sm:text-left">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Savings Group Overview</h1>
        <p className="mt-2 text-lg text-gray-600">Transparent tracking of our collective growth and individual contributions.</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white overflow-hidden shadow rounded-2xl border border-gray-100 p-6 flex items-center space-x-4"
          >
            <div className={`${stat.color} p-3 rounded-xl`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 truncate">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
            placeholder="Search members by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <Filter className="w-4 h-4 mr-1" />
          Showing {filteredMembers.length} of {members.length} members
        </div>
      </div>

      {/* Members Table */}
      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Member</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Deposited</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Interest</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Final Balance</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMembers.map((member) => {
                const { finalBalance, interestEarned } = calculateInterest(
                  member.totalDeposited,
                  settings.interestRate,
                  settings.duration
                );
                return (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.memberId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {formatCurrency(member.monthlyContribution)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(member.totalDeposited)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 font-medium">
                      +{formatCurrency(interestEarned)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-bold">
                      {formatCurrency(finalBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {member.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filteredMembers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No members found matching your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
