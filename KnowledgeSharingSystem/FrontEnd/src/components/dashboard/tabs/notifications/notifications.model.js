function mapNotificationType(rawType) {
  const type = String(rawType || "").toLowerCase();

  if (type.includes("qa") || type.includes("chat")) {
    return { key: "qa", label: "Q&A", icon: "💬" };
  }
  if (type.includes("point")) {
    return { key: "points", label: "Points", icon: "🏆" };
  }
  if (type.includes("plagiarism")) {
    return { key: "plagiarism", label: "Plagiarism", icon: "🛡️" };
  }
  if (type.includes("report") || type.includes("moderation")) {
    return { key: "moderation", label: "Moderation", icon: "🚩" };
  }
  if (type.includes("comment") || type.includes("document")) {
    return { key: "document", label: "Documents", icon: "📄" };
  }

  return { key: "system", label: "System", icon: "🔔" };
}

export function createNotificationsModel(input) {
  const source = Array.isArray(input.notifications) ? input.notifications : [];
  const items = source.map((item) => {
    const kind = mapNotificationType(item.type);
    return {
      ...item,
      kindKey: kind.key,
      kindLabel: kind.label,
      kindIcon: kind.icon,
    };
  });

  const unreadCount = items.filter((item) => !item.isRead).length;
  const categories = [
    { key: "all", label: "All", count: items.length },
    { key: "unread", label: "Unread", count: unreadCount },
    ...["qa", "document", "points", "moderation", "plagiarism", "system"].map((key) => ({
      key,
      label: key === "qa" ? "Q&A" : key.charAt(0).toUpperCase() + key.slice(1),
      count: items.filter((item) => item.kindKey === key).length,
    })),
  ];

  return {
    isBusy: Boolean(input.isBusy),
    notifications: items,
    unreadCount,
    categories: categories.filter((item) => item.count > 0 || item.key === "all" || item.key === "unread"),
  };
}
