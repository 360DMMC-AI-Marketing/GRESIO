function Box({ className = '', w, h, circle = false }) {
  return <div className={`animate-skeleton bg-surface-200 ${circle ? 'rounded-full' : 'rounded-lg'} ${className}`} style={{ width: w, height: h }} />;
}

function Text({ lines = 3, className = '' }) {
  const widths = ['100%', '92%', '85%', '78%', '70%'];
  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <Box key={i} w={widths[i % widths.length]} h={14} className="last:w-[60%]" />
      ))}
    </div>
  );
}

function Avatar({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Box w={40} h={40} circle />
      <div className="flex-1 space-y-2">
        <Box w="40%" h={14} />
        <Box w="60%" h={12} />
      </div>
    </div>
  );
}

function Card({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 p-5 space-y-4 ${className}`}>
      <Box w="100%" h={160} />
      <Text lines={3} />
    </div>
  );
}

function StatCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 p-5 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Box w={44} h={44} />
        <Box w={24} h={24} circle />
      </div>
      <Box w="60%" h={28} className="mb-2" />
      <Box w="40%" h={14} />
    </div>
  );
}

function TableRow({ cells = 5, className = '' }) {
  return (
    <div className={`flex items-center gap-4 px-4 py-3 border-b border-surface-100 ${className}`}>
      {Array.from({ length: cells }, (_, i) => (
        <Box key={i} w={i === 0 ? '30%' : i === cells - 1 ? '12%' : '16%'} h={14} className="flex-1" />
      ))}
    </div>
  );
}

function PageHeader({ className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div className="space-y-2">
        <Box w={180} h={28} />
        <Box w={260} h={16} />
      </div>
      <Box w={120} h={38} />
    </div>
  );
}

function Chart({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 p-5 ${className}`}>
      <Box w="30%" h={18} className="mb-6" />
      <div className="flex items-end gap-3 h-[200px]">
        {[40, 65, 50, 80, 45, 70, 55, 90, 60, 75].map((h, i) => (
          <Box key={i} w="8%" h={h * 2} className="flex-1" />
        ))}
      </div>
    </div>
  );
}

function Table({ rows = 6, cells = 5, className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 ${className}`}>
      <div className="flex items-center gap-4 px-4 py-3 border-b border-surface-200 bg-surface-50">
        {Array.from({ length: cells }, (_, i) => (
          <Box key={i} w={i === 0 ? '30%' : i === cells - 1 ? '12%' : '16%'} h={14} className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <TableRow key={i} cells={cells} />
      ))}
    </div>
  );
}

function ProjectCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 p-5 space-y-3 ${className}`}>
      <div className="flex items-center gap-3">
        <Box w={10} h={10} />
        <div className="flex-1 space-y-1.5">
          <Box w="70%" h={16} />
          <Box w="50%" h={12} />
        </div>
      </div>
      <Box w="100%" h={6} circle />
      <div className="flex gap-2">
        <Box w={60} h={22} circle />
        <Box w={80} h={22} circle />
      </div>
      <div className="flex -space-x-1.5">
        {[1, 2, 3, 4].map(i => <Box key={i} w={28} h={28} circle className="border-2 border-white" />)}
      </div>
    </div>
  );
}

function TaskRow({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 border-b border-surface-100 ${className}`}>
      <Box w={18} h={18} />
      <Box w="45%" h={16} />
      <Box w={70} h={20} circle />
      <Box w={60} h={14} />
      <Box w={80} h={14} />
      <Box w={32} h={32} circle />
    </div>
  );
}

function LogEntry({ className = '' }) {
  return (
    <div className={`flex items-start gap-3 px-4 py-3 border-b border-surface-100 ${className}`}>
      <Box w={32} h={32} circle />
      <div className="flex-1 space-y-1.5">
        <Box w="55%" h={15} />
        <Box w="35%" h={12} />
        <Box w="80%" h={12} />
      </div>
      <Box w={50} h={14} />
    </div>
  );
}

function TabBar({ tabs = 4, className = '' }) {
  return (
    <div className={`flex gap-6 border-b border-surface-200 mb-6 ${className}`}>
      {Array.from({ length: tabs }, (_, i) => (
        <Box key={i} w={i === 0 ? 100 : 80} h={32} className="mb-0" style={{ borderRadius: 0 }} />
      ))}
    </div>
  );
}

function ChartCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 ${className}`}>
      <div className="p-5 border-b border-surface-100">
        <Box w="35%" h={18} />
      </div>
      <div className="p-5">
        <div className="flex items-end gap-3 h-[180px] mb-5">
          {[55, 70, 45, 85, 60, 75, 50, 90, 40, 65].map((h, i) => (
            <Box key={i} w="8%" h={h * 2} className="flex-1" />
          ))}
        </div>
        <div className="flex justify-between">
          <Box w={40} h={10} />
          <Box w={40} h={10} />
          <Box w={40} h={10} />
          <Box w={40} h={10} />
          <Box w={40} h={10} />
        </div>
      </div>
    </div>
  );
}

function SettingsSkeleton({ className = '' }) {
  return (
    <div className={`space-y-6 ${className}`}>
      <PageHeader />
      <div className="bg-white rounded-xl border border-surface-200 p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-1.5">
              <Box w="30%" h={12} />
              <Box w="100%" h={38} />
            </div>
          ))}
        </div>
        <Box w={120} h={38} />
      </div>
    </div>
  );
}

const Skeleton = {
  Box, Text, Avatar, Card, StatCard, TableRow, Table,
  PageHeader, Chart, ProjectCard, TaskRow, LogEntry, TabBar,
  ChartCard, SettingsSkeleton,
};

export default Skeleton;
