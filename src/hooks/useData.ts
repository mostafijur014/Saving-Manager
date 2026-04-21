import { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';

export interface Member {
  id: string;
  name: string;
  memberId: string;
  phone?: string;
  monthlyContribution: number;
  totalDeposited: number;
  lastPaymentDate: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
  order: number;
}

export interface Transaction {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  month: string;
}

export interface ContactPerson {
  name: string;
  role: string;
  phone: string;
  email: string;
  imageUrl: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  position: string;
  phone: string;
  order: number;
}

export interface Expense {
  id: string;
  title: string;
  detail?: string;
  amount: number;
  date: string;
  createdAt?: any;
}

export interface Settings {
  interestAmount: number;
  duration: number;
  startDate: string;
  announcement?: string;
  showAnnouncement?: boolean;
  announcementSpeed?: number;
  tagline1?: string;
  tagline2?: string;
  showContactPersons?: boolean;
  contactPerson1?: ContactPerson;
  contactPerson2?: ContactPerson;
  dueStartDate?: number;
  dueWarningDate?: number;
  dueEndDate?: number;
}

export const useData = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>({ 
    interestAmount: 500, 
    duration: 12,
    startDate: new Date().toISOString().slice(0, 7), // Default to current month
    announcementSpeed: 40, // Default speed
    tagline1: 'Dream Development Society',
    tagline2: 'Collective savings, strong future',
    dueStartDate: 15,
    dueWarningDate: 17,
    dueEndDate: 20
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let membersLoaded = false;
    let transactionsLoaded = false;
    let settingsLoaded = false;
    let emergencyContactsLoaded = false;
    let expensesLoaded = false;

    const checkLoading = () => {
      if (membersLoaded && transactionsLoaded && settingsLoaded && emergencyContactsLoaded && expensesLoaded) {
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

    const qMembers = query(collection(db, 'members'), orderBy('order', 'asc'));
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

    const qEmergency = query(collection(db, 'emergencyContacts'), orderBy('order', 'asc'));
    const unsubEmergency = onSnapshot(qEmergency, (snapshot) => {
      setEmergencyContacts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EmergencyContact)));
      emergencyContactsLoaded = true;
      checkLoading();
    }, handleError);

    const qExpenses = query(collection(db, 'expenses'), orderBy('date', 'desc'));
    const unsubExpenses = onSnapshot(qExpenses, (snapshot) => {
      setExpenses(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense)));
      expensesLoaded = true;
      checkLoading();
    }, handleError);

    return () => {
      unsubMembers();
      unsubTransactions();
      unsubSettings();
      unsubEmergency();
      unsubExpenses();
    };
  }, []);

  return { members, transactions, settings, emergencyContacts, expenses, loading, error };
};
