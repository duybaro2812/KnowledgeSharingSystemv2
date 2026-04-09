import { createSearchController } from "./search/search.controller";
import { createSearchModel } from "./search/search.model";
import SearchTabView from "./search/SearchTabView";

function SearchTab(props) {
  const model = createSearchModel(props);
  const controller = createSearchController(props);
  return <SearchTabView model={model} controller={controller} />;
}

export default SearchTab;
