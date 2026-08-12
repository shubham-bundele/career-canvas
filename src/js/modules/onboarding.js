/**
 * Onboarding Wizard Module
 * Provides step-by-step onboarding for new users
 */

import eventBus, { EVENTS } from '../core/events.js';
import { createElement } from '../utils/sanitize.js';
import { createEmptyDocument, DOCUMENT_TYPES } from '../core/schema.js';
import { generateUUID } from '../utils/id.js';

/**
 * Onboarding wizard steps configuration
 */
const STEP_DOCUMENT_TYPE = {
  id: 'documentType',
  title: 'Choose Document Type',
  description: 'What would you like to create?',
  options: [
    { id: 'resume', icon: '📄', title: 'Resume', description: 'Standard professional resume' },
    { id: 'cv', icon: '📋', title: 'CV', description: 'Comprehensive curriculum vitae' },
    { id: 'academicCv', icon: '🎓', title: 'Academic CV', description: 'For academic positions and research' },
    { id: 'coverLetter', icon: '✉️', title: 'Cover Letter', description: 'Personalized job application letter' },
    { id: 'referenceSheet', icon: '📇', title: 'Reference Sheet', description: 'Professional references list' },
    { id: 'linkedinDraft', icon: '💼', title: 'LinkedIn Profile Draft', description: 'Draft for LinkedIn profile' },
    { id: 'aiFromJD', icon: '🤖', title: 'AI from Job Description', description: 'Paste a JD and AI creates a starter resume' }
  ]
};

const STEPS_BY_TYPE = {
  resume: [
    STEP_DOCUMENT_TYPE,
    { id: 'careerLevel', title: 'Career Level', description: 'What stage are you at in your career?', options: [
      { id: 'student', icon: '🎓', title: 'Student', description: 'Currently studying' },
      { id: 'graduate', icon: '👨‍🎓', title: 'Graduate', description: 'Recently graduated' },
      { id: 'entryLevel', icon: '🌱', title: 'Entry Level', description: '0-2 years experience' },
      { id: 'experienced', icon: '💼', title: 'Experienced', description: '3-7 years experience' },
      { id: 'senior', icon: '⭐', title: 'Senior', description: '8-15 years experience' },
      { id: 'executive', icon: '👔', title: 'Executive', description: 'Leadership and C-level' },
      { id: 'careerChanger', icon: '🔄', title: 'Career Changer', description: 'Switching fields' },
      { id: 'freelancer', icon: '🎨', title: 'Freelancer', description: 'Independent work' }
    ]},
    { id: 'goal', title: 'Resume Goal', description: 'What is your primary goal?', options: [
      { id: 'general', icon: '🎯', title: 'General Resume', description: 'Multi-purpose for various jobs' },
      { id: 'tailored', icon: '🔍', title: 'Tailor to Job', description: 'Customized for a specific role' },
      { id: 'ats', icon: '🤖', title: 'ATS-Friendly', description: 'Optimized for tracking systems' },
      { id: 'visual', icon: '🎨', title: 'Visual Resume', description: 'Modern design-focused' },
      { id: 'portfolio', icon: '💼', title: 'Portfolio Resume', description: 'Showcase projects and work' }
    ]},
    { id: 'pageFormat', title: 'Page Format', description: 'Choose your preferred page size', options: [
      { id: 'a4', icon: '📄', title: 'A4', description: '210 × 297 mm (International)' },
      { id: 'letter', icon: '📃', title: 'US Letter', description: '8.5 × 11 in (US standard)' }
    ]}
  ],
  cv: [
    STEP_DOCUMENT_TYPE,
    { id: 'careerLevel', title: 'Career Level', description: 'What stage are you at?', options: [
      { id: 'graduate', icon: '👨‍🎓', title: 'Graduate', description: 'Recently graduated' },
      { id: 'experienced', icon: '💼', title: 'Experienced', description: '3-7 years experience' },
      { id: 'senior', icon: '⭐', title: 'Senior', description: '8+ years experience' },
      { id: 'executive', icon: '👔', title: 'Executive', description: 'Leadership positions' }
    ]},
    { id: 'goal', title: 'CV Purpose', description: 'What will you use this CV for?', options: [
      { id: 'general', icon: '🎯', title: 'General CV', description: 'Comprehensive career overview' },
      { id: 'tailored', icon: '🔍', title: 'Targeted CV', description: 'For a specific opportunity' },
      { id: 'international', icon: '🌍', title: 'International', description: 'For positions abroad' },
      { id: 'technical', icon: '⚙️', title: 'Technical CV', description: 'Emphasize technical expertise' }
    ]},
    { id: 'pageFormat', title: 'Page Format', description: 'Choose page size', options: [
      { id: 'a4', icon: '📄', title: 'A4', description: '210 × 297 mm (International)' },
      { id: 'letter', icon: '📃', title: 'US Letter', description: '8.5 × 11 in (US standard)' }
    ]}
  ],
  academicCv: [
    STEP_DOCUMENT_TYPE,
    { id: 'careerLevel', title: 'Academic Stage', description: 'Where are you in your academic career?', options: [
      { id: 'gradStudent', icon: '🎓', title: 'Graduate Student', description: 'Masters or PhD candidate' },
      { id: 'postdoc', icon: '🔬', title: 'Postdoctoral', description: 'Postdoc researcher' },
      { id: 'assistantProf', icon: '📖', title: 'Assistant Professor', description: 'Early-career faculty' },
      { id: 'associateProf', icon: '📚', title: 'Associate Professor', description: 'Mid-career faculty' },
      { id: 'fullProf', icon: '🏛️', title: 'Full Professor', description: 'Senior faculty' },
      { id: 'researcher', icon: '🧪', title: 'Research Scientist', description: 'Non-tenure research' }
    ]},
    { id: 'goal', title: 'CV Purpose', description: 'What is this academic CV for?', options: [
      { id: 'faculty', icon: '🏛️', title: 'Faculty Position', description: 'Applying for academic jobs' },
      { id: 'grant', icon: '💰', title: 'Grant Application', description: 'For funding proposals' },
      { id: 'tenure', icon: '📋', title: 'Tenure Review', description: 'Promotion & tenure package' },
      { id: 'general', icon: '🎯', title: 'General Academic', description: 'Comprehensive record' }
    ]},
    { id: 'pageFormat', title: 'Page Format', description: 'Choose page size', options: [
      { id: 'a4', icon: '📄', title: 'A4', description: '210 × 297 mm (International)' },
      { id: 'letter', icon: '📃', title: 'US Letter', description: '8.5 × 11 in (US standard)' }
    ]}
  ],
  coverLetter: [
    STEP_DOCUMENT_TYPE,
    { id: 'letterType', title: 'Letter Type', description: 'What kind of letter are you writing?', options: [
      { id: 'application', icon: '📨', title: 'Job Application', description: 'Applying for a specific role' },
      { id: 'interest', icon: '💡', title: 'Letter of Interest', description: 'Expressing interest in a company' },
      { id: 'referral', icon: '🤝', title: 'Referral Letter', description: 'Referred by someone at the company' },
      { id: 'networking', icon: '🔗', title: 'Networking Letter', description: 'Building professional connections' }
    ]},
    { id: 'letterTone', title: 'Tone & Style', description: 'What tone should your letter have?', options: [
      { id: 'formal', icon: '👔', title: 'Formal', description: 'Traditional corporate tone' },
      { id: 'professional', icon: '💼', title: 'Professional', description: 'Modern professional tone' },
      { id: 'conversational', icon: '💬', title: 'Conversational', description: 'Friendly but professional' },
      { id: 'creative', icon: '🎨', title: 'Creative', description: 'Stand out with personality' }
    ]},
    { id: 'pageFormat', title: 'Page Format', description: 'Choose page size', options: [
      { id: 'a4', icon: '📄', title: 'A4', description: '210 × 297 mm' },
      { id: 'letter', icon: '📃', title: 'US Letter', description: '8.5 × 11 in' }
    ]}
  ],
  referenceSheet: [
    STEP_DOCUMENT_TYPE,
    { id: 'refCount', title: 'Number of References', description: 'How many references will you include?', options: [
      { id: '3', icon: '3️⃣', title: '3 References', description: 'Standard for most applications' },
      { id: '4', icon: '4️⃣', title: '4 References', description: 'Strong reference list' },
      { id: '5', icon: '5️⃣', title: '5+ References', description: 'Comprehensive list' }
    ]},
    { id: 'pageFormat', title: 'Page Format', description: 'Choose page size', options: [
      { id: 'a4', icon: '📄', title: 'A4', description: '210 × 297 mm' },
      { id: 'letter', icon: '📃', title: 'US Letter', description: '8.5 × 11 in' }
    ]}
  ],
  linkedinDraft: [
    STEP_DOCUMENT_TYPE,
    { id: 'linkedinGoal', title: 'Profile Goal', description: 'What do you want your LinkedIn profile to achieve?', options: [
      { id: 'jobSearch', icon: '🔍', title: 'Job Search', description: 'Attract recruiters and opportunities' },
      { id: 'networking', icon: '🤝', title: 'Networking', description: 'Build professional connections' },
      { id: 'thought', icon: '💡', title: 'Thought Leadership', description: 'Establish industry expertise' },
      { id: 'business', icon: '📈', title: 'Business Development', description: 'Attract clients and partnerships' }
    ]},
    { id: 'linkedinTone', title: 'Profile Tone', description: 'How should your profile sound?', options: [
      { id: 'professional', icon: '👔', title: 'Professional', description: 'Polished and corporate' },
      { id: 'approachable', icon: '😊', title: 'Approachable', description: 'Warm and personable' },
      { id: 'expert', icon: '🏆', title: 'Expert', description: 'Authoritative and knowledgeable' },
      { id: 'storyteller', icon: '📖', title: 'Storyteller', description: 'Narrative-driven' }
    ]}
  ]
};

