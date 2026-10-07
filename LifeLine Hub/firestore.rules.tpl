rules_version = '2';
// LifeLine Hub — own database "lifelinehub". Every record belongs to one user; medical data is never public.
// Responders see Health Vault fields only through a temporary, scoped token resolved by the server (/api/responder),
// and every such view is written to the owner's access log by the server (clients cannot write logs).
service cloud.firestore {
  match /databases/{database}/documents {
@BASE@

    // ---- LifeLine Hub ----
    function strList(v, n, max) { return v is list && v.size() <= n && (v.size() == 0 || (v[0] is string && v[0].size() <= max)); }
    function optMap(d, k) { return !(k in d) || d[k] == null || d[k] is map; }
    function validMedical(d) {
      return d.keys().hasOnly(['bloodGroup', 'allergies', 'medications', 'conditions', 'emergencyNotes', 'emergencyContact', 'doctor', 'organDonor', 'updatedAt'])
        && optStr(d, 'bloodGroup', 5)
        && strList(d.allergies, 20, 60) && strList(d.conditions, 20, 80)
        && d.medications is list && d.medications.size() <= 20
        && optStr(d, 'emergencyNotes', 500)
        && optMap(d, 'emergencyContact') && optMap(d, 'doctor')
        && (!('organDonor' in d) || d.organDonor == null || d.organDonor is bool)
        && d.updatedAt is string && d.updatedAt.size() <= 40;
    }
    function validPrefs(d) {
      return d.keys().hasOnly(['ambulance', 'police', 'fire', 'autoVaultLink', 'vaultLinkMinutes', 'voiceGuidance', 'updatedAt'])
        && optStr(d, 'ambulance', 15) && optStr(d, 'police', 15) && optStr(d, 'fire', 15)
        && d.autoVaultLink is bool && d.voiceGuidance is bool
        && d.vaultLinkMinutes is int && d.vaultLinkMinutes >= 5 && d.vaultLinkMinutes <= 60;
    }
    function validDevice(d) {
      return d.keys().hasOnly(['kind', 'label', 'autoSos', 'status', 'updatedAt'])
        && d.kind in ['wearable'] && d.label is string && d.label.size() <= 40
        && d.autoSos is bool && d.status in ['interested'];
    }
    match /users/{uid}/medicalProfile/{id} {
      allow read: if me(uid);
      allow create, update: if me(uid) && id == 'main' && validMedical(request.resource.data);
      allow delete: if me(uid);
    }
    match /users/{uid}/prefs/{id} {
      allow read: if me(uid);
      allow create, update: if me(uid) && id == 'main' && validPrefs(request.resource.data);
    }
    match /users/{uid}/connectedDevices/{id} {
      allow read, delete: if me(uid);
      allow create, update: if me(uid) && validDevice(request.resource.data);
    }
    match /users/{uid}/healthAccessLogs/{id} { allow read: if me(uid); }   // written by the server only
    match /users/{uid}/vaultTokens/{id} { allow read: if me(uid); }        // written by the server only
    match /lifelineHelpers/{uid} { allow read: if me(uid); }               // pilot registration, server-written
    // responderTokens: server only (hashed tokens).
  }
}
