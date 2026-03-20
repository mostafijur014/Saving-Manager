import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface Member {
  id: string;
  name: string;
  memberId: string;
  monthlyContribution: number;
  totalDeposited: number;
  lastPaymentDate: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Transaction {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  month: string;
}

export interface Settings {
  interestRate: number;
  duration: number;
  startDate: string;
}

export const useData = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    interestRate: 5, 
    duration: 12,
    startDate: new Date().toISOString().slice(0, 7) // Default to current month
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let membersLoaded = false;
    let transactionsLoaded = false;
    let settingsLoaded = false;

    const checkLoading = () => {
      if (membersLoaded && transactionsLoaded && settingsLoaded) {
        setLoading(false);
      }
    };

    const handleError = (err: any) => {
      console.error('Firestore Error:', err);
      if (err.code === 'permission-denied') {
        setError('Database connection failed: Missing or insufficient permissions. Please ensure the Cloud Firestore API is enabled and the database is created in your project.');
      } else {
        setError(err.message || 'An unknown error occurred while fetching data.');
      }
      setLoading(false);
    };

    const qMembers = query(collection(db, 'members'), orderBy('name'));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
      membersLoaded = true;
      checkLoading();
    }, handleError);

    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      transactionsLoaded = true;
      checkLoading();
    }, handleError);

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        setSettings(snapshot.docs[0].data() as Settings);
      }
      settingsLoaded = true;
      checkLoading();
    }, handleError);

    return () => {
      unsubMembers();
      unsubTransactions();
      unsubSettings();
    };
  }, []);

  return { members, transactions, settings, loading, error };
};
