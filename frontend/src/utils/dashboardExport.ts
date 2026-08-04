import type { AxiosResponse } from 'axios';

const safeFilename = (filename: string, fallbackName: string): string => {
  const sanitized = filename
    .replace(/[^A-Za-z0-9㐀-鿿._-]+/g, '_')
    .replace(/^\.+/, '')
    .replace(/_+/g, '_')
    .replace(/_+(?=\.)/g, '')
    .replace(/^_|_$/g, '');
  return sanitized || fallbackName;
};

const filenameFromDisposition = (disposition?: string): string | undefined => {
  if (!disposition) return undefined;

  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded.trim());
    } catch {
      return undefined;
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1]?.trim();
};

const isAxiosBlobResponse = (
  value: Blob | AxiosResponse<Blob>
): value is AxiosResponse<Blob> => !(value instanceof Blob);

export const downloadDashboardFile = (
  response: Blob | AxiosResponse<Blob>,
  fallbackName: string
): void => {
  const blob = isAxiosBlobResponse(response) ? response.data : response;
  const disposition = isAxiosBlobResponse(response)
    ? response.headers['content-disposition']
    : undefined;
  const filename = safeFilename(
    filenameFromDisposition(disposition) ?? fallbackName,
    fallbackName
  );
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  try {
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
  } finally {
    anchor.remove();
    window.URL.revokeObjectURL(url);
  }
};
