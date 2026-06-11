declare module '*.png' {
  const value: number;
  export default value;
}

declare module '*.jpg' {
  const value: number;
  export default value;
}

declare module '*.jpeg' {
  const value: number;
  export default value;
}

declare module '*.webp' {
  const value: number;
  export default value;
}

declare module '*.gif' {
  const value: number;
  export default value;
}

declare module '*.svg' {
  const value: number;
  export default value;
}

declare module 'react-native/Libraries/Image/resolveAssetSource' {
  interface ResolvedAssetSource {
    uri: string;
    width: number;
    height: number;
    scale: number;
  }
  function resolveAssetSource(source: number): ResolvedAssetSource;
  export default resolveAssetSource;
}
