/**
 * Safe clipboard copy utility that handles iframe restrictions,
 * unfocused documents, and browser permission issues gracefully.
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Try modern Clipboard API first
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (clipboardErr) {
      // Common in iframes when document is not focused (e.g. AI Studio preview)
      console.warn('Modern clipboard API failed, attempting execCommand fallback:', clipboardErr);
    }
  }

  // Fallback: document.execCommand with hidden textarea
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      // Prevent scrolling to bottom of page in iOS
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '0';
      textarea.style.width = '2em';
      textarea.style.height = '2em';
      textarea.style.padding = '0';
      textarea.style.border = 'none';
      textarea.style.outline = 'none';
      textarea.style.boxShadow = 'none';
      textarea.style.background = 'transparent';
      textarea.style.opacity = '0.01';
      textarea.setAttribute('readonly', '');
      
      document.body.appendChild(textarea);
      textarea.focus({ preventScroll: true });
      textarea.select();
      textarea.setSelectionRange(0, text.length);

      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch (execErr) {
      console.warn('Fallback execCommand copy failed:', execErr);
      return false;
    }
  }

  return false;
}
