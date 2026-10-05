import { onRequest } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { createApi } from '../../../safety-core/functions/src/api';
import { processChecks } from '../../../safety-core/functions/src/checks';
import { applyRetention } from '../../../safety-core/functions/src/account';
import { parseSmsConfig } from '../../../safety-core/functions/src/sms';

/** "none" or SMS-provider JSON (server fallback when the phone cannot text). Never shipped to the app. */
const SMS = defineSecret('SHESHIELD_SMS');
const REGION = 'asia-south1';

const { handler } = createApi({
  smsSecret: () => SMS.value(),
  checks: true, // Protection Check
  historyCollections: ['checkLog', 'shieldLog'], // the Evidence Vault is deleted only by the user, item by item, or with the account
});

export const sheshieldApi = onRequest({ region: REGION, secrets: [SMS], maxInstances: 10, memory: '256MiB' }, handler);
export const sheshieldChecks = onSchedule({ region: REGION, schedule: 'every 1 minutes', secrets: [SMS], memory: '256MiB' }, async () => processChecks(parseSmsConfig(SMS.value())));
export const sheshieldRetention = onSchedule({ region: REGION, schedule: 'every day 03:17', timeZone: 'Asia/Kolkata', memory: '256MiB' }, async () => applyRetention());
