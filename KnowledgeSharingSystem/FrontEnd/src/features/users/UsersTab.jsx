import { createUsersController } from "./users.controller";
import { createUsersModel } from "./users.model";
import UsersTabView from "./UsersTabView";

function UsersTab(props) {
  const model = createUsersModel(props);
  const controller = createUsersController(props);
  return <UsersTabView model={model} controller={controller} />;
}

export default UsersTab;

