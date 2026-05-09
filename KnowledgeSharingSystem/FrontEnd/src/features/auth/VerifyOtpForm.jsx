import { createVerifyOtpController } from "./verify-otp/verify-otp.controller";
import { createVerifyOtpModel } from "./verify-otp/verify-otp.model";
import VerifyOtpFormView from "./verify-otp/VerifyOtpFormView";

function VerifyOtpForm(props) {
  const model = createVerifyOtpModel(props);
  const controller = createVerifyOtpController(props);
  return <VerifyOtpFormView model={model} controller={controller} />;
}

export default VerifyOtpForm;
