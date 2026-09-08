/**
 * Pre-export ATS audit (pure, Node-safe). Checks the document model +
 * template facts supplied by the caller (column count, ATS mode, photo).
 * Returns [{ level:'error'|'warning', code, message }].
 */
export function auditForExport(doc, templateFacts = {}) {
  const { columnCount = 1, atsMode = false, hasPhoto = false } = templateFacts;
  const out = [];
  const err = (code, message) => out.push({ level: 'error', code, message });
  const warn = (code, message) => out.push({ level: 'warning', code, message });

  const pi = doc?.personalInfo || {};
  if (!pi.fullName?.trim()) err('missing-name', 'Name is missing — export would be anonymous');
  if (!pi.email?.trim() && !pi.phone?.trim()) err('missing-contact', 'No email or phone in the body text');
  if (!pi.email?.trim()) warn('missing-email', 'No email address found');

  const sections = (doc?.sections || []).filter((s) => s && s.visible !== false);
  const withContent = sections.filter((s) => {
    if (typeof s.content === 'string' && s.content.trim()) return true;
    return Array.isArray(s.items) && s.items.length > 0;
  });
  if (!withContent.length) err('no-content', 'No content sections to export');
  const types = new Set(sections.map((s) => s.sectionType || s.type || ''));
  if (![...types].some((t) => /experience/i.test(t))) warn('no-experience', 'No experience section — most ATS profiles expect one');
  if (![...types].some((t) => /skill/i.test(t))) warn('no-skills', 'No skills section — keyword matching will suffer');

  if (columnCount > 1 && !atsMode) {
    warn('multi-column', `Template uses ${columnCount} columns — strict ATS parsers may scramble reading order (enable ATS mode)`);
  }
  if (hasPhoto) {
    (atsMode ? warn : warn)('photo', 'Photo detected — many ATS parsers ignore images; keep a photo-free version for portals');
  }

  // Length estimate (~500 words per page)
  let words = 0;
  const count = (t) => { if (typeof t === 'string' && t.trim()) words += t.trim().split(/\s+/).length; };
  count(pi.resumeHeadline); count(pi.professionalTitle);
  for (const s of sections) {
    count(typeof s.content === 'string' ? s.content : '');
    for (const item of s.items || []) {
      for (const v of Object.values(item || {})) {
        if (typeof v === 'string') count(v);
        else if (Array.isArray(v)) v.forEach((a) => count(typeof a === 'string' ? a : a?.text || ''));
      }
    }
  }
  const pages = Math.max(1, Math.ceil(words / 500));
  if (pages > 2) warn('too-long', `Estimated ~${pages} pages (${words} words) — 1-2 pages is safest for ATS`);

  return out;
}

/**
 * Verify a generated .docx's document.xml actually contains the resume's key
 * text (used by the "Verify .docx" self-test). Returns { ok, missing[] }.
 */
export function verifyDocxContent(doc, documentXml) {
  const xml = String(documentXml || '');
  const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const hay = unesc(xml);
  const needles = [];
  const pi = doc?.personalInfo || {};
  if (pi.fullName?.trim()) needles.push(['name', pi.fullName.trim()]);
  if (pi.email?.trim()) needles.push(['email', pi.email.trim()]);
  for (const s of doc?.sections || []) {
    if (s.title) needles.push([`section:${s.title}`, s.title]);
  }
  const missing = needles.filter(([, n]) => !hay.includes(n)).map(([label]) => label);
  return { ok: missing.length === 0, missing };
}

export default { auditForExport, verifyDocxContent };
