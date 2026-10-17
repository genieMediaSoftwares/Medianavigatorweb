export async function exportDeepReport(text: string, postId: string): Promise<void> {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `deep-analysis-${postId.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
