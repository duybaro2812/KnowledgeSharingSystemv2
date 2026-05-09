import { createHomeController } from "./home.controller";
import { createHomeModel } from "./home.model";
import HomeTabView from "./HomeTabView";

function HomeTab(props) {
  const model = createHomeModel(props);
  const controller = createHomeController(props);
  return <HomeTabView model={model} controller={controller} />;
}

export default HomeTab;
