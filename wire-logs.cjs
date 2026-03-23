const fs = require('fs');
let code = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add logAction to StudentsPage context
code = code.split('const { students, setStudents, courses, departments, yearLevels, showToast, showConfirm } = useContext(AppContext);')
  .join('const { students, setStudents, courses, departments, yearLevels, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);');

// 2. Add logAction to SignatoriesPage context
code = code.split('const { offices, setOffices, signatories, setSignatories, showToast, showConfirm } = useContext(AppContext);')
  .join('const { offices, setOffices, signatories, setSignatories, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);');

// 3. Add logAction to AdminPage context
code = code.split('const { adminUsers, setAdminUsers, showToast, showConfirm } = useContext(AppContext);')
  .join('const { adminUsers, setAdminUsers, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);');

// 4. Add logAction to CoursesPage context
code = code.split('const { courses, setCourses, departments, setDepartments, students, setStudents, showToast, showConfirm } = useContext(AppContext);')
  .join('const { courses, setCourses, departments, setDepartments, students, setStudents, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);');

// 5. Add logAction to DepartmentsPage context
code = code.split('const { departments, setDepartments, courses, students, setStudents, showToast, showConfirm } = useContext(AppContext);')
  .join('const { departments, setDepartments, courses, students, setStudents, showToast, showConfirm, logAction, currentUser } = useContext(AppContext);');

// 6. Wire log calls into StudentsPage actions
code = code.split("showToast(\"Student profile updated!\");")
  .join("showToast(\"Student profile updated!\"); logAction(currentUser, 'Edited Student', `Updated record for ${formData.firstname} ${formData.lastname}`);");

code = code.split("showToast(\"New student account created!\");")
  .join("showToast(\"New student account created!\"); logAction(currentUser, 'Added Student', `Created account for ${formData.firstname} ${formData.lastname} (${formData.id})`);");

code = code.split("showToast(\"Student deleted.\", \"error\");")
  .join("showToast(\"Student deleted.\", \"error\"); logAction(currentUser, 'Deleted Student', `Removed student account`);");

// 7. Wire log calls into SignatoriesPage actions
code = code.split("showToast(\"Office '\" + trimmed + \"' added!\");")
  .join("showToast(\"Office '\" + trimmed + \"' added!\"); logAction(currentUser, 'Added Office', `Created office: ${trimmed}`);");

code = code.split("showToast(\"Signatory profile updated!\");")
  .join("showToast(\"Signatory profile updated!\"); logAction(currentUser, 'Edited Signatory', `Updated signatory: ${sigFormData.name}`);");

code = code.split("showToast(\"New signatory account created!\");")
  .join("showToast(\"New signatory account created!\"); logAction(currentUser, 'Added Signatory', `Created signatory account: ${sigFormData.name}`);");

code = code.split("showToast(\"Signatory account deleted.\", \"error\");")
  .join("showToast(\"Signatory account deleted.\", \"error\"); logAction(currentUser, 'Deleted Signatory', `Removed signatory account`);");

// 8. Wire log calls into CoursesPage actions
code = code.split("showToast(\"Course name updated!\");")
  .join("showToast(\"Course name updated!\"); logAction(currentUser, 'Edited Course', `Renamed course to: ${trimmed}`);");

code = code.split("showToast(`Course '${trimmed}' added!`);")
  .join("showToast(`Course '${trimmed}' added!`); logAction(currentUser, 'Added Course', `Added course: ${trimmed}`);");

code = code.split("showToast(`Course '${c}' removed.`, \"error\");")
  .join("showToast(`Course '${c}' removed.`, \"error\"); logAction(currentUser, 'Deleted Course', `Removed course: ${c}`);");

// 9. Wire into RequirementsPage
code = code.split('const { currentUser, requirements, setRequirements, showToast, showConfirm, offices, triggerGlobalSync } = useContext(AppContext);')
  .join('const { currentUser, requirements, setRequirements, showToast, showConfirm, logAction, offices, triggerGlobalSync } = useContext(AppContext);');

fs.writeFileSync('src/App.jsx', code);
console.log('logAction wired into all key mutation handlers!');
