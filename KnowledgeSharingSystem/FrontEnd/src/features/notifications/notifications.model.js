import { getUserLanguage, notificationKindKey, notificationKindLabel, notificationText, tFor } from "../../i18n";

const KIND_ICON = {
  qa: "Q&A",
  points: "PTS",
  plagiarism: "PLG",
  moderation: "MOD",
  document: "DOC",
  system: "SYS",
};

const categoryLabel = (key, text, language) => {
  if (key === "all") return text.all;
  if (key === "unread") return text.unread;
  if (key === "qa") return "Q&A";
  if (key === "points") return text.points;
  if (key === "plagiarism") return language === "en" ? "Plagiarism" : "Đạo văn";
  if (key === "moderation") return text.moderation;
  if (key === "document") return text.myDocuments;
  return language === "en" ? "System" : "Hệ thống";
};

export function createNotificationsModel(input) {
  const source = Array.isArray(input.notifications) ? input.notifications : [];
  const language = getUserLanguage(input.user);
  const text = tFor(input.user);
  const items = source.map((item) => {
    const kindKey = notificationKindKey(item.type);
    const localized = notificationText(item, language);
    return {
      ...item,
      displayTitle: localized.title,
      displayMessage: localized.message,
      kindKey,
      kindLabel: notificationKindLabel(item.type, language),
      kindIcon: KIND_ICON[kindKey] || KIND_ICON.system,
    };
  });

  const unreadCount = items.filter((item) => !item.isRead).length;
  const categoryKeys = ["qa", "document", "points", "moderation", "plagiarism", "system"];
  const categories = [
    { key: "all", label: text.all, count: items.length },
    { key: "unread", label: text.unread, count: unreadCount },
    ...categoryKeys.map((key) => ({
      key,
      label: categoryLabel(key, text, language),
      count: items.filter((item) => item.kindKey === key).length,
    })),
  ];

  return {
    isBusy: Boolean(input.isBusy),
    language,
    text,
    notifications: items,
    unreadCount,
    categories: categories.filter((item) => item.count > 0 || item.key === "all" || item.key === "unread"),
  };
}
