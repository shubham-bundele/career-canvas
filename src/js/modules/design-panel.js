/**
 * Design Panel Module
 * Customization controls for resume design
 */

import { createElement } from '../utils/sanitize.js';
import eventBus from '../core/events.js';

/**
 * Default design settings
 */
const DEFAULT_DESIGN = {
  // Page setup
  pageSize: 'A4',
  orientation: 'portrait',
  marginTop: 20,
  marginRight: 20,
  marginBottom: 20,
  marginLeft: 20,

  // Typography
  fontFamily: 'Arial',
  baseFontSize: 11,
  nameFontSize: 24,
  headingFontSize: 14,
  lineHeight: 1.5,

  // Colors
  accentColor: '#2563eb',
  textColor: '#1f2937',
  secondaryTextColor: '#6b7280',
  backgroundColor: '#ffffff',

  // Section style
  headingStyle: 'bold', // bold, underline, uppercase, accent-colored
  dividerStyle: 'line', // line, dots, none, double
  bulletStyle: 'disc', // disc, circle, square, dash, arrow

  // Layout
  headerAlignment: 'left', // left, center, right
  contactLayout: 'row', // row, column
  dateAlignment: 'right', // left, right, inline
  sidebarPosition: 'none', // none, left, right
  sidebarWidth: 30,

  // Photo
  photoShape: 'circle', // circle, square, rounded
  photoSize: 100,
  photoBorder: false,

  // Spacing
  sectionSpacing: 16,
  paragraphSpacing: 8,
  bulletSpacing: 4,

  // Advanced
  showIcons: false,
  linkStyle: 'underline', // underline, color, none
  pageNumbering: false,
  showHeader: false,
  showFooter: false
};

/**
 * DesignPanel class
 */
export class DesignPanel {
  constructor() {
    this.container = null;
    this.settings = { ...DEFAULT_DESIGN };
    this.listeners = [];
    this.undoStack = [];
    this.redoStack = [];
    this.maxUndoSteps = 20;
    this.onSettingsChange = null;
  }

  /**
   * Renders the design panel
   * @param {Object} initialSettings - Initial design settings
   * @returns {HTMLElement} Panel container
   */
  render(initialSettings = {}) {
    this.settings = { ...DEFAULT_DESIGN, ...initialSettings };

    this.container = createElement('div', '', { class: 'design-panel-container' });

    // Header
    const header = this.renderHeader();
    this.container.appendChild(header);

    // Settings groups
    const groups = createElement('div', '', { class: 'design-panel-groups' });

    // Page Setup
    const pageSetup = this.renderPageSetup();
    groups.appendChild(pageSetup);

    // Typography
    const typography = this.renderTypography();
    groups.appendChild(typography);

    // Colors
    const colors = this.renderColors();
    groups.appendChild(colors);

    // Section Style
    const sectionStyle = this.renderSectionStyle();
    groups.appendChild(sectionStyle);

    // Layout
    const layout = this.renderLayout();
    groups.appendChild(layout);

    // Photo
    const photo = this.renderPhoto();
    groups.appendChild(photo);

    // Spacing
    const spacing = this.renderSpacing();
    groups.appendChild(spacing);

    // Advanced
    const advanced = this.renderAdvanced();
    groups.appendChild(advanced);

    this.container.appendChild(groups);

    // Bottom reset button — always visible at end of panel
    const bottomActions = createElement('div', '', { class: 'design-panel-bottom-actions' });
    const bottomResetBtn = createElement('button', 'Reset All to Default', {
      class: 'design-panel-btn-reset-bottom',
      title: 'Reset all design and formatting settings to default values'
    });
    const bottomResetHandler = () => this.resetToDefault();
    bottomResetBtn.addEventListener('click', bottomResetHandler);
    this.listeners.push({ element: bottomResetBtn, event: 'click', handler: bottomResetHandler });
    bottomActions.appendChild(bottomResetBtn);
    this.container.appendChild(bottomActions);

    return this.container;
  }

