import { createMyDocumentsController } from "./my-documents/my-documents.controller";
import { createMyDocumentsModel } from "./my-documents/my-documents.model";
import MyDocumentsTabView from "./my-documents/MyDocumentsTabView";

function MyDocumentsTab(props) {
  const model = createMyDocumentsModel(props);
  const controller = createMyDocumentsController(props);
  return <MyDocumentsTabView model={model} controller={controller} />;
}

export default MyDocumentsTab;
