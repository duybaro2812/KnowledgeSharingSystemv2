import { createCategoriesController } from "./categories.controller";
import { createCategoriesModel } from "./categories.model";
import CategoriesTabView from "./CategoriesTabView";

function CategoriesTab(props) {
  const model = createCategoriesModel(props);
  const controller = createCategoriesController(props);
  return <CategoriesTabView model={model} controller={controller} />;
}

export default CategoriesTab;
