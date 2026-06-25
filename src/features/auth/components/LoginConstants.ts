/**
 * Design tokens aligned with web PR#179 account.css.
 *
 * Web reference: fun-talk-web/src/account/account.css
 *
 * Key differences from the old mobile palette:
 * - Primary buttons: green→teal gradient (not orange)
 * - Cards: white glassmorphic (not warm #fff7ee)
 * - Tabs: #f1f5f9 container, white active (not orange underline)
 * - Inputs: #f8fafc bg, #e2e8f0 border, blue focus
 * - Text: #0f172a dark / #475569 muted (Slate palette)
 */

export const LoginColors = {
  /* ── Primary (green → teal gradient, web .account-btn-primary) ── */
  primaryStart: '#10b981',
  primaryEnd: '#06b6d4',
  primaryShadow: 'rgba(6, 182, 212, 0.25)',
  primaryShadowHover: 'rgba(6, 182, 212, 0.35)',

  /* ── Card (glassmorphic white, web .account-card) ── */
  cardBg: 'rgba(255, 255, 255, 0.88)',
  cardBorder: 'rgba(255, 255, 255, 0.5)',
  cardShadow: '#0f172a',

  /* ── Panel (inner form panel, web .account-login-panel) ── */
  panelBg: 'rgba(248, 250, 252, 0.92)',
  panelBorder: '#e2e8f0',

  /* ── Tabs (web .account-tabs) ── */
  tabContainerBg: '#f1f5f9',
  tabActiveBg: '#ffffff',
  tabActiveText: '#0f172a',
  tabInactiveText: '#475569',
  tabShadow: 'rgba(15, 23, 42, 0.05)',

  /* ── Sub-tabs (family login mode, web .account-family-login-tabs) ── */
  subTabContainerBg: '#e2e8f0',

  /* ── Input (web .account-input) ── */
  inputBg: '#f8fafc',
  inputBgFocus: '#ffffff',
  inputBorder: '#e2e8f0',
  inputBorderFocus: '#38bdf8',
  inputFocusShadow: 'rgba(56, 189, 248, 0.15)',
  inputPlaceholder: '#94a3b8',
  inputText: '#0f172a',
  inputReadonlyBg: '#f8fafc',
  inputReadonlyText: '#64748b',

  /* ── Text (web typography) ── */
  text: '#0f172a',
  textMuted: '#475569',
  textLabel: '#1e293b',

  /* ── Error (web .account-error) ── */
  error: '#d94b32',
  errorBg: '#fef2f2',
  errorBorder: '#fecaca',
  errorText: '#b91c1c',

  /* ── Success (web .account-success) ── */
  success: '#15803d',

  /* ── Info boxes (web .account-info-box-*) ── */
  infoBlueBg: '#eff6ff',
  infoBlueBorder: '#bfdbfe',
  infoBlueText: '#1d4ed8',
  infoGreenBg: '#ecfdf3',
  infoGreenBorder: '#bbf7d0',
  infoGreenText: '#15803d',

  /* ── Tags (web .account-tag) ── */
  tagOkBg: '#dcfce7',
  tagOkText: '#15803d',
  tagMutedBg: '#f1f5f9',
  tagMutedText: '#64748b',

  /* ── Agreement (web .account-checkbox-label) ── */
  agreementText: '#475569',
  agreementLink: '#ea580c',
  checkboxBorder: '#cbd5e1',
  checkboxAccent: '#10b981',

  /* ── Modal (web .account-modal-backdrop / .account-modal) ── */
  modalBackdrop: 'rgba(15, 23, 42, 0.45)',
  modalBg: 'rgba(255, 255, 255, 0.96)',
  modalCloseBg: '#f1f5f9',
  modalCloseText: '#64748b',

  /* ── Secondary button (web .account-btn-secondary) ── */
  secondaryBg: '#ffffff',
  secondaryBorder: '#cbd5e1',
  secondaryText: '#334155',

  /* ── WeChat ── */
  wechatGreen: '#52b829',
  wechatGreenDark: '#4eb82d',

  /* ── School login ── */
  blueSchool: '#0284c7',

  /* ── Utility ── */
  white: '#ffffff',
  skyBg: '#94dcff',
  line: '#e2e8f0',
  orange: '#ea580c',
  shadowLg: 'rgba(15, 23, 42, 0.08)',

  /* ── Legacy aliases (for LandingView / WechatQrBox / WechatModal) ── */
  entryBlue: '#2f93ef',
  orangeEntry: '#ffb32b',
  blueTitle: '#2089ea',
  qrTitleShadow: '#ffffff',
  qrBoxBg: '#f4f6fa',
  qrMeta: '#ffffff',
  qrMetaWarning: '#ffe08a',
  starYellow: '#ffc82e',
  starShadow: 'rgba(151,103,21,0.18)',
  panelBgWarm: '#fff7ee',
  formLine: '#f2d8bd',
  formInnerBg: 'rgba(255,252,247,0.92)',
  homeBtnBg: 'rgba(255,248,241,0.96)',
  homeBtnText: '#5a341f',
  modalDialogBg: 'rgba(255,247,238,0.98)',
  modalCloseBtn: '#8a8a8a',
  checkboxBorderAlt: '#aaa',
  shadowColor: '#603b18',
  wechatGreenModal: '#4eb82d',
  wechatPurple: '#8259ff',
  blueSubmit: '#3e83ea',
  tabInactive: '#a6a6a6',
  agreement: '#9a9a9a',
  agreementLinkAlt: '#2377f4',
  fieldPlaceholder: '#b6b6b6',
  fieldText: '#333333',
  phoneLabel: '#4e4e4e',
  orText: '#b8b8b8',
  orLine: '#d6d6d6',
  pageDark: '#1e1e1e',
  panelAspectW: 2,
  panelAspectH: 3,
  panelMaxWidth: 480,
  tabHeight: 56,
  tabBorderBottom: 4,
  tabActiveIndicatorHeight: 6,
  tabIndicatorLeft: '38%' as const,
  tabIndicatorRight: '32%' as const,
  fieldHeight: 46,
  fieldBorderRadius: 16,
  fieldBorderWidth: 2,
  fieldFontSize: 17,
  submitHeight: 46,
  submitBorderRadius: 14,
  submitFontSize: 18,
  wechatBtnHeightAlt: 46,
  wechatBtnBorderRadiusAlt: 15,
  wechatBtnFontSizeAlt: 18,
  methodTitleFontSize: 24,
  orFontSize: 20,
  phoneLabelFontSize: 16,
  rememberForgotFontSize: 15,
  agreementFontSizeAlt: 12,
  noteFontSizeAlt: 14,
  formPaddingTop: 28,
  formPaddingHorizontal: 20,
  formInnerBorderRadius: 18,
  formInnerPadding: 16,
  checkboxSizeAlt: 20,
  checkboxInnerDotSize: 6,
  modalBorderRadiusAlt: 24,
  modalCloseSizeAlt: 36,
  modalTitleFontSizeAlt: 28,
  loginStagePaddingTop: 86,
  loginStagePaddingH: 16,
  loginStagePaddingBottom: 32,
  homeBtnHeightAlt: 44,
  homeBtnFontSizeAlt: 15,
  homeBtnRight: 14,
  homeBtnTop: 40,
  homeIconW: 20,
  homeIconH: 18,
  logoHeight: 34,
  logoLeft: 18,
  logoTop: 40,
} as const;

