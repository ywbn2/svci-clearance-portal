const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Insert the secret_key cell BEFORE the actions cell in the table row
const OLD_ROW_ACTIONS = `<td className="p-4 text-center space-x-3">
                       <button onClick={() => handleOpenSigModal(sig)} className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Edit</button>
                       <button onClick={() => handleDeleteSignatory(sig.id)} className="text-rose-500 font-bold hover:underline">Remove</button>
                     </td>`;
const NEW_ROW_ACTIONS = `<td className="p-4">
                       <span className="font-mono text-xs bg-amber-50 dark:bg-amber-900/10 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-lg tracking-widest select-all" title="Secret Key">{sig.secret_key || '—'}</span>
                     </td>
                     <td className="p-4 text-center space-x-3">
                       <button onClick={() => handleOpenSigModal(sig)} className="text-[#092B9C] dark:text-blue-400 font-bold hover:underline">Edit</button>
                       <button onClick={() => handleDeleteSignatory(sig.id)} className="text-rose-500 font-bold hover:underline">Remove</button>
                     </td>`;
code = code.replace(OLD_ROW_ACTIONS, NEW_ROW_ACTIONS);

// 2. Add secret key verification to toggleClearance in SignatoryStudentsPage
const OLD_TOGGLE = `  const toggleClearance = async (student) => {
    const office = currentUser?.office;
    const currentOfficeClearance = student.office_clearances?.[office] || 'Pending';
    const newOfficeClearance = currentOfficeClearance === 'Pending' ? 'Cleared' : 'Pending';`;
const NEW_TOGGLE = `  const toggleClearance = async (student) => {
    const office = currentUser?.office;
    // Secret key verification
    const enteredKey = window.prompt(\`🔐 Enter your Secret Key to \${(student.office_clearances?.[office] || 'Pending') === 'Pending' ? 'approve' : 'remove'} clearance for \${student.name}:\`);
    if (enteredKey === null) return; // cancelled
    if (enteredKey.trim() !== (currentUser?.secret_key || '')) return showToast('❌ Incorrect secret key. Action blocked.', 'error');
    const currentOfficeClearance = student.office_clearances?.[office] || 'Pending';
    const newOfficeClearance = currentOfficeClearance === 'Pending' ? 'Cleared' : 'Pending';`;
code = code.replace(OLD_TOGGLE, NEW_TOGGLE);

fs.writeFileSync('src/App.jsx', code);
console.log('Done! Secret key table + prompt wired in.');
