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
}

export const useData = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings>({ interestRate: 5, duration: 12 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let membersLoaded = false;
    let transactionsLoaded = false;
    let settingsLoaded = false;

    const checkLoading = () => {
      if (membersLoaded && transactionsLoaded && settingsLoaded) {
        setLoading(false);
      }
    };

    const qMembers = query(collection(db, 'members'), orderBy('name'));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Member)));
      membersLoaded = true;
      checkLoading();
    }, (err) => {
      console.error(err);
      membersLoaded = true;
      checkLoading();
    });

    const qTransactions = query(collection(db, 'transactions'), orderBy('date', 'desc'));
    const unsubTransactions = onSnapshot(qTransactions, (snapshot) => {
      setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
      transactionsLoaded = true;
      checkLoading();
    }, (err) => {
      console.error(err);
      transactionsLoaded = true;
      checkLoading();
    });

    const unsubSettings = onSnapshot(collection(db, 'settings'), (snapshot) => {
      if (!snapshot.empty) {
        setSettings(snapshot.docs[0].data() as Settings);
      }
      settingsLoaded = true;
      checkLoading();
    }, (err) => {
      console.error(err);
      settingsLoaded = true;
      checkLoading();
    });

    return () => {
      unsubMembers();
      unsubTransactions();
      unsubSettings();
    };
  }, []);

  return { members, transactions, settings, loading };
};
