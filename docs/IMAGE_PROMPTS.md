# Generated image prompts

The site ships with hand-built SVG illustrations, so it needs no image files. If you want
AI-generated artwork for the shopkeeper story, use the prompts below, keep one style across
all of them, and then:

1. Save the images as `public/images/shopkeeper-before.webp` and `public/images/shopkeeper-after.webp`
   (landscape, around 16:11, under 300 KB each).
2. Set the paths in `src/lib/assets.ts`.

The Problem section and the Before/After section will then use the images. The After panel
cross-fades from the first image to the second as the visitor scrolls.

## 1. Shopkeeper without smart inventory

> Friendly Indian neighborhood grocery shopkeeper in a small grocery store, visibly overwhelmed by excess inventory, cardboard boxes stacked around the shop, crowded shelves, misplaced grocery products, handwritten stock notes, subtle expiry labels, warm cream and green grocery environment, premium commercial illustration, realistic stylized character, natural expression of concern, clean composition, light background, modern editorial advertising photography/illustration aesthetic, no text, no logos, no dark colors.

## 2. Shopkeeper with smart inventory

> Same friendly Indian neighborhood grocery shopkeeper in the same grocery store, now relaxed and confident, organized shelves, neatly arranged cardboard boxes, clearly organized grocery products, clean warehouse, subtle smart inventory interface elements showing fresh stock and sell-first items, warm cream and fresh green palette, premium commercial illustration, realistic stylized character, natural happy expression, clean modern composition, light background, no text, no logos, no dark colors.

Tip: generate image 2 from image 1 (image-to-image or the same seed) so the shopkeeper and shop match.

## Additional visuals (same art direction)

Add this style suffix to each: *"premium flat commercial illustration, warm cream background, fresh green, mango and tomato accents, soft shadow, no text, no logos, no dark colors"*.

1. Grocery shelf with products arranged in three coloured rows
2. Small grocery warehouse with shelving and cardboard boxes
3. Stack of cardboard stock boxes with paper barcode labels
4. Glass milk bottle with a blue cap
5. Loaf of bread in a paper sleeve
6. Block of paneer in a clear tray
7. Family pack of biscuits
8. Carton of orange juice with a straw
9. 5 kg rice bag
10. Woven grocery basket with fresh products
11. Handheld barcode scanner
12. Friendly shopkeeper in a green apron holding a scanner
