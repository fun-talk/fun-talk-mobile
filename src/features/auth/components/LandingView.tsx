import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { loginImages } from '../assets/loginAssets';
import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';

/** Web breakpoint: @media (max-width: 760px) */
const MOBILE_BREAKPOINT = 760;

type LandingViewProps = {
  onReturningUser: () => void;
  onNewUser: () => void;
  windowWidth: number;
  windowHeight: number;
};

export function LandingView({
  onReturningUser,
  onNewUser,
  windowWidth,
  windowHeight,
}: LandingViewProps) {
  const isDesktop = windowWidth >= MOBILE_BREAKPOINT;

  if (isDesktop) {
    return (
      <DesktopLandingView
        onReturningUser={onReturningUser}
        onNewUser={onNewUser}
        windowWidth={windowWidth}
        windowHeight={windowHeight}
      />
    );
  }

  return (
    <MobileLandingView
      onReturningUser={onReturningUser}
      onNewUser={onNewUser}
      windowHeight={windowHeight}
    />
  );
}

/* ================================================================
 *  DESKTOP / TABLET  —  QR left 2/3, fox right 1/3
 *  Matches web: .qr-stage (left:0, w:66.666%, top:10.5vh)
 *               .mascot-hero (absolute right, bottom)
 *               .entry-actions (absolute left bottom)
 * ================================================================ */
