import { Image } from 'expo-image';

export interface PostImageProps {
  uri: string;
  onError: () => void;
}

/** Native images use the existing Expo image loader. */
export function PostImage({ uri, onError }: PostImageProps) {
  return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" onError={onError} accessibilityIgnoresInvertColors />;
}
