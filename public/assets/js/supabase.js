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

/** Fetch all characters for DM dashboard + dropdowns. */
export async function getCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('id, name, handle, role, current_hp, max_hp, image_url, current_humanity, max_humanity, current_luck, critical_injuries, conditions, mortally_wounded, stats, buffs, session_notes, improvement_points')
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

/** Fetch shop items, optionally filtered to a list of categories. */
export async function getItems(categories = []) {
  let q = supabase
    .from('items')
    .select('id, name, category, subcategory, price, raw_cost, damage, rof, hands, ammo, notes, source, extra')
    .order('name');
  if (categories.length) q = q.in('category', categories);
  const { data, error } = await q;
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

/** Fetch the most recent rolls (for DM dashboard initial load). */
export async function getRolls(limit = 50) {
  const { data, error } = await supabase
    .from('rolls')
    .select('id, character_name, expression, total, context, is_crit_success, is_crit_failure, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
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

// ── Combat Sessions ─────────────────────────────────────────

/** Fetch the currently active combat session (null if none). */
export async function getActiveCombat() {
  const { data, error } = await supabase
    .from('combat_sessions').select('*')
    .eq('is_active', true).order('created_at', { ascending: false })
    .limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

/** Create or update a combat session. Pass id to update, omit to create new. */
export async function saveCombat(patch) {
  if (patch.id) {
    const { id, ...rest } = patch;
    const { error } = await supabase.from('combat_sessions').update(rest).eq('id', id);
    if (error) throw error;
  } else {
    await supabase.from('combat_sessions').update({ is_active: false }).eq('is_active', true);
    const { error } = await supabase.from('combat_sessions').insert({ ...patch, is_active: true });
    if (error) throw error;
  }
}

/** Deactivate a combat session by id. */
export async function endCombat(id) {
  const { error } = await supabase.from('combat_sessions')
    .update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

/** Subscribe to live combat session changes. */
export function subscribeCombat(callback) {
  return supabase.channel('combat-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'combat_sessions' }, callback)
    .subscribe();
}

/** Delete a character and all associated rolls (CASCADE). */
export async function deleteCharacter(id) {
  const { error } = await supabase.from('characters').delete().eq('id', id);
  if (error) throw error;
}

/** Delete all roll entries from the rolls table. */
export async function deleteAllRolls() {
  const { error } = await supabase.from('rolls').delete().gte('id', 0);
  if (error) throw error;
}

// ── Chat Messages ────────────────────────────────────────────

export async function sendMessage({ sender, sender_role, content, image_url }) {
  const { error } = await supabase.from('messages').insert({
    sender, sender_role, content: content || null, image_url: image_url || null,
  });
  if (error) console.error('sendMessage:', error);
}

export async function patchMessage(id, patch) {
  const { error } = await supabase.from('messages').update(patch).eq('id', id);
  if (error) console.error('patchMessage:', error);
}

export async function getMessages(limit = 50) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) { console.error('getMessages:', error); return []; }
  return data || [];
}

export function subscribeMessages(callback) {
  return supabase.channel('messages-channel')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, callback)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, callback)
    .subscribe();
}

export async function uploadChatImage(file) {
  const ext  = file.name.split('.').pop();
  const path = `chat/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('chat-images').upload(path, file, { upsert: false });
  if (error) { console.error('uploadChatImage:', error); return null; }
  const { data } = supabase.storage.from('chat-images').getPublicUrl(path);
  return data.publicUrl;
}

// ── NPCs ─────────────────────────────────────────────────────

export async function getNpcs() {
  const { data, error } = await supabase.from('npcs').select('*').order('name');
  if (error) throw error;
  return data || [];
}

export async function saveNpc(data) {
  const { data: row, error } = await supabase
    .from('npcs').upsert(data, { onConflict: 'id' }).select().single();
  if (error) throw error;
  return row;
}

export async function patchNpc(id, patch) {
  const { error } = await supabase.from('npcs').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function deleteNpc(id) {
  const { error } = await supabase.from('npcs').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadNpcImage(blob, npcId) {
  const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${npcId}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from('npc-images').upload(path, blob, { upsert: true, contentType: blob.type });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from('npc-images').getPublicUrl(path);
  return data.publicUrl;
}

export function subscribeNpcs(callback) {
  return supabase.channel('npcs-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'npcs' }, callback)
    .subscribe();
}
