import { createNotificationsController } from "./notifications.controller";
import { createNotificationsModel } from "./notifications.model";
import NotificationsTabView from "./NotificationsTabView";

function NotificationsTab(props) {
  const model = createNotificationsModel(props);
  const controller = createNotificationsController(props);
  return <NotificationsTabView model={model} controller={controller} />;
}

export default NotificationsTab;
