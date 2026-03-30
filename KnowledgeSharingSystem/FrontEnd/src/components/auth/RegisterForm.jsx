import { createRegisterController } from "./register/register.controller";
import { createRegisterModel } from "./register/register.model";
import RegisterFormView from "./register/RegisterFormView";

function RegisterForm(props) {
  const model = createRegisterModel(props);
  const controller = createRegisterController(props);
  return <RegisterFormView model={model} controller={controller} />;
}

export default RegisterForm;
