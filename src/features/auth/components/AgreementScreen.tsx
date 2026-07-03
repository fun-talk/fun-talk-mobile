import { useCallback, useMemo } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { LoginColors, LoginSizes, LoginWeights } from './LoginConstants';
import { AgreementType, getAgreement } from '../data/agreements';

const validAgreementType = (value: unknown): AgreementType | null => {
  if (typeof value !== 'string') return null;
  if (value === 'user' || value === 'privacy' || value === 'children') return value;
  return null;
};

export function AgreementScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type?: string }>();
  const agreementType = validAgreementType(type) ?? 'user';
  const agreement = useMemo(() => getAgreement(agreementType), [agreementType]);

  const handleAgree = useCallback(() => {
    router.back();
  }, [router]);

  const handleDecline = useCallback(() => {
    if (Platform.OS === 'android') {
      BackHandler.exitApp();
    } else {
      router.back();
    }
  }, [router]);

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{agreement?.title ?? '协议'}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
      >
        <Text style={styles.body}>{agreement?.content ?? ''}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.declineButton]}
          onPress={handleDecline}
        >
          <Text style={[styles.buttonText, styles.declineButtonText]}>拒绝</Text>
        </Pressable>
        <Pressable
          style={[styles.button, styles.agreeButton]}
          onPress={handleAgree}
        >
          <Text style={[styles.buttonText, styles.agreeButtonText]}>同意</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: LoginColors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  title: {
    fontSize: LoginSizes.titleFontSize,
    fontWeight: LoginWeights.extraBold,
    color: LoginColors.text,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  body: {
    fontSize: 14,
    lineHeight: 22,
    color: LoginColors.text,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: LoginColors.line,
    backgroundColor: LoginColors.white,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreeButton: {
    backgroundColor: LoginColors.primaryEnd,
  },
  declineButton: {
    backgroundColor: LoginColors.white,
    borderWidth: 1,
    borderColor: LoginColors.inputBorder,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
  },
  agreeButtonText: {
    color: LoginColors.white,
  },
  declineButtonText: {
    color: LoginColors.text,
  },
});
