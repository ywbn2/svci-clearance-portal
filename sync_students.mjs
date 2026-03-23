import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const lines = fs.readFileSync('src/supabaseClient.js', 'utf8');
const urlMatch = lines.match(/supabaseUrl = '([^']+)'/);
const keyMatch = lines.match(/supabaseKey = '([^']+)'/);

if (!urlMatch || !keyMatch) {
  console.log("Could not extract Supabase credentials from src/supabaseClient.js");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function syncStudents() {
  console.log('Fetching databases...');
  const { data: depts } = await supabase.from('departments').select('*');
  const { data: deptCourses } = await supabase.from('department_courses').select('*');
  const { data: stds } = await supabase.from('students').select('id, course, dept');

  console.log('Mapping correct department targets...');
  
  const updates = [];

  for (const student of stds) {
    // Find what department this course is currently assigned to
    const binding = deptCourses.find(dc => dc.course_name === student.course);
    let targetDeptCode = 'Unassigned';

    if (binding) {
      const pDept = depts.find(d => d.id === binding.department_id);
      if (pDept) {
        targetDeptCode = pDept.code;
      }
    }

    if (student.dept !== targetDeptCode) {
      console.log(`Syncing Student ${student.id}: ${student.dept} -> ${targetDeptCode}`);
      updates.push(supabase.from('students').update({ dept: targetDeptCode }).eq('id', student.id));
    }
  }

  if (updates.length > 0) {
    console.log(`Applying ${updates.length} corrective patches into Supabase...`);
    await Promise.all(updates);
    console.log('Synchronization complete! All orphaned students restored.');
  } else {
    console.log('All students are actively synced to their courses. No patches needed.');
  }
}

syncStudents();
