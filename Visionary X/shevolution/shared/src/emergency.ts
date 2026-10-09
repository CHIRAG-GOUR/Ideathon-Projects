// EmergencyNumberService: official emergency numbers by region. India is the first-class configuration.
// Shevolution does not have its own link into any government control room; these are the public routes.

export interface EmergencyLine {
  label: string;
  number: string;
  note?: string;
}

export interface RegionConfig {
  region: string;
  name: string;
  primary: EmergencyLine;
  others: EmergencyLine[];
  /** Official integration for sending the event itself (not just a call). None exist in this build. */
  authorityIntegration: null | { id: string; name: string };
  timeZone: string;
}

const REGIONS: Record<string, RegionConfig> = {
  IN: {
    region: 'IN',
    name: 'India',
    primary: { label: 'Emergency (ERSS)', number: '112', note: 'Police, fire and ambulance. 112 supports voice, SMS and the 112 India app.' },
    others: [
      { label: 'Women helpline', number: '181' },
      { label: 'Women helpline (police)', number: '1091' },
      { label: 'Ambulance', number: '108' },
      { label: 'Fire', number: '101' },
    ],
    authorityIntegration: null,
    timeZone: 'Asia/Kolkata',
  },
  US: { region: 'US', name: 'United States', primary: { label: 'Emergency', number: '911' }, others: [], authorityIntegration: null, timeZone: 'America/New_York' },
  CA: { region: 'CA', name: 'Canada', primary: { label: 'Emergency', number: '911' }, others: [], authorityIntegration: null, timeZone: 'America/Toronto' },
  GB: { region: 'GB', name: 'United Kingdom', primary: { label: 'Emergency', number: '999' }, others: [{ label: 'Emergency (EU standard)', number: '112' }], authorityIntegration: null, timeZone: 'Europe/London' },
  AU: { region: 'AU', name: 'Australia', primary: { label: 'Emergency', number: '000' }, others: [{ label: 'Mobile emergency', number: '112' }], authorityIntegration: null, timeZone: 'Australia/Sydney' },
  NZ: { region: 'NZ', name: 'New Zealand', primary: { label: 'Emergency', number: '111' }, others: [], authorityIntegration: null, timeZone: 'Pacific/Auckland' },
  AE: { region: 'AE', name: 'United Arab Emirates', primary: { label: 'Police', number: '999' }, others: [{ label: 'Ambulance', number: '998' }, { label: 'Fire', number: '997' }], authorityIntegration: null, timeZone: 'Asia/Dubai' },
  SG: { region: 'SG', name: 'Singapore', primary: { label: 'Police', number: '999' }, others: [{ label: 'Ambulance & fire', number: '995' }], authorityIntegration: null, timeZone: 'Asia/Singapore' },
};

const FALLBACK: RegionConfig = {
  region: 'XX',
  name: 'Other region',
  primary: { label: 'Emergency', number: '112', note: 'GSM standard: most mobile networks route 112 to the local emergency service. Check your local number.' },
  others: [],
  authorityIntegration: null,
  timeZone: 'UTC',
};

export const EmergencyNumberService = {
  forRegion(region: string | null | undefined): RegionConfig {
    return (region && REGIONS[region.toUpperCase()]) || FALLBACK;
  },
  regions(): RegionConfig[] {
    return Object.values(REGIONS);
  },
  /** True for numbers Android will only ever open in the dialer (apps cannot place these calls silently). */
  isEmergencyNumber(number: string): boolean {
    const n = number.replace(/[^\d]/g, '');
    return [...Object.values(REGIONS), FALLBACK].some((r) => [r.primary, ...r.others].some((l) => l.number === n));
  },
};
