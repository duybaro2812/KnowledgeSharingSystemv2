import { createQaController } from "./qa.controller";
import { createQaModel } from "./qa.model";
import QaTabView from "./QaTabView";

function QaTab(props) {
  const model = createQaModel(props);
  const controller = createQaController(props);
  return <QaTabView model={model} controller={controller} />;
}

export default QaTab;
