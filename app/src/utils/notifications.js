export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("Browser does not support notifications");
    return false;
  }
  console.log("Current notification permission:", Notification.permission);
  if (Notification.permission === "granted") {
    console.log("Permission already granted");
    return true;
  }
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    console.log("Permission result:", permission);
    return permission === "granted";
  }
  console.log("Notification permission denied");
  return false;
};

export const showNotification = (title, body, onClickUrl = null) => {
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return;
  }
  if (Notification.permission !== "granted") {
    console.log(
      "Notification permission not granted, current:",
      Notification.permission
    );
    return;
  }
  console.log("Showing notification:", title, body);
  const notification = new Notification(title, {
    body: body,
    icon: "/notification-icon.png",
    silent: false,
  });
  if (onClickUrl) {
    notification.onclick = () => {
      window.focus();
      window.location.href = onClickUrl;
      notification.close();
    };
  }
};
