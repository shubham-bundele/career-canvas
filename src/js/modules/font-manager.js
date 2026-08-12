/**
 * Font Manager Module
 * Professional font and typography controls for CareerCanvas
 * Inspired by Google Docs, Canva, and Notion
 */

import { createElement } from '../utils/sanitize.js';

/**
 * Font categories and collections
 */
const FONT_CATEGORIES = {
  'Sans-Serif': [
    'Arial',
    'Helvetica',
    'Inter',
    'Roboto',
    'Open Sans',
    'Lato',
    'Poppins',
    'Montserrat',
    'Nunito',
    'Source Sans Pro',
    'Raleway',
    'Work Sans',
    'DM Sans',
    'Plus Jakarta Sans'
  ],
  'Serif': [
    'Georgia',
    'Times New Roman',
    'Merriweather',
    'Playfair Display',
    'Lora',
    'Libre Baskerville',
    'EB Garamond',
    'Crimson Text',
    'PT Serif'
  ],
  'Monospace': [
    'Courier New',
    'Fira Code',
    'JetBrains Mono',
    'Source Code Pro',
    'IBM Plex Mono'
  ]
};

/**
 * Preset styles for quick application
 */
const PRESETS = {
  modern: {
    name: 'Modern',
    fontFamily: 'Inter',
    fontSize: 11,
    nameSize: 28,
    headingSize: 14,
    lineHeight: 1.5,
    accentColor: '#3b82f6',
    textColor: '#1f2937',
    sectionSpacing: 16,
    paragraphSpacing: 8
  },
  classic: {
    name: 'Classic',
    fontFamily: 'Georgia',
    fontSize: 11,
    nameSize: 26,
    headingSize: 13,
    lineHeight: 1.5,
    accentColor: '#374151',
    textColor: '#1f2937',
    sectionSpacing: 18,
    paragraphSpacing: 10
  },
  minimal: {
    name: 'Minimal',
    fontFamily: 'Arial',
    fontSize: 10.5,
    nameSize: 24,
    headingSize: 12,
    lineHeight: 1.4,
    accentColor: '#000000',
    textColor: '#1f2937',
    sectionSpacing: 14,
    paragraphSpacing: 6
  },
  creative: {
    name: 'Creative',
    fontFamily: 'Poppins',
    fontSize: 11,
    nameSize: 32,
    headingSize: 15,
    lineHeight: 1.6,
    accentColor: '#a855f7',
    textColor: '#1f2937',
    sectionSpacing: 20,
    paragraphSpacing: 10
  },
  professional: {
    name: 'Professional',
    fontFamily: 'Calibri',
    fontSize: 11,
    nameSize: 26,
    headingSize: 13,
    lineHeight: 1.5,
    accentColor: '#1e40af',
    textColor: '#1f2937',
    sectionSpacing: 16,
    paragraphSpacing: 8
  },
  academic: {
    name: 'Academic',
    fontFamily: 'Times New Roman',
    fontSize: 12,
    nameSize: 24,
    headingSize: 14,
    lineHeight: 1.5,
    accentColor: '#374151',
    textColor: '#000000',
    sectionSpacing: 16,
    paragraphSpacing: 8
  }
};

/**
 * Line height options
 */
const LINE_HEIGHT_OPTIONS = [
  { value: 1.0, label: 'Compact (1.0)' },
  { value: 1.15, label: 'Tight (1.15)' },
  { value: 1.25, label: 'Snug (1.25)' },
  { value: 1.5, label: 'Normal (1.5)' },
  { value: 1.75, label: 'Relaxed (1.75)' },
  { value: 2.0, label: 'Spacious (2.0)' }
];

/**
 * Font size quick presets
 */
const FONT_SIZE_PRESETS = [9, 10, 11, 12, 14];

/**
 * FontManager class
 */