function getStepsForType(docType) {
  return STEPS_BY_TYPE[docType] || STEPS_BY_TYPE.resume;
}

/**
 * OnboardingWizard class
 */
export class OnboardingWizard {
  constructor() {
    this.container = null;
    this.currentStep = 0;
    this.selections = {};
    this.listeners = [];
    this.onComplete = null;
    this._cachedSteps = null;
    this.onSkip = null;
    this._isAdvancing = false;
    this._advanceTimer = null;
    this._continueOnSelection = this._loadContinueOnSelection();
    this._showingAiJDStep = false;
  }

  getSteps() {
    const docType = this.selections.documentType || 'resume';
    return getStepsForType(docType);
  }

  /**
   * Renders the onboarding wizard
   * @returns {HTMLElement} The wizard container element
   */
  render() {
    // Create modal overlay
    this.container = createElement('div', '', { class: 'onboarding-overlay' });

    // Space background
    const canvas = document.createElement('canvas');
    canvas.className = 'onboarding-starfield';
    canvas.setAttribute('aria-hidden', 'true');
    this.container.appendChild(canvas);
    this._initStarfield(canvas);

    // Create modal content
    const modal = createElement('div', '', { class: 'onboarding-modal' });

    // Create header
    const header = this.renderHeader();
    modal.appendChild(header);

    // Create progress bar
    const progressBar = this.renderProgressBar();
    modal.appendChild(progressBar);

    // Create continue-on-selection toggle
    const toggleRow = this.renderContinueToggle();
    modal.appendChild(toggleRow);

    // Create step content
    const stepContent = createElement('div', '', { class: 'onboarding-step-content' });
    stepContent.id = 'onboarding-step-content';
    modal.appendChild(stepContent);

    // Create navigation
    const navigation = this.renderNavigation();
    modal.appendChild(navigation);

    this.container.appendChild(modal);

    // Render first step
    this.renderStep(this.currentStep);
    this.updateProgress();

    // Typing animation on title
    this._typeTitle();
    // Progress bar sparkles
    this._initProgressParticles();

    // Add keyboard event listener
    this.handleKeydown = this.handleKeydown.bind(this);
    document.addEventListener('keydown', this.handleKeydown);

    // Inject feature showcase around the wizard
    this._initShowcase();

    return this.container;
  }

  /**
   * Renders the header section
   * @returns {HTMLElement} Header element
   */
  renderHeader() {
    const header = createElement('div', '', { class: 'onboarding-header' });

    const logo = createElement('div', '🎨', { class: 'onboarding-logo' });
    header.appendChild(logo);

    const title = createElement('h1', 'Welcome to CareerCanvas', { class: 'onboarding-title' });
    header.appendChild(title);

    const subtitle = createElement('p', 'Let\'s create your professional resume in just a few steps', { class: 'onboarding-subtitle' });
    header.appendChild(subtitle);

    return header;
  }

  /**
   * Renders the progress bar
   * @returns {HTMLElement} Progress bar element
   */
  renderProgressBar() {
    const progressContainer = createElement('div', '', { class: 'onboarding-progress' });

    const progressBar = createElement('div', '', { class: 'onboarding-progress-bar' });
    progressBar.id = 'onboarding-progress-bar';

    const progressFill = createElement('div', '', { class: 'onboarding-progress-fill' });
    progressFill.id = 'onboarding-progress-fill';
    progressBar.appendChild(progressFill);

    progressContainer.appendChild(progressBar);

    const progressText = createElement('div', '', { class: 'onboarding-progress-text' });
    progressText.id = 'onboarding-progress-text';
    progressContainer.appendChild(progressText);

    return progressContainer;
  }

  /**
   * Updates the progress indicator
   */
  updateProgress() {
    const progressFill = this.container && this.container.querySelector('#onboarding-progress-fill');
    const progressText = this.container && this.container.querySelector('#onboarding-progress-text');

    if (progressFill && progressText) {
      const progress = ((this.currentStep + 1) / this.getSteps().length) * 100;
      progressFill.style.width = `${progress}%`;
      progressText.textContent = `Step ${this.currentStep + 1} of ${this.getSteps().length}`;
    }
  }

