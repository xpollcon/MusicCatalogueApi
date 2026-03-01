import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  const id = util.autoId();
  const args = ctx && ctx.args ? ctx.args : {};
  const artist = args.artist;
  const title = args.title;
  const mediaType = args.mediaType;
  const condition = args.condition;
  const values: Record<string, any> = { artist: artist, title: title, mediaType: mediaType };
  if (condition !== undefined) {
    values.condition = condition;
  }
  return { payload: { key: { id: id }, values: values } };
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}
