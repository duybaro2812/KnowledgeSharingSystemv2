import { createSettingsController } from "./settings/settings.controller";
import { createSettingsModel } from "./settings/settings.model";
import SettingsTabView from "./settings/SettingsTabView";

function SettingsTab(props) {
  const model = createSettingsModel(props);
  const controller = createSettingsController(props);
  return <SettingsTabView model={model} controller={controller} />;
}

export default SettingsTab;
