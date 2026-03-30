export function createAuthShellController(input) {
  return {
    isMode: (mode) => input.authMode === mode,
  };
}
