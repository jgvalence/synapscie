export function lien(chemin: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return base + (chemin.startsWith('/') ? chemin : `/${chemin}`);
}
