import { createModerationController } from "./moderation.controller";
import { createModerationModel } from "./moderation.model";
import ModerationTabView from "./ModerationTabView";

function ModerationTab(props) {
  const model = createModerationModel(props);
  const controller = createModerationController(props);
  return <ModerationTabView model={model} controller={controller} />;
}

export default ModerationTab;
