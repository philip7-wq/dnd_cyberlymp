// ============================================================
// Seed the items table with the 581 Cyberpunk RED entries.
// Run once after schema.sql is applied:
//   npm install
//   npm run seed
// Requires SUPABASE_SERVICE_ROLE_KEY in .env (bypasses RLS).
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import 'dotenv/config';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
});

const raw = JSON.parse(readFileSync('./db/items.json', 'utf8'));
const items = raw.items;

// Core columns mapped directly; everything else lands in `extra` jsonb.
const coreKeys = new Set([
  'id', 'name', 'category', 'subcategory', 'price', 'price_options',
  'currency', 'price_category', 'raw_cost', 'damage', 'rof', 'hands',
  'ammo', 'notes', 'source'
]);

const rows = items.map(item => {
  const extra = {};
  for (const [k, v] of Object.entries(item)) {
    if (!coreKeys.has(k) && v !== null) extra[k] = v;
  }
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    subcategory: item.subcategory,
    price: item.price,
    price_options: item.price_options,
    currency: item.currency,
    price_category: item.price_category,
    raw_cost: item.raw_cost,
    damage: item.damage,
    rof: typeof item.rof === 'number' ? item.rof : null,
    hands: item.hands != null ? String(item.hands) : null,
    ammo: item.ammo,
    notes: item.notes,
    source: item.source,
    extra
  };
});

console.log(`Seeding ${rows.length} items…`);

const CHUNK = 200;
for (let i = 0; i < rows.length; i += CHUNK) {
  const chunk = rows.slice(i, i + CHUNK);
  const { error } = await supabase
    .from('items')
    .upsert(chunk, { onConflict: 'id' });
  if (error) {
    console.error(`Chunk ${i}-${i + chunk.length} failed:`, error);
    process.exit(1);
  }
  console.log(`  ${i + chunk.length}/${rows.length}`);
}

console.log('✓ Done.');
