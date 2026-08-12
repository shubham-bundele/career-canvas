/**
 * Vercel Serverless Function — AI Resume Analysis
 * Proxies requests to Groq API using server-side API key.
 * Users never see or enter any API key.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';
const MAX_INPUT_LENGTH = 15000;
const TIMEOUT_MS = 30000;

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured. Add GROQ_API_KEY in Vercel environment variables.' });
  }

  try {
    const { resumeText, mode, context } = req.body || {};

    if (!resumeText || typeof resumeText !== 'string') {
      return res.status(400).json({ error: 'Missing resumeText' });
    }

    if (resumeText.length > MAX_INPUT_LENGTH) {
      return res.status(400).json({ error: `Resume text too long (max ${MAX_INPUT_LENGTH} chars)` });
    }

    let systemPrompt, userPrompt;

    if (mode === 'summary') {
      systemPrompt = 'You are a resume writing expert. Return ONLY the summary text, nothing else.';
      userPrompt = `Write a professional summary (40-60 words) for this person. Be specific about experience level, key skills, and achievements.\n\nResume:\n${resumeText}`;
    } else if (mode === 'improve') {
      systemPrompt = 'You are a resume writing expert. Return ONLY the improved text, nothing else. No quotes.';
      userPrompt = `Improve this resume bullet point. Strong action verb, include metrics, under 150 chars. Context: ${context || 'professional experience'}. Original: ${resumeText}`;
    } else if (mode === 'generate-bullets') {
      systemPrompt = 'You are a resume writing expert. Return ONLY a JSON array of strings.';
      userPrompt = `Generate 6 achievement bullet points for this role. Each: strong action verb, metric/result, under 150 chars. Role: ${resumeText}. Context: ${context || ''}. Return JSON array of 6 strings.`;
    } else if (mode === 'extract-skills') {
      systemPrompt = 'You are a resume analyst. Return ONLY a JSON array of strings.';
      userPrompt = `Suggest 15-20 relevant skills for this resume. Include technical, tools, methodologies, soft skills. Only genuinely relevant ones. Return JSON array of strings.\n\nResume:\n${resumeText}`;
    } else if (mode === 'cover-letter') {
      systemPrompt = 'You are a cover letter writer. Return ONLY the letter text. No meta-commentary.';
      userPrompt = `Write a cover letter (250-350 words). Reference specific skills and experience from the resume that match the job. Professional but engaging.\n\nResume:\n${resumeText}\n\nJob Description:\n${context || 'General application'}`;
    } else if (mode === 'grammar') {
      systemPrompt = 'You are a proofreader. Return ONLY a valid JSON array.';
      userPrompt = `Find grammar errors, spelling mistakes, awkward phrasing. Return: [{"original":"wrong text","suggestion":"fixed text","message":"what's wrong"}]. Max 15. Return JSON array.\n\n${resumeText}`;
    } else if (mode === 'jd-enhance') {
      systemPrompt = 'You are a resume optimizer. Return ONLY a valid JSON array.';
      userPrompt = `Compare resume vs job description. Suggest rewording to better match. Return: [{"field":"section","original":"current text","suggestion":"improved text","message":"why"}]. Max 10.\n\nResume:\n${resumeText}\n\nJob Description:\n${context || ''}`;
    } else if (mode === 'tone') {
      systemPrompt = `Rewrite in a ${context || 'professional'} tone. Return ONLY rewritten text.`;
      userPrompt = resumeText;
    } else if (mode === 'interview-prep') {
      systemPrompt = 'You are a career coach. Return well-formatted text with numbered questions, each followed by a suggested STAR-format answer.';
      userPrompt = `Generate 8 likely interview questions for this role, with STAR-format answer suggestions based on the candidate resume. Include: 3 behavioral, 2 technical, 2 situational, 1 culture-fit.\n\nResume:\n${resumeText}\n\nJob Description:\n${context || 'General role'}`;
    } else if (mode === 'parse-linkedin') {
      systemPrompt = 'You are a profile parser. Return ONLY valid JSON: {"name":"","title":"","summary":"","experience":[{"jobTitle":"","company":"","dates":"","bullets":["..."]}],"education":[{"degree":"","institution":"","dates":""}],"skills":["..."],"certifications":["..."]}';
      userPrompt = `Parse this LinkedIn profile text:\n\n${resumeText}`;
    } else if (mode === 'resume-from-jd') {
      systemPrompt = 'You are a resume skeleton generator. Return ONLY valid JSON: {"title":"suggested professional title","summary":"40-word professional summary","sections":[{"type":"experience|skills|education|certifications|projects","title":"Section Name","items":["suggested bullet or skill"]}]}. Create a realistic starter resume.';
      userPrompt = `Generate a resume skeleton for this job description:\n\n${resumeText}`;
    } else if (mode === 'condense') {
      systemPrompt = 'You are a resume editor. Return ONLY a JSON array of strings — each is a condensed version of the corresponding input bullet. Keep under 100 chars each. Preserve meaning and impact.';
      userPrompt = `Condense these resume bullets (one per line):\n${resumeText}`;
    } else if (mode === 'skill-evidence') {
      systemPrompt = 'You are a resume writer. Return ONLY a JSON array of 3-4 achievement bullet strings that demonstrate the specified skill, based on the resume context. Each under 150 chars.';
      userPrompt = `Generate bullets proving the skill "${context}" based on this resume:\n${resumeText}`;
    } else if (mode === 'bulk-improve') {
      systemPrompt = 'You are a resume writer. Return ONLY a JSON array of improved bullets in the SAME ORDER as input. Each under 150 chars, strong action verb, metrics where possible.';
      userPrompt = `Improve each bullet (separated by ---):\n${resumeText}`;
    } else if (mode === 'follow-up-email') {
      systemPrompt = 'You are a career communication expert. Return ONLY the email text with Subject line, then body. Professional, concise, under 200 words.';
      userPrompt = `Write a follow-up email for this job application:\n${resumeText}`;
    } else if (mode === 'translate') {
      systemPrompt = `You are a professional translator. Translate this resume content to ${context || 'Spanish'}. Maintain professional resume conventions for the target language/culture. Return ONLY the translated text.`;
      userPrompt = resumeText;
    } else if (mode === 'parse') {
      systemPrompt = `You are a CareerCanvas resume parser. Return ONLY valid JSON with: {"name":"","title":"","email":"","phone":"","location":"","linkedin":"","github":"","website":"","sections":[{"title":"Exact heading","type":"TYPE","content":["line1","line2"]}]}. Allowed types: summary, experience, education, skills, projects, certifications, awards, publications, volunteer, languages, interests, references, custom. For experience: "Job Title | Company | Location" then "StartDate - EndDate" then bullet lines. For skills: split comma lists. Preserve ALL content.`;
      userPrompt = `Parse this resume:\n\n${resumeText}`;
    } else {
      systemPrompt = 'You are a resume reviewer. Return ONLY a valid JSON array.';
      userPrompt = `Analyze resume. Return: [{"category":"formatting/content/structure/ats","severity":"error/warning/info","message":"","field":"","original":"under 100 chars","suggestion":""}]. Max 12.\n\nResume:\n${resumeText}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 2048
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `Groq API error (${response.status})`;
      return res.status(response.status === 429 ? 429 : 502).json({ error: msg });
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';

    return res.status(200).json({ result: text });

  } catch (err) {
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'AI request timed out. Try again.' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
}
