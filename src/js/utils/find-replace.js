/**
 * Find & replace across a resume document (pure, Node-safe).
 * Walks personal info, section content, item fields, achievements,
 * skills and technology lists. Section titles are structural and skipped.
 */

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace all occurrences in a string; returns { text, count }. */
export function replaceInString(str, find, replacement, matchCase = false) {
  if (typeof str !== 'string' || !find) return { text: str, count: 0 };
  const re = new RegExp(escapeRegExp(find), matchCase ? 'g' : 'gi');
  let count = 0;
  const text = str.replace(re, () => {
    count++;
    return replacement;
  });
  return { text, count };
}

/** Count occurrences without replacing. */
export function countInString(str, find, matchCase = false) {
  if (typeof str !== 'string' || !find) return 0;
  const re = new RegExp(escapeRegExp(find), matchCase ? 'g' : 'gi');
  const m = str.match(re);
  return m ? m.length : 0;
}

const ITEM_STRING_KEYS = [
  'jobTitle', 'company', 'degree', 'institution', 'projectName', 'name',
  'text', 'description', 'summary', 'responsibilities', 'roleSummary',
  'companyDescription', 'location', 'category',
];
const ITEM_ARRAY_KEYS = ['skills', 'technologies', 'methods', 'keywords'];

/**
 * Apply find/replace throughout the document (mutates doc).
 * @returns {{count:number, fields:string[]}} replacements + dotted paths touched
 */
export function findReplaceInDoc(doc, find, replacement, matchCase = false) {
  let count = 0;
  const fields = [];
  if (!doc || !find) return { count, fields };

  const replaceField = (obj, key, path) => {
    if (!obj || typeof obj[key] !== 'string') return;
    const r = replaceInString(obj[key], find, replacement, matchCase);
    if (r.count > 0) {
      obj[key] = r.text;
      count += r.count;
      if (!fields.includes(path)) fields.push(path);
    }
  };

  const pi = doc.personalInfo || {};
  for (const key of Object.keys(pi)) replaceField(pi, key, `personalInfo.${key}`);

  for (const sec of doc.sections || []) {
    if (!sec || typeof sec !== 'object') continue;
    if (typeof sec.content === 'string') {
      const r = replaceInString(sec.content, find, replacement, matchCase);
      if (r.count > 0) {
        sec.content = r.text;
        count += r.count;
        fields.push(`sections[${sec.title || sec.type}].content`);
      }
    }
    for (const item of sec.items || []) {
      if (!item || typeof item !== 'object') continue;
      for (const key of ITEM_STRING_KEYS) replaceField(item, key, `items.${key}`);
      for (const key of ITEM_ARRAY_KEYS) {
        if (Array.isArray(item[key])) {
          item[key] = item[key].map((s) => {
            if (typeof s !== 'string') return s;
            const r = replaceInString(s, find, replacement, matchCase);
            if (r.count > 0) { count += r.count; return r.text; }
            return s;
          });
        }
      }
      for (const a of item.achievements || []) {
        if (typeof a === 'string') {
          const r = replaceInString(a, find, replacement, matchCase);
          if (r.count > 0) {
            const idx = item.achievements.indexOf(a);
            item.achievements[idx] = r.text;
            count += r.count;
          }
        } else if (a && typeof a.text === 'string') {
          const r = replaceInString(a.text, find, replacement, matchCase);
          if (r.count > 0) {
            a.text = r.text;
            count += r.count;
          }
        }
      }
    }
  }
  return { count, fields };
}

/** Count matches without mutating (for live preview). */
export function countInDoc(doc, find, matchCase = false) {
  if (!doc || !find) return 0;
  let n = 0;
  const pi = doc.personalInfo || {};
  for (const key of Object.keys(pi)) {
    if (typeof pi[key] === 'string') n += countInString(pi[key], find, matchCase);
  }
  for (const sec of doc.sections || []) {
    if (typeof sec?.content === 'string') n += countInString(sec.content, find, matchCase);
    for (const item of sec?.items || []) {
      if (!item || typeof item !== 'object') continue;
      const parts = [];
      for (const key of ITEM_STRING_KEYS) if (typeof item[key] === 'string') parts.push(item[key]);
      for (const key of ITEM_ARRAY_KEYS) if (Array.isArray(item[key])) parts.push(item[key].join('\n'));
      for (const a of item.achievements || []) parts.push(typeof a === 'string' ? a : a?.text || '');
      for (const p of parts) n += countInString(p, find, matchCase);
    }
  }
  return n;
}

export default { replaceInString, countInString, findReplaceInDoc, countInDoc };
