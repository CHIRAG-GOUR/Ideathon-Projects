// Firestore security rules tests. Run: npx firebase-tools emulators:exec --only firestore "node tests/rules.test.mjs"
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-nutri-scan',
  firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
});
let failures = 0;
const t = async (name, fn) => {
  try { await fn(); console.log('PASS', name); } catch (e) { failures++; console.log('FAIL', name, e.message); }
};
const food = (id, extra = {}) => ({ id, name: 'Milk', quantity: 1, unit: 'l', updatedAt: new Date().toISOString(), ...extra });

const alice = env.authenticatedContext('alice').firestore();
const bob = env.authenticatedContext('bob').firestore();
const anon = env.unauthenticatedContext().firestore();

await t('owner can write and read own food', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice/foods/f1'), food('f1')));
  await assertSucceeds(getDoc(doc(alice, 'users/alice/foods/f1')));
});
await t('another user cannot read it', () => assertFails(getDoc(doc(bob, 'users/alice/foods/f1'))));
await t('another user cannot list it', () => assertFails(getDocs(collection(bob, 'users/alice/foods'))));
await t('another user cannot write into it', () => assertFails(setDoc(doc(bob, 'users/alice/foods/f2'), food('f2'))));
await t('signed-out users are blocked', () => assertFails(getDoc(doc(anon, 'users/alice/foods/f1'))));
await t('doc id must match', () => assertFails(setDoc(doc(alice, 'users/alice/foods/f3'), food('other'))));
await t('huge photos are rejected', () => assertFails(setDoc(doc(alice, 'users/alice/foods/f4'), food('f4', { photo: 'x'.repeat(70000) }))));
await t('small photo allowed', () => assertSucceeds(setDoc(doc(alice, 'users/alice/foods/f5'), food('f5', { photo: 'data:image/jpeg;base64,abc' }))));
await t('scans + waste scoped to owner', async () => {
  await assertSucceeds(setDoc(doc(alice, 'users/alice/scans/s1'), { id: 's1', at: 'x', name: 'Milk' }));
  await assertSucceeds(setDoc(doc(alice, 'users/alice/waste/w1'), { id: 'w1', at: 'x', name: 'Milk' }));
  await assertFails(getDoc(doc(bob, 'users/alice/scans/s1')));
});
await t('owner can delete own food', () => assertSucceeds(deleteDoc(doc(alice, 'users/alice/foods/f1'))));
await t('other top-level collections are closed', () => assertFails(setDoc(doc(alice, 'anything/else'), { a: 1 })));

await env.cleanup();
console.log(failures ? `${failures} RULE TEST FAILURES` : 'ALL RULES TESTS PASSED');
process.exit(failures ? 1 : 0);
