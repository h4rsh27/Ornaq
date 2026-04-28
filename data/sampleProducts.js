const placeholderImages = (name, accent) => [
  {
    url: `https://placehold.co/900x1200/f8efe7/6e4b3a?text=${encodeURIComponent(name)}`,
    publicId: ""
  },
  {
    url: `https://placehold.co/900x1200/${accent}/fff7ef?text=${encodeURIComponent(`${name} Detail`)}`,
    publicId: ""
  }
];

const buildVariants = (name, colors, stock) => {
  const stockPerColor = Math.max(1, Math.ceil(stock / colors.length));
  return colors.map((color, index) => ({
    color,
    hexCode: "",
    stock: stockPerColor,
    sku: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index + 1}`
  }));
};

const buildProduct = ({
  name,
  category,
  fabric,
  colors,
  price,
  stock,
  discount,
  featured = false,
  isNewArrival = false,
  popularityScore,
  accent,
  note
}) => ({
  name,
  category,
  fabric,
  color: colors[0],
  colors,
  variants: buildVariants(name, colors, stock),
  images: placeholderImages(name, accent),
  price,
  stock,
  discount,
  discountPercent: discount,
  featured,
  isNewArrival,
  popularityScore,
  description: `${name} is crafted in ${fabric.toLowerCase()} with ${colors.join(", ").toLowerCase()} tones, designed for ${note}.`,
  serviceablePincodes: [],
  tags: [category.toLowerCase().replace(/\s+/g, "-"), ...(isNewArrival ? ["new-arrival"] : []), ...(featured ? ["featured"] : [])]
});

const paithaniProducts = [
  ["Gulnaar Morbagh Paithani", "Paithani Silk", ["Peacock Blue", "Lotus Pink", "Antique Gold"], 6290, 12, 18, true, true, 94, "996f7a", "wedding rituals and festive heirloom styling"],
  ["Aarini Zari Rekha Paithani", "Paithani Silk", ["Wine", "Rose Gold", "Pearl Beige"], 5890, 11, 15, false, true, 88, "8c5a6c", "family celebrations with a regal pallu"],
  ["Mrunmayi Lotus Border Paithani", "Maheshwari Silk", ["Mustard", "Parrot Green", "Magenta"], 4790, 10, 12, false, false, 82, "ac8d3a", "day functions and graceful festive dressing"],
  ["Vedanshi Rangmahal Paithani", "Soft Silk", ["Royal Purple", "Copper", "Fuchsia"], 5390, 9, 14, true, false, 90, "7b5b9c", "sangeet nights and statement evening looks"],
  ["Ishani Heritage Pallu Paithani", "Vichitra Silk", ["Rani Pink", "Orange", "Gold"], 4590, 14, 10, false, false, 79, "d37a47", "traditional gatherings and festive gifting"],
  ["Pranjali Deepam Paithani", "Paithani Silk", ["Bottle Green", "Amber", "Cream"], 6490, 8, 20, true, true, 97, "4b6b4f", "bridal trousseau curation and temple ceremonies"],
  ["Yutika Saanj Paithani", "Art Silk", ["Indigo", "Mauve", "Silver"], 3990, 13, 11, false, false, 73, "6972a3", "light celebrations and elegant hosting"],
  ["Tanishka Rajwadi Paithani", "Paithani Silk", ["Black", "Crimson", "Old Gold"], 6990, 7, 22, true, true, 99, "403236", "grand receptions and festive portraits"],
  ["Charulata Butti Bloom Paithani", "Soft Silk", ["Teal", "Rose Pink", "Champagne"], 4890, 15, 9, false, false, 76, "5d7f80", "pooja mornings and occasion brunches"],
  ["Madhurima Morpankh Paithani", "Paithani Silk", ["Emerald", "Peach", "Bronze"], 5690, 10, 16, false, true, 86, "567252", "festive evenings with rich woven detail"],
  ["Ruhini Varsa Paithani", "Maheshwari Silk", ["Sky Blue", "Lilac", "Silver"], 4290, 12, 8, false, false, 71, "8099be", "summer celebrations and graceful drape moments"],
  ["Keshavi Peshwai Paithani", "Paithani Silk", ["Maroon", "Tan", "Gold"], 7390, 6, 24, true, true, 100, "7a4941", "premium bridal styling and keepsake wardrobes"]
].map(([name, fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note]) =>
  buildProduct({ name, category: "Paithani", fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note })
);

const silkProducts = [
  ["Aarohi Noor Silk Saree", "Soft Silk", ["Ruby Red", "Blush Pink", "Gold"], 2990, 18, 12, true, true, 85, "8e5a64", "festive lunches and elegant gifting"],
  ["Suhani Temple Weave Silk", "Banarasi Silk Blend", ["Bottle Green", "Copper", "Beige"], 4490, 10, 14, true, false, 81, "5d6d57", "celebration-ready traditional dressing"],
  ["Varnika Chanderi Gleam", "Chanderi Silk", ["Ivory", "Gold", "Sage"], 2590, 16, 9, false, true, 77, "b19e77", "light festive wear with airy structure"],
  ["Ridhima Meenakari Silk", "Kanjivaram Silk Blend", ["Teal", "Magenta", "Gold"], 5190, 9, 18, true, false, 90, "5e7880", "wedding guests and evening receptions"],
  ["Anvika Satin Fall Silk", "Satin Silk", ["Wine", "Mink", "Rose Gold"], 2390, 17, 10, false, false, 69, "7b5b63", "cocktail-ready drape with fluid shine"],
  ["Myra Sunehri Silk Edit", "Soft Silk", ["Mustard", "Coral", "Pearl"], 2790, 15, 11, false, true, 75, "b38a4d", "festive daywear with bright color play"],
  ["Dhriti Kashida Silk", "Art Silk", ["Navy Blue", "Silver", "Pink"], 2190, 20, 8, false, false, 66, "56688d", "budget festive styling with polished finish"],
  ["Eshika Royal Border Silk", "Banarasi Silk Blend", ["Plum", "Bronze", "Gold"], 4690, 8, 16, true, false, 87, "75586e", "family functions and formal celebration wear"],
  ["Meher Anguri Silk Story", "Tissue Silk", ["Champagne", "Mint", "Gold"], 3890, 12, 13, false, true, 80, "b9b09f", "engagements and festive brunch dressing"],
  ["Jivika Moonlight Silk", "Organza Silk", ["Lavender", "Pearl Grey", "Silver"], 3590, 11, 12, false, false, 74, "9a95ac", "soft-glam occasion styling"],
  ["Kiara Gulmohar Silk", "Soft Silk", ["Rani Pink", "Orange", "Gold"], 3290, 14, 15, true, true, 84, "ca6b4f", "vibrant partywear and celebration gifting"],
  ["Tara Utsav Silk Drape", "Satin Silk", ["Onion Pink", "Cocoa", "Champagne"], 2690, 16, 10, false, false, 68, "a17b73", "polished day-to-evening transitions"]
].map(([name, fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note]) =>
  buildProduct({ name, category: "Silk", fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note })
);

const cottonProducts = [
  ["Nirali Handfeel Cotton", "Pure Cotton", ["Ivory", "Navy Blue", "Brick"], 1290, 25, 7, false, true, 58, "90867a", "everyday comfort and office-ready styling"],
  ["Devika Loomline Cotton", "Linen Cotton", ["Steel Grey", "Rose Pink", "White"], 1490, 22, 9, false, false, 61, "868388", "daily rotation with breathable ease"],
  ["Charvi Kora Cotton Select", "Kora Cotton", ["Cream", "Leaf Green", "Rust"], 1790, 18, 10, true, true, 67, "9b8768", "smart daytime wear and simple festive looks"],
  ["Pavani Sunday Cotton", "Mercerized Cotton", ["Sky Blue", "Ivory", "Peach"], 1390, 24, 8, false, false, 55, "87a5ba", "travel-friendly wardrobes and warm-weather dressing"],
  ["Yashika Sutradhar Cotton", "Slub Cotton", ["Coral", "Beige", "Indigo"], 1590, 20, 11, false, true, 63, "b27a6d", "relaxed festive wear with textured appeal"],
  ["Aabha Monsoon Cotton", "Pure Cotton", ["Moss Green", "Ochre", "Cream"], 1190, 28, 6, false, false, 52, "708268", "easy daily wear and lightweight drape"],
  ["Raina Heritage Cotton", "Linen Cotton", ["Maroon", "Sand", "Olive"], 1890, 17, 12, true, false, 65, "8b6557", "subtle traditional styling for day events"],
  ["Saanvi Soft Breeze Cotton", "Mul Cotton", ["Powder Blue", "Lilac", "White"], 999, 30, 5, false, true, 54, "9bb0c8", "summer wardrobes and all-day comfort"],
  ["Trisha Borderline Cotton", "Mercerized Cotton", ["Mustard", "Black", "Cream"], 1690, 21, 9, false, false, 60, "a58c4c", "weekday elegance and festive minimalism"],
  ["Anaya Veda Cotton", "Kota Cotton", ["Mint", "Peach", "Silver"], 2090, 14, 13, true, true, 70, "9bc2b7", "dressier cotton moments with airy finish"],
  ["Ira Daily Grace Cotton", "Slub Cotton", ["Dusty Rose", "Taupe", "Grey"], 1090, 26, 7, false, false, 50, "a58f8d", "practical wardrobes and soft textured styling"],
  ["Lavina Kala Cotton", "Linen Cotton", ["Terracotta", "Olive", "Cream"], 1990, 15, 12, true, true, 72, "ad7655", "modern ethnic dressing with easy movement"]
].map(([name, fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note]) =>
  buildProduct({ name, category: "Cotton", fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note })
);

const weddingProducts = [
  ["Shloka Bridal Noor", "Banarasi Silk", ["Rani Pink", "Gold", "Ruby"], 7990, 8, 20, true, true, 96, "b06b73", "bridal entries and rich celebratory dressing"],
  ["Prisha Vermilion Wedding Saree", "Jacquard Silk", ["Vermilion", "Gold", "Beige"], 6890, 7, 18, true, false, 91, "b06757", "classic wedding ceremonies and family portraits"],
  ["Kiara Shehnai Wedding Silk", "Tissue Silk", ["Champagne", "Rose Gold", "Copper"], 7490, 6, 17, true, true, 93, "c2a48f", "reception nights and luxe occasion styling"],
  ["Madhavi Saptapadi Drape", "Organza Silk", ["Peach", "Gold", "Ivory"], 6290, 9, 15, false, true, 84, "d0a08c", "engagement celebrations and lighter bridal edits"],
  ["Ritwika Maharani Weave", "Banarasi Silk", ["Maroon", "Old Gold", "Olive"], 8990, 5, 22, true, true, 98, "855e55", "grand wedding wardrobes with timeless richness"],
  ["Vaidehi Utsav Bridal", "Kanjivaram Silk Blend", ["Purple", "Magenta", "Gold"], 6990, 8, 16, false, false, 88, "7e6395", "pre-wedding rituals and statement drape moments"],
  ["Nitya Reception Bloom", "Tissue Silk", ["Silver Grey", "Rose", "Champagne"], 6590, 10, 14, false, true, 82, "b7a7a7", "modern receptions and polished evening styling"],
  ["Samaira Rajnigandha Wedding", "Banarasi Silk", ["Emerald", "Champagne", "Gold"], 8490, 5, 21, true, false, 95, "617668", "luxury wedding celebrations and festive portraits"],
  ["Ekaa Phoolwari Bridal Edit", "Organza Silk", ["Blush Pink", "Mint", "Gold"], 5690, 11, 13, false, true, 79, "c79a9a", "engagements with soft floral glamour"],
  ["Aadhira Sangeet Sparkle", "Sequin Silk Blend", ["Midnight Blue", "Silver", "Mauve"], 5990, 12, 12, false, true, 81, "5c6579", "sangeet nights and dance-ready elegance"],
  ["Tvesha Grihalaxmi Wedding", "Jacquard Silk", ["Bottle Green", "Gold", "Rust"], 7190, 7, 16, true, false, 87, "5c6f59", "traditional family weddings and formal hosting"],
  ["Miraa Palki Bridal Saree", "Banarasi Silk", ["Crimson", "Champagne", "Copper"], 9490, 4, 25, true, true, 100, "a75e58", "premium bridal trousseau and heirloom-style dressing"]
].map(([name, fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note]) =>
  buildProduct({ name, category: "Wedding Sarees", fabric, colors, price, stock, discount, featured, isNewArrival, popularityScore, accent, note })
);

export const sampleProducts = [...paithaniProducts, ...silkProducts, ...cottonProducts, ...weddingProducts];