  /**
   * Renders panel header
   */
  renderHeader() {
    const header = createElement('div', '', { class: 'design-panel-header' });

    const title = createElement('h3', 'Design Settings', { class: 'design-panel-title' });
    header.appendChild(title);

    // Undo/Redo buttons
    const undoRedo = createElement('div', '', { class: 'design-panel-undo-redo' });

    const undoBtn = createElement('button', '↶', {
      class: 'design-panel-btn-icon',
      'aria-label': 'Undo',
      id: 'design-undo-btn'
    });
    undoBtn.disabled = true;

    const undoHandler = () => this.undo();
    undoBtn.addEventListener('click', undoHandler);
    this.listeners.push({ element: undoBtn, event: 'click', handler: undoHandler });

    undoRedo.appendChild(undoBtn);

    const redoBtn = createElement('button', '↷', {
      class: 'design-panel-btn-icon',
      'aria-label': 'Redo',
      id: 'design-redo-btn'
    });
    redoBtn.disabled = true;

    const redoHandler = () => this.redo();
    redoBtn.addEventListener('click', redoHandler);
    this.listeners.push({ element: redoBtn, event: 'click', handler: redoHandler });

    undoRedo.appendChild(redoBtn);

    header.appendChild(undoRedo);

    // Presets dropdown
    const presetsContainer = createElement('div', '', { class: 'design-panel-presets' });

    const savePresetBtn = createElement('button', 'Save Preset', {
      class: 'design-panel-btn-secondary'
    });

    const saveHandler = () => this.savePreset();
    savePresetBtn.addEventListener('click', saveHandler);
    this.listeners.push({ element: savePresetBtn, event: 'click', handler: saveHandler });

    presetsContainer.appendChild(savePresetBtn);

    const resetBtn = createElement('button', 'Reset to Default', {
      class: 'design-panel-btn-secondary design-panel-btn-reset',
      title: 'Reset all formatting to default values'
    });

    const resetHandler = () => this.resetToDefault();
    resetBtn.addEventListener('click', resetHandler);
    this.listeners.push({ element: resetBtn, event: 'click', handler: resetHandler });

    presetsContainer.appendChild(resetBtn);

    header.appendChild(presetsContainer);

    return header;
  }

  /**
   * Renders page setup group
   */
  renderPageSetup() {
    const group = this.createGroup('Page Setup', 'page-setup');

    // Page size
    group.content.appendChild(this.createSelect('Page Size', 'pageSize', [
      { value: 'A4', label: 'A4 (210 × 297 mm)' },
      { value: 'Letter', label: 'US Letter (8.5 × 11 in)' },
      { value: 'Legal', label: 'US Legal (8.5 × 14 in)' },
      { value: 'A5', label: 'A5 (148 × 210 mm)' }
    ]));

    // Orientation
    group.content.appendChild(this.createSelect('Orientation', 'orientation', [
      { value: 'portrait', label: 'Portrait' },
      { value: 'landscape', label: 'Landscape' }
    ]));

    // Margins
    group.content.appendChild(this.createSlider('Top Margin', 'marginTop', 0, 50, 1, 'mm'));
    group.content.appendChild(this.createSlider('Right Margin', 'marginRight', 0, 50, 1, 'mm'));
    group.content.appendChild(this.createSlider('Bottom Margin', 'marginBottom', 0, 50, 1, 'mm'));
    group.content.appendChild(this.createSlider('Left Margin', 'marginLeft', 0, 50, 1, 'mm'));

    return group;
  }