/** React Native caps fontWeight at '900'. Web uses 800 extensively. */
export const LoginWeights = {
  extraBlack: '900' as const, // web 800 → RN 900 (closest)
  black: '900' as const,
  extraBold: '800' as const,
  bold: '700' as const,
  semiBold: '600' as const,
  medium: '500' as const,
} as const;

/**
 * Pixel values aligned with web account.css.
 *
 * Web breakpoints: @media (max-width: 640px) mobile.
 * Mobile card: padding 22px 20px, inputs 14px radius.
 */
export const LoginSizes = {
  /* ── Card (web .account-card / .account-card-student-login) ── */
  cardBorderRadius: 28,
  cardPaddingH: 32,
  cardPaddingV: 28,
  cardMaxWidth: 480,
  /** Mobile-optimized card padding (web @media max-width:640px). */
  cardPaddingHM: 20,
  cardPaddingVM: 22,

  /* ── Panel (inner, web .account-login-panel) ── */
  panelBorderRadius: 22,
  panelPadding: 22,

  /* ── Tabs (web .account-tabs) ── */
  tabContainerRadius: 16,
  tabGap: 4,
  tabPaddingV: 10,
  tabPaddingH: 16,
  tabFontSize: 15,
  tabActiveRadius: 12,

  /* ── Sub-tabs (family login mode) ── */
  subTabContainerRadius: 14,
  subTabPaddingV: 10,
  subTabPaddingH: 12,
  subTabFontSize: 14,
  subTabActiveRadius: 10,

  /* ── Buttons (web .account-btn) ── */
  btnBorderRadius: 9999, // full pill
  btnPaddingV: 11,
  btnPaddingH: 20,
  btnFontSize: 15,

  /* ── Input (web .account-input) ── */
  inputBorderRadius: 14,
  inputBorderWidth: 1.5,
  inputPaddingV: 11,
  inputPaddingH: 16,
  inputFontSize: 15,
  inputHeight: 44,

  /* ── Field (web .account-field) ── */
  fieldMarginBottom: 16,
  labelFontSize: 14,
  labelMarginBottom: 6,

  /* ── Typography (web headings) ── */
  titleFontSize: 24,
  subtitleFontSize: 15,
  sectionTitleFontSize: 18,
  subsectionTitleFontSize: 16,
  noteFontSize: 14,
  captionFontSize: 13,
  smallFontSize: 12,

  /* ── Agreement (web .account-checkbox-field) ── */
  agreementFontSize: 14,
  agreementGap: 10,
  checkboxSize: 18,
  checkboxRadius: 6,

  /* ── Modal (web .account-modal) ── */
  modalBorderRadius: 28,
  modalCloseSize: 32,
  modalTitleFontSize: 20,
  modalPadding: 32,

  /* ── WeChat button ── */
  wechatBtnBorderRadius: 9999,
  wechatBtnHeight: 46,
  wechatBtnFontSize: 15,

  /* ── Home / profile header button ── */
  headerBtnBorderRadius: 9999,
  headerBtnPaddingV: 8,
  headerBtnPaddingH: 20,
  headerBtnFontSize: 14,

  /* ── Info box ── */
  infoBoxRadius: 14,
  infoBoxPaddingV: 14,
  infoBoxPaddingH: 16,

  /* ── Tag ── */
  tagRadius: 9999,
  tagPaddingV: 6,
  tagPaddingH: 12,
  tagFontSize: 12,

  /* ── Section divider ── */
  sectionDividerMargin: 24,
  sectionDividerPadding: 20,

  /* ── Legacy aliases (for LandingView / WechatQrBox / WechatModal) ── */
  entryBtnHeight: 74,
  entryBtnBorderRadius: 16,
  entryBtnBorderWidth: 3,
  entryBtnPaddingH: 10,
  entryIconSize: 34,
  entryIconFontSize: 20,
  entryTitleFontSize: 17,
  entrySubtitleFontSize: 10,
  entryArrowFontSize: 18,
  qrTitleFontSize: 34,
  qrSubtitleFontSize: 28,
  qrMetaFontSize: 13,
  qrBoxBorderWidth: 12,
  qrBoxBorderRadius: 18,
  qrBoxSize: 260,
  qrStageTop: 86,
} as const;
