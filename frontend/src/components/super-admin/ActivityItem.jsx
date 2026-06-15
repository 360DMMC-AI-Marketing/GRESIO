const avatarColors = [
  'bg-primary-600',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
];

export default function ActivityItem({ activity }) {
  const {
    user = 'User',
    action = '',
    time = '',
    avatar,
  } = activity;

  const initial = (avatar || user).charAt(0).toUpperCase();
  const colorIndex = initial.charCodeAt(0) % avatarColors.length;
  const bgColor = avatarColors[colorIndex];

  return (
    <div className="flex items-start gap-3 py-3">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 ${bgColor}`}
      >
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-surface-800">
          <span className="font-semibold">{user}</span>{' '}
          <span className="text-surface-500">{action}</span>
        </p>
      </div>
      <p className="text-xs text-surface-400 shrink-0 whitespace-nowrap">{time}</p>
    </div>
  );
}
