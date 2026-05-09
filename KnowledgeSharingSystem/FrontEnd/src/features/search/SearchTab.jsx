import { createSearchController } from "./search.controller";
import { createSearchModel } from "./search.model";
import SearchTabView from "./SearchTabView";

function SearchTab(props) {
  const model = createSearchModel(props);
  const controller = createSearchController(props);
  return <SearchTabView model={model} controller={controller} />;
}

export default SearchTab;
