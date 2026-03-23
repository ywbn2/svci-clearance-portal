const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// --- SIGNATORY TABLE: Action button labels ---
code = code.split('>Approve Clearance<').join('>Approve Clearance<');  // already correct – keep
code = code.split('>Revoke Request<').join('>Remove Approval<');

// --- BULK ACTION PANEL: button labels ---
code = code.split('> Sign All<').join('> Approve All Selected<');
code = code.split('> Revoke All<').join('> Remove All Approvals<');

// --- BULK CONFIRM messages ---
code = code.split("'approve' : 'revoke'").join("'approve' : 'remove approval for'");

// --- SIGNATORY TABLE: status display for per-office badge ---
// The per-office status uses office_clearances[office] === 'Cleared'
// Rows show the per-office badge in the existing table status column
// (not yet shown per-office in table, only in student view — leave table status column as-is)

// --- Toast messages cleanup ---
code = code.split('`Student ${student.name} marked as ${newStatus}!`').join('`${student.name} status updated to ${newStatus === "Cleared" ? "Signed" : "Not Signed"}!`');

// --- STUDENT DASHBOARD: "✓ Signed" / "⏳ Pending" labels ---
code = code.split("'✓ Signed'").join("'✓ Signed'");   // already good
code = code.split("'⏳ Pending'").join("'⏳ Pending'"); // already good

// Fix button aria / status badge in signatory table (s.status col)
code = code.split("'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{s.status}</span>")
  .join("'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>{s.status === 'Cleared' ? 'Signed' : 'Not Signed'}</span>");

// --- STUDENT DASHBOARD: helper text + progress ---
code = code.split("Track your clearance progress across all offices")
  .join("View your clearance status for each office below. Complete all requirements to receive full clearance.");

code = code.split("'🎉 Fully Cleared!' : `${signedCount} of ${offices.length} offices cleared`")
  .join("`${signedCount === offices.length && offices.length > 0 ? '✅ Clearance Completed' : `Clearance Progress: ${offices.length > 0 ? Math.round((signedCount / offices.length) * 100) : 0}% Complete`}`");

// Fix the allCleared sub-text
code = code.split("'All offices have approved your clearance.' : 'Pending offices still need to sign off on your clearance.'")
  .join("'All offices have approved your clearance — you are fully cleared!' : 'Some offices are still pending. Complete all requirements to proceed.'");

// --- EMPTY STATE: No requirements ---
code = code.split(">No requirements posted yet.<")
  .join(">No requirements have been posted for this office.<");

// --- EMPTY STATE: Signatory students table ---
code = code.split(">No students found.<")
  .join(">No matching students found.<");

// --- STUDENT DASHBOARD: no offices ---
code = code.split(">No offices have been configured yet.<")
  .join(">No offices have been set up. Please contact the administrator.<");

// --- Legend text at bottom of student dashboard ---
code = code.split("● = Mandatory requirement &nbsp;|&nbsp; ○ = Optional requirement &nbsp;|&nbsp; * = Required")
  .join("● Mandatory &nbsp;|&nbsp; ○ Optional &nbsp;— Red asterisk (*) marks strictly required items");

fs.writeFileSync('src/App.jsx', code);
console.log('All text labels standardized successfully!');
