import { createPointsController } from "./points.controller";
import { createPointsModel } from "./points.model";
import PointsTabView from "./PointsTabView";

function PointsTab(props) {
  const model = createPointsModel(props);
  const controller = createPointsController(props);
  return <PointsTabView model={model} controller={controller} />;
}

export default PointsTab;

