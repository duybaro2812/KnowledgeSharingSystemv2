import { createForgotRequestController } from "./forgot-request/forgot-request.controller";
import ForgotPasswordRequestFormView from "./forgot-request/ForgotPasswordRequestFormView";
import { createForgotRequestModel } from "./forgot-request/forgot-request.model";

function ForgotPasswordRequestForm(props) {
  const model = createForgotRequestModel(props);
  const controller = createForgotRequestController(props);
  return <ForgotPasswordRequestFormView model={model} controller={controller} />;
}

export default ForgotPasswordRequestForm;
