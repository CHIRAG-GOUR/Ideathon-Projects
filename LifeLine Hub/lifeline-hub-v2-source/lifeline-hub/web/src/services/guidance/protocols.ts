/**
 * AI Guidance — prototype guidance engine (deterministic, runs on the device, works offline).
 *
 * The product vision pairs on-device triage with cloud models for extended guidance. This build implements the
 * on-device part as a rule-based triage engine over standard first-aid steps; no cloud model is configured, and
 * the UI says so. It does not diagnose. For anything high-risk it puts "call emergency services" first.
 * Content follows widely published lay first-aid guidance (e.g. Red Cross / St John Ambulance style steps).
 */
import type { IconName } from '@/ui/icons';

export interface Step { title: string; detail?: string; timerSec?: number; action?: 'call' | 'cpr' }
export interface Branch { steps: Step[]; urgent: boolean; note?: string }
export interface Protocol {
  id: string;
  label: string;
  icon: IconName;
  /** High-risk situations: the first card is always "call emergency services". */
  callFirst: boolean;
  calm: string;
  question?: { text: string; yes: Branch; no: Branch; yesLabel?: string; noLabel?: string };
  branch?: Branch;
  redFlags?: string[];
}

const CPR: Step[] = [
  { title: 'Call emergency services and put the phone on speaker', detail: 'The operator can coach you through CPR.', action: 'call' },
  { title: 'Start chest compressions', detail: 'Heel of your hand in the centre of the chest, other hand on top. Push hard and fast — about 5–6 cm deep, 100–120 a minute.', action: 'cpr' },
  { title: 'Ask someone to find an AED', detail: 'Turn it on and follow its voice instructions.' },
  { title: "Don't stop until help takes over", detail: 'Or until they start breathing normally.' },
];

