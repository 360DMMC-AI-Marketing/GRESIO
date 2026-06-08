export default function Teams() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Microsoft Teams</h1>
        <p className="text-surface-500 text-sm mt-1">Messages, meetings, and collaboration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">💬</p>
          <p className="text-sm text-surface-500">Messages Tracked</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Via Graph API</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">🎥</p>
          <p className="text-sm text-surface-500">Meetings</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Auto-detected</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
          <p className="text-3xl mb-2">👤</p>
          <p className="text-sm text-surface-500">Meeting Attendance</p>
          <p className="text-lg font-bold text-surface-900 mt-1">Tracked</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 p-6 text-center">
        <p className="text-5xl mb-4">💬</p>
        <h2 className="text-lg font-semibold text-surface-900 mb-2">Teams Integration</h2>
        <p className="text-surface-500 text-sm max-w-md mx-auto mb-4">
          Microsoft Teams activity is automatically tracked through the Microsoft Graph API.
          Messages, meetings, and attendance are analyzed for activity scoring.
        </p>
        <p className="text-sm text-surface-400">
          Configure Teams integration in Admin → Integrations
        </p>
      </div>
    </div>
  );
}
