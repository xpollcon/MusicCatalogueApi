import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  const { id } = ctx.args;
  return {
    operation: "DeleteItem",
    key: util.dynamodb.toMapValues({ id }),
  };
}

export function response(ctx: AppSyncContext) {
  if (ctx.error) {
    util.error(ctx.error.message, ctx.error.type);
  }
  return true;
}
