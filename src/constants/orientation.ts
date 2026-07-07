import type { ModalProps } from 'react-native';

export const LANDSCAPE_MODAL_ORIENTATIONS = [
  'landscape',
  'landscape-left',
  'landscape-right',
] satisfies NonNullable<ModalProps['supportedOrientations']>;
