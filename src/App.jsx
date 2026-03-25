import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Trophy, Plus, User, AlertCircle, Loader2 } from 'lucide-react';

// --- FIREBASE CONFIGURATION ---
// These globals are provided by the environment
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-leaderboard-app';

export default function App() {
  const [user, setUser] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newEntry, setNewEntry] = useState({ name: '', score: '' });

  // 1. AUTHENTICATION (RULE 3)
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth error:", err);
        setError("Failed to authenticate with database.");
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currUser) => {
      setUser(currUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. DATA FETCHING (RULE 1 & 2)
  useEffect(() => {
    if (!user) return;

    // MANDATORY PATH: /artifacts/{appId}/public/data/{collectionName}
    // This ensures an ODD number of segments (5 segments total)
    const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
    
    // Simple query (RULE 2: No complex ordering in Firestore)
    const q = query(entriesRef);

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Handle sorting in memory to comply with Rule 2
        const sortedData = data.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
        setEntries(sortedData);
        setLoading(false);
      },
      (err) => {
        console.error("Firestore error:", err);
        setError(`Database access error: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user || !newEntry.name || !newEntry.score) return;

    try {
      const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'leaderboard');
      await addDoc(entriesRef, {
        name: String(newEntry.name),
        score: Number(newEntry.score),
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewEntry({ name: '', score: '' });
    } catch (err) {
      setError("Failed to save entry. Please try again.");
    }
  };

  if (loading && !error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <Trophy className="text-amber-500" /> Community Leaderboard
              </h1>
              <p className="text-slate-500 text-sm mt-1">App ID: {appId}</p>
            </div>
            <div className="flex items-center gap-2 text-xs bg-slate-100 px-3 py-1 rounded-full">
              <User size={14} />
              <span className="font-mono">{user?.uid.substring(0, 8)}...</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
            <AlertCircle className="shrink-0 mt-0.5" size={18} />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Your Name"
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={newEntry.name}
            onChange={(e) => setNewEntry({...newEntry, name: e.target.value})}
            required
          />
          <input
            type="number"
            placeholder="Score"
            className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={newEntry.score}
            onChange={(e) => setNewEntry({...newEntry, score: e.target.value})}
            required
          />
          <button 
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus size={18} /> Add Entry
          </button>
        </form>

        {/* List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h2 className="font-semibold text-slate-700">Rankings</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {entries.length === 0 ? (
              <div className="p-8 text-center text-slate-400 italic">
                No entries yet. Be the first!
              </div>
            ) : (
              entries.map((entry, index) => (
                <div key={entry.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full font-bold text-sm ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-900">{String(entry.name)}</span>
                  </div>
                  <span className="text-xl font-bold text-blue-600">
                    {Number(entry.score).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
