export const isStrongPassword = (password) => {
  const value = String(password || "");
  const hasMinLength = value.length >= 8;
  const hasUppercase = /[A-Z]/.test(value);
  const hasLowercase = /[a-z]/.test(value);
  const hasNumber = /[0-9]/.test(value);
  const hasSpecial = /[^A-Za-z0-9]/.test(value);
  return hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
};

export const getPasswordStrength = (password) => {
  const value = String(password || "");
  if (!value) {
    return { score: 0, label: "Empty", className: "empty" };
  }

  let score = 0;
  if (value.length >= 8) score += 1;
  if (/[A-Z]/.test(value)) score += 1;
  if (/[a-z]/.test(value)) score += 1;
  if (/[0-9]/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;

  if (score <= 2) return { score, label: "Weak", className: "weak" };
  if (score <= 4) return { score, label: "Medium", className: "medium" };
  return { score, label: "Strong", className: "strong" };
};
