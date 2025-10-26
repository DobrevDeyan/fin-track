import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Middleware to verify Firebase Auth token
const authenticateUser = async (req: any, res: any, next: any) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// User profile endpoints
app.get('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    res.json({
      id: userId,
      email: req.user.email,
      ...userData
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

app.put('/api/user/profile', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { firstName, lastName, timezone, currency, language } = req.body;

    await admin.firestore().collection('users').doc(userId).update({
      firstName,
      lastName,
      timezone,
      currency,
      language,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Transactions endpoints
app.get('/api/transactions', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { limit = 50, startAfter } = req.query;

    let query = admin.firestore()
      .collection('transactions')
      .where('userId', '==', userId)
      .orderBy('date', 'desc')
      .limit(Number(limit));

    if (startAfter) {
      const startAfterDoc = await admin.firestore()
        .collection('transactions')
        .doc(startAfter as string)
        .get();
      query = query.startAfter(startAfterDoc);
    }

    const snapshot = await query.get();
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.post('/api/transactions', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const transactionData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('transactions')
      .add(transactionData);

    res.json({ id: docRef.id, ...transactionData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create transaction' });
  }
});

// Categories endpoints
app.get('/api/categories', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await admin.firestore()
      .collection('categories')
      .where('userId', '==', userId)
      .orderBy('name')
      .get();

    const categories = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const categoryData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('categories')
      .add(categoryData);

    res.json({ id: docRef.id, ...categoryData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Budgets endpoints
app.get('/api/budgets', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await admin.firestore()
      .collection('budgets')
      .where('userId', '==', userId)
      .orderBy('startDate', 'desc')
      .get();

    const budgets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(budgets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

app.post('/api/budgets', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const budgetData = {
      ...req.body,
      userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    const docRef = await admin.firestore()
      .collection('budgets')
      .add(budgetData);

    res.json({ id: docRef.id, ...budgetData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// Analytics endpoints
app.get('/api/analytics/summary', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.uid;
    const { startDate, endDate } = req.query;

    let query = admin.firestore()
      .collection('transactions')
      .where('userId', '==', userId);

    if (startDate) {
      query = query.where('date', '>=', new Date(startDate as string));
    }
    if (endDate) {
      query = query.where('date', '<=', new Date(endDate as string));
    }

    const snapshot = await query.get();
    const transactions = snapshot.docs.map(doc => doc.data());

    const totalIncome = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const netIncome = totalIncome - totalExpenses;

    res.json({
      totalIncome,
      totalExpenses,
      netIncome,
      transactionCount: transactions.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Export the Express app as a Cloud Function
export const api = functions.https.onRequest(app);
