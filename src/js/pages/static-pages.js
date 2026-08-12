export class StaticPages {
  constructor(pageName) {
    this.pageName = pageName;
    this.container = null;
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'static-page';

    const content = this.getPageContent(this.pageName);
    this.container.innerHTML = content;

    if (this.pageName === 'faq') {
      this.setupFaqToggles();
    }

    return this.container;
  }

  destroy() {
    this.container = null;
  }

  setupFaqToggles() {
    if (!this.container) return;
    this.container.querySelectorAll('.faq-question').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        item.classList.toggle('open');
        btn.setAttribute('aria-expanded', item.classList.contains('open'));
      });
    });
  }

  getPageContent(page) {
    const pages = {
      'privacy': this.privacyPolicy(),
      'terms': this.termsOfService(),
      'features': this.featuresPage(),
      'about': this.aboutPage(),
      'faq': this.faqPage(),
      'roadmap': this.roadmapPage(),
      'contact': this.contactPage(),
      'accessibility': this.accessibilityPage(),
      'changelog': this.changelogPage(),
    };
    return pages[page] || this.notFoundPage();
  }

  notFoundPage() {
    return `
      <div class="static-page-header">
        <h1>Page Not Found</h1>
      </div>
      <p>The page you're looking for doesn't exist.</p>
      <p><a href="#/dashboard">Go to Dashboard</a></p>
    `;
  }

  privacyPolicy() {
    return `
      <div class="static-page-header">
        <h1>Privacy Policy</h1>
        <p class="page-subtitle">Your privacy is fundamental to how CareerCanvas works</p>
        <p class="page-meta">Last updated: August 2026</p>
      </div>

      <div class="info-box">
        <p><strong>Privacy-First Design:</strong> CareerCanvas is built with a local-first architecture. Your resumes, personal data, and career documents are stored on your device and never uploaded to our servers without your explicit action.</p>
      </div>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Data You Create</h3>
      <p>CareerCanvas stores all documents (resumes, CVs, cover letters, reference sheets, portfolios) locally in your browser's IndexedDB storage. This data includes:</p>
      <ul>
        <li>Personal information you enter (name, contact details, work history, education, skills)</li>
        <li>Document content, formatting preferences, and template selections</li>
        <li>Application tracking data (company names, job titles, dates, notes)</li>
        <li>Master profile information</li>
        <li>Custom themes, section configurations, and design preferences</li>
      </ul>
      <p><strong>This data never leaves your device</strong> unless you explicitly export it or use AI-powered features.</p>

      <h3>1.2 Account Data (Optional)</h3>
      <p>If you choose to create an account (entirely optional), we collect:</p>
      <ul>
        <li>Email address</li>
        <li>Display name (if provided)</li>
        <li>Authentication tokens (managed by Supabase)</li>
      </ul>
      <p>Account creation is not required to use CareerCanvas. All features work in guest mode.</p>

      <h3>1.3 AI Feature Data</h3>
      <p>When you use AI-powered features (bullet improvement, summary generation, ATS optimization, etc.), the relevant content is sent to our AI provider for processing. This includes:</p>
      <ul>
        <li>The specific text you request to be improved or analyzed</li>
        <li>Job descriptions you provide for matching</li>
        <li>Resume content used for AI analysis</li>
      </ul>

      <div class="warning-box">
        <p><strong>Important:</strong> AI features send data to third-party AI providers (Groq/Google Gemini) for processing. We do not store AI request/response data on our servers. Review the AI provider's privacy policy for their data handling practices.</p>
      </div>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li><strong>Document creation:</strong> To render, edit, and manage your career documents</li>
        <li><strong>Local storage:</strong> To persist your work between sessions using IndexedDB</li>
        <li><strong>AI features:</strong> To process AI requests when you explicitly invoke them</li>
        <li><strong>Authentication:</strong> To manage your account if you choose to create one</li>
        <li><strong>Preferences:</strong> To remember your theme, editor settings, and UI preferences via localStorage</li>
      </ul>

      <h2>3. Data Storage</h2>

      <h3>3.1 Local Storage</h3>
      <p>All document data is stored in your browser's IndexedDB across 11 object stores. This data:</p>
      <ul>
        <li>Remains entirely on your device</li>
        <li>Is not accessible to us or any third party</li>
        <li>Can be cleared by you at any time via Settings or browser tools</li>
        <li>May be lost if you clear browser data or use private/incognito mode</li>
      </ul>

      <h3>3.2 Preferences</h3>
      <p>UI preferences (theme, editor settings, onboarding status) are stored in localStorage. These contain no personal information.</p>

      <h2>4. Data Sharing</h2>
      <p>We do not sell, trade, or rent your personal information. Data is shared only when:</p>
      <ul>
        <li>You explicitly use AI features (data sent to AI providers for processing)</li>
        <li>You export documents (you control who receives them)</li>
        <li>You create an account (authentication data managed by Supabase)</li>
        <li>Required by law (in response to valid legal process)</li>
      </ul>

      <h2>5. Cookies and Tracking</h2>
      <p>CareerCanvas does <strong>not</strong> use:</p>
      <ul>
        <li>Analytics or tracking cookies</li>
        <li>Third-party advertising trackers</li>
        <li>Fingerprinting or behavioral tracking</li>
        <li>Marketing pixels</li>
      </ul>
      <p>We use localStorage for functional preferences only (theme selection, editor settings).</p>

      <h2>6. Your Rights</h2>
      <p>You have full control over your data:</p>
      <ul>
        <li><strong>Access:</strong> All your data is stored locally and accessible to you at all times</li>
        <li><strong>Export:</strong> Export your data in JSON, PDF, Markdown, HTML, or plain text formats</li>
        <li><strong>Delete:</strong> Clear all data via Settings > Data Management, or clear your browser storage</li>
        <li><strong>Portability:</strong> Export and import your documents freely using JSON format</li>
        <li><strong>Account deletion:</strong> Delete your account at any time via Account Security settings</li>
      </ul>

      <h2>7. Data Security</h2>
      <ul>
        <li>Local data is protected by your browser's same-origin security model</li>
        <li>Authentication uses industry-standard practices via Supabase</li>
        <li>AI requests are transmitted over HTTPS</li>
        <li>No server-side storage of document content</li>
        <li>The Privacy Studio tool helps you identify and redact sensitive information before sharing</li>
      </ul>

      <h2>8. Children's Privacy</h2>
      <p>CareerCanvas is designed for professional use and is not directed at children under 13. We do not knowingly collect personal information from children.</p>

      <h2>9. Changes to This Policy</h2>
      <p>We may update this privacy policy from time to time. Changes will be reflected on this page with an updated revision date. Continued use of CareerCanvas after changes constitutes acceptance of the updated policy.</p>

      <h2>10. Contact</h2>
      <p>If you have questions about this privacy policy or your data, please <a href="#/contact">contact us</a>.</p>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  termsOfService() {
    return `
      <div class="static-page-header">
        <h1>Terms of Service</h1>
        <p class="page-subtitle">Guidelines for using CareerCanvas</p>
        <p class="page-meta">Last updated: August 2026</p>
      </div>

      <h2>1. Acceptance of Terms</h2>
      <p>By accessing or using CareerCanvas ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.</p>

      <h2>2. Description of Service</h2>
      <p>CareerCanvas is a free, browser-based career document builder that allows you to create, edit, and manage resumes, CVs, cover letters, reference sheets, and portfolios. The Service operates primarily on your local device using browser storage technologies.</p>

      <h2>3. Account Registration</h2>
      <ul>
        <li>Account creation is optional. All core features are available in guest mode.</li>
        <li>If you create an account, you are responsible for maintaining the security of your credentials.</li>
        <li>You must provide accurate information during registration.</li>
        <li>One account per person. Shared or automated accounts are not permitted.</li>
      </ul>

      <h2>4. User Content</h2>

      <h3>4.1 Ownership</h3>
      <p>You retain full ownership of all content you create using CareerCanvas. We claim no intellectual property rights over your resumes, cover letters, or other documents.</p>

      <h3>4.2 Responsibility</h3>
      <p>You are solely responsible for:</p>
      <ul>
        <li>The accuracy and truthfulness of information in your documents</li>
        <li>Ensuring your content does not infringe on third-party rights</li>
        <li>Maintaining backups of your important documents</li>
        <li>The security of exported documents you share with others</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to use CareerCanvas to:</p>
      <ul>
        <li>Create fraudulent, misleading, or deceptive documents</li>
        <li>Impersonate another person or misrepresent qualifications</li>
        <li>Distribute malware or malicious content</li>
        <li>Attempt to circumvent security measures or access controls</li>
        <li>Use AI features to generate harmful, discriminatory, or illegal content</li>
        <li>Overload or abuse AI features with automated or excessive requests</li>
      </ul>

      <h2>6. AI Features</h2>
      <p>CareerCanvas offers optional AI-powered features for content improvement and analysis:</p>
      <ul>
        <li>AI-generated content is provided as suggestions only. You are responsible for reviewing and verifying all AI output before use.</li>
        <li>AI features rely on third-party providers and may be subject to availability, rate limits, and their respective terms of service.</li>
        <li>We do not guarantee the accuracy, quality, or suitability of AI-generated content.</li>
        <li>AI features require an API key that you configure in Settings.</li>
      </ul>

      <h2>7. Templates</h2>
      <p>CareerCanvas provides 68 built-in templates across multiple categories. Templates are:</p>
      <ul>
        <li>Licensed for personal and professional use in creating your own career documents</li>
        <li>Not to be redistributed, sold, or used to create competing template products</li>
        <li>Provided "as is" without guarantee of ATS compatibility with all systems</li>
      </ul>

      <h2>8. Local Data and Storage</h2>
      <ul>
        <li>CareerCanvas stores data locally in your browser. We are not responsible for data loss due to browser cache clearing, device changes, or browser updates.</li>
        <li>We strongly recommend regularly exporting and backing up your documents.</li>
        <li>The Service provides a Data & Backup tool to help you manage your local data.</li>
      </ul>

      <h2>9. Service Availability</h2>
      <ul>
        <li>CareerCanvas is provided as a free service and may be modified or discontinued at any time.</li>
        <li>Because the app works offline via service worker, your existing documents remain accessible even if the website is unavailable.</li>
        <li>We make reasonable efforts to maintain service availability but provide no uptime guarantees.</li>
      </ul>

      <h2>10. Limitation of Liability</h2>
      <p>CareerCanvas is provided "as is" and "as available" without warranties of any kind. To the fullest extent permitted by law:</p>
      <ul>
        <li>We are not liable for any damages arising from use of the Service</li>
        <li>We do not guarantee that documents created with CareerCanvas will result in employment opportunities</li>
        <li>We are not responsible for decisions made by employers, ATS systems, or recruiters based on your documents</li>
        <li>ATS scores and compatibility assessments are approximations and do not guarantee actual ATS performance</li>
      </ul>

      <h2>11. Intellectual Property</h2>
      <p>The CareerCanvas application, including its code, design, templates, and branding, is the property of its creator. You may not copy, modify, or redistribute the application itself without permission.</p>

      <h2>12. Termination</h2>
      <ul>
        <li>You may stop using CareerCanvas at any time and delete your local data</li>
        <li>If you have an account, you may delete it via Account Security settings</li>
        <li>We may suspend or terminate accounts that violate these terms</li>
      </ul>

      <h2>13. Changes to Terms</h2>
      <p>We may update these terms from time to time. Changes will be posted on this page with an updated date. Continued use of CareerCanvas after changes constitutes acceptance of the new terms.</p>

      <h2>14. Governing Law</h2>
      <p>These terms are governed by and construed in accordance with applicable laws. Any disputes shall be resolved through good-faith negotiation.</p>

      <h2>15. Contact</h2>
      <p>For questions about these terms, please <a href="#/contact">contact us</a>.</p>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  featuresPage() {
    return `
      <div class="static-page-header">
        <h1>Features</h1>
        <p class="page-subtitle">Everything you need to build a standout career toolkit — free, private, and powerful</p>
      </div>

      <h2>Document Builder</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9998;</span>
          <h3>Live WYSIWYG Editor</h3>
          <p>Edit your resume in real-time with a live preview. Drag-and-drop sections, undo/redo, and autosave.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9638;</span>
          <h3>68 Professional Templates</h3>
          <p>ATS-optimized, professional, academic, executive, student, creative, and technical templates.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128196;</span>
          <h3>Multiple Document Types</h3>
          <p>Create resumes, CVs, cover letters, reference sheets, portfolios, and LinkedIn drafts.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#127912;</span>
          <h3>Design Customization</h3>
          <p>Custom colors, fonts, spacing, column layouts, photo placement, and page sizes (A4, Letter, Legal, A5).</p>
        </div>
      </div>

      <h2>AI-Powered Tools</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9889;</span>
          <h3>AI Bullet Improver</h3>
          <p>Enhance individual bullet points with stronger action verbs and quantified achievements.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9997;</span>
          <h3>AI Summary Generator</h3>
          <p>Generate compelling professional summaries tailored to your experience and target role.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128270;</span>
          <h3>ATS Optimizer</h3>
          <p>Analyze your resume against ATS requirements and get AI-powered fix suggestions.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128172;</span>
          <h3>Cover Letter Generator</h3>
          <p>Generate tailored cover letters from your resume and a job description.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128218;</span>
          <h3>Grammar Check</h3>
          <p>Catch typos, grammar issues, and tone inconsistencies across your document.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9906;</span>
          <h3>JD Matcher</h3>
          <p>Compare your resume against any job description with AI-powered gap analysis and suggestions.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128221;</span>
          <h3>Interview Prep</h3>
          <p>Generate likely interview questions based on your resume and the target role.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#127760;</span>
          <h3>Resume Translator</h3>
          <p>Translate your resume content to different languages while maintaining formatting.</p>
        </div>
      </div>

      <h2>Career Studios</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9835;</span>
          <h3>Theme Studio</h3>
          <p>Create and manage custom color themes for your documents.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9112;</span>
          <h3>PDF Studio</h3>
          <p>Fine-tune PDF output with layout controls, margins, and page break management.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128279;</span>
          <h3>Link & QR Studio</h3>
          <p>Generate QR codes and smart links for sharing your resume digitally.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#8942;</span>
          <h3>Timeline Studio</h3>
          <p>Visualize your career journey as an interactive timeline.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#10003;</span>
          <h3>Consistency Studio</h3>
          <p>Check formatting consistency across dates, bullet styles, capitalization, and more.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128274;</span>
          <h3>Privacy Studio</h3>
          <p>Identify and redact sensitive information before sharing your resume.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9878;</span>
          <h3>Skills Matrix</h3>
          <p>Visualize and analyze your skill coverage across categories and proficiency levels.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9986;</span>
          <h3>Space Optimizer</h3>
          <p>Automatically fit your content to a target page count with smart adjustments.</p>
        </div>
      </div>

      <h2>Import & Export</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128229;</span>
          <h3>Multi-Format Import</h3>
          <p>Import from PDF, DOCX, JSON, TXT, and HTML files with AI-powered smart parsing.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128228;</span>
          <h3>Flexible Export</h3>
          <p>Export to PDF, JSON, Markdown, HTML, and plain text formats.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128451;</span>
          <h3>Data & Backup</h3>
          <p>Full data backup and restore. Export all documents and settings as a single file.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9993;</span>
          <h3>Package Studio</h3>
          <p>Bundle multiple documents into application packages for specific job applications.</p>
        </div>
      </div>

      <h2>Core Principles</h2>
      <div class="features-grid">
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128274;</span>
          <h3>Privacy-First</h3>
          <p>All data stored locally on your device. No server uploads, no tracking, no analytics.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128176;</span>
          <h3>Completely Free</h3>
          <p>No paywall, no watermarks, no premium tiers. All features available to everyone.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#128268;</span>
          <h3>Works Offline</h3>
          <p>Service worker caching means your documents are always accessible, even without internet.</p>
        </div>
        <div class="feature-card">
          <span class="feature-card-icon" aria-hidden="true">&#9855;</span>
          <h3>Accessible</h3>
          <p>Built with ARIA labels, keyboard navigation, and an Accessibility Inspector tool.</p>
        </div>
      </div>

      <p style="margin-top:2rem;"><a href="#/dashboard">Start Building &rarr;</a></p>
    `;
  }

  aboutPage() {
    return `
      <div class="static-page-header">
        <h1>About CareerCanvas</h1>
        <p class="page-subtitle">A free, privacy-first career document builder</p>
      </div>

      <h2>What is CareerCanvas?</h2>
      <p>CareerCanvas is a comprehensive, browser-based career toolkit that helps you create professional resumes, CVs, cover letters, reference sheets, and portfolios. Built with a privacy-first philosophy, all your data stays on your device — no servers, no uploads, no tracking.</p>

      <div class="info-box">
        <p><strong>Our Mission:</strong> Make professional career document creation accessible to everyone — free, with no compromises on features, privacy, or quality.</p>
      </div>

      <h2>Why CareerCanvas?</h2>
      <ul>
        <li><strong>No paywalls or premium tiers</strong> — every feature is free for everyone, always</li>
        <li><strong>No watermarks</strong> — your documents are clean and professional</li>
        <li><strong>No account required</strong> — start building immediately in guest mode</li>
        <li><strong>Privacy by design</strong> — your resumes contain sensitive personal information, and we believe that data should stay under your control</li>
        <li><strong>Works offline</strong> — once loaded, CareerCanvas works without an internet connection</li>
        <li><strong>68 professional templates</strong> — from ATS-optimized to creative designs</li>
        <li><strong>18 AI-powered features</strong> — optional AI assistance for content improvement</li>
        <li><strong>22+ career tools</strong> — studios for every aspect of career document management</li>
      </ul>

      <h2>Built With</h2>
      <p>CareerCanvas is built with vanilla JavaScript (no framework), CSS custom properties for theming, and IndexedDB for local storage. It's a zero-build, zero-dependency application that runs entirely in your browser.</p>
      <ul>
        <li><strong>Frontend:</strong> Vanilla JavaScript with ES Modules</li>
        <li><strong>Storage:</strong> IndexedDB (local) + localStorage (preferences)</li>
        <li><strong>Styling:</strong> CSS Custom Properties with dark mode support</li>
        <li><strong>Routing:</strong> Hash-based SPA router</li>
        <li><strong>Offline:</strong> Service Worker with stale-while-revalidate caching</li>
        <li><strong>AI:</strong> Optional integration with Groq and Google Gemini APIs</li>
        <li><strong>Auth:</strong> Optional Supabase authentication</li>
      </ul>

      <h2>Created By</h2>
      <p>CareerCanvas is crafted by <strong>Shubham Bundele</strong> — a full-stack developer passionate about building tools that are useful, accessible, and respect user privacy.</p>

      <h2>Open Source</h2>
      <p>CareerCanvas is an open project. Contributions, feedback, and suggestions are welcome. If you find a bug or have an idea for a new feature, we'd love to hear from you.</p>

      <p style="margin-top:2rem;"><a href="#/features">Explore Features</a> &middot; <a href="#/contact">Get in Touch</a> &middot; <a href="#/dashboard">Go to Dashboard</a></p>
    `;
  }

  faqPage() {
    const faqs = [
      {
        q: 'Is CareerCanvas really free?',
        a: 'Yes, completely free. There are no premium tiers, no paywalls, and no watermarks on your documents. All 68 templates, 18 AI features, and 22+ tools are available to everyone.'
      },
      {
        q: 'Where is my data stored?',
        a: 'All your data is stored locally in your browser using IndexedDB. Your resumes, personal information, and career documents never leave your device unless you explicitly export them or use AI features. We have no server-side database storing your content.'
      },
      {
        q: 'Do I need to create an account?',
        a: 'No. Account creation is entirely optional. You can use all features in guest mode. An account is only needed if you want authentication features — your documents are stored locally regardless of account status.'
      },
      {
        q: 'Will I lose my data if I clear my browser?',
        a: 'Yes, clearing browser data (cache, cookies, site data) will remove your locally stored documents. We strongly recommend using the Data & Backup tool to regularly export your data. You can also export individual documents as JSON files for safekeeping.'
      },
      {
        q: 'How do AI features work?',
        a: 'AI features are optional and require an API key (configured in Settings). When you use an AI feature, the relevant text is sent to the AI provider (Groq or Google Gemini) for processing. The response is returned to your browser. We do not store AI requests or responses on our servers.'
      },
      {
        q: 'Are the templates ATS-compatible?',
        a: 'CareerCanvas includes 10 specifically ATS-optimized templates designed for maximum compatibility with Applicant Tracking Systems. The built-in ATS Checker analyzes your resume against common ATS requirements and provides a compatibility score. However, ATS systems vary widely, and we cannot guarantee compatibility with every system.'
      },
      {
        q: 'Can I use CareerCanvas offline?',
        a: 'Yes. CareerCanvas uses a service worker to cache the application for offline use. Once you\'ve loaded the app, it works without an internet connection. AI features require internet access, but all local features (editing, templates, export) work offline.'
      },
      {
        q: 'What file formats can I import?',
        a: 'CareerCanvas supports importing from PDF, DOCX, JSON, TXT, and HTML files. The AI Smart Parser can extract structured resume data from unstructured documents. You can also import from LinkedIn profiles.'
      },
      {
        q: 'What file formats can I export to?',
        a: 'You can export your documents as PDF (via browser print), JSON (CareerCanvas format, re-importable), Markdown, HTML, and plain text.'
      },
      {
        q: 'How do I back up my data?',
        a: 'Go to the Data & Backup tool (available from the Tools menu). You can export all your documents, settings, and data as a single backup file. This backup can be restored at any time to recover your data.'
      },
      {
        q: 'Can I use my own fonts?',
        a: 'CareerCanvas includes a selection of web-safe and Google Fonts. You can choose from multiple font combinations in the Design Panel when editing a document. Custom font uploads are on the roadmap.'
      },
      {
        q: 'Is CareerCanvas mobile-friendly?',
        a: 'Yes, CareerCanvas is responsive and works on mobile devices and tablets. The editor experience is optimized for desktop, but you can view, manage, and do basic editing on mobile.'
      },
      {
        q: 'How do I report a bug or request a feature?',
        a: 'Visit our <a href="#/contact">Contact page</a> for ways to reach us. We welcome bug reports, feature requests, and general feedback.'
      }
    ];

    const faqHTML = faqs.map(f => `
      <div class="faq-item">
        <button class="faq-question" aria-expanded="false">
          <span>${f.q}</span>
          <span class="faq-chevron" aria-hidden="true">&#9660;</span>
        </button>
        <div class="faq-answer">
          <p>${f.a}</p>
        </div>
      </div>
    `).join('');

    return `
      <div class="static-page-header">
        <h1>Frequently Asked Questions</h1>
        <p class="page-subtitle">Quick answers to common questions about CareerCanvas</p>
      </div>

      ${faqHTML}

      <h2>Still have questions?</h2>
      <p>Check our <a href="#/features">Features page</a> for a complete overview, or <a href="#/contact">contact us</a> directly.</p>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  roadmapPage() {
    return `
      <div class="static-page-header">
        <h1>Roadmap</h1>
        <p class="page-subtitle">Where we've been and where we're headed</p>
      </div>

      <div class="roadmap-phase completed">
        <div class="roadmap-dot"></div>
        <h3>Phase 1: Foundation <span class="roadmap-label roadmap-label--done">Completed</span></h3>
        <ul>
          <li>Core resume editor with live preview</li>
          <li>10 ATS-optimized templates</li>
          <li>PDF, JSON, and text export</li>
          <li>IndexedDB local storage</li>
          <li>Dark mode / light mode</li>
          <li>Drag-and-drop section reordering</li>
          <li>Onboarding wizard</li>
        </ul>
      </div>

      <div class="roadmap-phase completed">
        <div class="roadmap-dot"></div>
        <h3>Phase 2: Templates & Document Types <span class="roadmap-label roadmap-label--done">Completed</span></h3>
        <ul>
          <li>68 templates across 9 categories</li>
          <li>Cover letter, reference sheet, and portfolio support</li>
          <li>Template gallery with preview</li>
          <li>Design panel with color, font, and spacing controls</li>
          <li>Column layout support</li>
          <li>Photo placement and resizing</li>
        </ul>
      </div>

      <div class="roadmap-phase completed">
        <div class="roadmap-dot"></div>
        <h3>Phase 3: AI & Import/Export <span class="roadmap-label roadmap-label--done">Completed</span></h3>
        <ul>
          <li>18 AI-powered features (Groq + Gemini)</li>
          <li>Multi-format import (PDF, DOCX, JSON, TXT, HTML)</li>
          <li>AI smart parser for document imports</li>
          <li>ATS checker with AI-powered optimization</li>
          <li>JD Matcher with gap analysis</li>
          <li>Cover letter generator</li>
        </ul>
      </div>

      <div class="roadmap-phase completed">
        <div class="roadmap-dot"></div>
        <h3>Phase 4: Career Studios <span class="roadmap-label roadmap-label--done">Completed</span></h3>
        <ul>
          <li>Theme Studio, PDF Studio, Section Studio</li>
          <li>Timeline Studio, Consistency Studio, Privacy Studio</li>
          <li>Skills Matrix, Space Optimizer, Portfolio Studio</li>
          <li>Link & QR Studio, Localization Studio</li>
          <li>Version Studio, Data & Backup Studio</li>
          <li>Application Tracker and Master Profile</li>
        </ul>
      </div>

      <div class="roadmap-phase active">
        <div class="roadmap-dot"></div>
        <h3>Phase 5: Polish & Community <span class="roadmap-label roadmap-label--active">In Progress</span></h3>
        <ul>
          <li>Website pages (Privacy Policy, Terms, FAQ, About)</li>
          <li>Accessibility audit and improvements</li>
          <li>Performance optimization</li>
          <li>Enhanced mobile editing experience</li>
          <li>Community template submissions</li>
          <li>Documentation and user guides</li>
        </ul>
      </div>

      <div class="roadmap-phase">
        <div class="roadmap-dot"></div>
        <h3>Phase 6: Advanced Features <span class="roadmap-label roadmap-label--planned">Planned</span></h3>
        <ul>
          <li>Cloud sync (optional, encrypted)</li>
          <li>Custom font uploads</li>
          <li>Real-time collaboration</li>
          <li>Resume scoring with industry benchmarks</li>
          <li>Integration with job boards</li>
          <li>Multi-language UI support</li>
          <li>Advanced analytics dashboard</li>
        </ul>
      </div>

      <div class="roadmap-phase">
        <div class="roadmap-dot"></div>
        <h3>Phase 7: Platform Expansion <span class="roadmap-label roadmap-label--planned">Planned</span></h3>
        <ul>
          <li>Progressive Web App (installable)</li>
          <li>API for third-party integrations</li>
          <li>Team/organization features</li>
          <li>Resume review marketplace</li>
          <li>Career coaching AI assistant</li>
        </ul>
      </div>

      <div class="info-box">
        <p><strong>Have a feature request?</strong> We'd love to hear what you'd like to see in CareerCanvas. <a href="#/contact">Share your ideas</a> and help shape the roadmap.</p>
      </div>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  contactPage() {
    return `
      <div class="static-page-header">
        <h1>Contact Us</h1>
        <p class="page-subtitle">We'd love to hear from you</p>
      </div>

      <div class="contact-grid">
        <div class="contact-card">
          <span class="contact-card-icon" aria-hidden="true">&#128172;</span>
          <h3>Bug Reports</h3>
          <p>Found a bug? Report it on our GitHub Issues page with steps to reproduce.</p>
        </div>
        <div class="contact-card">
          <span class="contact-card-icon" aria-hidden="true">&#128161;</span>
          <h3>Feature Requests</h3>
          <p>Have an idea for a new feature? We welcome suggestions to improve CareerCanvas.</p>
        </div>
        <div class="contact-card">
          <span class="contact-card-icon" aria-hidden="true">&#128232;</span>
          <h3>General Inquiries</h3>
          <p>Questions, feedback, or just want to say hello? Reach out any time.</p>
        </div>
        <div class="contact-card">
          <span class="contact-card-icon" aria-hidden="true">&#129309;</span>
          <h3>Contributions</h3>
          <p>Interested in contributing to CareerCanvas? Check our repository for guidelines.</p>
        </div>
      </div>

      <h2>Get in Touch</h2>

      <h3>GitHub</h3>
      <p>The best way to report bugs, request features, or contribute is through our GitHub repository. Open an issue or start a discussion.</p>

      <h3>Email</h3>
      <p>For private inquiries or sensitive matters, you can reach the creator directly via email.</p>

      <h3>Response Times</h3>
      <p>CareerCanvas is maintained by an individual developer. We aim to respond to issues and inquiries within a few business days, but response times may vary.</p>

      <div class="info-box">
        <p><strong>Before reaching out</strong>, check our <a href="#/faq">FAQ page</a> — your question might already be answered there.</p>
      </div>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  accessibilityPage() {
    return `
      <div class="static-page-header">
        <h1>Accessibility Statement</h1>
        <p class="page-subtitle">Our commitment to making CareerCanvas accessible to everyone</p>
        <p class="page-meta">Last updated: August 2026</p>
      </div>

      <h2>Our Commitment</h2>
      <p>CareerCanvas is committed to ensuring digital accessibility for people with disabilities. We continually work to improve the user experience for everyone and apply relevant accessibility standards throughout development.</p>

      <h2>Conformance Status</h2>
      <p>We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1 at the AA level. While we strive for full compliance, some areas may still be in progress as we continuously improve.</p>

      <h2>Accessibility Features</h2>

      <h3>Navigation</h3>
      <ul>
        <li>Full keyboard navigation support throughout the application</li>
        <li>Skip-to-content functionality</li>
        <li>Logical tab order across all interactive elements</li>
        <li>Keyboard shortcuts for common actions (Ctrl+Shift+N for new document, Escape to close modals)</li>
        <li>ARIA landmarks and labels on all navigation elements</li>
      </ul>

      <h3>Visual</h3>
      <ul>
        <li>Dark mode and light mode for visual comfort</li>
        <li>Sufficient color contrast ratios across the interface</li>
        <li>Resizable text without loss of functionality</li>
        <li>No content that relies solely on color to convey information</li>
        <li>Focus indicators on all interactive elements</li>
      </ul>

      <h3>Content</h3>
      <ul>
        <li>Semantic HTML structure throughout the application</li>
        <li>Descriptive ARIA labels on icons and interactive elements</li>
        <li>Form labels and error messages associated with inputs</li>
        <li>Toast notifications announced via aria-live regions</li>
        <li>Alternative text for decorative and functional images</li>
      </ul>

      <h3>Built-in Accessibility Inspector</h3>
      <p>CareerCanvas includes a dedicated <strong>Accessibility Inspector</strong> tool that audits your resume documents for accessibility issues. This tool helps ensure the documents you create are accessible to screen readers and assistive technologies.</p>

      <h2>Known Limitations</h2>
      <ul>
        <li>The WYSIWYG editor uses contenteditable, which may have varying screen reader support across browsers</li>
        <li>Drag-and-drop section reordering has keyboard alternatives, but the visual feedback may differ</li>
        <li>Some complex interactive components (color pickers, timeline visualizations) may have limited screen reader support</li>
        <li>PDF export relies on browser print functionality, which has its own accessibility considerations</li>
      </ul>

      <h2>Assistive Technology Tested</h2>
      <p>We test CareerCanvas with:</p>
      <ul>
        <li>Screen readers (NVDA, VoiceOver)</li>
        <li>Keyboard-only navigation</li>
        <li>Browser zoom (up to 200%)</li>
        <li>High contrast mode</li>
      </ul>

      <h2>Feedback</h2>
      <p>We welcome feedback on the accessibility of CareerCanvas. If you encounter barriers or have suggestions for improvement, please <a href="#/contact">contact us</a>. We take accessibility feedback seriously and will work to address issues promptly.</p>

      <h2>Continuous Improvement</h2>
      <p>Accessibility is an ongoing effort. We regularly review and update our application to improve accessibility and are committed to making CareerCanvas usable by everyone.</p>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }

  changelogPage() {
    return `
      <div class="static-page-header">
        <h1>Changelog</h1>
        <p class="page-subtitle">What's new in CareerCanvas</p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.5.0</div>
        <div class="changelog-date">August 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Website pages: Privacy Policy, Terms of Service, Features, About, FAQ, Roadmap, Contact, Accessibility Statement, and Changelog
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Site-wide footer with navigation links
        </p>
        <p>
          <span class="changelog-tag changelog-tag--improve">Improved</span>
          Fixed dead links in signup form for Terms and Privacy Policy
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.4.0</div>
        <div class="changelog-date">July 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Stress Lab for testing template rendering edge cases
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Supabase authentication with email, magic link, and Google OAuth
        </p>
        <p>
          <span class="changelog-tag changelog-tag--improve">Improved</span>
          Welcome page and onboarding flow for new users
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.3.0</div>
        <div class="changelog-date">June 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Version Studio for document version tracking
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Data Studio with analytics and full backup management
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Accessibility Inspector tool
        </p>
        <p>
          <span class="changelog-tag changelog-tag--improve">Improved</span>
          Space Optimizer algorithm for better page fitting
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.2.0</div>
        <div class="changelog-date">May 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Portfolio Studio for work samples and project links
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Link & QR Studio for digital resume sharing
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Localization Studio for region-specific formatting
        </p>
        <p>
          <span class="changelog-tag changelog-tag--fix">Fix</span>
          Template rendering issues with certain column layouts
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.1.0</div>
        <div class="changelog-date">April 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Theme Studio for custom color themes
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Section Studio for custom section types
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          PDF Studio with advanced layout controls
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Consistency Studio for formatting checks
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Privacy Studio for sensitive data detection
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v2.0.0</div>
        <div class="changelog-date">March 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          18 AI-powered features (Groq + Google Gemini)
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Multi-format import (PDF, DOCX, JSON, TXT, HTML)
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          JD Matcher with AI gap analysis
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Skills Matrix visualization
        </p>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Application Tracker
        </p>
        <p>
          <span class="changelog-tag changelog-tag--improve">Improved</span>
          Template engine rewrite with 68 templates
        </p>
      </div>

      <div class="changelog-entry">
        <div class="changelog-version">v1.0.0</div>
        <div class="changelog-date">January 2026</div>
        <p>
          <span class="changelog-tag changelog-tag--new">New</span>
          Initial release of CareerCanvas
        </p>
        <ul>
          <li>WYSIWYG resume editor with live preview</li>
          <li>10 ATS-optimized templates</li>
          <li>PDF and JSON export</li>
          <li>Dark mode / light mode</li>
          <li>IndexedDB local storage</li>
          <li>Service worker for offline support</li>
          <li>Drag-and-drop section reordering</li>
          <li>Onboarding wizard</li>
          <li>Master Profile for auto-fill</li>
        </ul>
      </div>

      <p style="margin-top:2rem;"><a href="#/dashboard">&larr; Back to Dashboard</a></p>
    `;
  }
}