function DesktopLandingView({
  onReturningUser,
  onNewUser,
  windowWidth,
  windowHeight,
}: {
  onReturningUser: () => void;
  onNewUser: () => void;
  windowWidth: number;
  windowHeight: number;
}) {
  const vw = windowWidth / 100; // 1vw in px
  const vh = windowHeight / 100; // 1vh in px

  // clamp(min, preferred, max)
  const cx = (min: number, preferred: number, max: number) =>
    Math.min(max, Math.max(min, preferred));

  // QR stage
  const qrTop = 10.5 * vh;
  const qrBoxWidth = Math.min(0.72 * windowWidth * 0.6666, 360, 42 * vh);

  // QR title font sizes
  const qrTitleStrongSize = cx(34, 3.4 * vw, 56);
  const qrTitleSpanSize = cx(28, 2.4 * vw, 43);

  // QR box border & radius
  const qrBoxBorder = cx(12, 1.45 * vw, 28);
  const qrBoxRadius = cx(18, 2.2 * vw, 32);

  // Mascot
  const mascotRight = cx(8 * vw, 12 * vw, 160);
  const mascotBottom = cx(0.12 * windowHeight, 16 * vh, 0.18 * windowHeight);
  const mascotWidth = Math.min(0.33 * windowWidth, 420);

  // Entry buttons
  const entryLeft = 0.076 * windowWidth;
  const entryBottom = 0.109 * windowHeight;
  const entryWidth = 0.5 * windowWidth;
  const entryHeight = 0.102 * windowHeight;

  // Entry button inner sizes
  const entryIconSize = Math.min(58, 5.5 * vh);
  const entryIconFontSize = Math.min(34, 3.5 * vh);
  const entryTitleSize = Math.min(26, 2.85 * vh);
  const entrySubtitleSize = Math.min(14, 1.4 * vh);
  const entryArrowSize = Math.min(38, 4.2 * vh);

  return (
    <View style={desktopStyles.container}>
      {/* ---- QR Stage: left 0, width 66.666%, top 10.5vh ---- */}
      <View style={[desktopStyles.qrStage, { top: qrTop }]}>
        <View style={desktopStyles.qrHero}>
          <Text style={[desktopStyles.qrTitle, { lineHeight: qrTitleStrongSize * 0.96 }]}>
            <Text style={[desktopStyles.qrTitleStrong, { fontSize: qrTitleStrongSize }]}>
              扫一扫
            </Text>
            {'\n'}
            <Text
              style={[
                desktopStyles.qrTitleSpan,
                { fontSize: qrTitleSpanSize, marginTop: cx(8, 1 * vh, 12) },
              ]}>
              开始学习吧!
            </Text>
          </Text>

          <View
            style={[
              desktopStyles.qrBox,
              {
                width: qrBoxWidth,
                borderWidth: qrBoxBorder,
                borderRadius: qrBoxRadius,
                padding: cx(10, 1.1 * vw, 16),
              },
            ]}>
            <View style={desktopStyles.qrPlaceholder}>
              <Text style={desktopStyles.qrPlaceholderIcon}>💬</Text>
              <Text style={desktopStyles.qrPlaceholderText}>微信扫码</Text>
            </View>
            <Text style={desktopStyles.qrMeta}>请使用微信扫一扫登录</Text>
          </View>
        </View>
      </View>

      {/* ---- Mascot: absolute right, bottom (fox-login.png: 788×1182 ≈ 2:3 portrait) ---- */}
      <Image
        source={loginImages.foxLogin}
        style={[
          desktopStyles.mascot,
          {
            right: mascotRight,
            bottom: mascotBottom,
            width: mascotWidth,
            aspectRatio: 788 / 1182,
          },
        ]}
        contentFit="contain"
      />

      {/* ---- Entry Buttons: absolute left bottom ---- */}
      <View
        style={[
          desktopStyles.entryActions,
          {
            left: entryLeft,
            bottom: entryBottom,
            width: entryWidth,
            height: entryHeight,
          },
        ]}>
        <Pressable
          style={[desktopStyles.entryBtn, desktopStyles.entryBtnBlue]}
          onPress={onReturningUser}>
          <View style={[desktopStyles.entryIcon, { width: entryIconSize, height: entryIconSize, borderRadius: entryIconSize / 2 }]}>
            <Text style={[desktopStyles.entryIconText, { fontSize: entryIconFontSize, color: LoginColors.entryBlue }]}>
              ✓
            </Text>
          </View>
          <View style={desktopStyles.entryCopy}>
            <Text style={[desktopStyles.entryTitle, { fontSize: entryTitleSize }]}>我来过啦</Text>
            <Text style={[desktopStyles.entrySubtitle, { fontSize: entrySubtitleSize }]}>
              已注册，直接学习
            </Text>
          </View>
          <Text style={[desktopStyles.entryArrow, { fontSize: entryArrowSize, color: LoginColors.entryBlue }]}>
            ›
          </Text>
        </Pressable>

        <Pressable
          style={[desktopStyles.entryBtn, desktopStyles.entryBtnOrange]}
          onPress={onNewUser}>
          <View style={[desktopStyles.entryIcon, { width: entryIconSize, height: entryIconSize, borderRadius: entryIconSize / 2 }]}>
            <Text style={[desktopStyles.entryIconText, { fontSize: entryIconFontSize, color: LoginColors.orangeEntry }]}>
              ★
            </Text>
          </View>
          <View style={desktopStyles.entryCopy}>
            <Text style={[desktopStyles.entryTitle, { fontSize: entryTitleSize }]}>第一次来</Text>
            <Text style={[desktopStyles.entrySubtitle, { fontSize: entrySubtitleSize }]}>
              新用户，创建账号
            </Text>
          </View>
          <Text style={[desktopStyles.entryArrow, { fontSize: entryArrowSize, color: LoginColors.orangeEntry }]}>
            ›
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const desktopStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    inset: 0,
  },
  /* -- QR Stage -- */
  qrStage: {
    position: 'absolute',
    left: 0,
    width: '66.666%',
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: '2%',
  },
  qrHero: {
    width: '100%',
    alignItems: 'center',
  },
  qrTitle: {
    marginBottom: 14,
    textAlign: 'center',
  },
  qrTitleStrong: {
    fontWeight: '900',
    color: LoginColors.blueTitle,
    textShadowColor: LoginColors.qrTitleShadow,
    textShadowOffset: { width: -3, height: -3 },
    textShadowRadius: 0,
  },
  qrTitleSpan: {
    fontWeight: '900',
    color: LoginColors.blueTitle,
    textShadowColor: LoginColors.qrTitleShadow,
    textShadowOffset: { width: -3, height: -3 },
    textShadowRadius: 0,
  },
  qrBox: {
    aspectRatio: 1,
    borderColor: 'rgba(255,255,255,0.94)',
    backgroundColor: LoginColors.qrBoxBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  qrPlaceholderText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#888',
  },
  qrMeta: {
    position: 'absolute',
    bottom: -34,
    fontSize: 13,
    fontWeight: '800',
    color: LoginColors.qrMeta,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  /* -- Mascot -- */
  mascot: {
    position: 'absolute',
    zIndex: 2,
    maxHeight: '68%',
  },
  /* -- Entry Buttons -- */
  entryActions: {
    position: 'absolute',
    flexDirection: 'row',
    gap: '4.2%',
  },
  entryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 3,
    borderColor: LoginColors.white,
    paddingLeft: '6%',
    paddingRight: '6.5%',
  },
  entryBtnBlue: {
    backgroundColor: LoginColors.entryBlue,
  },
  entryBtnOrange: {
    backgroundColor: LoginColors.orangeEntry,
  },
  entryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: LoginColors.white,
  },
  entryIconText: {
    fontWeight: '900',
  },
  entryCopy: {
    flex: 1,
    marginLeft: 8,
  },
  entryTitle: {
    fontWeight: '900',
    color: LoginColors.white,
  },
  entrySubtitle: {
    fontWeight: '800',
    color: LoginColors.white,
    marginTop: 5,
  },
  entryArrow: {
    fontWeight: '500',
  },
});