export class FontManager {
  constructor(designSettings = {}, onChange = null) {
    this.settings = {
      fontFamily: designSettings.fontFamily || 'Arial',
      fontSize: designSettings.baseFontSize || designSettings.fontSize || 11,
      nameSize: designSettings.nameFontSize || designSettings.nameSize || 24,
      headingSize: designSettings.headingFontSize || designSettings.headingSize || 14,
      lineHeight: designSettings.lineHeight || 1.5,
      accentColor: designSettings.accentColor || '#2563eb',
      textColor: designSettings.textColor || '#1f2937',
      sectionSpacing: designSettings.sectionSpacing || 16,
      paragraphSpacing: designSettings.paragraphSpacing || 8
    };

    this.onChange = onChange;
    this.container = null;
    this.listeners = [];
    this.fontSearchTerm = '';
    this.isDropdownOpen = false;
  }

  /**
   * Renders the font manager toolbar
   * @returns {HTMLElement} Toolbar container
   */
  render() {
    this.container = createElement('div', '', { class: 'font-manager' });

    // Header
    const header = this.renderHeader();
    this.container.appendChild(header);

    // Toolbar sections
    const toolbar = createElement('div', '', { class: 'font-manager-toolbar' });

    // Font family section
    const fontSection = this.renderFontFamily();
    toolbar.appendChild(fontSection);

    // Font size section
    const sizeSection = this.renderFontSize();
    toolbar.appendChild(sizeSection);

    // Heading styles section
    const headingSection = this.renderHeadingStyles();
    toolbar.appendChild(headingSection);

    // Line height section
    const lineHeightSection = this.renderLineHeight();
    toolbar.appendChild(lineHeightSection);

    // Colors section
    const colorsSection = this.renderColors();
    toolbar.appendChild(colorsSection);

    // Spacing section
    const spacingSection = this.renderSpacing();
    toolbar.appendChild(spacingSection);

    this.container.appendChild(toolbar);

    // Preset styles section
    const presetsSection = this.renderPresets();
    this.container.appendChild(presetsSection);

    return this.container;
  }

  /**
   * Renders the header
   */
  renderHeader() {
    const header = createElement('div', '', { class: 'font-manager-header' });

    const title = createElement('h3', 'Typography Controls', { class: 'font-manager-title' });
    header.appendChild(title);

    const subtitle = createElement('p', 'Customize fonts, sizes, colors, and spacing', {
      class: 'font-manager-subtitle'
    });
    header.appendChild(subtitle);

    return header;
  }

