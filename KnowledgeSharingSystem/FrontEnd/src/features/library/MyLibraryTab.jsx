import { createLibraryController } from "./library.controller";
import { createLibraryModel } from "./library.model";
import LibraryTabView from "./LibraryTabView";

function MyLibraryTab(props) {
  const model = createLibraryModel(props);
  const controller = createLibraryController(props);
  return <LibraryTabView model={model} controller={controller} />;
}

export default MyLibraryTab;
