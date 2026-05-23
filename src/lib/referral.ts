export function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const array = new Uint32Array(8);
  crypto.getRandomValues(array);
  return Array.from(array, (num) => chars[num % chars.length]).join('');
}

export async function copyToClipboard(
  text: string,
  setToastMessage: (message: string) => void
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    setToastMessage('Copied to clipboard');
    setTimeout(() => setToastMessage(''), 2500);
  } catch (error) {
    console.error('Failed to copy:', error);
    setToastMessage('Failed to copy');
    setTimeout(() => setToastMessage(''), 2500);
  }
}
