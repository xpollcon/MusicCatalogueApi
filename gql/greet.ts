type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  const { source, args } = ctx;
  return {
    operation: "Invoke",
    payload: { field: ctx.info.fieldName, arguments: args, source },
  };
}

export function response(ctx: AppSyncContext) {
  return ctx.result;
}
