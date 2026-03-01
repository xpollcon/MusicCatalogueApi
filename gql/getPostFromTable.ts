import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  return dynamoDBGetItemRequest({ id: ctx.args.id });
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}

function dynamoDBGetItemRequest(key: Record<string, any>) {
  return {
    operation: "GetItem",
    key: util.dynamodb.toMapValues(key),
  };
}
