import { onRequest } from 'firebase-functions/https';
import { onSchedule } from 'firebase-functions/scheduler';
import { defineSecret } from 'firebase-functions/params';
import { createApi } from '../../../safety-core/functions/src/api';
import { applyRetention } from '../../../safety-core/functions/src/account';
import { lifelineRoutes, purgeTokens } from './lifeline';

/** "none" or SMS-provider JSON (server fallback when the phone cannot text). Never shipped to the app. */
const SMS = defineSecret('LIFELINE_SMS');
const REGION = 'asia-south1';

// LifeLine Hub = Safety Core SOS (sync, live links, SMS) + Health Vault responder access + Helper pilot.
const { handler } = createApi({ smsSecret: () => SMS.value(), historyCollections: ['healthAccessLogs'], extra: lifelineRoutes });

export const lifelineApi = onRequest({ region: REGION, secrets: [SMS], maxInstances: 10, memory: '256MiB' }, handler);
export const lifelineRetention = onSchedule({ region: REGION, schedule: 'every day 03:37', timeZone: 'Asia/Kolkata', memory: '256MiB' }, async () => {
  await applyRetention();
  await purgeTokens();
});
