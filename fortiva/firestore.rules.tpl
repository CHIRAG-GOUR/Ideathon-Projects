rules_version = '2';
// Fortiva — own database "fortiva". Every record belongs to one user; nothing is public.
service cloud.firestore {
  match /databases/{database}/documents {
@BASE@
    // ---- Fortiva ----
    // Incident Journal: the user's own dated notes about incidents (text only), kept until they delete them.
    match /users/{uid}/incidents/{id} {
      allow read, delete: if me(uid);
      allow create, update: if me(uid) && request.resource.data.keys().hasOnly(['title', 'text', 'category', 'happenedAt', 'place', 'location', 'createdAt'])
        && request.resource.data.title is string && request.resource.data.title.size() >= 1 && request.resource.data.title.size() <= 120
        && request.resource.data.text is string && request.resource.data.text.size() <= 5000
        && request.resource.data.category in ['harassment', 'following', 'unsafe_place', 'verbal', 'online', 'other']
        && request.resource.data.happenedAt is string && request.resource.data.createdAt is string
        && (request.resource.data.place == null || (request.resource.data.place is string && request.resource.data.place.size() <= 200));
    }
  }
}