/* ================================================================
 *  MOBILE (<760px)  —  stacked: QR top, fox below, buttons bottom
 *  Matches web @media (max-width: 760px)
 * ================================================================ */
function MobileLandingView({
  onReturningUser,
  onNewUser,
  windowHeight,
}: {
  onReturningUser: () => void;
  onNewUser: () => void;
  windowHeight: number;
}) {
  return (
    <View style={[mobileStyles.container, { minHeight: windowHeight }]}>
      {/* QR Stage */}
      <View style={mobileStyles.qrStage}>
        <View style={mobileStyles.qrHero}>
          <Text style={mobileStyles.qrTitle}>
            <Text style={mobileStyles.qrTitleStrong}>扫一扫</Text>
            {'\n'}
            <Text style={mobileStyles.qrTitleSpan}>开始学习吧!</Text>
          </Text>

          <View style={mobileStyles.qrBox}>
            <View style={mobileStyles.qrPlaceholder}>
              <Text style={mobileStyles.qrPlaceholderIcon}>💬</Text>
              <Text style={mobileStyles.qrPlaceholderText}>微信扫码</Text>
            </View>
            <Text style={mobileStyles.qrMeta}>请使用微信扫一扫登录</Text>
          </View>
        </View>
      </View>

      {/* Mascot */}
      <Image
        source={loginImages.foxLogin}
        style={mobileStyles.mascot}
        contentFit="contain"
      />

      {/* Entry Buttons */}
      <View style={mobileStyles.entryActions}>
        <Pressable style={[mobileStyles.entryBtn, mobileStyles.entryBtnBlue]} onPress={onReturningUser}>
          <View style={mobileStyles.entryIcon}>
            <Text style={[mobileStyles.entryIconText, { color: LoginColors.entryBlue }]}>✓</Text>
          </View>
          <View style={mobileStyles.entryCopy}>
            <Text style={mobileStyles.entryTitle}>我来过啦</Text>
            <Text style={mobileStyles.entrySubtitle}>已注册，直接学习</Text>
          </View>
          <Text style={[mobileStyles.entryArrow, { color: LoginColors.entryBlue }]}>›</Text>
        </Pressable>

        <Pressable style={[mobileStyles.entryBtn, mobileStyles.entryBtnOrange]} onPress={onNewUser}>
          <View style={mobileStyles.entryIcon}>
            <Text style={[mobileStyles.entryIconText, { color: LoginColors.orangeEntry }]}>★</Text>
          </View>
          <View style={mobileStyles.entryCopy}>
            <Text style={mobileStyles.entryTitle}>第一次来</Text>
            <Text style={mobileStyles.entrySubtitle}>新用户，创建账号</Text>
          </View>
          <Text style={[mobileStyles.entryArrow, { color: LoginColors.orangeEntry }]}>›</Text>
        </Pressable>
      </View>
    </View>
  );
}

