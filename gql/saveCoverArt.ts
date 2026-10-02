import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

// Writes the result of lookupCoverArt (ctx.stash.coverArt) onto an existing album.
// Fields the lookup could not find are removed so a stale cover is not kept.
export function request(ctx: AppSyncContext) {
  const { id } = ctx.args;
  const coverArt = ctx.stash.coverArt || {};

  const names: Record<string, string> = {};
  const values: Record<string, any> = {};
  const sets: string[] = [];
  const removes: string[] = [];
  for (const field of ["musicBrainzId", "coverArtUrl"]) {
    names["#" + field] = field;
    if (coverArt[field]) {
      values[":" + field] = coverArt[field];
      sets.push(`#${field} = :${field}`);
    } else {
      removes.push("#" + field);
    }
  }

  let expression = "";
  if (sets.length > 0) {
    expression += "SET " + sets.join(", ");
  }
  if (removes.length > 0) {
    expression += (expression ? " " : "") + "REMOVE " + removes.join(", ");
  }

  return {
    operation: "UpdateItem",
    key: util.dynamodb.toMapValues({ id }),
    update: {
      expression,
      expressionNames: names,
      expressionValues: sets.length > 0 ? util.dynamodb.toMapValues(values) : undefined,
    },
    condition: { expression: "attribute_exists(id)" },
  };
}

export function response(ctx: AppSyncContext) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return ctx.result;
}
