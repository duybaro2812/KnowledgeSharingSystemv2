import { createAuthShellController } from "./auth-shell.controller";
import { createAuthShellModel } from "./auth-shell.model";
import AuthShellView from "./AuthShellView";

function AuthShell(props) {
  const model = createAuthShellModel(props);
  const controller = createAuthShellController(props);
  return <AuthShellView model={model} controller={controller} sharedProps={props} />;
}

export default AuthShell;
