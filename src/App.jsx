import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  Trophy, 
  Users, 
  Info, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  LayoutList,
  Flame
} from 'lucide-react';

// Configuration for Firebase
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : {
      apiKey: "", 
      authDomain: "",
      projectId: "",
      storageBucket: "",
      messagingSenderId: "",
      appId: ""
    };

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// App ID setup - ensuring we don't have invalid segments
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'masters-og-2025';
// Ensure appId doesn't contain slashes that break segment counts
const appId = rawAppId.replace(/\//g, '_');

const SALARY_CAP = 55000;
const ROSTER_SIZE = 6;
const MISS_CUT_PENALTY = 80; 

const PLAYERS = [
    { id: 1, name: "S. Scheffler", price: 13500 }, { id: 2, name: "R. McIlroy", price: 12600 },
    { id: 3, name: "L. Aberg", price: 12100 }, { id: 4, name: "J. Rahm", price: 11800 },
    { id: 5, name: "X. Schauffele", price: 11500 }, { id: 6, name: "B. Dechambeau", price: 11400 },
    { id: 7, name: "T. Fleetwood", price: 11100 }, { id: 8, name: "C. Young", price: 10800 },
    { id: 9, name: "C. Morikawa", price: 10600 }, { id: 10, name: "J. Rose", price: 10500 },
    { id: 11, name: "P. Reed", price: 10400 }, { id: 12, name: "V. Hovland", price: 10200 },
    { id: 13, name: "H. Matsuyama", price: 10100 }, { id: 14, name: "A. Bhatia", price: 10000 },
    { id: 15, name: "J. Thomas", price: 9900 }, { id: 16, name: "M. Fitzpatrick", price: 9800 },
    { id: 17, name: "R. Henley", price: 9600 }, { id: 18, name: "B. Koepka", price: 9500 },
    { id: 19, name: "J. Spieth", price: 9400 }, { id: 20, name: "R. MacIntyre", price: 9300 },
    { id: 21, name: "T. Hatton", price: 9200 }, { id: 22, name: "M. Woo Lee", price: 9100 },
    { id: 23, name: "J. Niemann", price: 9000 }, { id: 24, name: "S. Straka", price: 8900 },
    { id: 25, name: "P. Cantlay", price: 8800 }, { id: 26, name: "S. Kim", price: 8700 },
    { id: 27, name: "S. Lowry", price: 8700 }, { id: 28, name: "C. Gotterup", price: 8600 },
    { id: 29, name: "C. Conners", price: 8600 }, { id: 30, name: "J. Day", price: 8500 },
    { id: 31, name: "B. Griffin", price: 8500 }, { id: 32, name: "B. Harman", price: 8500 },
    { id: 33, name: "D. Berger", price: 8400 }, { id: 34, name: "J. Bridgeman", price: 8400 },
    { id: 35, name: "M. Homa", price: 8300 }, { id: 36, name: "W. Zalatoris", price: 8200 },
    { id: 37, name: "S. Theegala", price: 8100 }, { id: 38, name: "H. English", price: 8100 },
    { id: 39, name: "C. Smith", price: 8000 }, { id: 40, name: "S. Im", price: 8000 },
    { id: 41, name: "A. Scott", price: 7900 }, { id: 42, name: "S. Burns", price: 7800 },
    { id: 43, name: "D. Johnson", price: 7800 }, { id: 44, name: "K. Bradley", price: 7700 },
    { id: 45, name: "T. Kim", price: 7600 }, { id: 46, name: "D. Thompson", price: 7500 },
    { id: 47, name: "T. Finau", price: 7400 }, { id: 48, name: "C. Jarvis", price: 7400 },
    { id: 49, name: "A. Rai", price: 7400 }, { id: 50, name: "M. McNealy", price: 7300 },
    { id: 51, name: "M. Penge", price: 7300 }, { id: 52, name: "S. Garcia", price: 7200 },
    { id: 53, name: "M. McCarty", price: 7200 }, { id: 54, name: "A. Noren", price: 7200 },
    { id: 55, name: "B. Horschel", price: 7100 }, { id: 56, name: "R. Fox", price: 7100 },
    { id: 57, name: "R. Hojgaard", price: 7100 }, { id: 58, name: "P. Mickelson", price: 7000 },
    { id: 59, name: "W. Clark", price: 7000 }, { id: 60, name: "B. Langer", price: 7000 }
];

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('leaderboard');
  const [selectedIds, setSelectedIds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [liveScores, setLiveScores] = useState({});
  const [userName, setUserName] = useState('');
  const [tiebreaker, setTiebreaker] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Initialize Auth
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Authentication Error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Listen to Firestore Data
  useEffect(() => {
    if (!user) return;
    
    // RULE 1: Standardized odd-segment path: /artifacts/{appId}/public/data/{collection}
    // Segment 1: artifacts
    // Segment 2: appId
    // Segment 3: public
    // Segment 4: data
    // Segment 5: entries (COLLECTION)
    const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'entries');
    
    const unsubEntries = onSnapshot(entriesRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setEntries(data);
    }, (err) => console.error("Snapshot Error (Entries):", err));

    // For specific document: 6 segments (EVEN)
    const scoresRef = doc(db, 'artifacts', appId, 'public', 'data', 'tournament', 'scores');
    const unsubScores = onSnapshot(scoresRef, (snapshot) => {
      if (snapshot.exists()) {
        setLiveScores(snapshot.data().scores || {});
      }
    }, (err) => console.error("Snapshot Error (Scores):", err));

    return () => {
      unsubEntries();
      unsubScores();
    };
  }, [user]);

  // Derived State
  const currentTotalSalary = useMemo(() => 
    selectedIds.reduce((sum, id) => sum + (PLAYERS.find(p => p.id === id)?.price || 0), 0)
  , [selectedIds]);
  
  const leaderboardData = useMemo(() => {
    return entries.map(entry => {
      let teamScore = 0;
      const roster = entry.roster || [];
      const detailedRoster = roster.map(p => {
        const liveVal = liveScores[p.name];
        // Ensure we handle numeric vs display strings to avoid [object Object] errors
        let scoreValue = 0;
        let displayScore = 'E';

        if (liveVal === 99) {
          scoreValue = MISS_CUT_PENALTY / 10;
          displayScore = 'MC';
        } else {
          scoreValue = Number(liveVal) || 0;
          displayScore = scoreValue > 0 ? `+${scoreValue}` : scoreValue === 0 ? 'E' : String(scoreValue);
        }
        
        teamScore += scoreValue;
        return { ...p, displayScore };
      });
      return { ...entry, teamScore, detailedRoster };
    }).sort((a, b) => a.teamScore - b.teamScore);
  }, [entries, liveScores]);

  const isBudgetOver = currentTotalSalary > SALARY_CAP;
  const isRosterFull = selectedIds.length === ROSTER_SIZE;
  const canSubmit = isRosterFull && !isBudgetOver && userName.trim() && tiebreaker.trim();

  const togglePlayer = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(pId => pId !== id));
    } else if (selectedIds.length < ROSTER_SIZE) {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting || !user) return;
    setSubmitting(true);
    try {
      // Use the standardized path for addition
      const entriesRef = collection(db, 'artifacts', appId, 'public', 'data', 'entries');
      await addDoc(entriesRef, {
        userName, 
        tiebreaker, 
        roster: selectedIds.map(id => PLAYERS.find(p => p.id === id)),
        totalSpent: currentTotalSalary, 
        timestamp: Date.now(), 
        userId: user.uid
      });
      setSubmitted(true);
      setSelectedIds([]); 
      setUserName(''); 
      setTiebreaker(''); 
      setActiveTab('leaderboard');
    } catch (err) { 
      console.error("Submission Error:", err);
    } finally { 
      setSubmitting(false); 
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#FDFBF7] text-gray-900 overflow-hidden font-sans">
      <header className="bg-[#006B38] text-white px-6 py-4 flex justify-between items-center shadow-lg border-b-4 border-[#F2A900] z-50">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-[#F2A900]" />
          <h1 className="text-xl font-bold tracking-tight uppercase italic">Masters OG</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-32">
        {activeTab === 'leaderboard' && (
          <div className="p-4 space-y-4">
             <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 px-2">
                <Flame size={14} className="text-orange-500" /> Live Standings
             </h2>
             {leaderboardData.length === 0 ? (
                <div className="text-center py-20 text-gray-400 italic">No entries yet. Be the first!</div>
             ) : (
               <div className="space-y-3">
                 {leaderboardData.map((entry, idx) => (
                   <div key={entry.id || idx} className="bg-white rounded-2xl border shadow-sm overflow-hidden border-gray-100">
                      <div className="p-4 flex justify-between items-center bg-gray-50/50">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#006B38] text-white flex items-center justify-center font-black text-xs">{idx + 1}</div>
                            <div>
                               <div className="font-bold text-sm text-gray-900">{entry.userName}</div>
                               <div className="text-[10px] text-gray-400 uppercase font-bold">TB: {entry.tiebreaker}</div>
                            </div>
                         </div>
                         <div className={`text-xl font-black ${entry.teamScore <= 0 ? 'text-[#006B38]' : 'text-red-500'}`}>
                            {entry.teamScore > 0 ? `+${entry.teamScore}` : entry.teamScore === 0 ? 'E' : entry.teamScore}
                         </div>
                      </div>
                      <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[10px] border-t border-gray-50">
                         {entry.detailedRoster.map((p, i) => (
                           <div key={i} className="flex justify-between items-center">
                              <span className="text-gray-500">{p.name}</span>
                              <span className={`font-bold ${p.displayScore === 'MC' ? 'text-red-400' : 'text-gray-900'}`}>{p.displayScore}</span>
                           </div>
                         ))}
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        )}

        {activeTab === 'draft' && (
          <>
            <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b px-6 py-3 shadow-sm">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase">Cap Progress</span>
                <span className={`text-lg font-black ${isBudgetOver ? 'text-red-600' : 'text-[#006B38]'}`}>
                  ${currentTotalSalary.toLocaleString()} <span className="text-xs text-gray-400 font-normal">/ ${SALARY_CAP.toLocaleString()}</span>
                </span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border">
                <div className={`h-full transition-all duration-500 ${isBudgetOver ? 'bg-red-500' : 'bg-[#006B38]'}`} style={{ width: `${Math.min(100, (currentTotalSalary / SALARY_CAP) * 100)}%` }} />
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-bold text-gray-500">
                 <span>{selectedIds.length} / {ROSTER_SIZE} Players</span>
                 <span className={isBudgetOver ? 'text-red-500' : ''}>${(SALARY_CAP - currentTotalSalary).toLocaleString()} Left</span>
              </div>
            </div>

            <div className="p-4 space-y-2">
              {PLAYERS.map(player => {
                const isSelected = selectedIds.includes(player.id);
                const canAdd = selectedIds.length < ROSTER_SIZE;
                return (
                  <button 
                    key={player.id} 
                    disabled={!isSelected && !canAdd} 
                    onClick={() => togglePlayer(player.id)}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all w-full ${isSelected ? 'bg-[#006B38] border-[#006B38] text-white' : 'bg-white border-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-white/20' : 'bg-gray-100'}`}>
                        {isSelected ? <CheckCircle2 size={18} /> : player.name[0]}
                      </div>
                      <div className="text-left font-bold text-sm">{player.name}</div>
                    </div>
                    <div className="font-black text-xs bg-black/5 px-2 py-1 rounded">${player.price.toLocaleString()}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {activeTab === 'rules' && (
          <div className="p-6 space-y-6">
             <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                <h2 className="text-2xl font-black text-[#006B38]">Official Rules</h2>
                <ul className="space-y-4 text-sm text-gray-600">
                  <li className="flex gap-3"><LayoutList size={18} className="text-[#006B38]" /> 6 players, $55,000 Salary Cap.</li>
                  <li className="flex gap-3"><AlertCircle size={18} className="text-red-500" /> Missed Cut = +8 penalty per round.</li>
                  <li className="flex gap-3"><RefreshCw size={18} className="text-blue-500" /> Tiebreaker is final winner's score.</li>
                </ul>
             </div>
          </div>
        )}
      </main>

      {activeTab === 'draft' && selectedIds.length > 0 && !submitted && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
           <div className="bg-white rounded-3xl shadow-2xl border-2 border-[#006B38] p-5 space-y-4">
              {isBudgetOver ? (
                <div className="text-red-600 font-bold text-center text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                   <AlertCircle size={14} /> Budget Exceeded
                </div>
              ) : isRosterFull ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      placeholder="Your Name" 
                      value={userName} 
                      onChange={(e) => setUserName(e.target.value)} 
                      className="bg-gray-100 rounded-xl p-3 text-sm outline-none w-full border border-transparent focus:border-[#006B38]" 
                    />
                    <input 
                      placeholder="TB (e.g. -12)" 
                      value={tiebreaker} 
                      onChange={(e) => setTiebreaker(e.target.value)} 
                      className="bg-gray-100 rounded-xl p-3 text-sm outline-none w-full border border-transparent focus:border-[#006B38]" 
                    />
                  </div>
                  <button 
                    onClick={handleSubmit} 
                    disabled={!canSubmit || submitting} 
                    className={`w-full py-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-transform ${canSubmit ? 'bg-[#006B38]' : 'bg-gray-300'}`}
                  >
                    {submitting ? 'SENDING TO COMMITTEE...' : 'LOCK IN LINEUP'}
                  </button>
                </div>
              ) : <div className="text-center text-xs text-gray-400 uppercase font-bold italic">Select {ROSTER_SIZE - selectedIds.length} more golfers to lock in</div>}
           </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around items-center px-4 pb-8 pt-2 z-50">
        <button onClick={() => setActiveTab('leaderboard')} className={`flex flex-col items-center w-full transition-colors ${activeTab === 'leaderboard' ? 'text-[#006B38]' : 'text-gray-400'}`}>
          <LayoutList size={20} /><span className="text-[10px] font-bold mt-1">SCORES</span>
        </button>
        <button onClick={() => setActiveTab('draft')} className={`flex flex-col items-center w-full transition-colors ${activeTab === 'draft' ? 'text-[#006B38]' : 'text-gray-400'}`}>
          <Users size={20} /><span className="text-[10px] font-bold mt-1">DRAFT</span>
        </button>
        <button onClick={() => setActiveTab('rules')} className={`flex flex-col items-center w-full transition-colors ${activeTab === 'rules' ? 'text-[#006B38]' : 'text-gray-400'}`}>
          <Info size={20} /><span className="text-[10px] font-bold mt-1">INFO</span>
        </button>
      </nav>

      {submitted && (
        <div className="fixed inset-0 z-[100] bg-[#006B38] text-white flex flex-col items-center justify-center p-10 text-center">
           <CheckCircle2 size={80} className="mb-6 text-[#F2A900]" />
           <h2 className="text-3xl font-black mb-2 italic">LINEUP SECURED</h2>
           <p className="text-sm opacity-80 mb-8 font-medium">Your team has been submitted to the tournament field.</p>
           <button 
            onClick={() => setSubmitted(false)} 
            className="bg-white text-[#006B38] px-12 py-4 rounded-full font-black uppercase text-sm shadow-xl hover:bg-[#F2A900] transition-colors"
           >
             Back to Standings
           </button>
        </div>
      )}
    </div>
  );
}
