export const UTF8_SAMPLE_TEXT = 'PrivKnife 🔐 Español 日本語';

export const PNG_1X1_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const PNG_1X1_DATA_URI = `data:image/png;base64,${PNG_1X1_BASE64}`;

export const PDF_HEADER_BASE64 = 'JVBERi0xLjQK';

export const ZIP_HEADER_BASE64 = 'UEsDBBQAAAAIAA==';

export const JPEG_HEADER_BASE64 = '/9j/4AAQSkZJRg==';

export const WEBP_HEADER_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);

export const URL_QUERY_SAMPLE =
  'https://example.com/search?q=hello%20world&tag=a&tag=b#results';

export const XSS_HTML_SAMPLE =
  '<script>alert("xss")</script><img src=x onerror=alert(1)> 🚀';

export const MORSE_SPEC_INPUT = 'SOS 2026';

export const MORSE_SPEC_EXPECTED = '... --- ... / ..--- ----- ..--- -....';
