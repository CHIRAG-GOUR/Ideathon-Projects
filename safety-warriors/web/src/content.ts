// Safety Warriors content: emergency playbooks and the safety toolkit.
// General safety guidance written for the app — not professional, legal or medical advice.
// Every step is one of three kinds, always labelled in the UI:
//   info   → guidance to read          do → something you do yourself
//   action → a real emergency action the app performs when you tap it (call, SOS, share location, nearby help)

export type Situation = 'harassment' | 'stalking' | 'unsafe_public' | 'following' | 'medical' | 'domestic' | 'lost' | 'general';
/** Lines resolve to the user's region; outside India every helpline falls back to the region's emergency number. */
export type Line = 'emergency' | 'women' | 'women_police' | 'ambulance' | 'cyber' | 'child';
export type Action = { kind: 'sos' } | { kind: 'silent' } | { kind: 'call'; line: Line } | { kind: 'callTrusted' } | { kind: 'share' } | { kind: 'nearby' };
export interface Step { kind: 'info' | 'do' | 'action'; title: string; text?: string; action?: Action }
export interface Playbook { id: Situation; title: string; short: string; urgent: boolean; color: 'sos' | 'tang' | 'teal' | 'indigo' | 'emerald'; steps: Step[] }

export const INDIA_LINES: Record<Exclude<Line, 'emergency'>, { number: string; label: string }> = {
  women: { number: '181', label: 'Women Helpline' },
  women_police: { number: '1091', label: 'Women Helpline (Police)' },
  ambulance: { number: '108', label: 'Ambulance' },
  cyber: { number: '1930', label: 'Cyber Crime Helpline' },
  child: { number: '1098', label: 'Childline' },
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'following', title: 'Someone is following me', short: 'Right now, on foot or in a vehicle', urgent: true, color: 'sos',
    steps: [
      { kind: 'do', title: 'Head towards people and light', text: 'Move to a busy, well-lit place — a shop, petrol pump, hospital, hotel lobby or metro station. Avoid shortcuts, empty lanes and going straight home.' },
      { kind: 'action', title: 'Share your location', text: 'Send your exact position to your trusted person now. (A full SOS keeps it updating live.)', action: { kind: 'share' } },
      { kind: 'do', title: 'Check, without confronting', text: 'Cross the road or change direction once. If the same person changes with you, treat it as real.' },
      { kind: 'action', title: 'Call your trusted person', text: 'Stay on the phone and describe where you are and what you see.', action: { kind: 'callTrusted' } },
      { kind: 'do', title: 'Ask for help out loud', text: 'Tell a shopkeeper, guard or a group of people that you are being followed. Staff can let you wait inside.' },
      { kind: 'action', title: 'If you feel in danger, start SOS', text: 'Alerts your contacts with your location and keeps updating it.', action: { kind: 'sos' } },
      { kind: 'action', title: 'Call emergency services', action: { kind: 'call', line: 'emergency' } },
      { kind: 'info', title: 'Remember details', text: 'Clothing, height, vehicle colour and number plate. Write them down later in a safe place.' },
    ],
  },
  {
    id: 'harassment', title: 'Harassment in public', short: 'Comments, touching, threats, being cornered', urgent: false, color: 'tang',
    steps: [
      { kind: 'info', title: 'Your safety comes first', text: 'You do not have to respond or explain. Moving away is always a valid choice.' },
      { kind: 'do', title: 'Create distance and move to others', text: 'Step towards other people, staff, a conductor or driver, or a women-only coach or seat where available.' },
      { kind: 'do', title: 'Use a firm, loud voice if you choose', text: '"Stop. Move away from me." Saying it loudly draws attention from people nearby.' },
      { kind: 'action', title: 'Call the Women Helpline', text: 'Trained responders can advise you and help arrange assistance.', action: { kind: 'call', line: 'women' } },
      { kind: 'action', title: 'If you are threatened or touched, start SOS', action: { kind: 'sos' } },
      { kind: 'do', title: 'Note what happened', text: 'Time, place, description of the person, and any witnesses. Only take photos if it is safe.' },
      { kind: 'info', title: 'Reporting is your choice', text: 'You can report to the police later. Writing details down soon helps if you decide to.' },
    ],
  },
  {
    id: 'stalking', title: 'Being stalked', short: 'Repeated following, contact or watching', urgent: false, color: 'indigo',
    steps: [
      { kind: 'info', title: 'Take it seriously', text: 'Repeated unwanted following, messaging or watching is a pattern, not a coincidence. Trust your instinct.' },
      { kind: 'do', title: 'Tell people you trust', text: 'Family, friends, flatmates, your workplace or campus security. The more people who know, the safer you are.' },
      { kind: 'do', title: 'Keep a record', text: 'Dates, times, places, screenshots of messages and calls. Save copies somewhere the person cannot access.' },
      { kind: 'do', title: 'Vary your routine', text: 'Change routes and timings where you can, and avoid sharing live plans on social media.' },
      { kind: 'do', title: 'Secure your accounts', text: 'Change passwords, turn on two-step verification and review location sharing on apps.' },
      { kind: 'action', title: 'Call the Women Helpline (Police)', text: 'For advice on reporting and protection.', action: { kind: 'call', line: 'women_police' } },
      { kind: 'action', title: 'If they approach you now, start SOS', action: { kind: 'sos' } },
    ],
  },
  {
    id: 'unsafe_public', title: 'Unsafe public situation', short: 'Fights, crowds, isolated spots, a bad feeling', urgent: false, color: 'teal',
    steps: [
      { kind: 'do', title: 'Leave early', text: 'If something feels wrong, go before it escalates. You do not need a reason.' },
      { kind: 'do', title: 'Move to staffed places', text: 'Station counters, security desks, shops and help desks have people who can help.' },
      { kind: 'action', title: 'Find nearby help', text: 'Police stations, hospitals and pharmacies around you.', action: { kind: 'nearby' } },
      { kind: 'action', title: 'Share your location', action: { kind: 'share' } },
      { kind: 'info', title: 'In a dense crowd', text: 'Move diagonally towards the edge, keep your arms up in front of your chest, and avoid walls and barriers.' },
      { kind: 'action', title: 'If anyone is hurt or in danger, call emergency services', action: { kind: 'call', line: 'emergency' } },
    ],
  },
  {
    id: 'medical', title: 'Medical emergency', short: 'Collapse, severe pain, breathing trouble', urgent: true, color: 'sos',
    steps: [
      { kind: 'action', title: 'Call an ambulance', text: 'Say where you are, what happened, and the person\'s age if known.', action: { kind: 'call', line: 'ambulance' } },
      { kind: 'do', title: 'Make the area safe', text: 'Check for traffic, fire or electricity before you go closer.' },
      { kind: 'do', title: 'Check response and breathing', text: 'Speak loudly and tap their shoulders. Look for normal breathing.' },
      { kind: 'info', title: 'Follow the dispatcher', text: 'Emergency call-takers can guide you through first aid step by step. Keep the phone on speaker.' },
      { kind: 'do', title: 'Send someone to guide the ambulance', text: 'Ask a bystander to wait at the gate or roadside.' },
      { kind: 'action', title: 'Alert your contacts with your location', action: { kind: 'sos' } },
      { kind: 'info', title: 'This is not medical advice', text: 'Only trained responders can assess a medical emergency. Get professional help as quickly as possible.' },
    ],
  },
  {
    id: 'domestic', title: 'Domestic concern', short: 'Feeling unsafe at home', urgent: false, color: 'indigo',
    steps: [
      { kind: 'info', title: 'You deserve to be safe', text: 'Abuse can be physical, verbal, emotional, sexual or financial. Help is available confidentially.' },
      { kind: 'do', title: 'Plan a safe exit', text: 'Know which rooms have an exit, avoid rooms with weapons such as the kitchen during an argument, and keep your phone charged.' },
      { kind: 'do', title: 'Keep essentials ready', text: 'ID, money, medicines, keys and important documents — or copies — somewhere you can reach quickly, or with someone you trust.' },
      { kind: 'do', title: 'Agree a code word', text: 'Choose a word with a trusted person that means "call for help for me".' },
      { kind: 'action', title: 'Call the Women Helpline', text: '181 offers confidential support and can connect you to local services.', action: { kind: 'call', line: 'women' } },
      { kind: 'action', title: 'If you are in danger now, send a silent SOS', text: 'No siren — contacts are texted that you may not be able to talk.', action: { kind: 'silent' } },
      { kind: 'info', title: 'Your phone may be checked', text: 'If someone monitors your phone, consider using this app with a lock and clearing history in Privacy.' },
    ],
  },
  {
    id: 'lost', title: 'Lost or disoriented', short: 'Unfamiliar place, phone low, no transport', urgent: false, color: 'emerald',
    steps: [
      { kind: 'do', title: 'Stop somewhere safe', text: 'A shop, café, station or hotel. Stay where there are people and light.' },
      { kind: 'action', title: 'Share your location', text: 'Send your exact position to someone you trust.', action: { kind: 'share' } },
      { kind: 'do', title: 'Save battery', text: 'Lower brightness, close apps, turn on battery saver. Keep enough charge for a call.' },
      { kind: 'action', title: 'Find nearby help', action: { kind: 'nearby' } },
      { kind: 'do', title: 'Use official transport', text: 'Prepaid taxi counters, metro, or app rides — share the trip details with someone.' },
      { kind: 'action', title: 'Call your trusted person', action: { kind: 'callTrusted' } },
    ],
  },
  {
    id: 'general', title: 'General emergency', short: 'Anything else that feels dangerous', urgent: true, color: 'sos',
    steps: [
      { kind: 'action', title: 'Start SOS', text: 'Siren, live location and alerts to your trusted contacts.', action: { kind: 'sos' } },
      { kind: 'action', title: 'Call emergency services', text: 'Police, fire and ambulance.', action: { kind: 'call', line: 'emergency' } },
      { kind: 'do', title: 'Get to a safer place if you can', text: 'Away from the danger and towards other people.' },
      { kind: 'do', title: 'Say where you are clearly', text: 'Landmarks, building names, floor, road name. Your SOS screen shows your coordinates.' },
      { kind: 'info', title: 'Stay on the line', text: 'Follow instructions from emergency services and keep your phone with you.' },
    ],
  },
];

