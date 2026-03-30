export function createAuthShellModel(input) {
  return {
    authMode: input.authMode,
    status: input.status || "",
  };
}
