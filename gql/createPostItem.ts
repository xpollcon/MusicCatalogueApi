import { util } from "@aws-appsync/utils";

type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  // Accept either pipeline payload shape ({ payload: { key, values } })
  // or direct prev.result shape ({ key, values }). Keep behavior compatible.
  const prevResult = ctx && ctx.prev ? ctx.prev.result : undefined;
  const payload = prevResult && prevResult.payload ? prevResult.payload : prevResult || {};
  const { key, values } = payload as { key?: Record<string, any>; values?: Record<string, any> };

  return {
    operation: "PutItem",
    key: util.dynamodb.toMapValues(key),
    attributeValues: util.dynamodb.toMapValues(values),
  };
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}
