import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  // Accept either pipeline payload shape ({ payload: { key, values } })
  // or direct prev.result shape ({ key, values }). Keep behavior compatible.
  const prevResult = ctx && ctx.prev ? ctx.prev.result : undefined;
  const payload = prevResult && prevResult.payload ? prevResult.payload : prevResult || {};
  const { key, values } = payload as { key?: Record<string, any>; values?: Record<string, any> };

  // Added by lookupCoverArt when it found something.
  const coverArt = ctx.stash && ctx.stash.coverArt;
  if (values && coverArt) {
    if (coverArt.musicBrainzId) {
      values.musicBrainzId = coverArt.musicBrainzId;
    }
    if (coverArt.coverArtUrl) {
      values.coverArtUrl = coverArt.coverArtUrl;
    }
  }

  return {
    operation: "PutItem",
    key: util.dynamodb.toMapValues(key),
    attributeValues: util.dynamodb.toMapValues(values),
  };
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}
