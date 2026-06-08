export default function Outlook() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Microsoft Outlook</h1>
        <p className="text-surface-500 text-sm mt-1">Email and calendar tracking</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">📧</p>
          <p className="text-sm text-surface-500">Emails Tracked</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Via Graph API</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">📅</p>
          <p className="text-sm text-surface-500">Calendar Events</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Synced</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">📊</p>
          <p className="text-sm text-surface-500">Workload View</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Available</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
        <p className="text-5xl mb-4">📧</p>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Outlook Integration</h2>
        <p className="text-surface-500 text-sm max-w-md mx-auto mb-4">
          Emails and calendar events are tracked via Microsoft Graph API.
          Activity is analyzed to determine user engagement and workload.
        </p>
        <p className="text-sm text-surface-400">
          Configure Outlook integration in Admin → Integrations
        </p>
      </div>
    </div>
  );
}
