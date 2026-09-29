package com.skillizee.shevolution;

import org.json.JSONObject;

/** JVM check (run by tests): the phone builds exactly the same SOS text as shared/src/message.ts. */
public class SmsTextCheck {
    public static void main(String[] a) throws Exception {
        JSONObject cfg = new JSONObject().put("userName", "Aanya").put("emergencyNumber", "112").put("timeZone", "Asia/Kolkata");
        JSONObject loc = new JSONObject().put("latitude", 28.6315).put("longitude", 77.2167).put("accuracy", 12.0);
        String s = Sms.fill(Sms.DEFAULT_SOS, cfg, loc, "https://shevolution.web.app/e/TOKEN1234567890abcd", new JSONObject().put("area", "Connaught Place, New Delhi"));
        System.out.println(s.replaceAll("Time: .*", "Time: T"));
        System.out.println("---");
        System.out.println(Sms.fill(Sms.DEFAULT_SOS, cfg, null, null, null).replaceAll("Time: .*", "Time: T"));
        System.out.println("---" + Store.sha256("abc"));
    }
}
