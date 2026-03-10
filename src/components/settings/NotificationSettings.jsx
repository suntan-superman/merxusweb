export default function NotificationSettings() {
  return (
    <section className="card">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">Notifications</h3>
      <p className="text-sm text-gray-600">
        Notification routing has moved into the `SMS Messaging` tab so caller confirmations,
        staff alerts, contact groups, links, and template overrides all stay in one place.
      </p>
      <div className="mt-4 rounded-lg border border-primary-200 bg-primary-50 p-4">
        <p className="text-sm text-primary-700">
          Use the `SMS Messaging` tab to manage event routing, staff contacts, channel preferences,
          and notification templates.
        </p>
      </div>
    </section>
  );
}
