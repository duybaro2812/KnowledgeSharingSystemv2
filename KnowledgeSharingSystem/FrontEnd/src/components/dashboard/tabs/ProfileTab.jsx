import { createProfileController } from "./profile/profile.controller";
import { createProfileModel } from "./profile/profile.model";
import ProfileTabView from "./profile/ProfileTabView";

function ProfileTab(props) {
  const model = createProfileModel(props);
  const controller = createProfileController(props);
  return <ProfileTabView model={model} controller={controller} />;
}

export default ProfileTab;
