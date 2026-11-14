const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be'];

/** The video id inside a YouTube link the family pasted, or null when it is not one. */
export function youtubeVideoId(link: string): string | null {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '');
  if (url.protocol !== 'https:' || !HOSTS.includes(host)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const candidate =
    host === 'youtu.be'
      ? parts[0]
      : parts[0] === 'watch'
        ? url.searchParams.get('v')
        : parts[0] === 'shorts' || parts[0] === 'embed' || parts[0] === 'live'
          ? parts[1]
          : null;
  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

/** Built from a checked id only, so the app never opens an arbitrary pasted link. */
export function youtubeWatchUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** YouTube's own still for the video; shown small with YouTube named as the source. */
export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
