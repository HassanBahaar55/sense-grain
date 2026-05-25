/**
 * One-time Firebase factory reset script.
 *
 * Deletes ALL Firestore data (users, userRequests, resourceRequests, accounts/*)
 * then seeds fresh admin and testing account profiles.
 *
 * REQUIREMENTS:
 *   1. Place your Firebase Admin SDK service account JSON at:
 *        sense-grain/firebase-admin-key.json
 *      (download from Firebase Console → Project Settings → Service Accounts → Generate new private key)
 *   2. NEVER commit firebase-admin-key.json — it's in .gitignore
 *   3. Install deps if needed: cd firebase/functions && npm install firebase-admin
 *
 * USAGE:
 *   node mobile-app/scripts/reset-firebase.js
 *
 * AFTER RUNNING:
 *   - Admin (hammadtahir@gmail.com) and testing (testing@gmail.com) can sign in
 *   - testing account auto-seeds 30-day demo data on first login
 *   - All other accounts see "Account not registered"
 */

'use strict';

const admin = require('firebase-admin');
const path  = require('path');
const fs    = require('fs');

// ─── Config ────────────────────────────────────────────────────────────────────

const ADMIN_EMAIL   = 'hammadtahir@gmail.com';
const TEST_EMAIL    = 'testing@gmail.com';
const KEY_PATH      = path.resolve(__dirname, '../../firebase-admin-key.json');

if (!fs.existsSync(KEY_PATH)) {
  console.error(`\n[reset-firebase] ERROR: Service account key not found at:\n  ${KEY_PATH}\n`);
  console.error('Download it from Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const serviceAccount = require(KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db   = admin.firestore();
const auth = admin.auth();

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function deleteCollection(collPath, batchSize = 400) {
  const collRef = db.collection(collPath);
  let deleted   = 0;

  while (true) {
    const snap = await collRef.limit(batchSize).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    deleted += snap.docs.length;

    if (snap.docs.length < batchSize) break;
  }
  return deleted;
}

async function deleteSubcollectionsOf(docRef) {
  const subcols = await docRef.listCollections();
  for (const sub of subcols) {
    const snap = await sub.get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (!snap.empty) await batch.commit();
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n[reset-firebase] Starting factory reset...\n');

  // 1. Delete top-level global collections
  for (const coll of ['users', 'userRequests', 'resourceRequests']) {
    const count = await deleteCollection(coll);
    console.log(`  Deleted ${count} docs from /${coll}`);
  }

  // 2. Delete all per-user account subcollections
  const accountsRef = db.collection('accounts');
  const accountDocs = await accountsRef.get();
  let accountsDeleted = 0;

  for (const acDoc of accountDocs.docs) {
    await deleteSubcollectionsOf(acDoc.ref);
    await acDoc.ref.delete();
    accountsDeleted++;
  }
  console.log(`  Deleted ${accountsDeleted} account documents (with all subcollections)`);

  // 3. Look up admin + testing UIDs from Firebase Auth
  let adminUid = null;
  let testUid  = null;

  try {
    const adminUser = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = adminUser.uid;
    console.log(`\n  Admin UID: ${adminUid} (${ADMIN_EMAIL})`);
  } catch {
    console.warn(`  WARNING: Admin account (${ADMIN_EMAIL}) not found in Firebase Auth — skipping profile creation`);
  }

  try {
    const testUser = await auth.getUserByEmail(TEST_EMAIL);
    testUid = testUser.uid;
    console.log(`  Testing UID: ${testUid} (${TEST_EMAIL})`);
  } catch {
    console.warn(`  WARNING: Testing account (${TEST_EMAIL}) not found in Firebase Auth — skipping profile creation`);
  }

  const now = Date.now();

  // 4. Seed admin profile
  if (adminUid) {
    await db.doc(`users/${adminUid}`).set({
      uid:            adminUid,
      email:          ADMIN_EMAIL,
      displayName:    'Admin',
      role:           'admin',
      approvalStatus: 'approved',
      approvedAt:     now,
      createdAt:      now,
    });
    console.log(`  Created admin profile for ${ADMIN_EMAIL}`);
  }

  // 5. Seed testing profile (client seeder writes demo data on first login)
  if (testUid) {
    await db.doc(`users/${testUid}`).set({
      uid:            testUid,
      email:          TEST_EMAIL,
      displayName:    'Demo User',
      approvalStatus: 'approved',
      approvedAt:     now,
      createdAt:      now,
    });
    // Clear seeded flag so client seeder runs fresh on next login
    await db.doc(`accounts/${testUid}/meta/seeded`).delete().catch(() => {});
    console.log(`  Created testing profile for ${TEST_EMAIL} (demo data will seed on next login)`);
  }

  console.log('\n[reset-firebase] Done. Firebase is reset to factory state.\n');
  process.exit(0);
}

main().catch(err => {
  console.error('\n[reset-firebase] FATAL ERROR:', err);
  process.exit(1);
});
