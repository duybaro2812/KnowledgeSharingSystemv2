import { createUploadController } from "./upload/upload.controller";
import { createUploadModel } from "./upload/upload.model";
import UploadTabView from "./upload/UploadTabView";

function UploadTab(props) {
  const model = createUploadModel(props);
  const controller = createUploadController(props);
  return <UploadTabView model={model} controller={controller} />;
}

export default UploadTab;
