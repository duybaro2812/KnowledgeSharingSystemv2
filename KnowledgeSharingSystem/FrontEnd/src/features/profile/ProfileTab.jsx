import { createProfileController } from "./profile.controller";
import { createProfileModel } from "./profile.model";
import ProfileTabView from "./ProfileTabView";

function ProfileTab(props) {
  const model = createProfileModel(props);
  const controller = createProfileController(props);
  return <ProfileTabView model={model} controller={controller} />;
}

export default ProfileTab;
