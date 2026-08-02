const CACHE_NAME = "marutham-fms-v2";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Marutham FMS", body: event.data.text() };
  }

  const options = {
    body: data.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [200, 100, 200],
    tag: data.tag || "marutham-notification",
    renotify: true,
    data: { url: data.url || "/" },
    requireInteraction: data.urgent || false,
    actions: [
      { action: "open", title: "Open App" },
      { action: "close", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title || "Marutham FMS 🌾", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "close") return;

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Check motor turn / tractor oil periodically (requires the Periodic Background
// Sync permission, which most browsers do not grant to installed PWAs today —
// this is best-effort groundwork, not the primary notification path).
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-notifications") {
    event.waitUntil(checkAndNotify());
  }
});

async function checkAndNotify() {
  const channel = new BroadcastChannel("notification-check");
  channel.postMessage({ type: "CHECK" });
  channel.close();
}
