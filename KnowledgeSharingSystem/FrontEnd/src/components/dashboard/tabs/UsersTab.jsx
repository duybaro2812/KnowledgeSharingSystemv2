import { createUsersController } from "./users/users.controller";
import { createUsersModel } from "./users/users.model";
import UsersTabView from "./users/UsersTabView";

function UsersTab(props) {
  const model = createUsersModel(props);
  const controller = createUsersController(props);
  return <UsersTabView model={model} controller={controller} />;
}

export default UsersTab;

