/**
 * Design tokens extracted from the web frontpage CSS for pixel-level parity.
 *
 * Web sources:
 * - :root custom properties (--orange, --blue, --panel, --line, --text, --muted)
 * - .page, .scene, .login-stage, .login-panel, .tabs, .tab, .form-side
 * - .entry-button, .qr-stage, .field, .submit, .agreement
 * - @media (max-width: 760px) mobile overrides
 */

export const LoginColors = {
  orange: '#ff7a15',
  orangeEntry: '#ffb32b',
  /** General brand blue (#2f91ee). Entry buttons use entryBlue (#2f93ef). */
  blue: '#2f91ee',
  /** Entry button blue, distinct from brand blue. */
  entryBlue: '#2f93ef',
  blueSubmit: '#3e83ea',
  blueTitle: '#2089ea',
  blueSchool: '#2d86f2',
  panelBg: '#fff7ee',
  formInnerBg: 'rgba(255,252,247,0.92)',
  line: '#f2dcc4',
  formLine: '#f2d8bd',
  text: '#4b3424',
  muted: '#a7a7a7',
  tabInactive: '#a6a6a6',
  wechatGreen: '#52b829',
  wechatGreenModal: '#4eb82d',
  wechatPurple: '#8259ff',
  skyBg: '#94dcff',
  pageDark: '#1e1e1e',
  inputBorder: '#666',
  inputFocus: '#ff7a15',
  rememberForgot: '#a8a8a8',
  agreement: '#9a9a9a',
  agreementLink: '#2377f4',
  success: '#2f9e44',
  error: '#d94b32',
  white: '#ffffff',
  fieldBg: '#ffffff',
  fieldPlaceholder: '#b6b6b6',
  fieldText: '#333333',
  phoneLabel: '#4e4e4e',
  orText: '#b8b8b8',
  orLine: '#d6d6d6',
  homeBtnBg: 'rgba(255,248,241,0.96)',
  homeBtnText: '#5a341f',
  qrBoxBg: '#f4f6fa',
  qrMeta: '#ffffff',
  qrMetaWarning: '#ffe08a',
  modalDialogBg: 'rgba(255,247,238,0.98)',
  modalCloseBtn: '#8a8a8a',
  checkboxBorder: '#aaa',
  modalBackdrop: 'rgba(30,30,30,0.58)',
  shadowColor: '#603b18',
  qrTitleShadow: '#ffffff',
  starYellow: '#ffc82e',
  starShadow: 'rgba(151,103,21,0.18)',
} as const;

/** React Native caps fontWeight at '900' (web uses 950 in places). */
export const LoginWeights = {
  extraBlack: '900' as const, // web 950 → RN 900
  black: '900' as const,
  extraBold: '800' as const,
  bold: '700' as const,
  semiBold: '600' as const,
  medium: '500' as const,
} as const;

/** Pixel values from web @media (max-width: 760px) mobile breakpoint,
 *  with fallback to smaller end of clamp() ranges. */
export const LoginSizes = {
  /* -- Brand -- */
  logoHeight: 34,
  logoLeft: 18,
  logoTop: 40,

  /* -- Home button -- */
  homeBtnHeight: 44,
  homeBtnFontSize: 15,
  homeBtnRight: 14,
  homeBtnTop: 40,
  homeIconW: 20,
  homeIconH: 18,

  /* -- Login panel -- */
  panelAspectW: 2,
  panelAspectH: 3,
  panelBorderRadius: 30,
  panelMaxWidth: 480,

  /* -- Tabs -- */
  tabHeight: 56,
  tabBorderBottom: 4,
  tabActiveIndicatorHeight: 6,
  tabFontSize: 21,
  tabIndicatorLeft: '38%' as const,
  tabIndicatorRight: '32%' as const,

  /* -- Fields -- */
  fieldHeight: 46,
  fieldBorderRadius: 16,
  fieldBorderWidth: 2,
  fieldFontSize: 17,
  fieldPaddingH: 16,

  /* -- Submit -- */
  submitHeight: 46,
  submitBorderRadius: 14,
  submitFontSize: 18,

  /* -- WeChat -- */
  wechatBtnHeight: 46,
  wechatBtnBorderRadius: 15,
  wechatBtnFontSize: 18,

  /* -- Typography -- */
  methodTitleFontSize: 24,
  orFontSize: 20,
  phoneLabelFontSize: 16,
  rememberForgotFontSize: 15,
  agreementFontSize: 12,
  noteFontSize: 14,

  /* -- Forms -- */
  formPaddingTop: 28,
  formPaddingHorizontal: 20,
  formInnerBorderRadius: 18,
  formInnerPadding: 16,
  formGap: 14,

  /* -- Checkbox -- */
  checkboxSize: 20,
  checkboxInnerDotSize: 6,

  /* -- QR Stage -- */
  qrTitleFontSize: 34,
  qrSubtitleFontSize: 28,
  qrMetaFontSize: 13,
  qrBoxBorderWidth: 12,
  qrBoxBorderRadius: 18,

  /* -- Entry Buttons -- */
  entryBtnHeight: 74,
  entryBtnBorderRadius: 16,
  entryBtnBorderWidth: 3,
  entryBtnPaddingH: 10,
  entryIconSize: 34,
  entryIconFontSize: 20,
  entryTitleFontSize: 17,
  entrySubtitleFontSize: 10,
  entryArrowFontSize: 18,

  /* -- Modal -- */
  modalBorderRadius: 24,
  modalCloseSize: 36,
  modalTitleFontSize: 28,
  modalQrBoxSize: 260,

  /* -- Login stage -- */
  loginStagePaddingTop: 86,
  loginStagePaddingH: 16,
  loginStagePaddingBottom: 32,
  qrStageTop: 86,

  /* -- WeChat card (hidden on mobile, retained for reference) -- */
  wechatCardBorderRadius: 27,
  wechatCardAspectW: 286,
  wechatCardAspectH: 462,
} as const;
