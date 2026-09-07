/**
 * Offline keyword extraction (TF-ranked unigrams + bigrams).
 * No downloads, no network. Used as the fallback for skill/keyword
 * suggestions when AI is unavailable. Pure functions (Node-safe).
 */

const STOPWORDS = new Set(
  ('a,an,the,and,or,but,if,then,else,when,while,where,which,who,whom,whose,what,that,this,these,those,am,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,should,could,ought,will,shall,may,might,must,can,of,at,by,for,with,about,into,through,during,before,after,above,below,up,down,in,out,on,off,over,under,again,further,once,here,there,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,just,as,from,they,them,their,we,our,you,your,he,him,his,she,her,it,its,i,me,my,mine,us,to,per,via,etc,eg,ie,within,across,among,between,including,using,used,use,also,well,able,based,part,high,level,upon,day,key,new,own,way,many,still,every,good,give,role,team,work,working,year,years,company,position,looking,ideal,candidate,including,related,experience,strong,including,etc,' +
    'job,duties,including,responsibilities,responsible,requirements,required,preferred,qualifications,join,help,helps,work,works,worked,including,day,to,day'
  ).split(',')
);

/** Single-char tokens worth keeping (real tech). */
const TECH_SINGLE = new Set(['c', 'r']);

/** Generic resume filler excluded from skill suggestions. */
const GENERIC_FILLER = new Set([
  'experience', 'experiences', 'work', 'job', 'role', 'roles', 'company', 'companies',
  'team', 'teams', 'project', 'projects', 'day', 'duty', 'duties', 'responsibility',
  'responsibilities', 'requirement', 'requirements', 'qualification', 'qualifications',
  'ability', 'abilities', 'skills', 'skill', 'knowledge', 'years', 'year', 'including',
  'various', 'multiple', 'strong', 'excellent', 'good', 'great', 'detail', 'details',
]);

/** Normalize text into candidate tokens (keeps c++, c#, node.js, etc). */
export function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9+#./\s-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/^[./-]+|[./-]+$/g, ''))
    .filter((t) => {
      if (!t) return false;
      if (STOPWORDS.has(t)) return false;
      if (t.length === 1) return TECH_SINGLE.has(t);
      if (/^\d+$/.test(t)) return false;
      return true;
    });
}

function titleCase(term) {
  return term
    .split(' ')
    .map((w) => (/^(c\+\+|c#|\.net|javascript|typescript)$/i.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(' ');
}

/**
 * Rank terms by frequency (+ bigram bonus). Returns [{term, count}].
 */
export function extractKeywords(text, topN = 20) {
  const tokens = tokenize(text);
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  // bigrams of adjacent kept tokens (original order, stopwords already removed)
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i];
    const b = tokens[i + 1];
    if (a.length < 3 || b.length < 3) continue;
    if (GENERIC_FILLER.has(a) && GENERIC_FILLER.has(b)) continue;
    const bi = `${a} ${b}`;
    counts.set(bi, (counts.get(bi) || 0) + 1.5);
  }
  return [...counts.entries()]
    .filter(([term]) => !GENERIC_FILLER.has(term))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, topN)
    .map(([term, count]) => ({ term: titleCase(term), count: Math.round(count * 10) / 10 }));
}

/** Top skill-like suggestions for a resume text (offline). */
export function suggestSkillsOffline(text, topN = 20) {
  return extractKeywords(text, topN * 2)
    .map((k) => k.term)
    .filter((t) => t.length >= 2)
    .slice(0, topN);
}

export default { tokenize, extractKeywords, suggestSkillsOffline };
