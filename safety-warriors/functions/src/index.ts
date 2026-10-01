import { onRequest } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { createApi } from '../../../safety-core/functions/src/api';
import { applyRetention } from '../../../safety-core/functions/src/account';

/** "none" or SMS-provider JSON (server fallback when the phone cannot text). Never shipped to the app. */
const SMS = defineSecret('WARRIORS_SMS');
const REGION = 'asia-south1';

// No periodic checks in Safety Warriors — its focus is the Toolkit and Emergency Playbooks.
const { handler } = createApi({ smsSecret: () => SMS.value(), historyCollections: [] });

export const warriorsApi = onRequest({ region: REGION, secrets: [SMS], maxInstances: 10, memory: '256MiB' }, handler);
export const warriorsRetention = onSchedule({ region: REGION, schedule: 'every day 03:29', timeZone: 'Asia/Kolkata', memory: '256MiB' }, async () => applyRetention());
