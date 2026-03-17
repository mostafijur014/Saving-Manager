import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logs: string[] = [];
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

console.log = (...args) => {
  logs.push(`[LOG] ${args.join(' ')}`);
  originalLog(...args);
};
console.error = (...args) => {
  logs.push(`[ERROR] ${args.join(' ')}`);
  originalError(...args);
};
console.warn = (...args) => {
  logs.push(`[WARN] ${args.join(' ')}`);
  originalWarn(...args);
};

async function startServer() {
  console.log('Starting server...');
  const app = express();
  app.use(express.json());

  app.get('/api/admin/debug/logs', (req, res) => {
    res.send(logs.join('\n'));
  });

  const PORT = 3000;

  let db: admin.firestore.Firestore;
  let dbInitError: string | null = null;

  try {
    // Load Firebase Config
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error(`firebase-applet-config.json not found at ${configPath}`);
    }
    const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('Firebase config loaded for project:', firebaseConfig.projectId);

    // Initialize Firebase Admin
    if (!admin.apps.length) {
      // In Cloud Run, initializeApp() without arguments uses application default credentials
      // and automatically picks up the correct project ID.
      admin.initializeApp();
      console.log('Firebase Admin initialized with default credentials');
    }

    const dbId = firebaseConfig.firestoreDatabaseId;
    console.log(`Initializing Firestore. Project: ${firebaseConfig.projectId}, Config Database: ${dbId || '(default)'}`);
    
    const tryInit = async (id?: string) => {
      const dbInstance = id ? getFirestore(id) : getFirestore();
      // Verify connection by attempting to read
      const snap = await dbInstance.collection('members').limit(1).get();
      return { dbInstance, empty: snap.empty };
    };

    try {
      // 1. Try named database if provided
      if (dbId && dbId !== '(default)') {
        console.log(`Attempting named database: ${dbId}`);
        const { dbInstance, empty } = await tryInit(dbId);
        db = dbInstance;
        console.log(`Firestore initialized with named database: ${dbId}. Empty: ${empty}`);
      } else {
        throw new Error('No named database in config');
      }
    } catch (namedErr: any) {
      console.warn(`Named database attempt failed: ${namedErr.message}`);
      try {
        // 2. Try default database
        console.log('Attempting default database...');
        const { dbInstance, empty } = await tryInit();
        db = dbInstance;
        console.log(`Firestore initialized with default database. Empty: ${empty}`);
      } catch (defaultErr: any) {
        console.error('Default database also failed:', defaultErr.message);
        dbInitError = `Firestore connection failed. Named: ${namedErr.message}. Default: ${defaultErr.message}`;
      }
    }
  } catch (error: any) {
    console.error('Failed to load Firebase config or init Admin:', error);
    dbInitError = `Init failed: ${error.message}`;
  }

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      dbInitialized: !!db,
      dbInitError,
      projectId: admin.apps[0]?.options.projectId
    });
  });

  // Middleware to check admin password
  const checkAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    console.log('Auth check:', { 
      received: authHeader, 
      expected: 'Basic admin:savings2026',
      match: authHeader === 'Basic admin:savings2026'
    });
    if (authHeader === 'Basic admin:savings2026') {
      next();
    } else {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };

  app.get('/api/admin/debug/members', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      const snapshot = await db.collection('members').get();
      const docs = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }));
      res.json(docs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      const docRef = await db.collection('members').add({
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/admin/members/:id', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      await db.collection('members').doc(req.params.id).update(req.body);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/members/:id', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      await db.collection('members').doc(req.params.id).delete();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/transactions', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      const docRef = await db.collection('transactions').add({
        ...req.body,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      res.json({ id: docRef.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/admin/deposit', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    const { memberId, amount, date, month, newTotal } = req.body;
    console.log('Processing deposit:', { memberId, amount, date, month, newTotal });
    
    try {
      // Diagnostic: Check if member exists
      const memberRef = db.collection('members').doc(memberId);
      console.log(`Fetching member doc: ${memberId}`);
      const memberDoc = await memberRef.get();
      if (!memberDoc.exists) {
        console.error(`Member with ID ${memberId} not found in database`);
        return res.status(404).json({ error: `Member not found: ${memberId}` });
      }
      console.log(`Member found: ${memberDoc.data()?.name}`);

      // 1. Add Transaction
      console.log('Adding transaction...');
      const transRef = db.collection('transactions').doc();
      await transRef.set({ 
        memberId, 
        amount: Number(amount), 
        date, 
        month,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // 2. Update Member
      console.log('Updating member...');
      await memberRef.set({ 
        totalDeposited: Number(newTotal),
        lastPaymentDate: date
      }, { merge: true });
      
      console.log('Deposit processed successfully');
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error processing deposit:', error);
      const message = error.message || 'Unknown error occurred';
      res.status(500).json({ error: `Server Error: ${message}` });
    }
  });

  app.post('/api/admin/settings', checkAdmin, async (req, res) => {
    if (!db) return res.status(500).json({ error: 'Database not initialized' });
    try {
      const settingsRef = db.collection('settings');
      const snapshot = await settingsRef.limit(1).get();
      if (snapshot.empty) {
        await settingsRef.add(req.body);
      } else {
        await settingsRef.doc(snapshot.docs[0].id).update(req.body);
      }
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    console.log('Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware initialized');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
});
