import { createForgotVerifyController } from "./forgot-verify/forgot-verify.controller";
import ForgotPasswordVerifyFormView from "./forgot-verify/ForgotPasswordVerifyFormView";
import { createForgotVerifyModel } from "./forgot-verify/forgot-verify.model";

function ForgotPasswordVerifyForm(props) {
  const model = createForgotVerifyModel(props);
  const controller = createForgotVerifyController(props);
  return <ForgotPasswordVerifyFormView model={model} controller={controller} />;
}

export default ForgotPasswordVerifyForm;
