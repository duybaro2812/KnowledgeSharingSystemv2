import { apiRequest } from "../api";

export function createAdminUserFeature(ctx) {
  const { token, call, setStatus, setAdminUsers } = ctx;

  const loadAdminUsers = async () => {
    if (!token) {
      setAdminUsers([]);
      return;
    }

    const payload = await apiRequest("/users", { token });
    setAdminUsers(payload.data || []);
  };

  const changeUserRole = async (userId, role) => {
    await call(async () => {
      await apiRequest(`/users/${userId}/role`, {
        method: "PATCH",
        token,
        body: { role },
      });
      setStatus(
        role === "moderator"
          ? "User promoted to moderator."
          : "Moderator changed back to user.",
      );
      await loadAdminUsers();
    });
  };

  const setUserActiveStatus = async (userId, isActive) => {
    await call(async () => {
      await apiRequest(`/users/${userId}/active-status`, {
        method: "PATCH",
        token,
        body: { isActive },
      });
      setStatus(isActive ? "User account unlocked." : "User account locked.");
      await loadAdminUsers();
    });
  };

  const deleteUserAccount = async (userId) => {
    await call(async () => {
      await apiRequest(`/users/${userId}`, {
        method: "DELETE",
        token,
      });
      setStatus("User account deleted (soft delete).");
      await loadAdminUsers();
    });
  };

  return {
    loadAdminUsers,
    changeUserRole,
    setUserActiveStatus,
    deleteUserAccount,
  };
}
