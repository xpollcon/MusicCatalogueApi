type AppSyncContext = any;

export function request(ctx: AppSyncContext) {
  return {
    operation: "Scan",
  };
}

export function response(ctx: AppSyncContext) {
  return ctx.result.items;
}