  /**
   * Renders font family picker
   */
  renderFontFamily() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Font Family', {
      class: 'font-manager-label',
      for: 'font-family-picker'
    });
    section.appendChild(label);

    // Custom dropdown
    const dropdown = createElement('div', '', { class: 'font-family-dropdown' });

    // Selected font display
    const selected = createElement('button', '', {
      class: 'font-family-selected',
      id: 'font-family-picker',
      type: 'button',
      'aria-haspopup': 'listbox',
      'aria-expanded': 'false'
    });

    const selectedText = createElement('span', this.settings.fontFamily, {
      class: 'font-family-selected-text'
    });
    selectedText.style.fontFamily = this.settings.fontFamily;
    selected.appendChild(selectedText);

    const chevron = createElement('span', '▼', { class: 'font-family-chevron' });
    selected.appendChild(chevron);

    const clickHandler = () => this.toggleFontDropdown();
    selected.addEventListener('click', clickHandler);
    this.listeners.push({ element: selected, event: 'click', handler: clickHandler });

    dropdown.appendChild(selected);

    // Dropdown menu
    const menu = createElement('div', '', {
      class: 'font-family-menu',
      role: 'listbox',
      id: 'font-family-menu'
    });
    menu.style.display = 'none';

    // Search input
    const searchContainer = createElement('div', '', { class: 'font-family-search' });
    const searchInput = createElement('input', '', {
      class: 'font-family-search-input',
      type: 'text',
      placeholder: 'Search fonts...',
      id: 'font-search-input'
    });

    const searchHandler = (e) => {
      this.fontSearchTerm = e.target.value.toLowerCase();
      this.updateFontList();
    };
    searchInput.addEventListener('input', searchHandler);
    this.listeners.push({ element: searchInput, event: 'input', handler: searchHandler });

    searchContainer.appendChild(searchInput);
    menu.appendChild(searchContainer);

    // Font list
    const fontList = createElement('div', '', {
      class: 'font-family-list',
      id: 'font-family-list'
    });
    menu.appendChild(fontList);

    dropdown.appendChild(menu);

    this.populateFontList(fontList);

    section.appendChild(dropdown);

    return section;
  }

  /**
   * Populates the font list
   */
  populateFontList(container) {
    container.innerHTML = '';

    Object.entries(FONT_CATEGORIES).forEach(([category, fonts]) => {
      const filteredFonts = fonts.filter(font =>
        font.toLowerCase().includes(this.fontSearchTerm)
      );

      if (filteredFonts.length === 0) return;

      const categoryHeader = createElement('div', category, {
        class: 'font-family-category'
      });
      container.appendChild(categoryHeader);

      filteredFonts.forEach(font => {
        const option = createElement('button', font, {
          class: 'font-family-option',
          type: 'button',
          role: 'option',
          'data-font': font
        });
        option.style.fontFamily = font;

        if (font === this.settings.fontFamily) {
          option.classList.add('selected');
          option.setAttribute('aria-selected', 'true');
        }

        const selectHandler = () => {
          this.updateSetting('fontFamily', font);
          this.closeFontDropdown();
        };
        option.addEventListener('click', selectHandler);
        this.listeners.push({ element: option, event: 'click', handler: selectHandler });

        container.appendChild(option);
      });
    });
  }

  /**
   * Updates font list (for search)
   */
  updateFontList() {
    const list = this.container.querySelector('#font-family-list');
    if (list) {
      this.populateFontList(list);
    }
  }

  /**
   * Toggles font dropdown
   */
  toggleFontDropdown() {
    if (this.isDropdownOpen) {
      this.closeFontDropdown();
    } else {
      this.openFontDropdown();
    }
  }

  /**
   * Opens font dropdown
   */
  openFontDropdown() {
    const menu = this.container.querySelector('#font-family-menu');
    const button = this.container.querySelector('#font-family-picker');
    const searchInput = this.container.querySelector('#font-search-input');

    if (menu && button) {
      menu.style.display = 'block';
      button.setAttribute('aria-expanded', 'true');
      this.isDropdownOpen = true;

      if (searchInput) {
        setTimeout(() => searchInput.focus(), 50);
      }

      // Close on outside click
      const outsideClickHandler = (e) => {
        if (!menu.contains(e.target) && !button.contains(e.target)) {
          this.closeFontDropdown();
          document.removeEventListener('click', outsideClickHandler);
        }
      };
      setTimeout(() => {
        document.addEventListener('click', outsideClickHandler);
      }, 100);
    }
  }

  /**
   * Closes font dropdown
   */
  closeFontDropdown() {
    const menu = this.container.querySelector('#font-family-menu');
    const button = this.container.querySelector('#font-family-picker');
    const searchInput = this.container.querySelector('#font-search-input');

    if (menu && button) {
      menu.style.display = 'none';
      button.setAttribute('aria-expanded', 'false');
      this.isDropdownOpen = false;

      if (searchInput) {
        searchInput.value = '';
        this.fontSearchTerm = '';
        this.updateFontList();
      }
    }
  }

  /**
   * Renders font size controls
   */
  renderFontSize() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Font Size', {
      class: 'font-manager-label',
      for: 'font-size-input'
    });
    section.appendChild(label);

    const controls = createElement('div', '', { class: 'font-size-controls' });

    // Decrease button
    const decreaseBtn = createElement('button', '−', {
      class: 'font-size-btn font-size-btn-decrease',
      type: 'button',
      'aria-label': 'Decrease font size'
    });
    const decreaseHandler = () => {
      const newSize = Math.max(8, this.settings.fontSize - 0.5);
      this.updateSetting('fontSize', newSize);
    };
    decreaseBtn.addEventListener('click', decreaseHandler);
    this.listeners.push({ element: decreaseBtn, event: 'click', handler: decreaseHandler });
    controls.appendChild(decreaseBtn);

    // Size input
    const sizeInput = createElement('input', '', {
      class: 'font-size-input',
      type: 'number',
      id: 'font-size-input',
      min: '8',
      max: '16',
      step: '0.5'
    });
    sizeInput.value = this.settings.fontSize;

    const sizeChangeHandler = (e) => {
      const value = parseFloat(e.target.value);
      if (!isNaN(value) && value >= 8 && value <= 16) {
        this.updateSetting('fontSize', value);
      }
    };
    sizeInput.addEventListener('change', sizeChangeHandler);
    this.listeners.push({ element: sizeInput, event: 'change', handler: sizeChangeHandler });
    controls.appendChild(sizeInput);

    // Increase button
    const increaseBtn = createElement('button', '+', {
      class: 'font-size-btn font-size-btn-increase',
      type: 'button',
      'aria-label': 'Increase font size'
    });
    const increaseHandler = () => {
      const newSize = Math.min(16, this.settings.fontSize + 0.5);
      this.updateSetting('fontSize', newSize);
    };
    increaseBtn.addEventListener('click', increaseHandler);
    this.listeners.push({ element: increaseBtn, event: 'click', handler: increaseHandler });
    controls.appendChild(increaseBtn);

    section.appendChild(controls);

    // Quick presets
    const presets = createElement('div', '', { class: 'font-size-presets' });
    FONT_SIZE_PRESETS.forEach(size => {
      const btn = createElement('button', `${size}`, {
        class: 'font-size-preset-btn',
        type: 'button'
      });
      if (this.settings.fontSize === size) {
        btn.classList.add('active');
      }
      const presetHandler = () => this.updateSetting('fontSize', size);
      btn.addEventListener('click', presetHandler);
      this.listeners.push({ element: btn, event: 'click', handler: presetHandler });
      presets.appendChild(btn);
    });
    section.appendChild(presets);

    return section;
  }

  /**
   * Renders heading styles controls
   */
  renderHeadingStyles() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Heading Styles', { class: 'font-manager-label' });
    section.appendChild(label);

    // Name size
    const nameControl = this.createSliderControl(
      'Name/Title',
      'nameSize',
      18,
      42,
      1,
      'pt'
    );
    section.appendChild(nameControl);

    // Section heading size
    const headingControl = this.createSliderControl(
      'Section Heading',
      'headingSize',
      11,
      20,
      1,
      'pt'
    );
    section.appendChild(headingControl);

    return section;
  }

  /**
   * Renders line height controls
   */
  renderLineHeight() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Line Height', {
      class: 'font-manager-label',
      for: 'line-height-select'
    });
    section.appendChild(label);

    const select = createElement('select', '', {
      class: 'font-manager-select',
      id: 'line-height-select'
    });

    LINE_HEIGHT_OPTIONS.forEach(option => {
      const opt = createElement('option', option.label, {
        value: option.value.toString()
      });
      if (Math.abs(this.settings.lineHeight - option.value) < 0.01) {
        opt.selected = true;
      }
      select.appendChild(opt);
    });

    const changeHandler = (e) => {
      this.updateSetting('lineHeight', parseFloat(e.target.value));
    };
    select.addEventListener('change', changeHandler);
    this.listeners.push({ element: select, event: 'change', handler: changeHandler });

    section.appendChild(select);

    return section;
  }

  /**
   * Renders color controls
   */
  renderColors() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Colors', { class: 'font-manager-label' });
    section.appendChild(label);

    const colorRow = createElement('div', '', { class: 'font-manager-color-row' });

    // Accent color
    const accentControl = this.createColorControl('Accent', 'accentColor');
    colorRow.appendChild(accentControl);

    // Text color
    const textControl = this.createColorControl('Text', 'textColor');
    colorRow.appendChild(textControl);

    section.appendChild(colorRow);

    return section;
  }

  /**
   * Renders spacing controls
   */
  renderSpacing() {
    const section = createElement('div', '', { class: 'font-manager-section' });

    const label = createElement('label', 'Spacing', { class: 'font-manager-label' });
    section.appendChild(label);

    // Section spacing
    const sectionControl = this.createSliderControl(
      'Section Spacing',
      'sectionSpacing',
      8,
      32,
      2,
      'px'
    );
    section.appendChild(sectionControl);

    // Paragraph spacing
    const paragraphControl = this.createSliderControl(
      'Paragraph Spacing',
      'paragraphSpacing',
      4,
      16,
      2,
      'px'
    );
    section.appendChild(paragraphControl);

    return section;
  }

  /**
   * Renders preset styles
   */
  renderPresets() {
    const section = createElement('div', '', { class: 'font-manager-presets' });

    const header = createElement('div', '', { class: 'font-manager-presets-header' });
    const title = createElement('h4', 'Quick Styles', { class: 'font-manager-presets-title' });
    header.appendChild(title);
    section.appendChild(header);

    const grid = createElement('div', '', { class: 'font-manager-presets-grid' });

    Object.entries(PRESETS).forEach(([key, preset]) => {
      const card = createElement('button', '', {
        class: 'font-preset-card',
        type: 'button'
      });

      const name = createElement('div', preset.name, {
        class: 'font-preset-name'
      });
      name.style.fontFamily = preset.fontFamily;
      card.appendChild(name);

      const preview = createElement('div', '', { class: 'font-preset-preview' });

      const fontInfo = createElement('div', preset.fontFamily, {
        class: 'font-preset-font'
      });
      preview.appendChild(fontInfo);

      const sizeInfo = createElement('div', `${preset.fontSize}pt`, {
        class: 'font-preset-size'
      });
      preview.appendChild(sizeInfo);

      const colorSwatch = createElement('div', '', {
        class: 'font-preset-color'
      });
      colorSwatch.style.backgroundColor = preset.accentColor;
      preview.appendChild(colorSwatch);

      card.appendChild(preview);

      const clickHandler = () => this.applyPreset(key);
      card.addEventListener('click', clickHandler);
      this.listeners.push({ element: card, event: 'click', handler: clickHandler });

      grid.appendChild(card);
    });

    section.appendChild(grid);

    return section;
  }

  /**
   * Creates a slider control
   */
  createSliderControl(label, key, min, max, step, unit = '') {
    const control = createElement('div', '', { class: 'font-manager-slider-control' });

    const labelRow = createElement('div', '', { class: 'font-manager-slider-label' });

    const labelEl = createElement('span', label, { class: 'font-manager-slider-label-text' });
    labelRow.appendChild(labelEl);

    const value = createElement('span', `${this.settings[key]}${unit}`, {
      class: 'font-manager-slider-value',
      id: `${key}-value`
    });
    labelRow.appendChild(value);

    control.appendChild(labelRow);

    const slider = createElement('input', '', {
      class: 'cc-slider',
      type: 'range',
      id: `${key}-slider`,
      min: min.toString(),
      max: max.toString(),
      step: step.toString()
    });
    slider.value = this.settings[key];
    this.updateSliderFill(slider);

    const inputHandler = (e) => {
      const newValue = parseFloat(e.target.value);
      value.textContent = `${newValue}${unit}`;
      this.updateSliderFill(slider);
      this.updateSetting(key, newValue);
    };
    slider.addEventListener('input', inputHandler);
    this.listeners.push({ element: slider, event: 'input', handler: inputHandler });

    control.appendChild(slider);

    return control;
  }

  /**
   * Creates a color control
   */
  createColorControl(label, key) {
    const control = createElement('div', '', { class: 'font-manager-color-control' });

    const labelEl = createElement('label', label, {
      class: 'font-manager-color-label',
      for: `${key}-input`
    });
    control.appendChild(labelEl);

    const inputWrapper = createElement('div', '', { class: 'font-manager-color-wrapper' });

    const colorInput = createElement('input', '', {
      class: 'font-manager-color-input',
      type: 'color',
      id: `${key}-input`
    });
    colorInput.value = this.settings[key] || '#000000';

    const swatch = createElement('div', '', {
      class: 'font-manager-color-swatch',
      id: `${key}-swatch`,
      title: `Click to change ${label.toLowerCase()} color`,
      role: 'button',
      tabindex: '0'
    });
    swatch.style.backgroundColor = this.settings[key] || '#000000';

    const changeHandler = (e) => {
      this.updateSetting(key, e.target.value);
      swatch.style.backgroundColor = e.target.value;
    };
    colorInput.addEventListener('input', changeHandler);
    this.listeners.push({ element: colorInput, event: 'input', handler: changeHandler });

    swatch.addEventListener('click', () => colorInput.click());
    swatch.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') colorInput.click(); });

    inputWrapper.appendChild(colorInput);
    inputWrapper.appendChild(swatch);

    control.appendChild(inputWrapper);

    return control;
  }

  /**
   * Updates a setting
   */
  updateSliderFill(slider) {
    const min = parseFloat(slider.min) || 0;
    const max = parseFloat(slider.max) || 100;
    const val = parseFloat(slider.value) || 0;
    const pct = Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));
    slider.style.background = `linear-gradient(to right, var(--color-primary, #2563eb) 0%, var(--color-primary, #2563eb) ${pct}%, var(--bg-tertiary, #334155) ${pct}%, var(--bg-tertiary, #334155) 100%)`;
  }

  updateSetting(key, value) {
    this.settings[key] = value;

    // Update UI elements
    this.updateUI(key, value);

    // Call onChange callback
    if (this.onChange) {
      this.onChange(this.settings);
    }
  }

  /**
   * Updates UI elements after a setting change
   */
  updateUI(key, value) {
    if (!this.container) return;

    // Update font family display
    if (key === 'fontFamily') {
      const selectedText = this.container.querySelector('.font-family-selected-text');
      if (selectedText) {
        selectedText.textContent = value;
        selectedText.style.fontFamily = value;
      }

      // Update selected option
      const options = this.container.querySelectorAll('.font-family-option');
      options.forEach(opt => {
        if (opt.getAttribute('data-font') === value) {
          opt.classList.add('selected');
          opt.setAttribute('aria-selected', 'true');
        } else {
          opt.classList.remove('selected');
          opt.removeAttribute('aria-selected');
        }
      });
    }

    // Update font size input
    if (key === 'fontSize') {
      const input = this.container.querySelector('#font-size-input');
      if (input) {
        input.value = value;
      }

      // Update preset buttons
      const presetBtns = this.container.querySelectorAll('.font-size-preset-btn');
      presetBtns.forEach(btn => {
        if (parseFloat(btn.textContent) === value) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      });
    }

    // Update slider values
    if (key === 'nameSize' || key === 'headingSize' || key === 'sectionSpacing' || key === 'paragraphSpacing') {
      const slider = this.container.querySelector(`#${key}-slider`);
      if (slider) {
        slider.value = value;
      }
    }

    // Update color swatches
    if (key === 'accentColor' || key === 'textColor') {
      const swatch = this.container.querySelector(`#${key}-swatch`);
      if (swatch) {
        swatch.style.backgroundColor = value;
      }
      const input = this.container.querySelector(`#${key}-input`);
      if (input) {
        input.value = value;
      }
    }

    // Update line height select
    if (key === 'lineHeight') {
      const select = this.container.querySelector('#line-height-select');
      if (select) {
        select.value = value.toString();
      }
    }
  }

  /**
   * Applies a preset style
   */
  applyPreset(presetName) {
    const preset = PRESETS[presetName];
    if (!preset) return;

    // Update all settings from preset
    Object.keys(preset).forEach(key => {
      if (key !== 'name' && this.settings.hasOwnProperty(key)) {
        this.settings[key] = preset[key];
      }
    });

    // Update all UI elements
    Object.keys(this.settings).forEach(key => {
      this.updateUI(key, this.settings[key]);
    });

    // Call onChange callback
    if (this.onChange) {
      this.onChange(this.settings);
    }
  }

  /**
   * Gets current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Destroys the font manager (cleanup)
   */
  destroy() {
    // Remove all event listeners
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    // Remove container from DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
  }
}

export default FontManager;
