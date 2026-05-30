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
    .select('id, name, handle, role, current_hp, max_hp, image_url, current_humanity, max_humanity, current_luck, critical_injuries, conditions, mortally_wounded, stats, buffs, session_notes, improvement_points, role_ability_data')
    .order('name');
  if (error) throw error;
  return data;
}

/** Fetch a single character by id. Returns null if not found. */
export async function getCharacter(id) {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error('Charakter nicht gefunden — bitte zurück zur Übersicht.'), { code: 'NOT_FOUND' });
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

/** Patch individual fields (e.g. HP update from DM dashboard).
 *  Uses raw fetch with Prefer: return=minimal to avoid PostgREST's
 *  "Cannot coerce the result to a single JSON object" bug in some
 *  supabase-js versions that send return=representation by default. */
export async function patchCharacter(id, patch) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(patch),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || `HTTP ${res.status}`), body);
  }
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

/** Fetch all currently active combat sessions. */
export async function getActiveCombats() {
  const { data, error } = await supabase
    .from('combat_sessions').select('*')
    .eq('is_active', true).order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Create or update a combat session. Pass id to update, omit to create new.
 *  Multiple sessions can be active simultaneously — no longer deactivates others. */
export async function saveCombat(patch) {
  if (patch.id) {
    const { id, ...rest } = patch;
    const { error } = await supabase.from('combat_sessions').update(rest).eq('id', id);
    if (error) throw error;
  } else {
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

/** Set or clear the timer on the active (or latest) combat session. */
export async function saveTimer(timerData) {
  const { data: active } = await supabase.from('combat_sessions')
    .select('id').eq('is_active', true).limit(1).maybeSingle();
  const targetId = active?.id ?? (await supabase.from('combat_sessions')
    .select('id').order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.id;

  if (targetId) {
    await supabase.from('combat_sessions').update({ timer: timerData }).eq('id', targetId);
  } else {
    await supabase.from('combat_sessions').insert({ timer: timerData });
  }
}

// ── Maps ─────────────────────────────────────────────────────

export async function getLatestMap() {
  const { data, error } = await supabase.from('maps')
    .select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMap(id) {
  const { data, error } = await supabase.from('maps').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function saveMap(patch) {
  if (patch.id) {
    const { id, ...rest } = patch;
    const { error } = await supabase.from('maps')
      .update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) throw error;
  } else {
    const { data, error } = await supabase.from('maps').insert(patch).select().single();
    if (error) throw error;
    return data;
  }
}

export function subscribeMaps(callback) {
  return supabase.channel('maps-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'maps' }, callback)
    .subscribe();
}

export async function uploadMapBackground(blob) {
  const ext  = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `bg_${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from('map-backgrounds').upload(path, blob, { upsert: false, contentType: blob.type });
  if (error) throw error;
  const { data } = supabase.storage.from('map-backgrounds').getPublicUrl(path);
  return data.publicUrl;
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

export async function getActiveNpcs() {
  const { data, error } = await supabase.from('npcs')
    .select('id,name,hp_current,hp_max,critical_injuries');
  if (error) { console.warn('getActiveNpcs:', error); return []; }
  return data || [];
}

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

// ── Cash Log ──────────────────────────────────────────────────

/** Append a cash transaction to char.cash_log and update cash in one patch. */
export async function patchCash(id, newCash, delta, reason, existingLog) {
  const entry = { delta, reason: reason || null, ts: Date.now(), balance: newCash };
  const log   = [entry, ...(existingLog || [])].slice(0, 20);
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/characters?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ cash: newCash, cash_log: log }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || `HTTP ${res.status}`), body);
  }
  return log;
}

// ── Game State (In-Game Time) ─────────────────────────────────

export async function getGameState() {
  const { data, error } = await supabase
    .from('game_state').select('*').eq('id', 1).maybeSingle();
  if (error) throw error;
  return data;
}

/** Patch the singleton game_state row. Uses raw fetch to dodge return=representation. */
export async function patchGameState(patch) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/game_state?id=eq.1`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw Object.assign(new Error(body.message || `HTTP ${res.status}`), body);
  }
}

export function subscribeGameState(callback) {
  return supabase.channel('game-state-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, callback)
    .subscribe();
}

// ── Character Effects ─────────────────────────────────────────

export async function getCharacterEffects(characterId = null) {
  let q = supabase.from('character_effects').select('*').order('started_at_ingame', { ascending: true });
  if (characterId) q = q.eq('character_id', characterId);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function addCharacterEffect(row) {
  const { data, error } = await supabase.from('character_effects').insert(row).select().single();
  if (error) throw error;
  return data;
}

export async function removeCharacterEffect(id) {
  const { error } = await supabase.from('character_effects').delete().eq('id', id);
  if (error) throw error;
}

export async function removeCharacterEffectsBy({ characterId = null, endsOnLongRest = null, expiresBefore = null }) {
  let q = supabase.from('character_effects').delete();
  if (characterId)      q = q.eq('character_id', characterId);
  if (endsOnLongRest)   q = q.eq('ends_on_long_rest', endsOnLongRest);
  if (expiresBefore)    q = q.not('expires_at_ingame', 'is', null).lt('expires_at_ingame', expiresBefore);
  const { error } = await q;
  if (error) throw error;
}

export function subscribeCharacterEffects(callback) {
  return supabase.channel('character-effects-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'character_effects' }, callback)
    .subscribe();
}

// ── Room Items ────────────────────────────────────────────────

export async function getRoomItems() {
  const { data, error } = await supabase.from('room_items').select('*').order('created_at');
  if (error) throw error;
  return data || [];
}

export async function addRoomItem({ item_name, item_data = {}, placed_by = null, room_description = 'Aktueller Raum' }) {
  const { data, error } = await supabase.from('room_items')
    .insert({ item_name, item_data, placed_by, room_description })
    .select().single();
  if (error) throw error;
  return data;
}

export async function removeRoomItem(id) {
  const { error } = await supabase.from('room_items').delete().eq('id', id);
  if (error) throw error;
}

export async function clearRoomItems() {
  const { error } = await supabase.from('room_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export async function setRoomDescription(desc) {
  const { error } = await supabase.from('room_items').update({ room_description: desc }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) throw error;
}

export function subscribeRoomItems(callback) {
  return supabase.channel('room-items-live')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_items' }, callback)
    .subscribe();
}

// ── Sound ────────────────────────────────────────────────────

export async function getSoundLibrary() {
  const { data, error } = await supabase.from('sound_library').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function uploadSound(file, name, category) {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from('sounds').upload(path, file, { contentType: file.type });
  if (upErr) throw upErr;
  const { data: urlData } = supabase.storage.from('sounds').getPublicUrl(path);
  const { data, error } = await supabase.from('sound_library')
    .insert({ name, file_path: path, file_url: urlData.publicUrl, category, size_bytes: file.size })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteSound(id, filePath) {
  await supabase.storage.from('sounds').remove([filePath]);
  const { error } = await supabase.from('sound_library').delete().eq('id', id);
  if (error) throw error;
}

export async function getSoundButtons() {
  const { data, error } = await supabase.from('sound_buttons').select('*, sound:sound_id(*)').order('category').order('position');
  if (error) throw error;
  return data || [];
}

export async function saveSoundButton(btn) {
  const payload = { name: btn.name, sound_id: btn.sound_id || null, category: btn.category, color: btn.color || null, hotkey: btn.hotkey || null, position: btn.position ?? 0 };
  if (btn.id) {
    const { data, error } = await supabase.from('sound_buttons').update(payload).eq('id', btn.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase.from('sound_buttons').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSoundButton(id) {
  const { error } = await supabase.from('sound_buttons').delete().eq('id', id);
  if (error) throw error;
}

export function createSoundChannel() {
  return supabase.channel('sound-control', {
    config: { broadcast: { ack: false, self: true } }
  });
}

export function createCombatEventChannel() {
  return supabase.channel('combat-events', {
    config: { broadcast: { ack: false, self: false } }
  });
}

// ── Roll Requests (Player Self-Roll) ─────────────────────────

export async function createRollRequest({ character_id, damage_formula, damage_source, effect_description }) {
  const { data, error } = await supabase.from('roll_requests')
    .insert([{ character_id, damage_formula, damage_source, effect_description }])
    .select().single();
  if (error) throw error;
  return data;
}

export async function resolveRollRequest(id, roll_result) {
  const { error } = await supabase.from('roll_requests')
    .update({ roll_result, resolved: true }).eq('id', id);
  if (error) throw error;
}

export async function getPendingRollRequests(character_id) {
  const { data } = await supabase.from('roll_requests')
    .select('*').eq('character_id', character_id).eq('resolved', false);
  return data || [];
}

export function subscribeRollRequests(character_id, callback) {
  return supabase.channel(`roll-req-${character_id}`)
    .on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'roll_requests',
      filter: `character_id=eq.${character_id}`
    }, callback).subscribe();
}

// ── Saved Maps ───────────────────────────────────────────────

export async function getSavedMaps() {
  const { data } = await supabase.from('saved_maps')
    .select('id,name,created_at,updated_at')
    .order('updated_at', { ascending: false });
  return data || [];
}

export async function upsertSavedMap(id, name, mapData) {
  const payload = { name, updated_at: new Date().toISOString() };
  if (mapData !== null) payload.map_data = mapData;
  if (id) {
    const { data, error } = await supabase.from('saved_maps').update(payload).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
  if (mapData !== null) payload.map_data = mapData;
  const { data, error } = await supabase.from('saved_maps').insert([payload]).select().single();
  if (error) throw error;
  return data;
}

export async function loadSavedMapData(id) {
  const { data, error } = await supabase.from('saved_maps').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function deleteSavedMap(id) {
  const { error } = await supabase.from('saved_maps').delete().eq('id', id);
  if (error) throw error;
}