const mobileStyles = StyleSheet.create({
  container: {
    position: 'relative',
    width: '100%',
  },
  qrStage: {
    marginTop: 86,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  qrHero: {
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    marginBottom: 14,
    textAlign: 'center',
    lineHeight: LoginSizes.qrTitleFontSize * 0.96,
  },
  qrTitleStrong: {
    fontSize: LoginSizes.qrTitleFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.blueTitle,
    textShadowColor: LoginColors.qrTitleShadow,
    textShadowOffset: { width: -2, height: -2 },
    textShadowRadius: 0,
  },
  qrTitleSpan: {
    fontSize: LoginSizes.qrSubtitleFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.blueTitle,
    textShadowColor: LoginColors.qrTitleShadow,
    textShadowOffset: { width: -2, height: -2 },
    textShadowRadius: 0,
    marginTop: 8,
  },
  qrBox: {
    width: '72%',
    maxWidth: 320,
    aspectRatio: 1,
    padding: 14,
    borderWidth: LoginSizes.qrBoxBorderWidth,
    borderColor: 'rgba(255,255,255,0.94)',
    borderRadius: LoginSizes.qrBoxBorderRadius,
    backgroundColor: LoginColors.qrBoxBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  qrPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrPlaceholderIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  qrPlaceholderText: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
    color: '#888',
  },
  qrMeta: {
    position: 'absolute',
    bottom: -34,
    fontSize: LoginSizes.qrMetaFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.qrMeta,
    textShadowColor: 'rgba(0,0,0,0.28)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  mascot: {
    width: '72%',
    maxWidth: 320,
    aspectRatio: 788 / 1182,
    alignSelf: 'center',
    marginTop: 16,
  },
  entryActions: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: 42,
    height: LoginSizes.entryBtnHeight,
    flexDirection: 'row',
    gap: 10,
  },
  entryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: LoginSizes.entryBtnBorderRadius,
    borderWidth: LoginSizes.entryBtnBorderWidth,
    borderColor: LoginColors.white,
    paddingHorizontal: LoginSizes.entryBtnPaddingH,
  },
  entryBtnBlue: {
    backgroundColor: LoginColors.entryBlue,
  },
  entryBtnOrange: {
    backgroundColor: LoginColors.orangeEntry,
  },
  entryIcon: {
    width: LoginSizes.entryIconSize,
    height: LoginSizes.entryIconSize,
    borderRadius: LoginSizes.entryIconSize / 2,
    backgroundColor: LoginColors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryIconText: {
    fontSize: LoginSizes.entryIconFontSize,
    fontWeight: LoginWeights.extraBlack,
    lineHeight: LoginSizes.entryIconFontSize + 2,
  },
  entryCopy: {
    flex: 1,
    marginLeft: 8,
  },
  entryTitle: {
    fontSize: LoginSizes.entryTitleFontSize,
    fontWeight: LoginWeights.extraBlack,
    color: LoginColors.white,
  },
  entrySubtitle: {
    fontSize: LoginSizes.entrySubtitleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.white,
    marginTop: 2,
  },
  entryArrow: {
    fontSize: LoginSizes.entryArrowFontSize,
    fontWeight: LoginWeights.medium,
  },
});
