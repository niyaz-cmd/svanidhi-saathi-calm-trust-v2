export const PRIVACY_KEY = 'saathi:privacy:v1';
export const NOTICE_VERSION = '2026-09-13';
const languages = new Set(['kn', 'hi', 'en']);
export const defaultPrivacy = () => ({ noticeVersion:NOTICE_VERSION, acceptedAt:null, updatedAt:null, language:'kn', voice:false, research:false });
export function readPrivacy(storage) {
  try {
    const value = JSON.parse(storage.getItem(PRIVACY_KEY));
    if (!value || value.noticeVersion !== NOTICE_VERSION || !Number.isFinite(Date.parse(value.acceptedAt))) return defaultPrivacy();
    return { noticeVersion:NOTICE_VERSION, acceptedAt:value.acceptedAt, updatedAt:value.updatedAt,
      language:languages.has(value.language) ? value.language : 'kn', voice:value.voice === true, research:value.research === true };
  } catch { return defaultPrivacy(); }
}
export function savePrivacy(storage, { language, voice, research }, at = new Date().toISOString()) {
  if (!languages.has(language) || typeof voice !== 'boolean' || typeof research !== 'boolean' || !Number.isFinite(Date.parse(at))) throw Error('Invalid privacy choices');
  const previous = readPrivacy(storage);
  const value = { noticeVersion:NOTICE_VERSION, acceptedAt:previous.acceptedAt || at, updatedAt:at, language, voice, research };
  storage.setItem(PRIVACY_KEY, JSON.stringify(value));
  return value;
}
export function saathiKeys(storage) {
  return Array.from({length:storage.length}, (_, i) => storage.key(i)).filter(key => typeof key === 'string' && key.startsWith('saathi:'));
}
export function exportLocalData(storage) {
  return { schemaVersion:1, exportedAt:new Date().toISOString(), scope:'Saathi data on this browser only',
    data:Object.fromEntries(saathiKeys(storage).map(key => { const raw = storage.getItem(key); try { return [key, JSON.parse(raw)]; } catch { return [key, raw]; } })) };
}
export function deleteResearchData(storage) {
  for (const key of saathiKeys(storage).filter(key => /^saathi:(events|research):/.test(key))) storage.removeItem(key);
}
export function deleteLocalData(storage) {
  // Remove consent first so any interrupted deletion leaves collection disabled.
  storage.removeItem(PRIVACY_KEY);
  for (const key of saathiKeys(storage)) storage.removeItem(key);
  if (saathiKeys(storage).length) throw Error('Data deletion incomplete');
}
