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
  user: ["home", "upload", "points", "notifications"],
  moderator: ["home", "upload", "points", "moderation", "documents", "categories"],
  admin: ["home", "upload", "points", "moderation", "documents", "users", "categories"],
};

export const tabLabel = {
  home: "Home",
  upload: "Upload",
  points: "Points",
  moderation: "Moderation",
  documents: "Documents",
  users: "Users",
  notifications: "Notifications",
  categories: "Courses",
};
