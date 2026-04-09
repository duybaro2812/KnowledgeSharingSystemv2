import { createQaController } from "./qa/qa.controller";
import { createQaModel } from "./qa/qa.model";
import QaTabView from "./qa/QaTabView";

function QaTab(props) {
  const model = createQaModel(props);
  const controller = createQaController(props);
  return <QaTabView model={model} controller={controller} />;
}

export default QaTab;