  /**
   * Renders the continue-on-selection toggle
   * @returns {HTMLElement} Toggle row element
   */
  renderContinueToggle() {
    const row = createElement('div', '', { class: 'onboarding-continue-toggle-row' });
    row.id = 'onboarding-continue-toggle-row';

    const labelGroup = createElement('div', '', { class: 'onboarding-continue-label-group' });
    const label = createElement('label', 'Continue on selection', {
      class: 'onboarding-continue-label',
      for: 'onboarding-continue-toggle'
    });
    labelGroup.appendChild(label);
    const hint = createElement('span', 'When enabled, selecting an option automatically moves to the next step.', {
      class: 'onboarding-continue-hint',
      id: 'onboarding-continue-hint'
    });
    labelGroup.appendChild(hint);
    row.appendChild(labelGroup);

    const toggle = createElement('button', '', {
      class: 'onboarding-toggle',
      id: 'onboarding-continue-toggle',
      type: 'button',
      role: 'switch',
      'aria-checked': String(this._continueOnSelection),
      'aria-describedby': 'onboarding-continue-hint'
    });
    const knob = createElement('span', '', { class: 'onboarding-toggle-knob', 'aria-hidden': 'true' });
    toggle.appendChild(knob);

    if (this._continueOnSelection) {
      toggle.classList.add('onboarding-toggle--on');
    }

    const toggleHandler = () => {
      this._continueOnSelection = !this._continueOnSelection;
      toggle.setAttribute('aria-checked', String(this._continueOnSelection));
      toggle.classList.toggle('onboarding-toggle--on', this._continueOnSelection);
      this._saveContinueOnSelection();
    };
    toggle.addEventListener('click', toggleHandler);
    this.listeners.push({ element: toggle, event: 'click', handler: toggleHandler });

    row.appendChild(toggle);
    return row;
  }

  _loadContinueOnSelection() {
    try {
      const val = localStorage.getItem('cc_continueOnSelection');
      return val === 'true';
    } catch (e) {
      return false;
    }
  }

  _saveContinueOnSelection() {
    try {
      localStorage.setItem('cc_continueOnSelection', String(this._continueOnSelection));
    } catch (e) {
      // localStorage unavailable
    }
  }

  /**
   * Renders a specific step
   * @param {number} stepIndex - Index of the step to render
   */
  renderStep(stepIndex) {
    const step = this.getSteps()[stepIndex];
    const stepContent = this.container.querySelector('#onboarding-step-content');

    if (!stepContent) return;

    // Slide transition
    const isForward = stepIndex >= (this._lastStep || 0);
    this._lastStep = stepIndex;
    stepContent.innerHTML = '';
    stepContent.classList.remove('step-slide-in-left', 'step-slide-in-right');
    stepContent.offsetHeight;
    stepContent.classList.add(isForward ? 'step-slide-in-right' : 'step-slide-in-left');

    // Add step title and description
    const stepTitle = createElement('h2', step.title, { class: 'onboarding-step-title' });
    stepContent.appendChild(stepTitle);

    const stepDesc = createElement('p', step.description, { class: 'onboarding-step-description' });
    stepContent.appendChild(stepDesc);

    // Create options grid
    const optionsGrid = createElement('div', '', { class: 'onboarding-options-grid' });

    step.options.forEach((option, index) => {
      const card = this.createOptionCard(option, step.id, index);
      optionsGrid.appendChild(card);
    });

    stepContent.appendChild(optionsGrid);

    // Update navigation buttons
    this.updateNavigation();
  }

  /**
   * Creates an option card
   * @param {Object} option - Option configuration
   * @param {string} stepId - Step ID
   * @param {number} index - Option index
   * @returns {HTMLElement} Option card element
   */
  createOptionCard(option, stepId, index) {
    const card = createElement('div', '', {
      class: 'onboarding-option-card',
      'data-step': stepId,
      'data-option': option.id,
      'data-index': index,
      tabindex: '0',
      role: 'button',
      'aria-pressed': 'false'
    });

    // Check if this option is currently selected
    if (this.selections[stepId] === option.id) {
      card.classList.add('selected');
      card.setAttribute('aria-pressed', 'true');
    }

    const icon = createElement('div', option.icon, { class: 'onboarding-option-icon' });
    card.appendChild(icon);

    const title = createElement('div', option.title, { class: 'onboarding-option-title' });
    card.appendChild(title);

    const description = createElement('div', option.description, { class: 'onboarding-option-description' });
    card.appendChild(description);

    // Spotlight element for cursor tracking
    const spotlight = createElement('div', '', { class: 'card-spotlight' });
    card.appendChild(spotlight);

    // Add click listener with ripple
    const clickHandler = (e) => {
      const rect = card.getBoundingClientRect();
      const ripple = document.createElement('div');
      ripple.className = 'card-ripple';
      const size = Math.max(rect.width, rect.height);
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      card.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove());
      this.selectOption(stepId, option.id);
    };
    card.addEventListener('click', clickHandler);

