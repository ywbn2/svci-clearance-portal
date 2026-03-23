export const YEAR_DAYS = { '1st Year': 880, '2nd Year': 660, '3rd Year': 440, '4th Year': 220 };
export const computeExpirationDate = (signupDate, yearLevel) => {
  const days = YEAR_DAYS[yearLevel] || 880;
  const d = new Date(signupDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
};
export const getAccountStatus = (student) => {
  if (student.account_status && student.account_status !== 'Active') return student.account_status;
  if (!student.expiration_date) return 'Active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(student.expiration_date);
  if (isNaN(exp.getTime())) return 'Active';
  if (exp < today) return 'Expired';
  return 'Active';
};
export const getRemainingDays = (expDate) => {
  if (!expDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expDate);
  if (isNaN(exp.getTime())) return null;
  return Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
};
// ────────────────────────────────────────────────────────────────
export const getScopedOfficeName = (office, deptCode) => {
  if (!deptCode || !office) return office;
  if (office.startsWith('Dept. ')) return `${deptCode} Department ${office.replace('Dept. ', '')}`;
  if (office === "Dean's Office") return `${deptCode} Dean's Office`;
  return office;
};
// ────────────────────────────────────────────────────────────────