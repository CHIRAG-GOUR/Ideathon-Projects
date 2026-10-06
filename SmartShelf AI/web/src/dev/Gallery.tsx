// Development-only artwork gallery (served by `npm run dev` at /?gallery). Not included in production builds.
import { ProductArt } from '../art/ProductArt';
import { CategoryScene, CheckoutIllustration, ExpiryIllustration, ForecastIllustration, HealthyShelfIllustration, QuietShelfIllustration, RestockIllustration, StoreAisleIllustration, StorefrontMini, AisleMarker } from '../art/scenes';
import { DEMO_PROFILES } from '../engine/demo';
import { CATEGORIES } from '../engine/types';

export default function Gallery() {
  return (
    <div className="space-y-6 bg-cream p-6">
      <div className="grid grid-cols-8 gap-3">
        {DEMO_PROFILES.map(([name, category]) => (
          <div key={name} className="flex flex-col items-center rounded-xl bg-surface p-2 text-center text-[10px]"><ProductArt product={{ name, category }} size={96} />{name}</div>
        ))}
      </div>
      <div className="grid grid-cols-9 gap-3">{CATEGORIES.map((c) => <div key={c} className="flex flex-col items-center rounded-xl bg-surface p-2 text-[11px]"><CategoryScene category={c} />{c}</div>)}</div>
      <div className="grid grid-cols-2 gap-4">
        <StoreAisleIllustration className="overflow-hidden rounded-3xl"><AisleMarker x={17} y={40} tone="red" label="2 Restock" pulse /><AisleMarker x={45} y={52} tone="green" label="Healthy" /></StoreAisleIllustration>
        <div className="flex flex-wrap items-center gap-4 rounded-3xl bg-green-dark p-6">
          <StorefrontMini className="w-40" /><RestockIllustration /><ExpiryIllustration /><QuietShelfIllustration /><HealthyShelfIllustration /><ForecastIllustration /><CheckoutIllustration className="w-72" />
        </div>
      </div>
    </div>
  );
}
