import { createLoginController } from "./login/login.controller";
import LoginFormView from "./login/LoginFormView";
import { createLoginModel } from "./login/login.model";

function LoginForm(props) {
  const model = createLoginModel(props);
  const controller = createLoginController(props);
  return <LoginFormView model={model} controller={controller} />;
}

export default LoginForm;
