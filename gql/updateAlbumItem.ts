import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  const { id, artist, title, mediaType, condition } = ctx.args;

  const names: Record<string, string> = { "#artist": "artist", "#title": "title", "#mediaType": "mediaType" };
  const values: Record<string, any> = { ":artist": artist, ":title": title, ":mediaType": mediaType };
  let expression = "SET #artist = :artist, #title = :title, #mediaType = :mediaType";

  if (condition !== undefined) {
    names["#condition"] = "condition";
    values[":condition"] = condition;
    expression += ", #condition = :condition";
  }

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({ id }),
    update: {
      expression,
      expressionNames: names,
      expressionValues: util.dynamodb.toMapValues(values),
    },
  };
}

export function response(ctx: AppSyncContext) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
