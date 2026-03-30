import { createCategoriesController } from "./categories/categories.controller";
import { createCategoriesModel } from "./categories/categories.model";
import CategoriesTabView from "./categories/CategoriesTabView";

function CategoriesTab(props) {
  const model = createCategoriesModel(props);
  const controller = createCategoriesController(props);
  return <CategoriesTabView model={model} controller={controller} />;
}

export default CategoriesTab;
