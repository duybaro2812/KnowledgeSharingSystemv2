import { createLibraryController } from "./library/library.controller";
import { createLibraryModel } from "./library/library.model";
import LibraryTabView from "./library/LibraryTabView";

function MyLibraryTab(props) {
  const model = createLibraryModel(props);
  const controller = createLibraryController(props);
  return <LibraryTabView model={model} controller={controller} />;
}

export default MyLibraryTab;
