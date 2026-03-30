import { createNotificationsController } from "./notifications/notifications.controller";
import { createNotificationsModel } from "./notifications/notifications.model";
import NotificationsTabView from "./notifications/NotificationsTabView";

function NotificationsTab(props) {
  const model = createNotificationsModel(props);
  const controller = createNotificationsController(props);
  return <NotificationsTabView model={model} controller={controller} />;
}

export default NotificationsTab;
