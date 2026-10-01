rules_version = '2';
// Safety Warriors — own database "safetywarriors". Every record belongs to one user; nothing is public.
// Playbooks and the toolkit are bundled in the app; only the profile, contacts and SOS events are stored.
service cloud.firestore {
  match /databases/{database}/documents {
@BASE@
  }
}
