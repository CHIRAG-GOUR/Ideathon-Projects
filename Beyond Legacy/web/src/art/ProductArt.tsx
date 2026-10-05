// Picks the illustration for a product from its name and category, with stable per-product packaging colours.
import type { Category, Product } from '../engine/types';
import { ART, hashIndex } from './palette';
import * as P from './products';

const PACK = [ART.red, ART.green, ART.blue, ART.orange, ART.purple, ART.teal, ART.yellow];

export function ProductArt({ product, size = 64, className }: { product: Pick<Product, 'name' | 'category'>; size?: number; className?: string }) {
  const n = product.name.toLowerCase();
  const pack = PACK[hashIndex(product.name, PACK.length)];
  const alt = PACK[(hashIndex(product.name, PACK.length) + 3) % PACK.length];
  const p = { size, className };
  const has = (...k: string[]) => k.some((x) => new RegExp(`\\b${x}`).test(n)); // word starts only: 'chocolate' is not 'cola'

  if (has('coffee')) return <P.ColdCoffee {...p} />;
  if (has('coconut')) return <P.Carton {...p} color={ART.green} top={ART.paper} label="COCO" />;
  if (has('water')) return <P.Bottle {...p} liquid={ART.sky} cap={ART.blue} accent={ART.blue} />;
  if (has('cola', 'soda', 'energy', 'can')) return <P.Can {...p} color={has('energy') ? ART.greenDark : has('lemon') ? ART.yellow : ART.red} accent={has('energy') ? ART.yellow : has('lemon') ? ART.green : ART.yellow} />;
  if (has('juice')) return <P.Carton {...p} color={ART.orange} top={ART.paper} label="JUICE" />;
  if (has('lassi', 'buttermilk')) return <P.Carton {...p} color={ART.yellow} top={ART.paper} label="LASSI" />;
  if (has('iced tea', 'tea lemon')) return <P.Bottle {...p} liquid={ART.caramel} cap={ART.yellow} accent={ART.orange} />;
  if (has('ketchup')) return <P.Bottle {...p} liquid={ART.red} cap={ART.redDark} accent={ART.green} clear={false} />;
  if (has('milk')) return <P.Carton {...p} color={ART.blue} top={ART.white} label="MILK" />;
  if (has('curd', 'yogurt', 'dahi')) return <P.Tub {...p} color={ART.blue} />;
  if (has('paneer') && has('wrap')) return <P.Wrap {...p} />;
  if (has('paneer')) return <P.BlockPack {...p} color={ART.green} label="PANEER" />;
  if (has('butter') && !has('peanut') && !has('croissant')) return <P.BlockPack {...p} color={ART.yellow} label="BUTTER" />;
  if (has('cheese') && !has('nacho')) return <P.BlockPack {...p} color={ART.orange} label="CHEESE" />;
  if (has('egg')) return <P.EggBox {...p} />;
  if (has('muffin')) return <P.Muffin {...p} />;
  if (has('croissant')) return <P.Croissant {...p} />;
  if (has('bread', 'loaf', 'bun')) return <P.BreadLoaf {...p} />;
  if (has('cake')) return <P.CakeSlice {...p} />;
  if (has('sandwich')) return <P.Sandwich {...p} />;
  if (has('wrap', 'roll')) return <P.Wrap {...p} />;
  if (has('samosa', 'puff')) return <P.Samosa {...p} />;
  if (has('noodles cup', 'cup noodle')) return <P.NoodleCup {...p} color={ART.red} />;
  if (has('biryani', 'bowl', 'rice bowl', 'meal')) return <P.Bowl {...p} />;
  if (has('noodle')) return <P.NoodleCup {...p} color={ART.orange} />;
  if (has('chocolate bar', 'choco bar') || (has('chocolate') && !has('biscuit', 'muffin', 'cookie'))) return <P.ChocolateBar {...p} wrap={ART.purple} />;
  if (has('biscuit', 'cookie')) return <P.BiscuitPack {...p} wrap={has('chocolate') ? ART.brown : ART.blue} />;
  if (has('chips', 'nacho', 'popcorn', 'crisps')) return <P.ChipsBag {...p} color={has('nacho') ? ART.orange : has('popcorn') ? ART.red : ART.yellow} accent={has('popcorn') ? ART.yellow : ART.red} />;
  if (has('peanut butter', 'jam', 'spread', 'honey')) return <P.Jar {...p} />;
  if (has('peanut', 'gum', 'mint', 'nuts', 'trail')) return <P.ChipsBag {...p} small color={has('gum', 'mint') ? ART.teal : ART.orange} accent={ART.greenDark} />;
  if (has('rice')) return <P.Box {...p} color={ART.greenDark} accent={ART.yellow} label="RICE" />;
  if (has('oats')) return <P.Box {...p} color={ART.orange} accent={ART.yellow} label="OATS" />;
  if (has('tea')) return <P.Box {...p} color={ART.green} accent={ART.yellow} label="TEA" />;
  if (has('toothpaste')) return <P.Tube {...p} color={ART.teal} />;
  if (has('sanitizer', 'shampoo', 'dishwash', 'liquid', 'handwash', 'lotion')) return <P.PumpBottle {...p} liquid={has('dish') ? ART.yellow : has('shampoo') ? ART.purple : ART.teal} />;
  if (has('soap')) return <P.SoapBar {...p} />;
  if (has('tissue', 'napkin')) return <P.TissueBox {...p} color={ART.teal} />;
  if (has('cup')) return <P.CupStack {...p} />;
  if (has('garbage', 'bag')) return <P.TissueBox {...p} color={ART.greenDark} />;
  if (has('batter', 'cable', 'charger', 'bulb')) return <P.BlisterPack {...p} color={has('cable') ? ART.sky : ART.yellow} />;
  return byCategory(product.category, p, pack, alt);
}

function byCategory(c: Category, p: { size: number; className?: string }, pack: string, alt: string) {
  switch (c) {
    case 'Beverages': return <P.Bottle {...p} liquid={pack} cap={alt} accent={pack} />;
    case 'Snacks': return <P.ChipsBag {...p} color={pack} accent={alt} />;
    case 'Dairy': return <P.Carton {...p} color={pack} />;
    case 'Bakery': return <P.Muffin {...p} />;
    case 'Ready-to-Eat': return <P.Bowl {...p} />;
    case 'Packaged Food': return <P.Box {...p} color={pack} accent={ART.yellow} label="PANTRY" />;
    case 'Personal Care': return <P.PumpBottle {...p} liquid={pack} />;
    case 'Household': return <P.TissueBox {...p} color={pack} />;
    default: return <P.BlisterPack {...p} />;
  }
}
