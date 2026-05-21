// ============================================================
// Supabase client + all DB/Storage helpers.
// Raw queries only here — page files never call supabase directly.
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL      = 'https://vegzlsfgjixvvjgojwuu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZ3psc2Znaml4dnZqZ29qd3V1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNjYyNzIsImV4cCI6MjA5NDk0MjI3Mn0.WVyJ6IO-NBYWrPnM9bWFXf-dhxyLwiJDhiRmn94VBSk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Characters ──────────────────────────────────────────────

/** Insert or update a character row. Returns the saved row. */
export async function saveCharacter(data) {
  const { data: row, error } = await supabase
    .from('characters')
    .upsert(data, { onConflict: 'id' })
    .select()
    .single();
  if (error) throw error;
  return row;
}

/** Fetch all characters (name + id + role + current_hp + max_hp) for dropdowns. */
export async function getCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, handle, role, current_hp, max_hp, image_url')
    .order('name');
  if (error) throw error;
  return data;
}

/** Fetch a single character by id. */
export async function getCharacter(id) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

/** Patch individual fields (e.g. HP update from DM dashboard). */
export async function patchCharacter(id, patch) {
  const { error } = await supabase
    .from('characters')
    .update(patch)
    .eq('id', id);
  if (error) throw error;
}

// ── Storage ─────────────────────────────────────────────────

/**
 * Upload a portrait image to character-images bucket.
 * Returns the public URL.
 */
export async function uploadPortrait(blob, characterId) {
  const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${characterId}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('character-images')
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (upErr) throw upErr;

  const { data } = supabase.storage
    .from('character-images')
    .getPublicUrl(path);
  return data.publicUrl;
}

// ── Rolls ───────────────────────────────────────────────────

/** Log a dice roll to the rolls table. */
export async function logRoll({ characterId, characterName, expression, individualRolls, modifier, total, context, isCritSuccess, isCritFailure }) {
  const { error } = await supabase.from('rolls').insert({
    character_id:     characterId,
    character_name:   characterName,
    expression,
    individual_rolls: individualRolls,
    modifier:         modifier ?? 0,
    total,
    context:          context ?? null,
    is_crit_success:  isCritSuccess ?? false,
    is_crit_failure:  isCritFailure ?? false,
  });
  if (error) console.warn('logRoll failed:', error);
}

/** Subscribe to live character changes (DM dashboard). */
export function subscribeCharacters(callback) {
  return supabase
    .channel('characters-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'characters' }, callback)
    .subscribe();
}

/** Subscribe to live roll events. */
export function subscribeRolls(callback) {
  return supabase
    .channel('rolls-live')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rolls' }, callback)
    .subscribe();
}
