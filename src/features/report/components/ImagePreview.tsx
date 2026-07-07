import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';

import { LoginColors, LoginSizes, LoginWeights } from '@/features/auth/components/LoginConstants';

import type { ReportImage } from '../types';

type ImagePreviewProps = {
  images: ReportImage[];
  onRemove: (index: number) => void;
  disabled?: boolean;
};

export function ImagePreview({ images, onRemove, disabled = false }: ImagePreviewProps) {
  if (images.length === 0) return null;

  return (
    <View style={styles.container}>
      {images.map((image, index) => (
        <View key={`screenshot-${index}`} style={styles.thumbnail}>
          <Image
            source={{ uri: image.uri }}
            style={styles.image}
            contentFit="cover"
          />
          <Pressable
            style={[styles.removeBtn, disabled && styles.removeBtnDisabled]}
            onPress={() => onRemove(index)}
            disabled={disabled}
          >
            <Text style={styles.removeText}>×</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
  },
  thumbnail: {
    width: 88,
    height: 88,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  removeBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: LoginColors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnDisabled: {
    opacity: 0.55,
  },
  removeText: {
    color: LoginColors.white,
    fontSize: 16,
    fontWeight: LoginWeights.extraBold,
    lineHeight: 20,
    marginTop: -1,
  },
});
