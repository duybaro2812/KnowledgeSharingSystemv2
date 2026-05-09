import { createMyDocumentsController } from "./my-documents.controller";
import { createMyDocumentsModel } from "./my-documents.model";
import MyDocumentsTabView from "./MyDocumentsTabView";

function MyDocumentsTab(props) {
  const model = createMyDocumentsModel(props);
  const controller = createMyDocumentsController(props);
  return <MyDocumentsTabView model={model} controller={controller} />;
}

export default MyDocumentsTab;
