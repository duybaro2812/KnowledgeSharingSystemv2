export const initialLogin = { username: "", password: "", adminLogin: false };

export const initialRegister = {
  name: "",
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export const hasModeratorRole = (role) =>
  role === "admin" || role === "moderator";

export const roleTabs = {
  user: ["home", "upload", "notifications", "categories"],
  moderator: ["home", "upload", "moderation", "categories"],
  admin: ["home", "upload", "moderation", "users", "categories"],
};

export const tabLabel = {
  home: "Home",
  upload: "Upload",
  moderation: "Moderation",
  users: "Users",
  notifications: "Notifications",
  categories: "Categories",
};