  /**
   * Renders typography group
   */
  renderTypography() {
    const group = this.createGroup('Typography', 'typography');

    // Font family
    group.content.appendChild(this.createSelect('Font Family', 'fontFamily', [
      { value: 'Arial', label: 'Arial' },
      { value: 'Calibri', label: 'Calibri' },
      { value: 'Cambria', label: 'Cambria' },
      { value: 'Georgia', label: 'Georgia' },
      { value: 'Helvetica', label: 'Helvetica' },
      { value: 'Times New Roman', label: 'Times New Roman' },
      { value: 'Verdana', label: 'Verdana' },
      { value: 'Garamond', label: 'Garamond' },
      { value: 'Palatino', label: 'Palatino' },
      { value: 'Courier New', label: 'Courier New' }
    ]));

    // Font sizes
    group.content.appendChild(this.createSlider('Base Font Size', 'baseFontSize', 8, 16, 0.5, 'pt'));
    group.content.appendChild(this.createSlider('Name Font Size', 'nameFontSize', 16, 40, 1, 'pt'));
    group.content.appendChild(this.createSlider('Heading Size', 'headingFontSize', 10, 24, 1, 'pt'));
    group.content.appendChild(this.createSlider('Line Height', 'lineHeight', 1.0, 2.0, 0.1));

    return group;
  }

  /**
   * Renders colors group
   */
  renderColors() {
    const group = this.createGroup('Colors', 'colors');

    group.content.appendChild(this.createColorPicker('Accent Color', 'accentColor'));
    group.content.appendChild(this.createColorPicker('Text Color', 'textColor'));
    group.content.appendChild(this.createColorPicker('Secondary Text', 'secondaryTextColor'));
    group.content.appendChild(this.createColorPicker('Background', 'backgroundColor'));

    // Contrast check
    const contrastWarning = createElement('div', '', {
      class: 'design-panel-contrast-warning',
      id: 'contrast-warning'
    });
    group.content.appendChild(contrastWarning);

    this.checkContrast();

    return group;
  }

  /**
   * Renders section style group
   */
  renderSectionStyle() {
    const group = this.createGroup('Section Style', 'section-style');

    group.content.appendChild(this.createSelect('Heading Style', 'headingStyle', [
      { value: 'bold', label: 'Bold' },
      { value: 'underline', label: 'Underline' },
      { value: 'uppercase', label: 'Uppercase' },
      { value: 'accent-colored', label: 'Accent Colored' }
    ]));

    group.content.appendChild(this.createSelect('Divider Style', 'dividerStyle', [
      { value: 'line', label: 'Line' },
      { value: 'dots', label: 'Dots' },
      { value: 'none', label: 'None' },
      { value: 'double', label: 'Double Line' }
    ]));

    group.content.appendChild(this.createSelect('Bullet Style', 'bulletStyle', [
      { value: 'disc', label: 'Disc (•)' },
      { value: 'circle', label: 'Circle (○)' },
      { value: 'square', label: 'Square (■)' },
      { value: 'dash', label: 'Dash (–)' },
      { value: 'arrow', label: 'Arrow (→)' }
    ]));

    return group;
  }

  /**
   * Renders layout group
   */
  renderLayout() {
    const group = this.createGroup('Layout', 'layout');

    group.content.appendChild(this.createSelect('Header Alignment', 'headerAlignment', [
      { value: 'left', label: 'Left' },
      { value: 'center', label: 'Center' },
      { value: 'right', label: 'Right' }
    ]));

    group.content.appendChild(this.createSelect('Contact Layout', 'contactLayout', [
      { value: 'row', label: 'Row' },
      { value: 'column', label: 'Column' }
    ]));

    group.content.appendChild(this.createSelect('Date Alignment', 'dateAlignment', [
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' },
      { value: 'inline', label: 'Inline' }
    ]));

    group.content.appendChild(this.createSelect('Sidebar Position', 'sidebarPosition', [
      { value: 'none', label: 'None' },
      { value: 'left', label: 'Left' },
      { value: 'right', label: 'Right' }
    ]));

    group.content.appendChild(this.createSlider('Sidebar Width', 'sidebarWidth', 20, 40, 1, '%'));

    return group;
  }

  /**
   * Renders photo group
   */
  renderPhoto() {
    const group = this.createGroup('Photo', 'photo');

    group.content.appendChild(this.createSelect('Photo Shape', 'photoShape', [
      { value: 'circle', label: 'Circle' },
      { value: 'square', label: 'Square' },
      { value: 'rounded', label: 'Rounded Square' }
    ]));

    group.content.appendChild(this.createSlider('Photo Size', 'photoSize', 50, 200, 10, 'px'));

    group.content.appendChild(this.createCheckbox('Photo Border', 'photoBorder'));

    return group;
  }

