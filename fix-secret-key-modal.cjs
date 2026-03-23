const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add `signatories` to SignatoryStudentsPage context destructure
code = code.replace(
  `const { students, setStudents, currentUser, showToast, showConfirm, logAction, courses, yearLevels } = useContext(AppContext);`,
  `const { students, setStudents, currentUser, signatories, showToast, showConfirm, logAction, courses, yearLevels } = useContext(AppContext);`
);

// 2. Remove the window.prompt from toggleClearance and replace with a ref-based trigger
code = code.replace(
  `  const toggleClearance = async (student) => {
    const office = currentUser?.office;
    // Secret key verification
    const enteredKey = window.prompt(\`🔐 Enter your Secret Key to \${(student.office_clearances?.[office] || 'Pending') === 'Pending' ? 'approve' : 'remove'} clearance for \${student.name}:\`);
    if (enteredKey === null) return; // cancelled
    if (enteredKey.trim() !== (currentUser?.secret_key || '')) return showToast('❌ Incorrect secret key. Action blocked.', 'error');
    const currentOfficeClearance = student.office_clearances?.[office] || 'Pending';
    const newOfficeClearance = currentOfficeClearance === 'Pending' ? 'Cleared' : 'Pending';`,
  `  const [keyModalState, setKeyModalState] = useState(null); // { student, resolve }
  const [keyInput, setKeyInput] = useState('');

  const requestSecretKey = (student) => {
    return new Promise((resolve) => {
      setKeyInput('');
      setKeyModalState({ student, resolve });
    });
  };

  const handleKeySubmit = () => {
    const sigRecord = signatories.find(s => s.id === currentUser?.id || s.email === currentUser?.email);
    const storedKey = (sigRecord?.secret_key || '').trim();
    if (!keyInput.trim() || keyInput.trim() !== storedKey) {
      showToast('❌ Incorrect secret key. Action blocked.', 'error');
      setKeyModalState(null);
      keyModalState?.resolve(false);
      return;
    }
    setKeyModalState(null);
    keyModalState?.resolve(true);
  };

  const toggleClearance = async (student) => {
    const confirmed = await requestSecretKey(student);
    if (!confirmed) return;
    const office = currentUser?.office;
    const currentOfficeClearance = student.office_clearances?.[office] || 'Pending';
    const newOfficeClearance = currentOfficeClearance === 'Pending' ? 'Cleared' : 'Pending';`
);

// 3. Add the key modal UI just before the closing </div> of SignatoryStudentsPage return
// Find the closing tags of the SignatoryStudentsPage return
code = code.replace(
  `       </Card>


    </div>
  );
};

const RequirementsPage`,
  `       </Card>

    {/* Secret Key Verification Modal */}
    {keyModalState && (
      <ModalPortal>
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.50)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} className="flex items-center justify-center p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.20)] border border-amber-200/50 dark:border-amber-800/50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <KeyIcon className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-white">Secret Key Required</h2>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 ml-13">
              Enter your assigned secret key to {(keyModalState.student?.office_clearances?.[currentUser?.office] || 'Pending') === 'Pending' ? 'approve' : 'remove'} clearance for <span className="font-bold text-slate-700 dark:text-white">{keyModalState.student?.name}</span>.
            </p>
            <input
              type="password"
              placeholder="Enter your secret key..."
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleKeySubmit()}
              autoFocus
              className="w-full p-3 mb-4 border border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono tracking-widest"
            />
            <div className="flex gap-3">
              <button onClick={() => { setKeyModalState(null); keyModalState?.resolve(false); }} className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 transition">Cancel</button>
              <button onClick={handleKeySubmit} className="flex-1 py-2.5 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 transition shadow-md">Confirm</button>
            </div>
          </div>
        </div>
      </ModalPortal>
    )}

    </div>
  );
};

const RequirementsPage`
);

fs.writeFileSync('src/App.jsx', code);
console.log('✅ Secret key modal + fix applied!');
