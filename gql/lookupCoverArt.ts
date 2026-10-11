import { util, runtime } from "@aws-appsync/utils";

type AppSyncContext = any;

const MBID_PATTERN = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$";

// Calls the CoverArt Lambda and puts its answer in ctx.stash.coverArt for the next
// step to save. The previous step's result is passed through unchanged.
//
// addAlbum:         search by artist/title (or use the musicBrainzId argument).
// updateAlbum:      expects the existing item from the previous step; only searches
//                   again when artist/title changed or a musicBrainzId is given.
// refreshCoverArt:  expects the existing item; always looks up again.
export function request(ctx: AppSyncContext) {
  const args = ctx.args;
  const existing = ctx.prev.result;
  ctx.stash.resultBeforeCoverArt = existing;

  if (args.musicBrainzId && !util.matches(MBID_PATTERN, args.musicBrainzId)) {
    util.error("musicBrainzId must be a MusicBrainz release group ID (a UUID)", "ValidationError");
  }

  let payload: Record<string, any> = { artist: args.artist, title: args.title, musicBrainzId: args.musicBrainzId };

  if (ctx.info.fieldName === "refreshCoverArt") {
    if (!existing) {
      util.error("Album not found", "NotFound");
    }
    ctx.stash.coverArtRequired = true;
    payload = { artist: existing.artist, title: existing.title, musicBrainzId: args.musicBrainzId };
  }

  if (ctx.info.fieldName === "updateAlbum" && existing && !args.musicBrainzId) {
    const unchanged = existing.artist === args.artist && existing.title === args.title;
    if (unchanged && existing.musicBrainzId) {
      if (existing.coverArtUrl) {
        // Nothing relevant changed and we already have a cover: keep it.
        runtime.earlyReturn(existing);
      }
      // Same album, no cover yet: check whether one has been uploaded since.
      payload.musicBrainzId = existing.musicBrainzId;
    }
  }

  return { operation: "Invoke", payload };
}

export function response(ctx: AppSyncContext) {
  if (ctx.error) {
    if (ctx.stash.coverArtRequired) {
      util.error(ctx.error.message, ctx.error.type);
    }
    // A cover is optional: save the album without one rather than failing.
    console.log("Cover art lookup failed: " + ctx.error.message);
  } else {
    ctx.stash.coverArt = ctx.result;
  }
  return ctx.stash.resultBeforeCoverArt;
}