  /**
   * Renders spacing group
   */
  renderSpacing() {
    const group = this.createGroup('Spacing', 'spacing');

    group.content.appendChild(this.createSlider('Section Spacing', 'sectionSpacing', 8, 32, 2, 'px'));
    group.content.appendChild(this.createSlider('Paragraph Spacing', 'paragraphSpacing', 4, 20, 2, 'px'));
    group.content.appendChild(this.createSlider('Bullet Spacing', 'bulletSpacing', 2, 12, 1, 'px'));

    return group;
  }

  /**
   * Renders advanced group
   */
  renderAdvanced() {
    const group = this.createGroup('Advanced', 'advanced');

    group.content.appendChild(this.createCheckbox('Show Icons', 'showIcons'));

    group.content.appendChild(this.createSelect('Link Style', 'linkStyle', [
      { value: 'underline', label: 'Underline' },
      { value: 'color', label: 'Color Only' },
      { value: 'none', label: 'None' }
    ]));

    group.content.appendChild(this.createCheckbox('Page Numbering', 'pageNumbering'));
    group.content.appendChild(this.createCheckbox('Show Header', 'showHeader'));
    group.content.appendChild(this.createCheckbox('Show Footer', 'showFooter'));

    return group;
  }

  /**
   * Creates a collapsible group
   */
  createGroup(title, id) {
    const group = createElement('div', '', { class: 'design-panel-group' });

    const header = createElement('div', '', { class: 'design-panel-group-header' });

    const titleEl = createElement('h4', title, { class: 'design-panel-group-title' });
    header.appendChild(titleEl);

    const toggleIcon = createElement('span', '▼', { class: 'design-panel-group-toggle' });
    header.appendChild(toggleIcon);

    const content = createElement('div', '', {
      class: 'design-panel-group-content',
      id: `design-group-${id}`
    });

    const toggleHandler = () => {
      const isExpanded = content.classList.contains('expanded');
      if (isExpanded) {
        content.classList.remove('expanded');
        toggleIcon.textContent = '▼';
      } else {
        content.classList.add('expanded');
        toggleIcon.textContent = '▲';
      }
    };

    header.addEventListener('click', toggleHandler);
    this.listeners.push({ element: header, event: 'click', handler: toggleHandler });

    // Start expanded
    content.classList.add('expanded');
    toggleIcon.textContent = '▲';

    group.appendChild(header);
    group.appendChild(content);

    // Store reference to content for adding controls
    group.content = content;

    return group;
  }