export const PROTOCOLS: Protocol[] = [
  {
    id: 'accident', label: 'Accident', icon: 'ambulance', callFirst: true,
    calm: "First, make sure you're safe.",
    question: {
      text: 'Is the person responsive? Speak to them and gently tap their shoulder.',
      yes: { urgent: true, steps: [
        { title: 'Make the scene safe', detail: 'Hazard lights on, warn traffic. Stay out of the road.' },
        { title: 'Call emergency services', detail: 'Say exactly where you are and how many people are hurt.', action: 'call' },
        { title: "Don't move them unless they're in danger", detail: 'Keep the head and neck still. Leave a motorcycle helmet on unless they cannot breathe.' },
        { title: 'Press on any heavy bleeding', detail: 'Firm, steady pressure with a clean cloth.' },
        { title: 'Keep them warm and keep talking', detail: 'Reassure them that help is on the way.' },
      ] },
      no: { urgent: true, note: 'Unresponsive after an accident is an emergency.', steps: [
        { title: 'Call emergency services now', detail: 'Phone on speaker so your hands are free.', action: 'call' },
        { title: 'Check breathing for up to 10 seconds', detail: 'Look at the chest, listen and feel for normal breaths.', timerSec: 10 },
        { title: 'Not breathing normally? Start CPR', detail: 'Push hard and fast in the centre of the chest, 100–120 a minute.', action: 'cpr' },
        { title: 'Breathing? Keep the airway open', detail: 'Only roll them onto their side if they may choke — keep head and neck in line.' },
      ] },
    },
  },
  {
    id: 'bleeding', label: 'Heavy bleeding', icon: 'blood', callFirst: true,
    calm: 'Pressure stops bleeding. You can do this.',
    branch: { urgent: true, steps: [
      { title: 'Call emergency services', action: 'call' },
      { title: 'Press firmly on the wound', detail: 'Use a clean cloth or your hand. Wear gloves if you have them.' },
      { title: 'Keep pressing — don’t lift to look', detail: 'If blood soaks through, add more cloth on top. Don’t remove the first layer.', timerSec: 600 },
      { title: 'Lie them down and keep them warm' },
      { title: 'Leave embedded objects in place', detail: 'Press around them, not on them.' },
    ] },
    redFlags: ['Blood spurting or pooling', 'They become pale, cold or confused'],
  },
  {
    id: 'unconscious', label: 'Unconscious person', icon: 'pulse', callFirst: true,
    calm: "Stay with them. Let's check their breathing.",
    question: {
      text: 'Are they breathing normally? Look, listen and feel for up to 10 seconds.',
      yesLabel: 'Breathing normally', noLabel: 'Not breathing / not sure',
      yes: { urgent: true, steps: [
        { title: 'Call emergency services', action: 'call' },
        { title: 'Put them in the recovery position', detail: 'On their side, top knee bent, head tilted back so the airway stays open — unless you suspect a neck or back injury.' },
        { title: 'Keep checking their breathing', detail: 'If it stops or becomes abnormal, start CPR.' },
      ] },
      no: { urgent: true, note: 'Not breathing normally means CPR now.', steps: CPR },
    },
  },
  {
    id: 'chest', label: 'Chest pain', icon: 'heart', callFirst: true,
    calm: 'Keep them calm and still. Help is the priority.',
    branch: { urgent: true, steps: [
      { title: 'Call emergency services now', detail: "Don't drive them yourself unless the operator says to.", action: 'call' },
      { title: 'Help them sit and rest', detail: 'A half-sitting position with knees bent is often most comfortable.' },
      { title: 'Loosen tight clothing' },
      { title: 'Their own heart medicine', detail: 'If they have prescribed medicine (such as a GTN spray), help them take it.' },
      { title: 'Aspirin only if the operator advises it', detail: 'And only if they are not allergic to it.' },
      { title: 'If they collapse and stop breathing normally', detail: 'Start CPR.', action: 'cpr' },
    ] },
  },
  {
    id: 'breathing', label: 'Breathing difficulty', icon: 'spark', callFirst: false,
    calm: 'Slow, steady breaths. Stay with them.',
    question: {
      text: 'Can they speak in full sentences?',
      yesLabel: 'Yes, full sentences', noLabel: 'No — only a few words',
      yes: { urgent: false, steps: [
        { title: 'Sit them upright', detail: 'Leaning slightly forward often helps.' },
        { title: 'Help them use their own inhaler', detail: 'If they have one for asthma.' },
        { title: 'Breathe slowly with them', detail: 'In through the nose, out through pursed lips.' },
        { title: 'Call emergency services if it doesn’t ease', detail: 'Or if their lips turn blue or they get drowsy.', action: 'call' },
      ] },
      no: { urgent: true, note: 'Struggling to speak is a sign of a severe breathing problem.', steps: [
        { title: 'Call emergency services now', action: 'call' },
        { title: 'Sit them upright, leaning forward' },
        { title: 'Use their own medicine', detail: 'Inhaler for asthma; adrenaline auto-injector for a severe allergic reaction, if they carry one.' },
        { title: 'If they stop breathing normally', detail: 'Start CPR.', action: 'cpr' },
      ] },
    },
  },
  {
    id: 'burn', label: 'Burn', icon: 'fire', callFirst: false,
    calm: 'Cool water first. Every minute of cooling helps.',
    branch: { urgent: false, steps: [
      { title: 'Cool the burn under running water', detail: 'Cool, not ice-cold, for 20 minutes.', timerSec: 1200 },
      { title: 'Remove rings, watches, tight clothing nearby', detail: 'Unless they are stuck to the skin.' },
      { title: 'Cover loosely', detail: 'Cling film or a clean, non-fluffy cloth.' },
      { title: "Don't use ice, butter or creams", detail: "Don't burst blisters." },
    ] },
    redFlags: ['Large burn, or on face, hands, feet or groin', 'Electrical or chemical burn', 'A child or older person'],
  },
  {
    id: 'fall', label: 'Fall', icon: 'alert', callFirst: false,
    calm: "Don't rush them up. Let's check first.",
    question: {
      text: 'Did they hit their head, or do they have neck or back pain?',
      yes: { urgent: true, steps: [
        { title: "Don't move them", detail: 'Keep the head and neck still.' },
        { title: 'Call emergency services', action: 'call' },
        { title: 'Watch for warning signs', detail: 'Drowsiness, vomiting, confusion, worsening headache.' },
        { title: 'Keep them warm and talk to them' },
      ] },
      no: { urgent: false, steps: [
        { title: 'Help them get comfortable', detail: 'Only stand up when they feel ready.' },
        { title: 'Check for injuries', detail: 'Pain, swelling, or a limb at an odd angle.' },
        { title: 'Cold pack on bruises', detail: 'Wrapped in cloth, 10–20 minutes.' },
        { title: 'Get medical care if pain worsens', detail: "Or if they can't put weight on a leg." },
      ] },
    },
  },
  {
    id: 'other', label: 'Other', icon: 'more', callFirst: false,
    calm: "Take a breath. If you're unsure, calling is always right.",
    branch: { urgent: false, steps: [
      { title: 'Make sure you are safe' },
      { title: 'If in doubt, call emergency services', detail: 'Describe what you see; the operator will guide you.', action: 'call' },
      { title: 'Share their Health Vault with responders', detail: 'Allergies, medications and conditions help them decide faster.' },
      { title: 'Stay with them until help arrives' },
    ] },
  },
];

export const DISCLAIMER = 'Emergency guidance, not a diagnosis. It does not replace professional medical care — when in doubt, call emergency services.';
