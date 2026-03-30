import { createModerationController } from "./moderation/moderation.controller";
import { createModerationModel } from "./moderation/moderation.model";
import ModerationTabView from "./moderation/ModerationTabView";

function ModerationTab(props) {
  const model = createModerationModel(props);
  const controller = createModerationController(props);
  return <ModerationTabView model={model} controller={controller} />;
}

export default ModerationTab;
