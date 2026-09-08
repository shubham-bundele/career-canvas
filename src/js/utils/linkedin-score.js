/**
 * LinkedIn presence checklist scorer (pure, Node-safe).
 * Scores a profile snapshot { headline, summary, experienceCount, skillsCount,
 * hasPhoto, hasUrl, recommendations } → { score, checks[{label, pass, hint}] }.
 */
export function scoreLinkedIn(profile = {}) {
  const checks = [];
  const check = (label, pass, hint) => checks.push({ label, pass: !!pass, hint });

  check('Custom profile URL', !!profile.hasUrl, 'Claim linkedin.com/in/yourname instead of the default ID string');
  check('Professional headline', !!(profile.headline && profile.headline.trim().length >= 10), 'Headline should state role + value, not just a job title');
  check('About section', !!(profile.summary && profile.summary.trim().length >= 100), 'Write 2-3 short paragraphs with keywords recruiters search');
  check('Experience entries', (profile.experienceCount || 0) >= 2, 'List at least 2 roles with bullets, matching your resume');
  check('Skills listed', (profile.skillsCount || 0) >= 8, 'Add 8-15 skills so you appear in recruiter searches');
  check('Profile photo', !!profile.hasPhoto, 'Profiles with photos get far more views');
  check('Recommendations', (profile.recommendations || 0) >= 1, 'Even one recommendation boosts credibility');

  const passed = checks.filter((c) => c.pass).length;
  const score = Math.round((passed / checks.length) * 100);
  return { score, passed, total: checks.length, checks };
}

export default { scoreLinkedIn };