  /**
   * Creates a select control
   */
  createSelect(label, settingKey, options) {
    const control = createElement('div', '', { class: 'design-panel-control' });

    const labelEl = createElement('label', label, {
      class: 'design-panel-label',
      for: `design-${settingKey}`
    });
    control.appendChild(labelEl);

    const select = createElement('select', '', {
      class: 'design-panel-select',
      id: `design-${settingKey}`
    });

    options.forEach(opt => {
      const option = createElement('option', opt.label, { value: opt.value });
      if (this.settings[settingKey] === opt.value) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    const changeHandler = (e) => {
      this.updateSetting(settingKey, e.target.value);
    };
    select.addEventListener('change', changeHandler);
    this.listeners.push({ element: select, event: 'change', handler: changeHandler });

    control.appendChild(select);

    return control;
  }

  /**
   * Creates a slider control
   */
  createSlider(label, settingKey, min, max, step, unit = '') {
    const control = createElement('div', '', { class: 'design-panel-control' });

    const labelContainer = createElement('div', '', { class: 'design-panel-slider-label' });

    const labelEl = createElement('label', label, {
      class: 'design-panel-label',
      for: `design-${settingKey}`
    });
    labelContainer.appendChild(labelEl);

    const valueDisplay = createElement('span', `${this.settings[settingKey]}${unit}`, {
      class: 'design-panel-slider-value',
      id: `design-${settingKey}-value`
    });
    labelContainer.appendChild(valueDisplay);

    control.appendChild(labelContainer);

    const slider = createElement('input', '', {
      class: 'design-panel-slider cc-slider',
      type: 'range',
      id: `design-${settingKey}`,
      min: min.toString(),
      max: max.toString(),
      step: step.toString(),
      'data-unit': unit
    });
    slider.value = this.settings[settingKey];

    const inputHandler = (e) => {
      const value = parseFloat(e.target.value);
      valueDisplay.textContent = `${value}${unit}`;
      this.updateSetting(settingKey, value, true);
    };

    const changeHandler = () => {
      this.saveToUndoStack();
    };

    slider.addEventListener('input', inputHandler);
    slider.addEventListener('change', changeHandler);
    this.listeners.push({ element: slider, event: 'input', handler: inputHandler });
    this.listeners.push({ element: slider, event: 'change', handler: changeHandler });

    control.appendChild(slider);

    return control;
  }

  /**
   * Creates a color picker control
   */
  createColorPicker(label, settingKey) {
    const control = createElement('div', '', { class: 'design-panel-control' });

    const labelEl = createElement('label', label, {
      class: 'design-panel-label',
      for: `design-${settingKey}`
    });
    control.appendChild(labelEl);

    const inputContainer = createElement('div', '', { class: 'design-panel-color-input-container' });

    const colorInput = createElement('input', '', {
      class: 'design-panel-color-input',
      type: 'color',
      id: `design-${settingKey}`
    });
    colorInput.value = this.settings[settingKey];

    const changeHandler = (e) => {
      this.updateSetting(settingKey, e.target.value);
      this.checkContrast();
    };
    colorInput.addEventListener('change', changeHandler);
    this.listeners.push({ element: colorInput, event: 'change', handler: changeHandler });

    inputContainer.appendChild(colorInput);

    const hexInput = createElement('input', '', {
      class: 'design-panel-color-hex',
      type: 'text',
      maxlength: '7'
    });
    hexInput.value = this.settings[settingKey];

    const hexInputHandler = (e) => {
      const value = e.target.value;
      if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
        colorInput.value = value;
        this.updateSetting(settingKey, value);
        this.checkContrast();
      }
    };
    hexInput.addEventListener('change', hexInputHandler);
    this.listeners.push({ element: hexInput, event: 'change', handler: hexInputHandler });

    inputContainer.appendChild(hexInput);

    control.appendChild(inputContainer);

    return control;
  }

  /**
   * Creates a checkbox control
   */
  createCheckbox(label, settingKey) {
    const control = createElement('div', '', { class: 'design-panel-control design-panel-control-checkbox' });

    const checkbox = createElement('input', '', {
      class: 'design-panel-checkbox',
      type: 'checkbox',
      id: `design-${settingKey}`
    });
    checkbox.checked = this.settings[settingKey];

    const changeHandler = (e) => {
      this.updateSetting(settingKey, e.target.checked);
    };
    checkbox.addEventListener('change', changeHandler);
    this.listeners.push({ element: checkbox, event: 'change', handler: changeHandler });

    control.appendChild(checkbox);

    const labelEl = createElement('label', label, {
      class: 'design-panel-label',
      for: `design-${settingKey}`
    });
    control.appendChild(labelEl);

    return control;
  }

  /**
   * Updates a setting
   */
  updateSetting(key, value, debounce = false) {
    this.settings[key] = value;

    if (!debounce) {
      this.saveToUndoStack();
    }

    // Emit change event
    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }

    eventBus.emit('design:change', { settings: this.settings });
  }

  /**
   * Saves current state to undo stack
   */
  saveToUndoStack() {
    this.undoStack.push({ ...this.settings });

    if (this.undoStack.length > this.maxUndoSteps) {
      this.undoStack.shift();
    }

    this.redoStack = [];
    this.updateUndoRedoButtons();
  }

