import QRCode from "qrcode";
const codes = new Map<string, Promise<string>>();
export const publicReportLink = (origin: string, criterion: number, id: string) =>
  `${origin}/#criteria/${criterion}/report/${encodeURIComponent(id)}`;
export const publicCertificateLink = (origin: string, id: string) =>
  `${origin}/#courses/certificate/${encodeURIComponent(id)}`;
export function printQr(url: string) {
  if (!codes.has(url))
    codes.set(
      url,
      QRCode.toDataURL(url, {
        errorCorrectionLevel: "M",
        margin: 4,
        width: 232,
        color: { dark: "#15445a", light: "#ffffff" },
      }).catch((error) => {
        codes.delete(url);
        throw error;
      }),
    );
  return codes.get(url)!;
}
