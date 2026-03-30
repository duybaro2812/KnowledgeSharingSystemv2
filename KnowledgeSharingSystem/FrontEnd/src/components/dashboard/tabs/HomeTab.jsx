import { createHomeController } from "./home/home.controller";
import { createHomeModel } from "./home/home.model";
import HomeTabView from "./home/HomeTabView";

function HomeTab(props) {
  const model = createHomeModel(props);
  const controller = createHomeController(props);
  return <HomeTabView model={model} controller={controller} />;
}

export default HomeTab;
