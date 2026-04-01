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
  user: ["home", "upload", "points", "notifications", "categories"],
  moderator: ["home", "upload", "points", "moderation", "categories"],
  admin: ["home", "upload", "points", "moderation", "users", "categories"],
};

export const tabLabel = {
  home: "Home",
  upload: "Upload",
  points: "Points",
  moderation: "Moderation",
  users: "Users",
  notifications: "Notifications",
  categories: "Categories",
};
