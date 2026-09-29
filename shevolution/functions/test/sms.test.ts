import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { mapProviderStatus, parseSmsConfig, sendSms, validTwilioSignature } from '../src/sms';

test('SMS provider is optional and never assumed', async () => {
  assert.equal(parseSmsConfig('none'), null);
  assert.equal(parseSmsConfig(undefined), null);
  assert.equal(parseSmsConfig('{"provider":"twilio"}'), null);
  const r = await sendSms(null, '+911234567890', 'x', null);
  assert.equal(r.status, 'not_configured');
});

test('provider acceptance is "submitted", never "delivered"', () => {
  assert.equal(mapProviderStatus('queued'), 'submitted');
  assert.equal(mapProviderStatus('sent'), 'submitted');
  assert.equal(mapProviderStatus('delivered'), 'delivered');
  assert.equal(mapProviderStatus('undelivered'), 'failed');
});

test('Twilio callback signature check', () => {
  const url = 'https://shevolution.web.app/api/sms/status';
  const params = { MessageSid: 'SM1', MessageStatus: 'delivered' };
  const sig = createHmac('sha1', 'tok').update(url + 'MessageSidSM1MessageStatusdelivered').digest('base64');
  assert.ok(validTwilioSignature('tok', url, params, sig));
  assert.ok(!validTwilioSignature('other', url, params, sig));
});
