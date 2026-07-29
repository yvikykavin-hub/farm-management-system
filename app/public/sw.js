const CACHE_NAME = "marutham-fms-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};

  const options = {
    body: data.body || "",
    icon: "/icon-192x192.png",
    badge: "/icon-192x192.png",
    vibrate: [200, 100, 200],
    data: { url: data.url || "/" },
    requireInteraction: data.urgent || false,
  };

  event.waitUntil(self.registration.showNotification(data.title || "Marutham FMS 🌾", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/"));
});

// Check motor turn every hour (requires the Periodic Background Sync
// permission, which most browsers do not grant to installed PWAs today —
// this is best-effort groundwork, not the primary notification path).
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-motor-turn") {
    event.waitUntil(checkMotorTurn());
  }
});

async function checkMotorTurn() {
  const channel = new BroadcastChannel("motor-check");
  channel.postMessage({ type: "CHECK_MOTOR" });
}
