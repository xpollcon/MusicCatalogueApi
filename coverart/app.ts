// Looks up album covers via MusicBrainz (to find the release group's MBID) and the
// Cover Art Archive (to check that a front cover exists).
//
// Returns { musicBrainzId, coverArtUrl }. Either may be null when MusicBrainz has no
// confident match or nobody has uploaded a cover yet. Transient failures (network,
// rate limiting) throw, so callers can tell "no cover" apart from "try again later".

const MUSICBRAINZ_URL = "https://musicbrainz.org/ws/2/release-group/";
const COVER_ART_ARCHIVE_URL = "https://coverartarchive.org/release-group/";
const MIN_MATCH_SCORE = 90;
const REQUEST_TIMEOUT_MS = 4000;
const COVER_SIZE = "front-500";

type FetchFn = (url: string, init?: any) => Promise<any>;

export interface CoverArtRequest {
  artist?: string;
  title?: string;
  musicBrainzId?: string;
}

export interface CoverArtResult {
  musicBrainzId: string | null;
  coverArtUrl: string | null;
}

// MusicBrainz rejects requests without an identifying User-Agent.
function userAgent(): string {
  const contact = process.env.MUSICBRAINZ_CONTACT || "https://github.com/xpollcon/musiccatalogueapi";
  return `MusicCatalogueApi/1.0 ( ${contact} )`;
}

// Inside a quoted Lucene phrase only backslashes and quotes need escaping.
function quote(value: string): string {
  return '"' + value.replace(/[\\"]/g, "\\$&") + '"';
}

export async function findReleaseGroupId(artist: string, title: string, fetchFn: FetchFn = fetch): Promise<string | null> {
  const query = `releasegroup:${quote(title)} AND artist:${quote(artist)}`;
  const url = `${MUSICBRAINZ_URL}?query=${encodeURIComponent(query)}&fmt=json&limit=5`;
  const res = await fetchFn(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`MusicBrainz search failed with HTTP ${res.status}`);
  }

  const body = await res.json();
  const groups: any[] = (body && body["release-groups"]) || [];
  const confident = groups.filter((g) => Number(g.score) >= MIN_MATCH_SCORE);
  if (confident.length === 0) {
    return null;
  }

  // Among equally good matches, prefer the album over a single/EP with the same name.
  const topScore = Number(confident[0].score);
  const best = confident.filter((g) => Number(g.score) === topScore);
  const album = best.find((g) => g["primary-type"] === "Album");
  return (album || best[0]).id;
}

export async function hasFrontCover(musicBrainzId: string, fetchFn: FetchFn = fetch): Promise<boolean> {
  const res = await fetchFn(COVER_ART_ARCHIVE_URL + musicBrainzId, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    throw new Error(`Cover Art Archive lookup failed with HTTP ${res.status}`);
  }

  const body = await res.json();
  const images: any[] = (body && body.images) || [];
  return images.some((image) => image.front);
}

export function coverArtUrl(musicBrainzId: string): string {
  return `${COVER_ART_ARCHIVE_URL}${musicBrainzId}/${COVER_SIZE}`;
}

export async function findCoverArt(request: CoverArtRequest, fetchFn: FetchFn = fetch): Promise<CoverArtResult> {
  let musicBrainzId = request.musicBrainzId || null;
  if (!musicBrainzId) {
    if (!request.artist || !request.title) {
      return { musicBrainzId: null, coverArtUrl: null };
    }
    musicBrainzId = await findReleaseGroupId(request.artist, request.title, fetchFn);
  }
  if (!musicBrainzId) {
    return { musicBrainzId: null, coverArtUrl: null };
  }

  const found = await hasFrontCover(musicBrainzId, fetchFn);
  return { musicBrainzId, coverArtUrl: found ? coverArtUrl(musicBrainzId) : null };
}

export const lambdaHandler = async (event: CoverArtRequest, _context: any): Promise<CoverArtResult> => {
  const result = await findCoverArt(event || {});
  console.log(JSON.stringify({ request: event, result }));
  return result;
};
