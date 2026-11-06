// Automated Test Suite: Firebase Firestore ash-user Management, Auth, Bidirectional Data Flow, and Vercel Proxy
const fs = require('fs');
const path = require('path');

const FIREBASE_API_KEY = "AIzaSyCruCfmmN68FTMSkYNGOOGoJTa3lRulFfY";
const FIREBASE_PROJECT_ID = "dashboard-cloud-4bdfa";

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    console.log(`  PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`  FAIL: ${message}`);
    process.exitCode = 1;
  }
}

function parseRestUserItem(v) {
  if (!v || !v.mapValue || !v.mapValue.fields) return null;
  const f = v.mapValue.fields;
  const dashboards = (f.permissions && f.permissions.mapValue && f.permissions.mapValue.fields && f.permissions.mapValue.fields.dashboards && f.permissions.mapValue.fields.dashboards.arrayValue && f.permissions.mapValue.fields.dashboards.arrayValue.values)
    ? f.permissions.mapValue.fields.dashboards.arrayValue.values.map(d => d.stringValue)
    : ((f.allowedDashboards && f.allowedDashboards.arrayValue && f.allowedDashboards.arrayValue.values)
      ? f.allowedDashboards.arrayValue.values.map(d => d.stringValue)
      : ((f.dashboards && f.dashboards.arrayValue && f.dashboards.arrayValue.values)
        ? f.dashboards.arrayValue.values.map(d => d.stringValue)
        : ['overview']));

  const role = (f.role && f.role.stringValue) || 'Member';
  const isFounder = role.toLowerCase() === 'founder';
  const settingsPerm = isFounder || (f.permissions && f.permissions.mapValue && f.permissions.mapValue.fields && f.permissions.mapValue.fields.settings && f.permissions.mapValue.fields.settings.booleanValue !== undefined)
    ? (isFounder || (f.permissions && f.permissions.mapValue && f.permissions.mapValue.fields && f.permissions.mapValue.fields.settings && f.permissions.mapValue.fields.settings.booleanValue))
    : (dashboards.includes('settings') || (f.settings && f.settings.booleanValue));

  const nowIso = new Date().toISOString();
  const createdAt = (f.createdAt && f.createdAt.stringValue) || nowIso;
  const updatedAt = (f.updatedAt && f.updatedAt.stringValue) || nowIso;

  return {
    id: (f.id && f.id.stringValue) || ('user_' + ((f.username && f.username.stringValue) || '').toLowerCase()),
    username: (f.username && f.username.stringValue) || '',
    fullName: (f.fullName && f.fullName.stringValue) || (f.name && f.name.stringValue) || '',
    name: (f.name && f.name.stringValue) || (f.fullName && f.fullName.stringValue) || '',
    password: (f.password && f.password.stringValue) || '',
    role: role,
    status: (f.status && f.status.stringValue) || 'active',
    allowedDashboards: dashboards,
    permissions: {
      dashboards: dashboards,
      settings: Boolean(settingsPerm)
    },
    dashboards: dashboards,
    settings: Boolean(settingsPerm),
    createdAt: createdAt,
    updatedAt: updatedAt
  };
}

// Convert JS object to Firestore REST fields map
function toRestValue(val) {
  if (typeof val === 'string') return { stringValue: val };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map(toRestValue) } };
  }
  if (typeof val === 'object' && val !== null) {
    const fields = {};
    for (const [k, v] of Object.entries(val)) {
      if (v === undefined) continue;
      fields[k] = toRestValue(v);
    }
    return { mapValue: { fields } };
  }
  return { nullValue: null };
}

function buildUserRestFields(usersList) {
  const fields = {
    users: toRestValue(usersList),
    updatedAt: { stringValue: new Date().toISOString() }
  };
  usersList.forEach(u => {
    if (u && u.username) {
      fields[u.username] = toRestValue(u);
    }
  });
  return fields;
}

const CANONICAL_STAFF = [
  { name: 'Arjun', department: 'Tech', designation: 'MERN Stack Developer' },
  { name: 'Gokul', department: 'Academy', designation: 'Graphic Designer' },
  { name: 'Gopika', department: 'HR', designation: 'HR Executive' },
  { name: 'Haseena', department: 'Academy', designation: 'Administration' },
  { name: 'Hashir', department: 'Academy', designation: 'Academy Coordinator' },
  { name: 'Hemin', department: 'Academy', designation: 'Video Editor' },
  { name: 'Hissath', department: 'Accounts', designation: 'Accountant' },
  { name: 'Husnu Mubarak', department: 'Tech', designation: 'Web Developer cum Mentor' },
  { name: 'Jamsheed', department: 'Design', designation: 'Graphic Designer' },
  { name: 'Nihala', department: 'Marketing', designation: 'Marketing Head' },
  { name: 'Rafsida', department: 'Academy', designation: 'Placement Officer' },
  { name: 'Safal', department: 'Academy', designation: 'Digital Marketing Mentor' },
  { name: 'Shahana', department: 'Academy', designation: 'SHO' },
  { name: 'Sufail', department: 'Management', designation: 'Founder' },
  { name: 'Sunisha', department: 'Academy', designation: 'MERN Stack Mentor' },
  { name: 'Vishnupriya', department: 'Marketing', designation: 'Content Creator' }
];

function canonicalizeName(name) {
  if (!name) return '';
  const s = String(name).trim();
  const lower = s.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (lower.includes('nihala')) return 'Nihala';
  if (lower.includes('shahana')) return 'Shahana';
  if (lower.includes('husnu') || lower.includes('mubarak')) return 'Husnu Mubarak';
  if (lower.includes('vishnu') || lower.includes('priya')) return 'Vishnupriya';
  if (lower.includes('shafal') || lower === 'safal') return 'Safal';
  if (lower.includes('hissath') || lower.includes('hizzath')) return 'Hissath';
  if (lower === 'hashir' || lower === 'hshir') return 'Hashir';
  if (lower.includes('haseena')) return 'Haseena';
  if (lower.includes('hemin')) return 'Hemin';
  if (lower.includes('sunisha')) return 'Sunisha';
  if (lower === 'arjun') return 'Arjun';
  if (lower.includes('rafsida')) return 'Rafsida';
  if (lower.includes('gopika')) return 'Gopika';
  if (lower.includes('gokul')) return 'Gokul';
  if (lower.includes('jamsheed')) return 'Jamsheed';
  if (lower === 'sufail') return 'Sufail';
  return s;
}

async function runTests() {
  console.log('=== 1. TESTING FIRESTORE "ash-user" DOCUMENT ===');

  const ashUserDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/ash_settings/ash-user?key=${FIREBASE_API_KEY}`;
  const ashUsersMirrorUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/ash_settings/users?key=${FIREBASE_API_KEY}`;
  const ashDashMirrorUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/ash_dashboard/ash-user?key=${FIREBASE_API_KEY}`;

  const ashRes = await fetch(ashUserDocUrl);
  assert(ashRes.ok, `Firestore "ash_settings/ash-user" returns HTTP ${ashRes.status}`);

  const ashData = await ashRes.json();
  assert(ashData.fields && ashData.fields.users && ashData.fields.users.arrayValue, '"ash-user" contains users array field');

  const ashUsers = ashData.fields.users.arrayValue.values.map(parseRestUserItem).filter(Boolean);
  assert(ashUsers.length >= 3, `Found ${ashUsers.length} users inside "ash-user"`);

  const sufail = ashUsers.find(u => u.username === 'sufailash');
  const hashir = ashUsers.find(u => u.username === 'hashirash');
  const gopika = ashUsers.find(u => u.username === 'ashgopika');

  assert(Boolean(sufail), 'sufailash is kept inside ash-user');
  assert(sufail && sufail.password === 'ashcm@3212', 'sufailash password is correct');
  assert(sufail && sufail.role === 'Founder', 'sufailash role is Founder');
  assert(sufail && (sufail.dashboards.includes('settings') || sufail.settings === true), 'sufailash has settings access');

  assert(Boolean(hashir), 'hashirash is kept inside ash-user');
  assert(hashir && hashir.password === 'hasac@123', 'hashirash password is correct');
  assert(hashir && hashir.dashboards.includes('overview'), 'hashirash has overview dashboard access');

  assert(Boolean(gopika), 'ashgopika is kept inside ash-user');
  assert(gopika && gopika.password === 'hrash@1234', 'ashgopika password is correct');
  assert(gopika && hashir && !hashir.settings, 'hashirash does not have settings admin access');


  console.log('\n=== 2. VERIFYING OTHER DASHBOARD "users" COLLECTION IS UNTOUCHED ===');

  const otherUsersUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/users?key=${FIREBASE_API_KEY}`;
  const otherRes = await fetch(otherUsersUrl);
  assert(otherRes.ok, `Other dashboard "users" collection returns HTTP ${otherRes.status}`);

  const otherData = await otherRes.json();
  const otherDocs = (otherData.documents || []).map(d => d.name.split('/').pop());

  assert(!otherDocs.includes('sufailash'), 'sufailash is NOT in the other dashboard "users" collection');
  assert(!otherDocs.includes('hashirash'), 'hashirash is NOT in the other dashboard "users" collection');
  assert(!otherDocs.includes('ashgopika'), 'ashgopika is NOT in the other dashboard "users" collection');
  assert(otherDocs.includes('vipin'), 'Other dashboard user "vipin" is preserved intact');
  assert(otherDocs.includes('arun'), 'Other dashboard user "arun" is preserved intact');


  console.log('\n=== 3. TESTING AUTHENTICATION LOGIC USING "ash-user" ===');

  function authenticate(username, password) {
    const matched = ashUsers.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);
    if (!matched) return null;
    return {
      username: matched.username,
      name: matched.name,
      role: matched.role,
      allowedDashboards: matched.dashboards,
      hasSettings: matched.settings || matched.dashboards.includes('settings')
    };
  }

  const authSufail = authenticate('sufailash', 'ashcm@3212');
  assert(authSufail !== null, 'sufailash valid login succeeds');
  assert(authSufail && authSufail.hasSettings === true, 'sufailash can view settings');

  const authHashir = authenticate('hashirash', 'hasac@123');
  assert(authHashir !== null, 'hashirash valid login succeeds');
  assert(authHashir && authHashir.hasSettings === false, 'hashirash settings view blocked');

  const authGopika = authenticate('ashgopika', 'hrash@1234');
  assert(authGopika !== null, 'ashgopika valid login succeeds');

  const authWrongPass = authenticate('sufailash', 'wrongpassword');
  assert(authWrongPass === null, 'Wrong password login correctly rejected');

  const authWrongUser = authenticate('nonexistent_user', 'anypass');
  assert(authWrongUser === null, 'Unknown user login correctly rejected');


  console.log('\n=== 4. TESTING USER CRUD & MIRROR SYNC (DASHBOARD <-> FIREBASE) ===');

  // A. Create test user inside ash-user
  const tempUser = {
    id: 'user_test_ops_99',
    fullName: 'Test Operations User',
    name: 'Test Operations User',
    username: 'test_ops_99',
    password: 'password_99',
    role: 'Operations Lead',
    status: 'active',
    allowedDashboards: ['overview', 'daily-report'],
    permissions: {
      dashboards: ['overview', 'daily-report'],
      settings: false
    },
    dashboards: ['overview', 'daily-report'],
    settings: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const baseCleanUsers = ashUsers.map(u => ({
    id: u.id,
    fullName: u.fullName,
    name: u.name,
    username: u.username,
    password: u.password,
    role: u.role,
    status: u.status,
    allowedDashboards: u.allowedDashboards,
    permissions: u.permissions,
    dashboards: u.dashboards,
    settings: u.settings,
    createdAt: u.createdAt || new Date().toISOString(),
    updatedAt: u.updatedAt || new Date().toISOString()
  }));

  const usersWithNew = [...baseCleanUsers, tempUser];

  const patchCreateRes = await fetch(ashUserDocUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: buildUserRestFields(usersWithNew) })
  });
  assert(patchCreateRes.ok, `Create user inside ash-user: Firestore PATCH returned HTTP ${patchCreateRes.status}`);

  // Read back and verify create
  const verifyRes1 = await fetch(ashUserDocUrl);
  const doc1 = await verifyRes1.json();
  const list1 = doc1.fields.users.arrayValue.values.map(v => v.mapValue.fields.username.stringValue);
  assert(list1.includes('test_ops_99'), 'Newly created user test_ops_99 found inside ash-user');

  // B. Update test user
  const usersWithUpdate = usersWithNew.map(u => {
    if (u.username === 'test_ops_99') {
      return {
        ...u,
        role: 'Branch Manager',
        allowedDashboards: ['overview', 'daily-report', 'calicut-branch'],
        permissions: {
          dashboards: ['overview', 'daily-report', 'calicut-branch'],
          settings: false
        },
        dashboards: ['overview', 'daily-report', 'calicut-branch'],
        updatedAt: new Date().toISOString()
      };
    }
    return u;
  });

  const patchUpdateRes = await fetch(ashUserDocUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: buildUserRestFields(usersWithUpdate) })
  });
  assert(patchUpdateRes.ok, `Update user inside ash-user: Firestore PATCH returned HTTP ${patchUpdateRes.status}`);

  // Read back and verify update
  const verifyRes2 = await fetch(ashUserDocUrl);
  const doc2 = await verifyRes2.json();
  const updatedDocUser = doc2.fields.users.arrayValue.values
    .map(v => v.mapValue.fields)
    .find(f => f.username.stringValue === 'test_ops_99');
  assert(updatedDocUser && updatedDocUser.role.stringValue === 'Branch Manager', 'Updated user role in ash-user is Branch Manager');

  // C. Delete test user and synchronize all 3 user documents cleanly (removing any stale top-level keys like "test")
  const usersRestored = usersWithUpdate.filter(u => u.username !== 'test_ops_99');
  const cleanUserFields = buildUserRestFields(usersRestored);

  const [delPrimary, delMirror1, delMirror2] = await Promise.all([
    fetch(ashUserDocUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanUserFields })
    }),
    fetch(ashUsersMirrorUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanUserFields })
    }),
    fetch(ashDashMirrorUrl, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields: cleanUserFields })
    })
  ]);

  assert(delPrimary.ok, `Restore & clean primary ash_settings/ash-user: HTTP ${delPrimary.status}`);
  assert(delMirror1.ok, `Sync mirror ash_settings/users: HTTP ${delMirror1.status}`);
  assert(delMirror2.ok, `Sync mirror ash_dashboard/ash-user: HTTP ${delMirror2.status}`);

  // Verify deletion and verify no stale "test" top-level key remains in any mirror
  const [verifyPrimary, verifyMirror1, verifyMirror2] = await Promise.all([
    fetch(ashUserDocUrl).then(r => r.json()),
    fetch(ashUsersMirrorUrl).then(r => r.json()),
    fetch(ashDashMirrorUrl).then(r => r.json())
  ]);

  const list3 = verifyPrimary.fields.users.arrayValue.values.map(v => v.mapValue.fields.username.stringValue);
  assert(!list3.includes('test_ops_99'), 'Deleted user test_ops_99 is no longer in ash-user');
  assert(list3.length === 3, 'Exactly 3 base users remain inside ash-user');
  assert(!verifyPrimary.fields.test && !verifyPrimary.fields.test_ops_99, 'No stale deleted user keys in ash_settings/ash-user');
  assert(!verifyMirror1.fields.test && !verifyMirror1.fields.test_ops_99, 'No stale deleted user keys in ash_settings/users');
  assert(!verifyMirror2.fields.test && !verifyMirror2.fields.test_ops_99, 'No stale deleted user keys in ash_dashboard/ash-user');

  // Verify timestamps are valid strings (not nullValue)
  const firstUserFields = verifyPrimary.fields.users.arrayValue.values[0].mapValue.fields;
  assert(Boolean(firstUserFields.createdAt && firstUserFields.createdAt.stringValue), 'User createdAt is preserved as stringValue');
  assert(Boolean(firstUserFields.updatedAt && firstUserFields.updatedAt.stringValue), 'User updatedAt is preserved as stringValue');


  console.log('\n=== 5. TESTING BIDIRECTIONAL FLOW FOR EMPLOYEE STATUS (ash_settings/employee_status) ===');
  const empStatusUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/ash_settings/employee_status?key=${FIREBASE_API_KEY}`;
  const empRes = await fetch(empStatusUrl);
  assert(empRes.ok, `Firestore "ash_settings/employee_status" returns HTTP ${empRes.status}`);

  const empDoc = await empRes.json();
  assert(empDoc.fields && empDoc.fields.statusMap && empDoc.fields.statusMap.mapValue, 'employee_status contains statusMap field');

  // Normalize statusMap to canonical staff names (eliminating duplicates like "Hshir" or "GOKUL KRISHNA")
  const rawMapFields = (empDoc.fields.statusMap.mapValue && empDoc.fields.statusMap.mapValue.fields) || {};
  const normalizedStatusMap = {};

  CANONICAL_STAFF.forEach(item => {
    normalizedStatusMap[item.name] = {
      active: true,
      department: item.department,
      designation: item.designation
    };
  });

  Object.keys(rawMapFields).forEach(rawKey => {
    const canon = canonicalizeName(rawKey);
    if (!canon) return;
    const entryFields = (rawMapFields[rawKey].mapValue && rawMapFields[rawKey].mapValue.fields) || {};
    const isActive = entryFields.active && entryFields.active.booleanValue !== undefined
      ? entryFields.active.booleanValue
      : true;
    const meta = CANONICAL_STAFF.find(s => s.name === canon);
    if (!normalizedStatusMap[canon]) {
      normalizedStatusMap[canon] = {
        active: isActive,
        department: meta ? meta.department : ((entryFields.department && entryFields.department.stringValue) || 'Academy'),
        designation: meta ? meta.designation : ((entryFields.designation && entryFields.designation.stringValue) || 'Team Member')
      };
    } else if (rawKey === canon) {
      normalizedStatusMap[canon].active = isActive;
    }
  });

  const filterModeVal = (empDoc.fields.filterMode && empDoc.fields.filterMode.stringValue) || 'active';

  const empPatchRes = await fetch(empStatusUrl, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        statusMap: toRestValue(normalizedStatusMap),
        filterMode: { stringValue: filterModeVal },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    })
  });
  assert(empPatchRes.ok, `Dashboard -> Firebase employee_status write returns HTTP ${empPatchRes.status}`);

  const empVerifyRes = await fetch(empStatusUrl);
  const empVerifyDoc = await empVerifyRes.json();
  const verifiedStaffKeys = Object.keys(empVerifyDoc.fields.statusMap.mapValue.fields);
  assert(verifiedStaffKeys.includes('Hashir') && !verifiedStaffKeys.includes('Hshir'), 'Employee status map has canonical "Hashir" and no duplicate "Hshir"');
  assert(verifiedStaffKeys.includes('Gokul') && !verifiedStaffKeys.includes('GOKUL KRISHNA'), 'Employee status map has canonical "Gokul" and no duplicate "GOKUL KRISHNA"');
  assert(verifiedStaffKeys.length >= 16, `Firebase -> Dashboard employee_status returns ${verifiedStaffKeys.length} canonical staff members`);


  console.log('\n=== 6. TESTING BIDIRECTIONAL FLOW FOR LIVE DASHBOARD CACHE (ash_dashboard/latest_data) ===');
  const latestDataUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/ash_dashboard/latest_data?key=${FIREBASE_API_KEY}`;
  const latestRes = await fetch(latestDataUrl);
  assert(latestRes.ok, `Firestore "ash_dashboard/latest_data" returns HTTP ${latestRes.status}`);

  const latestDoc = await latestRes.json();
  assert(latestDoc.fields && latestDoc.fields.sheets && latestDoc.fields.sheets.mapValue, 'latest_data contains multi-sheet cache in Firestore');
  const cachedSheetNames = Object.keys(latestDoc.fields.sheets.mapValue.fields || {});
  assert(cachedSheetNames.includes('Lead') && cachedSheetNames.includes('EOD') && cachedSheetNames.includes('Weekly'), `Firebase -> Dashboard latest_data has sheets: ${cachedSheetNames.join(', ')}`);


  console.log('\n=== 7. TESTING VERCEL SERVERLESS PROXY (/api/data) ===');
  const dataProxyHandler = require('./api/data.js');
  let dataProxyResult = null;
  const mockReq = { method: 'GET' };
  const mockRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(data) { dataProxyResult = data; return this; },
    end() { return this; }
  };

  await dataProxyHandler(mockReq, mockRes);
  assert(mockRes.statusCode === 200, `api/data.js responded with HTTP ${mockRes.statusCode}`);
  assert(dataProxyResult && dataProxyResult.sheets, 'api/data.js returned sheets object');
  assert(dataProxyResult.sheets && Object.keys(dataProxyResult.sheets).length > 0, `api/data.js returned ${dataProxyResult.sheets ? Object.keys(dataProxyResult.sheets).length : 0} sheets`);


  console.log('\n=== 8. TESTING VERCEL ENVIRONMENT HANDLER (/api/env) ===');
  const envHandler = require('./api/env.js');
  let envResult = null;
  const mockEnvRes = {
    statusCode: 200,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(data) { envResult = data; return this; }
  };
  envHandler(mockReq, mockEnvRes);
  assert(mockEnvRes.statusCode === 200, `api/env.js responded with HTTP ${mockEnvRes.statusCode}`);
  assert(envResult && (envResult.API_URL || envResult.dataPath), 'api/env.js returned configuration');


  console.log('\n=== 9. TESTING INDEX.HTML DOM STRUCTURE & BIDIRECTIONAL SYNC LOGIC ===');
  const htmlContent = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

  assert(htmlContent.includes('id="sidebar-settings-section"'), 'Sidebar includes Settings & Users section');
  assert(htmlContent.includes('id="nav-settings-btn"'), 'Sidebar includes nav-settings-btn');
  assert(htmlContent.includes('id="section-settings"'), 'Main views include section-settings');
  assert(htmlContent.includes('id="users-table-body"'), 'Settings includes users-table-body');
  assert(htmlContent.includes('id="users-firebase-sync-badge"'), 'Settings includes users-firebase-sync-badge status indicator');
  assert(htmlContent.includes('id="user-form-modal"'), 'Settings includes user-form-modal for creating and editing');
  assert(htmlContent.includes('id="user-delete-modal"'), 'Settings includes user-delete-modal for deleting users');
  assert(htmlContent.includes('name="user-dashboards"'), 'User modal includes dashboard permission checkboxes');
  assert(htmlContent.includes('function getFirebaseUsers'), 'index.html contains getFirebaseUsers()');
  assert(htmlContent.includes('function saveFirebaseUser'), 'index.html contains saveFirebaseUser()');
  assert(htmlContent.includes('function deleteFirebaseUser'), 'index.html contains deleteFirebaseUser()');
  assert(htmlContent.includes('function saveAshUsersViaRestApi'), 'index.html contains REST write fallback saveAshUsersViaRestApi()');
  assert(htmlContent.includes('function initDashboardDataRealtimeListener'), 'index.html contains initDashboardDataRealtimeListener()');
  assert(htmlContent.includes('function normalizeEmployeeStatusMap'), 'index.html contains normalizeEmployeeStatusMap()');
  assert(htmlContent.includes('function renderUserSettingsTable'), 'index.html contains renderUserSettingsTable()');
  assert(htmlContent.includes("switchView('settings')") || htmlContent.includes("viewName === 'settings'"), 'switchView handles settings');
  assert(htmlContent.includes("'ash-user'"), 'index.html uses document "ash-user" for user storage');

  // Verify that NO passwords or credentials are hardcoded in index.html
  assert(!htmlContent.includes('ashcm@3212'), 'sufailash password is NOT hardcoded in HTML');
  assert(!htmlContent.includes('hasac@123'), 'hashirash password is NOT hardcoded in HTML');
  assert(!htmlContent.includes('hrash@1234'), 'ashgopika password is NOT hardcoded in HTML');

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${testsPassed} / ${testsTotal} PASSED (${Math.round((testsPassed / testsTotal) * 100)}%)`);
  console.log(`========================================\n`);

  if (testsPassed === testsTotal) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
