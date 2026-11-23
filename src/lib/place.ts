export function isTwoGisUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      /(^|\.)2gis\.(ru|com)$/i.test(url.hostname)
    );
  } catch {
    return false;
  }
}
