export function createProfileController(input) {
  return {
    onUpdateProfile: input.updateMyProfile,
    onUpdateAvatar: input.updateMyAvatar,
    resolveFileUrl: input.resolveFileUrl,
    onEditProfile: () => input.setActiveTab?.("settings"),
    onUploadDocument: () => input.setActiveTab?.("upload"),
    onOpenDocument: input.openPreview,
  };
}
