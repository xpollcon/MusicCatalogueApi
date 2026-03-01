import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  const artist = ctx.args.artist;
  return {
    operation: "Scan",
    filter: {
      expression: "artist = :artist",
      expressionValues: util.dynamodb.toMapValues({ ":artist": artist }),
    },
  };
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}