  /**
   * Undo last change
   */
  undo() {
    if (this.undoStack.length === 0) return;

    this.redoStack.push({ ...this.settings });
    this.settings = this.undoStack.pop();

    this.updateAllControls();
    this.updateUndoRedoButtons();

    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }

    eventBus.emit('design:change', { settings: this.settings });
  }

  /**
   * Redo last undone change
   */
  redo() {
    if (this.redoStack.length === 0) return;

    this.undoStack.push({ ...this.settings });
    this.settings = this.redoStack.pop();

    this.updateAllControls();
    this.updateUndoRedoButtons();

    if (this.onSettingsChange) {
      this.onSettingsChange(this.settings);
    }

    eventBus.emit('design:change', { settings: this.settings });
  }

  /**
   * Updates undo/redo button states
   */
  updateUndoRedoButtons() {
    const undoBtn = this.container.querySelector('#design-undo-btn');
    const redoBtn = this.container.querySelector('#design-redo-btn');

    if (undoBtn) {
      undoBtn.disabled = this.undoStack.length === 0;
    }

    if (redoBtn) {
      redoBtn.disabled = this.redoStack.length === 0;
    }
  }

  /**
   * Updates all control values
   */
  updateAllControls() {
    Object.keys(this.settings).forEach(key => {
      const input = this.container.querySelector('#design-' + key);
      if (!input) return;

      if (input.type === 'checkbox') {
        input.checked = this.settings[key];
      } else if (input.type === 'range') {
        input.value = this.settings[key];
        const valueDisplay = this.container.querySelector('#design-' + key + '-value');
        if (valueDisplay) {
          const unit = input.dataset.unit || '';
          valueDisplay.textContent = `${this.settings[key]}${unit}`;
        }
      } else {
        input.value = this.settings[key];
      }
    });

    this.checkContrast();
  }

  /**
   * Checks color contrast ratio
   */
  checkContrast() {
    const textColor = this.settings.textColor;
    const bgColor = this.settings.backgroundColor;

    const ratio = this.calculateContrastRatio(textColor, bgColor);

    const warning = this.container.querySelector('#contrast-warning');
    if (!warning) return;

    if (ratio < 4.5) {
      warning.textContent = `⚠ Low contrast ratio (${ratio.toFixed(2)}:1). Minimum recommended is 4.5:1`;
      warning.style.display = 'block';
    } else {
      warning.style.display = 'none';
    }
  }

  /**
   * Calculates contrast ratio between two colors
   */
  calculateContrastRatio(color1, color2) {
    const lum1 = this.getRelativeLuminance(color1);
    const lum2 = this.getRelativeLuminance(color2);

    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Gets relative luminance of a color
   */
  getRelativeLuminance(hexColor) {
    const rgb = this.hexToRgb(hexColor);
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Converts hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }

  /**
   * Saves current settings as a preset
   */
  savePreset() {
    const name = prompt('Enter preset name:');
    if (!name) return;

    const presets = this.getPresets();
    presets[name] = { ...this.settings };

    try {
      localStorage.setItem('designPresets', JSON.stringify(presets));
      eventBus.emit('design:presetSaved', { name });
    } catch (error) {
      console.error('Failed to save preset:', error);
    }
  }

  /**
   * Gets saved presets
   */
  getPresets() {
    try {
      const presets = localStorage.getItem('designPresets');
      return presets ? JSON.parse(presets) : {};
    } catch (error) {
      console.error('Failed to load presets:', error);
      return {};
    }
  }

  /**
   * Resets to default settings
   */
  resetToDefault() {
    if (confirm('Reset all design settings to default?')) {
      this.settings = { ...DEFAULT_DESIGN };
      this.updateAllControls();

      if (this.onSettingsChange) {
        this.onSettingsChange(this.settings);
      }

      eventBus.emit('design:change', { settings: this.settings });
    }
  }

  /**
   * Gets current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Cleans up event listeners
   */
  destroy() {
    this.listeners.forEach(({ element, event, handler }) => {
      element.removeEventListener(event, handler);
    });
    this.listeners = [];

    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }

    this.container = null;
  }
}

export default DesignPanel;
