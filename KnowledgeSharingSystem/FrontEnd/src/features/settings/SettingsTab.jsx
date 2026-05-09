import { createSettingsController } from "./settings.controller";
import { createSettingsModel } from "./settings.model";
import SettingsTabView from "./SettingsTabView";

function SettingsTab(props) {
  const model = createSettingsModel(props);
  const controller = createSettingsController(props);
  return <SettingsTabView model={model} controller={controller} />;
}

export default SettingsTab;
