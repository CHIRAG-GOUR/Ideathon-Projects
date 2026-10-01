rules_version = '2';
// She Shield — own database "sheshield". Every record belongs to one user; nothing is public.
service cloud.firestore {
  match /databases/{database}/documents {
@BASE@
    // ---- She Shield ----
    // Shield Mode sessions (on/off) for the protection activity log.
    match /users/{uid}/shieldLog/{id} {
      allow read: if me(uid);
      allow create: if me(uid) && request.resource.data.keys().hasOnly(['type', 'at'])
        && request.resource.data.type in ['on', 'off'] && request.resource.data.at is string;
    }
    // Safety Evidence Vault: notes and file references; files themselves are in Storage (owner-only).
    match /users/{uid}/vault/{id} {
      allow read, delete: if me(uid);
      allow create: if me(uid) && request.resource.data.keys().hasOnly(['kind', 'title', 'text', 'path', 'contentType', 'size', 'at', 'location'])
        && request.resource.data.kind in ['note', 'photo', 'audio']
        && request.resource.data.title is string && request.resource.data.title.size() <= 120
        && (request.resource.data.text == null || (request.resource.data.text is string && request.resource.data.text.size() <= 5000))
        && (request.resource.data.path == null || request.resource.data.path.matches('users/' + uid + '/vault/.*'));
    }
  }
}
