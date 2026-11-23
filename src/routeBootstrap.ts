const redirectKey = "__brc_route";

export function restoreRoute(
  location: Location,
  history: History,
  base: string,
) {
  const root = base.endsWith("/") ? base : `${base}/`;
  const params = new URLSearchParams(location.search);
  const saved = params.get(redirectKey);

  const isRoot =
    location.pathname === root || location.pathname === root.slice(0, -1);
  const isWithinBase = (path: string) =>
    root === "/" || path.startsWith(root) || path === root.slice(0, -1);
  if (saved && isRoot) {
    try {
      const destination = new URL(saved, location.origin);
      if (
        destination.origin === location.origin &&
        isWithinBase(destination.pathname)
      ) {
        history.replaceState(
          null,
          "",
          destination.pathname + destination.search + destination.hash,
        );
      }
    } catch {
      // Ignore malformed redirect values and leave the current address intact.
    }
    return;
  }

  // Redirect existing links from the old hash router to the equivalent clean URL.
  if (location.hash.startsWith("#/") && isRoot) {
    const destination = new URL(root + location.hash.slice(2), location.origin);
    for (const [key, value] of params)
      destination.searchParams.append(key, value);
    if (
      destination.origin === location.origin &&
      isWithinBase(destination.pathname)
    ) {
      history.replaceState(
        null,
        "",
        destination.pathname + destination.search + destination.hash,
      );
    }
  }
}
