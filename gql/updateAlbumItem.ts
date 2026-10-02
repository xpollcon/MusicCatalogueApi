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

  // Set by lookupCoverArt when it ran. Missing fields are removed so a cover for the
  // album's old artist/title is not kept.
  const coverArt = ctx.stash.coverArt;
  const removes: string[] = [];
  if (coverArt) {
    for (const field of ["musicBrainzId", "coverArtUrl"]) {
      names["#" + field] = field;
      if (coverArt[field]) {
        values[":" + field] = coverArt[field];
        expression += `, #${field} = :${field}`;
      } else {
        removes.push("#" + field);
      }
    }
  }
  if (removes.length > 0) {
    expression += " REMOVE " + removes.join(", ");
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