    // Add keyboard listener
    const keyHandler = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.selectOption(stepId, option.id);
      }
    };
    card.addEventListener('keydown', keyHandler);

    // 3D tilt + spotlight tracking on mousemove
    const moveHandler = (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = ((y - centerY) / centerY) * -8;
      const rotateY = ((x - centerX) / centerX) * 8;
      card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px) scale(1.02)`;
      card.style.setProperty('--spot-x', `${x}px`);
      card.style.setProperty('--spot-y', `${y}px`);
    };
    const leaveHandler = () => {
      card.style.transform = '';
    };
    card.addEventListener('mousemove', moveHandler);
    card.addEventListener('mouseleave', leaveHandler);

    // Store listeners for cleanup
    this.listeners.push({ element: card, event: 'click', handler: clickHandler });
    this.listeners.push({ element: card, event: 'keydown', handler: keyHandler });
    this.listeners.push({ element: card, event: 'mousemove', handler: moveHandler });
    this.listeners.push({ element: card, event: 'mouseleave', handler: leaveHandler });

    return card;
  }

  /**
   * Selects an option
   * @param {string} stepId - Step ID
   * @param {string} optionId - Option ID
   */
  selectOption(stepId, optionId) {
    if (this._isAdvancing) return;

    if (stepId === 'documentType' && this.selections[stepId] !== optionId) {
      const oldType = this.selections[stepId];
      if (oldType !== undefined) {
        const keysToKeep = new Set(['documentType']);
        Object.keys(this.selections).forEach(key => {
          if (!keysToKeep.has(key)) delete this.selections[key];
        });
      }
    }
    this.selections[stepId] = optionId;

    // Update UI
    const cards = this.container.querySelectorAll(`[data-step="${stepId}"]`);
    cards.forEach(card => {
      if (card.getAttribute('data-option') === optionId) {
        card.classList.add('selected');
        card.setAttribute('aria-pressed', 'true');
        this._burstFromElement(card);
      } else {
        card.classList.remove('selected');
        card.setAttribute('aria-pressed', 'false');
      }
    });

    // Update navigation
    this.updateNavigation();

    // Auto-advance if toggle is on
    if (this._continueOnSelection && this.selections[stepId]) {
      this._scheduleAdvance();
    }
  }

  _scheduleAdvance() {
    if (this._isAdvancing) return;
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer);
      this._advanceTimer = null;
    }

    this._isAdvancing = true;

    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 50 : 220;

    this._advanceTimer = setTimeout(() => {
      this._advanceTimer = null;
      this.goNext();
      this._isAdvancing = false;
    }, delay);
  }

  /**
   * Renders navigation buttons
   * @returns {HTMLElement} Navigation element
   */
  renderNavigation() {
    const navigation = createElement('div', '', { class: 'onboarding-navigation' });
    navigation.id = 'onboarding-navigation';

    const backButton = createElement('button', 'Back', {
      class: 'onboarding-btn onboarding-btn-back',
      id: 'onboarding-back-btn'
    });
    const backHandler = () => this.goBack();
    backButton.addEventListener('click', backHandler);
    this.listeners.push({ element: backButton, event: 'click', handler: backHandler });
    navigation.appendChild(backButton);

    const buttonGroup = createElement('div', '', { class: 'onboarding-btn-group' });

    const skipButton = createElement('button', 'Skip', {
      class: 'onboarding-btn onboarding-btn-skip',
      id: 'onboarding-skip-btn'
    });
    const skipHandler = () => this.skip();
    skipButton.addEventListener('click', skipHandler);
    this.listeners.push({ element: skipButton, event: 'click', handler: skipHandler });
    buttonGroup.appendChild(skipButton);

    const nextButton = createElement('button', 'Next', {
      class: 'onboarding-btn onboarding-btn-next',
      id: 'onboarding-next-btn'
    });
    const nextHandler = () => this.goNext();
    nextButton.addEventListener('click', nextHandler);
    this.listeners.push({ element: nextButton, event: 'click', handler: nextHandler });
    buttonGroup.appendChild(nextButton);

    navigation.appendChild(buttonGroup);

    return navigation;
  }

  /**
   * Updates navigation button states
   */
  updateNavigation() {
    const backButton = this.container.querySelector('#onboarding-back-btn');
    const nextButton = this.container.querySelector('#onboarding-next-btn');

    if (!backButton || !nextButton) return;

    // Back button always enabled — on step 0 it closes the wizard
    backButton.disabled = false;

    // Next button disabled if no selection made
    const currentStepId = this.getSteps()[this.currentStep].id;
    const hasSelection = this.selections[currentStepId] !== undefined;
    nextButton.disabled = !hasSelection;

    // Change text on last step
    if (this.currentStep === this.getSteps().length - 1) {
      nextButton.textContent = 'Get Started';
    } else {
      nextButton.textContent = 'Next';
    }
  }

  /**
   * Goes to previous step
   */
  goBack() {
    // If we are on the AI JD step, go back to the document type step
    if (this._showingAiJDStep) {
      this._showingAiJDStep = false;
      // Restore hidden navigation buttons
      const nextButton = this.container.querySelector('#onboarding-next-btn');
      if (nextButton) nextButton.style.display = '';
      const skipButton = this.container.querySelector('#onboarding-skip-btn');
      if (skipButton) skipButton.style.display = '';
      this.currentStep = 0;
      this.renderStep(this.currentStep);
      this.updateProgress();
      return;
    }

    if (this.currentStep > 0) {
      this.currentStep--;
      this.renderStep(this.currentStep);
      this.updateProgress();
    } else {
      this.destroy();
      if (this.onSkip) this.onSkip();
    }
  }

  /**
   * Goes to next step or completes wizard
   */
  goNext() {
    const currentStepId = this.getSteps()[this.currentStep].id;

    // Check if option is selected
    if (!this.selections[currentStepId]) {
      return;
    }

    // Intercept: if user chose AI from JD on the document-type step, show
    // the special JD-paste step instead of continuing the normal wizard flow.
    if (currentStepId === 'documentType' && this.selections.documentType === 'aiFromJD') {
      this.renderAiJDStep();
      return;
    }

    if (this.currentStep < this.getSteps().length - 1) {
      this.currentStep++;
      this.renderStep(this.currentStep);
      this.updateProgress();
    } else {
      // Complete wizard
      this.complete();
    }
  }

  /**
   * Renders the AI Job Description paste step
   */
  renderAiJDStep() {
    this._showingAiJDStep = true;

    const stepContent = this.container.querySelector('#onboarding-step-content');
    if (!stepContent) return;

    // Slide transition (forward)
    stepContent.innerHTML = '';
    stepContent.classList.remove('step-slide-in-left', 'step-slide-in-right');
    stepContent.offsetHeight; // force reflow
    stepContent.classList.add('step-slide-in-right');

    const stepTitle = createElement('h2', 'Paste Job Description', { class: 'onboarding-step-title' });
    stepContent.appendChild(stepTitle);

    const stepDesc = createElement('p', 'Paste the job description for your target role', { class: 'onboarding-step-description' });
    stepContent.appendChild(stepDesc);

    const textarea = createElement('textarea', '', {
      class: 'onboarding-jd-textarea',
      id: 'onboarding-jd-textarea',
      placeholder: 'Paste the full job description here...',
      rows: '10'
    });
    textarea.style.cssText = 'width:100%;min-height:200px;max-height:400px;padding:12px 16px;border:1px solid var(--border-color, #d1d5db);border-radius:8px;font-family:inherit;font-size:0.95rem;line-height:1.5;resize:vertical;background:var(--bg-secondary, #f9fafb);color:var(--text-primary, #111827);transition:border-color 0.2s;';
    stepContent.appendChild(textarea);

    const statusArea = createElement('div', '', {
      class: 'onboarding-jd-status',
      id: 'onboarding-jd-status'
    });
    statusArea.style.cssText = 'margin-top:8px;font-size:0.85rem;color:var(--text-secondary, #6b7280);min-height:1.5em;';
    stepContent.appendChild(statusArea);

    const generateBtn = createElement('button', 'Generate Resume', {
      class: 'onboarding-btn onboarding-btn-next',
      id: 'onboarding-generate-btn',
      style: 'margin-top:16px;width:100%;'
    });
    const generateHandler = () => this.handleAiGenerate();
    generateBtn.addEventListener('click', generateHandler);
    this.listeners.push({ element: generateBtn, event: 'click', handler: generateHandler });
    stepContent.appendChild(generateBtn);

    // Update progress to show intermediate state
    const progressFill = this.container.querySelector('#onboarding-progress-fill');
    const progressText = this.container.querySelector('#onboarding-progress-text');
    if (progressFill && progressText) {
      progressFill.style.width = '66%';
      progressText.textContent = 'AI Resume Builder';
    }

    // Update navigation: back returns to document type step
    const backButton = this.container.querySelector('#onboarding-back-btn');
    if (backButton) backButton.disabled = false;
    const nextButton = this.container.querySelector('#onboarding-next-btn');
    if (nextButton) nextButton.style.display = 'none';
    const skipButton = this.container.querySelector('#onboarding-skip-btn');
    if (skipButton) skipButton.style.display = 'none';

    // Focus the textarea
    setTimeout(() => textarea.focus(), 100);
  }

  /**
   * Handles the AI resume generation from pasted job description
   */
  async handleAiGenerate() {
    const textarea = this.container.querySelector('#onboarding-jd-textarea');
    const statusArea = this.container.querySelector('#onboarding-jd-status');
    const generateBtn = this.container.querySelector('#onboarding-generate-btn');
    if (!textarea || !generateBtn) return;

    const jobDescription = textarea.value.trim();
    if (jobDescription.length < 20) {
      if (statusArea) statusArea.textContent = 'Please paste a longer job description (at least 20 characters).';
      return;
    }

    // Disable UI during generation
    generateBtn.disabled = true;
    generateBtn.textContent = 'Generating...';
    textarea.disabled = true;
    if (statusArea) statusArea.textContent = 'Calling AI to generate your resume. This may take a moment...';

    try {
      const { AiFormatter } = await import('./ai-formatter.js');
      const ai = new AiFormatter(AiFormatter.getApiKey());
      const result = await ai.generateResumeFromJD(jobDescription);

      // Create a new resume document
      const doc = createEmptyDocument(DOCUMENT_TYPES.RESUME, 'AI-Generated Resume');

      // Fill in professional title from the AI result
      if (result.title) {
        doc.personalInfo.professionalTitle = result.title;
      }

      // Fill in the summary section
      if (result.summary) {
        const summarySection = doc.sections.find(s => s.sectionType === 'summary');
        if (summarySection) {
          summarySection.content = result.summary;
        }
      }

      // Fill in skills section from AI result
      if (result.skills && Array.isArray(result.skills)) {
        const skillsSection = doc.sections.find(s => s.sectionType === 'skills');
        if (skillsSection) {
          skillsSection.items = result.skills.map(skill => ({
            id: generateUUID(),
            category: typeof skill === 'string' ? 'Skills' : (skill.category || 'Skills'),
            name: typeof skill === 'string' ? skill : (skill.name || skill.skill || String(skill)),
            level: '',
            included: true
          }));
        }
      }

      // Fill in additional sections from the AI result
      if (result.sections && Array.isArray(result.sections)) {
        for (const aiSection of result.sections) {
          if (!aiSection.title && !aiSection.type) continue;

          // Try to find a matching existing section
          const sectionType = aiSection.type || aiSection.sectionType || '';
          let existingSection = doc.sections.find(s =>
            s.sectionType === sectionType ||
            (s.title && aiSection.title && s.title.toLowerCase() === aiSection.title.toLowerCase())
          );

          if (existingSection) {
            // Fill existing section with AI items
            if (aiSection.content) {
              existingSection.content = aiSection.content;
            }
            if (aiSection.items && Array.isArray(aiSection.items)) {
              existingSection.items = aiSection.items.map(item => ({
                id: generateUUID(),
                ...item,
                included: true
              }));
            }
          } else {
            // Create a new section
            const newSection = {
              id: generateUUID(),
              sectionType: sectionType || 'custom',
              title: aiSection.title || 'Additional Section',
              type: aiSection.items ? 'list' : 'text',
              visible: true,
              content: aiSection.content || '',
              items: (aiSection.items || []).map(item => ({
                id: generateUUID(),
                ...item,
                included: true
              }))
            };
            doc.sections.push(newSection);
          }
        }
      }

      // Mark onboarding complete and hand off the document
      this.markOnboardingComplete();
      if (this.onComplete) {
        this.onComplete(doc, { documentType: 'aiFromJD', aiGenerated: true });
      }
      this.destroy();

    } catch (err) {
      // Re-enable the UI so the user can try again
      generateBtn.disabled = false;
      generateBtn.textContent = 'Generate Resume';
      textarea.disabled = false;
      if (statusArea) {
        statusArea.textContent = err.message || 'Failed to generate resume. Please try again.';
        statusArea.style.color = 'var(--color-error, #ef4444)';
      }
    }
  }

  /**
   * Skips the wizard
   */
  skip() {
    if (confirm('Are you sure you want to skip the setup? You can always start a new document from the dashboard.')) {
      this.markOnboardingComplete();
      if (this.onSkip) {
        this.onSkip();
      }
      this.destroy();
    }
  }

  /**
   * Completes the wizard
   */
  complete() {
    this.markOnboardingComplete();

    // Create document based on selections
    const documentType = this.getDocumentType();
    const doc = createEmptyDocument(documentType, this.getDocumentName());

    // Apply selections
    doc.pageSize = this.getPageSize();
    doc.atsMode = this.selections.goal === 'ats';

    // Store career level and goal as metadata
    doc.careerLevel = this.selections.careerLevel;
    doc.goal = this.selections.goal;
    doc.startingMethod = this.selections.startingMethod;

    if (this.onComplete) {
      this.onComplete(doc, this.selections);
    }

    this.destroy();
  }

  /**
   * Gets document type based on selections
   * @returns {string} Document type
   */
  getDocumentType() {
    const docType = this.selections.documentType;

    switch (docType) {
      case 'resume':
        return DOCUMENT_TYPES.RESUME;
      case 'cv':
      case 'academicCv':
        return DOCUMENT_TYPES.CV;
      case 'coverLetter':
        return DOCUMENT_TYPES.COVER_LETTER;
      case 'referenceSheet':
        return DOCUMENT_TYPES.REFERENCE_SHEET;
      case 'aiFromJD':
        return DOCUMENT_TYPES.RESUME;
      default:
        return DOCUMENT_TYPES.RESUME;
    }
  }

  /**
   * Gets document name based on selections
   * @returns {string} Document name
   */
  getDocumentName() {
    const docType = this.selections.documentType;
    const level = this.selections.careerLevel;

    let name = 'My ';

    if (docType === 'resume') {
      name += 'Resume';
    } else if (docType === 'cv' || docType === 'academicCv') {
      name += 'CV';
    } else if (docType === 'coverLetter') {
      name += 'Cover Letter';
    } else if (docType === 'referenceSheet') {
      name += 'References';
    } else if (docType === 'aiFromJD') {
      return 'AI-Generated Resume';
    } else {
      name += 'Document';
    }

    return name;
  }

  /**
   * Gets page size based on selection
   * @returns {string} Page size
   */
  getPageSize() {
    const format = this.selections.pageFormat;

    switch (format) {
      case 'a4':
        return 'A4';
      case 'letter':
        return 'Letter';
      case 'legal':
        return 'Legal';
      case 'a5':
        return 'A5';
      default:
        return 'A4';
    }
  }

  /**
   * Handles keyboard navigation
   * @param {KeyboardEvent} e - Keyboard event
   */
  handleKeydown(e) {
    const cards = Array.from(this.container.querySelectorAll('.onboarding-option-card'));
    if (cards.length === 0) return;

    const currentIndex = cards.findIndex(card => card === document.activeElement);

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % cards.length;
      cards[nextIndex].focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + cards.length) % cards.length;
      cards[prevIndex].focus();
    }
  }

  /**
   * Marks onboarding as complete in localStorage
   */
  markOnboardingComplete() {
    try {
      localStorage.setItem('onboardingComplete', 'true');
    } catch (e) {
      console.error('Failed to save onboarding state:', e);
    }
  }

  /**
   * Checks if onboarding has been completed
   * @returns {boolean} True if onboarding is complete
   */
  static isOnboardingComplete() {
    try {
      return localStorage.getItem('onboardingComplete') === 'true';
    } catch (e) {
      console.error('Failed to check onboarding state:', e);
      return false;
    }
  }

  /**
   * Resets onboarding state (for testing)
   */
  static resetOnboarding() {
    try {
      localStorage.removeItem('onboardingComplete');
    } catch (e) {
      console.error('Failed to reset onboarding state:', e);
    }
  }

  // ==================== VISUAL EFFECTS ====================

  _burstFromElement(el) {
    if (!el || !this.container) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const count = 18;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement('div');
      spark.className = 'onboarding-spark';
      const angle = (i / count) * Math.PI * 2;
      const dist = 40 + Math.random() * 60;
      const hue = Math.floor(Math.random() * 360);
      spark.style.cssText = `left:${cx}px;top:${cy}px;--dx:${Math.cos(angle)*dist}px;--dy:${Math.sin(angle)*dist}px;--hue:${hue};--delay:${Math.random()*0.1}s;`;
      this.container.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove());
    }
  }

  _typeTitle() {
    const titleEl = this.container?.querySelector('.onboarding-title');
    if (!titleEl || this._titleTyped) return;
    this._titleTyped = true;
    const fullText = titleEl.textContent;
    titleEl.textContent = '';
    titleEl.style.minHeight = '1.2em';
    let i = 0;
    const type = () => {
      if (i < fullText.length) {
        titleEl.textContent = fullText.slice(0, i + 1);
        i++;
        setTimeout(type, 35 + Math.random() * 25);
      } else {
        titleEl.style.minHeight = '';
      }
    };
    setTimeout(type, 400);
  }

  _initProgressParticles() {
    if (!this.container) return;
    const bar = this.container.querySelector('.onboarding-progress-fill');
    if (!bar || bar._sparkInterval) return;
    bar._sparkInterval = setInterval(() => {
      if (!bar.parentNode) { clearInterval(bar._sparkInterval); return; }
      const rect = bar.getBoundingClientRect();
      if (rect.width < 10) return;
      const spark = document.createElement('div');
      spark.className = 'progress-spark';
      spark.style.left = `${rect.right - 2}px`;
      spark.style.top = `${rect.top + rect.height / 2}px`;
      this.container.appendChild(spark);
      spark.addEventListener('animationend', () => spark.remove());
    }, 600);
    this._progressSparkInterval = bar._sparkInterval;
  }

  // ==================== STARFIELD BACKGROUND ====================

  _initStarfield(canvas) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    let w, h, animId, t = 0;
    let stars, comets;
    const PI2 = Math.PI * 2;
    const trail = [];
    let mouseX = -100, mouseY = -100, mouseActive = false;
    let lastSpawn = 0;

    const resize = () => { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; };

    const floatingEmoji = [];
    const emojiSet = ['📄','📋','🎓','✉️','💼','⭐','🎯','🔍','🤖','🎨','🌱','👔','🔬','📖'];

    const init = () => {
      const count = Math.min(500, Math.floor(w * h / 2800));
      stars = [];
      for (let i = 0; i < count; i++) {
        const d = Math.random();
        stars.push({ x: Math.random() * w, y: Math.random() * h,
          ox: Math.random() * w, oy: Math.random() * h,
          r: d < 0.82 ? 0.3 + Math.random() * 0.6 : 1 + Math.random() * 1.8,
          dy: 0.01 + d * 0.1, dx: (Math.random() - 0.5) * 0.05,
          p: Math.random() * PI2, sp: 0.006 + Math.random() * 0.018,
          hue: d > 0.93 ? [220,250,340,30,200][Math.floor(Math.random()*5)] : 0,
          glow: d > 0.88,
          depth: 0.2 + d * 0.8 });
      }
      comets = [];
      floatingEmoji.length = 0;
      for (let i = 0; i < 6; i++) {
        floatingEmoji.push({
          emoji: emojiSet[Math.floor(Math.random() * emojiSet.length)],
          x: Math.random() * w, y: h + 20 + Math.random() * 100,
          dy: -(0.15 + Math.random() * 0.3),
          dx: (Math.random() - 0.5) * 0.2,
          rot: Math.random() * 360,
          rotSpeed: (Math.random() - 0.5) * 0.5,
          size: 12 + Math.random() * 10,
          alpha: 0.08 + Math.random() * 0.07
        });
      }
    };

    const onMouseMove = (e) => {
      mouseX = e.clientX; mouseY = e.clientY; mouseActive = true;
      const now = performance.now();
      if (now - lastSpawn > 16) {
        lastSpawn = now;
        const hue = (t * 40) % 360;
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * PI2;
          const speed = 0.3 + Math.random() * 1.2;
          trail.push({
            x: mouseX + (Math.random() - 0.5) * 4,
            y: mouseY + (Math.random() - 0.5) * 4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 0.3,
            r: 1.5 + Math.random() * 2.5,
            life: 1,
            decay: 0.015 + Math.random() * 0.01,
            hue: hue + Math.random() * 40 - 20
          });
        }
      }
    };

    const onMouseLeave = () => { mouseActive = false; };

    canvas.parentElement.addEventListener('mousemove', onMouseMove);
    canvas.parentElement.addEventListener('mouseleave', onMouseLeave);

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.016;

      // Parallax offset from mouse
      const px = mouseActive ? (mouseX - w / 2) / w : 0;
      const py = mouseActive ? (mouseY - h / 2) / h : 0;

      // Aurora effect at top
      for (let a = 0; a < 3; a++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const aHue = [160, 200, 280][a];
        const aAlpha = 0.02 + Math.sin(t * 0.3 + a * 2) * 0.01;
        const yOff = 40 + a * 30 + Math.sin(t * 0.2 + a) * 20;
        for (let x = 0; x <= w; x += 20) {
          const y = yOff + Math.sin(x * 0.005 + t * 0.4 + a * 1.5) * 30 + Math.sin(x * 0.01 + t * 0.2) * 15;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(w, 0); ctx.closePath();
        const ag = ctx.createLinearGradient(0, 0, 0, yOff + 60);
        ag.addColorStop(0, `hsla(${aHue}, 70%, 50%, ${aAlpha})`);
        ag.addColorStop(1, 'transparent');
        ctx.fillStyle = ag; ctx.fill();
      }

      // Stars with parallax
      for (const s of stars) {
        s.p += s.sp; s.oy += s.dy; s.ox += s.dx;
        if (s.oy > h + 4) { s.oy = -4; s.ox = Math.random() * w; }
        if (s.ox < -4) s.ox = w + 4; if (s.ox > w + 4) s.ox = -4;
        s.x = s.ox + px * s.depth * -30;
        s.y = s.oy + py * s.depth * -20;
        const al = s.glow ? 0.45 + Math.sin(s.p) * 0.55 : 0.12 + Math.sin(s.p) * 0.18;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, PI2);
        if (s.glow) {
          ctx.fillStyle = `hsla(${s.hue},70%,82%,${al})`;
          ctx.shadowColor = `hsla(${s.hue},80%,70%,0.5)`; ctx.shadowBlur = 8;
          ctx.fill(); ctx.shadowBlur = 0;
          if (s.r > 2) {
            ctx.strokeStyle = `hsla(${s.hue},50%,80%,${al*0.2})`; ctx.lineWidth = 0.5;
            ctx.beginPath(); ctx.moveTo(s.x-7,s.y); ctx.lineTo(s.x+7,s.y); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(s.x,s.y-7); ctx.lineTo(s.x,s.y+7); ctx.stroke();
          }
        } else { ctx.fillStyle = `rgba(255,255,255,${al})`; ctx.fill(); }
      }

      // Comets
      if (Math.random() < 0.025 && comets.length < 5) {
        const fl = Math.random() > 0.5;
        comets.push({ x: fl?-20:w+20, y: Math.random()*h*0.7,
          dx: (fl?1:-1)*(3+Math.random()*6), dy: 0.5+Math.random()*3,
          life: 1, len: 50+Math.random()*100, hue: [200,240,270,40,180][Math.floor(Math.random()*5)] });
      }
      for (let i = comets.length-1; i >= 0; i--) {
        const c = comets[i]; c.x += c.dx; c.y += c.dy; c.life -= 0.006;
        if (c.life<=0||c.x<-120||c.x>w+120||c.y>h+60) { comets.splice(i,1); continue; }
        const tx = c.x-(c.dx/Math.abs(c.dx))*c.len, ty = c.y-(c.dy/Math.abs(c.dy))*c.len*0.3;
        const g = ctx.createLinearGradient(tx,ty,c.x,c.y);
        g.addColorStop(0,'transparent'); g.addColorStop(1,`hsla(${c.hue},80%,90%,${c.life*0.7})`);
        ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(c.x,c.y); ctx.stroke();
        ctx.shadowColor = `hsla(${c.hue},80%,80%,0.6)`; ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(c.x,c.y,2.5,0,PI2); ctx.fillStyle=`hsla(${c.hue},90%,95%,${c.life})`; ctx.fill(); ctx.shadowBlur=0;
      }

      // Floating emoji
      ctx.save();
      for (const fe of floatingEmoji) {
        fe.y += fe.dy; fe.x += fe.dx; fe.rot += fe.rotSpeed;
        if (fe.y < -30) { fe.y = h + 20; fe.x = Math.random() * w; fe.emoji = emojiSet[Math.floor(Math.random() * emojiSet.length)]; }
        ctx.globalAlpha = fe.alpha;
        ctx.font = `${fe.size}px serif`;
        ctx.translate(fe.x, fe.y); ctx.rotate(fe.rot * Math.PI / 180);
        ctx.fillText(fe.emoji, 0, 0);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      ctx.globalAlpha = 1;
      ctx.restore();

      // Mouse trail particles
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i];
        p.x += p.vx; p.y += p.vy;
        p.vy += 0.02;
        p.vx *= 0.98;
        p.life -= p.decay;
        if (p.life <= 0) { trail.splice(i, 1); continue; }

        const size = p.r * p.life;
        const alpha = p.life * 0.7;

        // Outer glow
        ctx.shadowColor = `hsla(${p.hue}, 80%, 70%, ${alpha * 0.6})`;
        ctx.shadowBlur = 12;
        ctx.beginPath(); ctx.arc(p.x, p.y, size, 0, PI2);
        ctx.fillStyle = `hsla(${p.hue}, 75%, 70%, ${alpha})`;
        ctx.fill();
        ctx.shadowBlur = 0;

        // Bright core
        ctx.beginPath(); ctx.arc(p.x, p.y, size * 0.4, 0, PI2);
        ctx.fillStyle = `hsla(${p.hue}, 60%, 92%, ${alpha})`;
        ctx.fill();
      }

      // Cursor glow (soft ambient light around cursor)
      if (mouseActive) {
        const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 80);
        const hue = (t * 40) % 360;
        glow.addColorStop(0, `hsla(${hue}, 70%, 65%, 0.06)`);
        glow.addColorStop(0.5, `hsla(${hue}, 60%, 55%, 0.02)`);
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(mouseX, mouseY, 80, 0, PI2); ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    };
    resize(); init(); draw();
    this._starfieldCleanup = () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      canvas.parentElement?.removeEventListener('mousemove', onMouseMove);
      canvas.parentElement?.removeEventListener('mouseleave', onMouseLeave);
    };
    const onResize = () => { resize(); init(); };
    window.addEventListener('resize', onResize);
  }

  // ==================== FEATURE SHOWCASE ====================

  _getShowcaseFeatures() {
    const templateCount = window.CC?.templateEngine?.templates?.size || 68;
    return [
      { id: 'privacy', title: 'Private by Design', desc: 'Your career data stays in your browser. Nothing is uploaded.', stat: '100% Local', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>', accent: '#10b981' },
      { id: 'matching', title: 'JD Matcher', desc: 'Compare your resume against job descriptions with local analysis.', stat: 'Rule-Based', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>', accent: '#f59e0b' },
      { id: 'skills', title: 'Skills Evidence', desc: 'Map skills to experience, projects, and certifications.', stat: 'Evidence-Based', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>', accent: '#8b5cf6' },
      { id: 'templates', title: `${templateCount} Templates`, desc: 'ATS, professional, student, executive, academic, creative, and more.', stat: '9 Categories', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>', accent: '#3b82f6' },
      { id: 'workspace', title: 'Career Workspace', desc: 'Resumes, CVs, cover letters, references, and LinkedIn drafts.', stat: '6 Doc Types', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>', accent: '#ec4899' },
      { id: 'editor', title: 'Powerful Editor', desc: 'Drag-and-drop sections, rich text, live preview, undo/redo.', stat: '25 Features', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>', accent: '#06b6d4' },
      { id: 'tracker', title: 'Application Tracker', desc: 'Saved, applied, screening, interview, offer — track it all.', stat: '8 Statuses', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>', accent: '#f97316' },
      { id: 'autosave', title: 'Auto-Save', desc: 'Your work saves as you type. Protected on this device.', stat: 'Always On', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>', accent: '#14b8a6' },
      { id: 'themes', title: 'Theme Studio', desc: '12 built-in themes, custom editor, import and export.', stat: '12 Themes', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 017 7c0 2-1 4-3 5s-3 4-3 6"/><circle cx="12" cy="18" r="1" fill="currentColor"/></svg>', accent: '#a855f7' },
      { id: 'design', title: 'Design Studio', desc: 'Typography, spacing, colors, presets — full visual control.', stat: '7 Presets', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>', accent: '#e11d48' },
      { id: 'pdf', title: 'PDF Studio', desc: 'View, navigate, search, and inspect PDF documents locally.', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>', accent: '#dc2626' },
      { id: 'export', title: 'Multi-Format Export', desc: 'PDF, JSON, plain text, Markdown, HTML — your data, your way.', stat: '5 Formats', icon: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>', accent: '#0891b2' },
    ];
  }

  _initShowcase() {
    if (!this.container) return;
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isTouch = window.matchMedia?.('(pointer: coarse)').matches;
    const vw = window.innerWidth;

    if (vw < 1440) { this._initMobileShowcase(); return; }

    const features = this._getShowcaseFeatures();
    const layer = createElement('div', '', { class: 'showcase-layer', 'aria-hidden': 'true' });

    // Background orbs (4)
    const bg = createElement('div', '', { class: 'showcase-bg-layer' });
    bg.innerHTML = '<div class="showcase-orb showcase-orb--1"></div><div class="showcase-orb showcase-orb--2"></div><div class="showcase-orb showcase-orb--3"></div><div class="showcase-orb showcase-orb--4"></div>';
    layer.appendChild(bg);

    // Grid overlay
    const grid = createElement('div', '', { class: 'showcase-grid' });
    layer.appendChild(grid);

    // Sparkle particles (8)
    for (let i = 1; i <= 8; i++) {
      const p = createElement('div', '', { class: `showcase-particle showcase-particle--${i}` });
      layer.appendChild(p);
    }

    // Orbit connectors
    layer.appendChild(createElement('div', '', { class: 'showcase-connector showcase-connector--1' }));
    layer.appendChild(createElement('div', '', { class: 'showcase-connector showcase-connector--2' }));

    // Feature cards — 3 left, 3 right (stacked vertically)
    const leftCards = [features[0], features[4], features[5]];
    const rightCards = [features[1], features[3], features[6]];
    const allCards = [];
    leftCards.forEach((f, i) => { const c = this._createShowcaseCard(f, 'left', i); layer.appendChild(c); allCards.push(c); });
    rightCards.forEach((f, i) => { const c = this._createShowcaseCard(f, 'right', i); layer.appendChild(c); allCards.push(c); });

    // Chips — 6 total for secondary features spread around
    const chipConfigs = [
      [features[7], 'left'], [features[8], 'right'],
      [features[9], 'left2'], [features[2], 'right2'],
      [features[10], 'left3'], [features[11], 'right3']
    ];
    const allChips = [];
    chipConfigs.forEach(([f, pos]) => {
      const chip = this._createChip(f, pos);
      layer.appendChild(chip);
      allChips.push(chip);
    });

    // Bottom banner
    const banner = createElement('div', '', { class: 'showcase-banner' });
    banner.innerHTML = '<span class="showcase-banner-dot"></span> <strong>No account required</strong> &nbsp;·&nbsp; No watermarks &nbsp;·&nbsp; No paywalls &nbsp;·&nbsp; No upload &nbsp;·&nbsp; Works offline';
    layer.appendChild(banner);

    this.container.insertBefore(layer, this.container.firstChild);
    this._showcaseLayer = layer;

    // After pop-in animations complete, add breathing float class
    if (!prefersReducedMotion) {
      setTimeout(() => {
        allCards.forEach(c => c.classList.add('sc-floated'));
        allChips.forEach(c => c.classList.add('sc-floated'));
      }, 1200);
    }

    // Parallax mouse listener (desktop + fine pointer + no reduced motion)
    if (!prefersReducedMotion && !isTouch) {
      let rafId = null;
      let targetX = 0, targetY = 0, curX = 0, curY = 0;
      const lerp = (a, b, t) => a + (b - a) * t;

      this._showcaseMouseHandler = (e) => {
        targetX = (e.clientX / vw - 0.5) * 2;
        targetY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      this.container.addEventListener('mousemove', this._showcaseMouseHandler);

      const animate = () => {
        curX = lerp(curX, targetX, 0.08);
        curY = lerp(curY, targetY, 0.08);
        layer.style.setProperty('--mx', `${curX * 8}px`);
        layer.style.setProperty('--my', `${curY * 8}px`);
        layer.style.setProperty('--mx-bg', `${curX * 4}px`);
        layer.style.setProperty('--my-bg', `${curY * 4}px`);
        rafId = requestAnimationFrame(animate);
      };
      rafId = requestAnimationFrame(animate);
      this._showcaseRaf = rafId;
    }

    // Pause when page hidden
    this._visHandler = () => {
      if (document.hidden) layer.classList.add('showcase-paused');
      else layer.classList.remove('showcase-paused');
    };
    document.addEventListener('visibilitychange', this._visHandler);
  }

  _createShowcaseCard(feature, side, index) {
    const card = createElement('div', '', { class: `showcase-card showcase-card--${side} showcase-card--${index}` });
    card.style.setProperty('--accent', feature.accent);

    // Inner accent glow
    const glow = createElement('div', '', { class: 'showcase-card-glow' });
    card.appendChild(glow);

    // Spotlight for cursor tracking
    const spotlight = createElement('div', '', { class: 'showcase-card-spotlight' });
    card.appendChild(spotlight);

    const iconEl = createElement('div', '', { class: 'showcase-card-icon' });
    iconEl.innerHTML = feature.icon;
    card.appendChild(iconEl);
    card.appendChild(createElement('div', feature.title, { class: 'showcase-card-title' }));
    card.appendChild(createElement('div', feature.desc, { class: 'showcase-card-desc' }));

    if (feature.stat) {
      card.appendChild(createElement('div', feature.stat, { class: 'showcase-card-stat' }));
    }

    // 3D tilt + spotlight on hover
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = ((y - cy) / cy) * -10;
      const ry = ((x - cx) / cx) * 10;
      card.style.transform = `perspective(500px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.05)`;
      card.style.setProperty('--spot-x', `${x}px`);
      card.style.setProperty('--spot-y', `${y}px`);
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });

    return card;
  }

  _createChip(feature, position) {
    const chip = createElement('div', '', { class: `showcase-chip showcase-chip--${position}` });
    chip.style.setProperty('--accent', feature.accent);
    const iconEl = createElement('div', '', { class: 'showcase-chip-icon' });
    iconEl.innerHTML = feature.icon;
    chip.appendChild(iconEl);
    chip.appendChild(createElement('span', feature.title, { class: 'showcase-chip-label' }));
    return chip;
  }

  _initMobileShowcase() {
    if (!this.container) return;
    const features = this._getShowcaseFeatures().slice(0, 4);
    const strip = createElement('div', '', { class: 'showcase-mobile-strip' });
    features.forEach(f => {
      const item = createElement('div', '', { class: 'showcase-mobile-item' });
      const iconEl = createElement('div', '', { class: 'showcase-mobile-icon' });
      iconEl.innerHTML = f.icon;
      item.appendChild(iconEl);
      item.appendChild(createElement('span', f.title, {}));
      strip.appendChild(item);
    });
    const modal = this.container.querySelector('.onboarding-modal');
    const nav = modal?.querySelector('.onboarding-navigation');
    if (modal && nav) modal.insertBefore(strip, nav);
    else if (modal) modal.appendChild(strip);
    this._mobileStrip = strip;
  }

  _destroyShowcase() {
    if (this._showcaseRaf) { cancelAnimationFrame(this._showcaseRaf); this._showcaseRaf = null; }
    if (this._showcaseMouseHandler && this.container) {
      this.container.removeEventListener('mousemove', this._showcaseMouseHandler);
      this._showcaseMouseHandler = null;
    }
    if (this._visHandler) {
      document.removeEventListener('visibilitychange', this._visHandler);
      this._visHandler = null;
    }
    if (this._showcaseLayer?.parentNode) this._showcaseLayer.parentNode.removeChild(this._showcaseLayer);
    if (this._mobileStrip?.parentNode) this._mobileStrip.parentNode.removeChild(this._mobileStrip);
    this._showcaseLayer = null;
    this._mobileStrip = null;
  }

  /**
   * Cleans up event listeners and removes DOM elements
   */
  destroy() {
    if (this._advanceTimer) {
      clearTimeout(this._advanceTimer);
      this._advanceTimer = null;
    }
    this._isAdvancing = false;
    this._destroyShowcase();

    if (this._starfieldCleanup) {
      this._starfieldCleanup();
      this._starfieldCleanup = null;
    }
    if (this._progressSparkInterval) {
      clearInterval(this._progressSparkInterval);
      this._progressSparkInterval = null;
    }

    // Remove keyboard listener
    if (this.handleKeydown) {
      document.removeEventListener('keydown', this.handleKeydown);
    }

    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Remove from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
  }
}

export default OnboardingWizard;
