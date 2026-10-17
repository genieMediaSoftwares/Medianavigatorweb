import { Share } from 'react-native';
export async function exportDeepReport(text: string, _postId: string): Promise<void> {
  await Share.share({ title: 'Media Navigator — Deep Analysis', message: text });
}
