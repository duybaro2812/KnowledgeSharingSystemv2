import { createUploadController } from "./upload.controller";
import { createUploadModel } from "./upload.model";
import UploadTabView from "./UploadTabView";

function UploadTab(props) {
  const model = createUploadModel(props);
  const controller = createUploadController(props);
  return <UploadTabView model={model} controller={controller} />;
}

export default UploadTab;
