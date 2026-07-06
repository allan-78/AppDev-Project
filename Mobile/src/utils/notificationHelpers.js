export function groupNotificationsByDate(notifications = []) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  notifications.forEach((notification) => {
    const date = new Date(notification.createdAt);
    const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (normalized.getTime() === today.getTime()) {
      groups.today.push(notification);
    } else if (normalized.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification);
    } else if (date >= weekAgo) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  const sections = [];
  if (groups.today.length) sections.push({ title: "Today", data: groups.today });
  if (groups.yesterday.length) sections.push({ title: "Yesterday", data: groups.yesterday });
  if (groups.thisWeek.length) sections.push({ title: "This Week", data: groups.thisWeek });
  if (groups.older.length) sections.push({ title: "Older", data: groups.older });

  return { sections, groups };
}