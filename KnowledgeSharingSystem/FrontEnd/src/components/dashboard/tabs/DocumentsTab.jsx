import { createDocumentsController } from "./documents/documents.controller";
import { createDocumentsModel } from "./documents/documents.model";
import DocumentsTabView from "./documents/DocumentsTabView";

function DocumentsTab(props) {
  const model = createDocumentsModel(props);
  const controller = createDocumentsController(props);
  return <DocumentsTabView model={model} controller={controller} />;
}

export default DocumentsTab;

