/**
 * Tiện ích sao chép văn bản vào bộ nhớ tạm (Clipboard) hoạt động trên mọi môi trường:
 * - Hỗ trợ HTTPS & Localhost qua Navigator Clipboard API
 * - Hỗ trợ HTTP / IP VPS / Trình duyệt cũ qua execCommand fallback
 */
export const copyTextToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Thử dùng Modern Clipboard API nếu đang ở ngữ cảnh bảo mật (HTTPS / localhost)
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('[Clipboard API failed, fallback to execCommand]', err);
    }
  }

  // 2. Fallback cho môi trường HTTP (IP VPS thông thường) & mobile browser
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    if (successful) return true;
  } catch (err) {
    console.error('[Fallback Copy Error]', err);
  }

  // 3. Nếu mọi cách trên đều bị chặn (rất hiếm), mở prompt cho người dùng copy tay
  try {
    window.prompt('Sao chép mã phòng:', text);
    return true;
  } catch (e) {
    return false;
  }
};
