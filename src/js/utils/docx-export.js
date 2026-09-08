/**
 * Minimal dependency-free .docx exporter (pure, Node-safe).
 * Builds a real Office Open XML package with STORE-only ZIP entries
 * (no compression) that Word/LibreOffice/Google Docs open.
 * Layout: headings + paragraphs + prefixed bullets — ATS-safe by design.
 */

function crc32(bytes) {
  let table = crc32._t;
  if (!table) {
    table = crc32._t = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < bytes.length; i++) crc = table[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ -1) >>> 0;
}

const te = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
function utf8(str) {
  if (te) return te.encode(str);
  const buf = Buffer.from(str, 'utf8');
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

/** STORE-method ZIP writer. files: [{ name, data: Uint8Array|string }]. */
export function writeZip(files) {
  const enc = [];
  const central = [];
  let offset = 0;
  for (const f of files) {
    const nameBytes = utf8(f.name);
    const data = typeof f.data === 'string' ? utf8(f.data) : f.data;
    const crc = crc32(data);
    // Local file header (30 bytes): sig, ver, flags, method, time, date,
    // crc32@14, compSize@18, uncompSize@22, nameLen@26, extraLen@28.
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true);
    lh.setUint16(6, 0x0800, true); // UTF-8 filenames
    lh.setUint16(8, 0, true); // STORE (no compression)
    lh.setUint16(10, 0, true);
    lh.setUint16(12, 0, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true);
    lh.setUint32(22, data.length, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);
    const lhBytes = new Uint8Array(lh.buffer);
    enc.push(lhBytes, nameBytes, data);
    central.push({ nameBytes, crc, size: data.length, offset });
    offset += 30 + nameBytes.length + data.length;
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) {
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
    ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true); ch.setUint16(14, 0, true); ch.setUint16(16, 0, true);
    ch.setUint32(18, c.crc, true);
    ch.setUint32(22, c.size, true); ch.setUint32(26, c.size, true);
    ch.setUint16(30, c.nameBytes.length, true);
    ch.setUint16(32, 0, true); ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true); ch.setUint16(38, 0, true);
    ch.setUint32(40, 0, true);
    ch.setUint32(42, c.offset, true);
    const chBytes = new Uint8Array(ch.buffer);
    enc.push(chBytes, c.nameBytes);
    centralSize += 46 + c.nameBytes.length;
  }
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, central.length, true);
  end.setUint16(10, central.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, centralStart, true);
  enc.push(new Uint8Array(end.buffer));
  const total = enc.reduce((n, b) => n + b.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const b of enc) { out.set(b, p); p += b.length; }
  return out;
}

function escXml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function para(text, { bold = false, size = 22, heading = 0, bullet = false } = {}) {
  const pPr = heading
    ? `<w:pPr><w:pStyle w:val="Heading${heading}"/></w:pPr>`
    : `<w:pPr>${bullet ? '<w:ind w:left="360" w:hanging="240"/>' : ''}</w:pPr>`;
  return `<w:p>${pPr}<w:r><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="${size}"/>${bold ? '<w:b/>' : ''}</w:rPr><w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p>`;
}

function linesOf(item) {
  const out = [];
  for (const [k, v] of Object.entries(item || {})) {
    if (['id', 'included', 'hidden', 'order', 'column'].includes(k)) continue;
    if (typeof v === 'string' && v.trim()) out.push({ k, v: v.trim() });
    else if (Array.isArray(v)) {
      for (const a of v) {
        const t = typeof a === 'string' ? a : a?.text || '';
        if (t.trim()) out.push({ k, v: t.trim(), bullet: true });
      }
    }
  }
  return out;
}

/** WordprocessingML for the resume body. Exported for the verify self-test. */
export function buildDocumentXml(doc) {
  const pi = doc?.personalInfo || {};
  const body = [];
  if (pi.fullName?.trim()) body.push(para(pi.fullName.trim(), { bold: true, size: 32 }));
  const title = pi.professionalTitle || pi.resumeHeadline || '';
  if (String(title).trim()) body.push(para(String(title).trim(), { size: 24 }));
  const contact = [pi.email, pi.phone, [pi.city, pi.state, pi.country].filter(Boolean).join(', '), pi.linkedinUrl, pi.githubUrl, pi.personalWebsite]
    .filter((s) => String(s || '').trim()).join(' | ');
  if (contact) body.push(para(contact, { size: 20 }));
  for (const sec of doc?.sections || []) {
    if (!sec || sec.visible === false) continue;
    if (sec.title) body.push(para(sec.title, { bold: true, size: 26, heading: 1 }));
    if (typeof sec.content === 'string' && sec.content.trim()) {
      for (const line of sec.content.split('\n')) {
        if (line.trim()) body.push(para(line.trim().replace(/^[-•*▪▸►⦁◦‣·]\s*/, '• '), { bullet: /^[-•*▪▸►⦁◦‣·]/.test(line.trim()) }));
      }
    }
    for (const item of sec.items || []) {
      const head = [item.jobTitle || item.degree || item.projectName || item.name, item.company || item.institution]
        .filter(Boolean).join(' — ');
      const dates = [item.startMonth, item.startYear, item.currentlyWorking ? 'Present' : [item.endMonth, item.endYear].filter(Boolean).join(' ')]
        .filter(Boolean).join(' ').trim();
      if (head) body.push(para(dates ? `${head} (${dates})` : head, { bold: true }));
      for (const l of linesOf(item)) {
        if (/^(jobTitle|degree|projectName|name|company|institution|startMonth|startYear|endMonth|endYear|currentlyWorking)$/.test(l.k)) continue;
        body.push(para(l.bullet ? `• ${l.v}` : l.v, { bullet: !!l.bullet }));
      }
    }
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/></w:sectPr></w:body></w:document>`;
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;

/** Full .docx bytes for a resume document. */
export function buildDocx(doc) {
  return writeZip([
    { name: '[Content_Types].xml', data: CONTENT_TYPES },
    { name: '_rels/.rels', data: RELS },
    { name: 'word/document.xml', data: buildDocumentXml(doc) },
  ]);
}

export default { buildDocx, buildDocumentXml, writeZip };