export type ToolCategory = 'personal' | 'public' | 'emergency' | 'medical' | 'digital' | 'harassment' | 'stalking';
export interface Tool { id: ToolCategory; title: string; blurb: string; color: Playbook['color']; tips: { t: string; d: string }[]; playbooks: Situation[]; lines?: Line[] }

export const TOOLKIT: Tool[] = [
  { id: 'personal', title: 'Personal safety', blurb: 'Everyday habits that keep you prepared', color: 'teal', playbooks: ['following', 'lost'], tips: [
    { t: 'Tell someone your plans', d: 'Where you are going, with whom, and when you expect to be back.' },
    { t: 'Keep your phone charged', d: 'Carry a power bank on long days and late nights.' },
    { t: 'Trust your instincts', d: 'If a person or place feels wrong, leave. You owe no one an explanation.' },
    { t: 'Keep cash and an ID separately', d: 'So losing your bag or phone does not leave you stranded.' },
  ] },
  { id: 'public', title: 'Public spaces & transport', blurb: 'Streets, buses, metros and cabs', color: 'emerald', playbooks: ['unsafe_public', 'harassment'], tips: [
    { t: 'Check the cab before you sit', d: 'Match the number plate, driver photo and name. Share the ride details with someone.' },
    { t: 'Sit near others', d: 'Near the driver or conductor, or in women-only coaches where available.' },
    { t: 'Know your exits', d: 'In stations, malls and venues, note where the exits and staff are.' },
    { t: 'Stay alert with earphones', d: 'Keep one ear free or volume low in unfamiliar places.' },
  ] },
  { id: 'emergency', title: 'Emergency basics', blurb: 'What to do in the first minutes', color: 'sos', playbooks: ['general', 'following'], lines: ['emergency', 'women'], tips: [
    { t: 'Know your numbers', d: 'In India, 112 connects police, fire and ambulance. 181 is the Women Helpline.' },
    { t: 'Say your location first', d: 'Landmarks, road, building and floor. Then what is happening.' },
    { t: 'Practise SOS once', d: 'Use demo mode to see what happens — it sends nothing.' },
  ] },
  { id: 'medical', title: 'Medical preparedness', blurb: 'Be ready for health emergencies', color: 'tang', playbooks: ['medical'], lines: ['ambulance'], tips: [
    { t: 'Save your medical details', d: 'Blood group, allergies and medicines in Settings — shared with contacts only during an SOS if you allow it.' },
    { t: 'Learn basic first aid', d: 'A certified first-aid course is the best preparation. This app is not a substitute.' },
    { t: 'Know the nearest hospital', d: 'Use Nearby Help to find hospitals and pharmacies around you.' },
  ] },
  { id: 'digital', title: 'Digital safety', blurb: 'Accounts, location sharing and online abuse', color: 'indigo', playbooks: ['stalking'], lines: ['cyber'], tips: [
    { t: 'Turn on two-step verification', d: 'On email, social media and banking apps.' },
    { t: 'Review who sees your location', d: 'Check maps, social apps and family-sharing settings regularly.' },
    { t: 'Do not share live plans publicly', d: 'Post about places after you have left them.' },
    { t: 'Report online abuse', d: 'In India, call 1930 or use cybercrime.gov.in. Save screenshots first.' },
  ] },
  { id: 'harassment', title: 'Harassment', blurb: 'Responding in the moment and after', color: 'tang', playbooks: ['harassment'], lines: ['women', 'women_police'], tips: [
    { t: 'Move towards people', d: 'Staff, families, groups. Distance and witnesses help.' },
    { t: 'A loud, clear "Stop"', d: 'If you choose to respond, be loud and brief, then move away.' },
    { t: 'Write it down afterwards', d: 'Time, place, description and witnesses help if you decide to report.' },
  ] },
  { id: 'stalking', title: 'Stalking', blurb: 'When it keeps happening', color: 'indigo', playbooks: ['stalking', 'following'], lines: ['women_police', 'cyber'], tips: [
    { t: 'Keep a log', d: 'Dates, times, places and screenshots — stored where the person cannot reach them.' },
    { t: 'Tell your circle', d: 'Family, friends, workplace or campus security.' },
    { t: 'Change routines', d: 'Different routes and timings where possible.' },
  ] },
];

export const DISCLAIMER = 'General safety guidance, not professional, legal or medical advice. In danger, contact emergency services.';
