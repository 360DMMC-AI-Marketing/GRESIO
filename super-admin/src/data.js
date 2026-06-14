export const companies = [
  { id:'c1', name:'TechStart Inc', plan:'trial', type:'saas', status:'on_track', users:12, projects:3, mrr:'$0', deadline:'2026-06-15', progress:86, overdue:2, health:75, domain:'techstart.io', createdAt:'2026-01-10' },
  { id:'c2', name:'Acme Corp', plan:'enterprise', type:'design', status:'completed', users:48, projects:7, mrr:'$12,500', deadline:'2026-09-01', progress:92, overdue:0, health:92, domain:'acme.com', createdAt:'2025-11-20' },
  { id:'c3', name:'GlobalSoft', plan:'pro', type:'business', status:'at_risk', users:24, projects:5, mrr:'$4,200', deadline:'2026-12-31', progress:25, overdue:3, health:35, domain:'globalsoft.io', createdAt:'2026-02-14' },
  { id:'c4', name:'DesignStudio', plan:'trial', type:'design', status:'on_track', users:6, projects:2, mrr:'$0', deadline:'2026-06-15', progress:33, overdue:0, health:60, domain:'designstudio.co', createdAt:'2026-06-01' },
  { id:'c5', name:'DataFlow Systems', plan:'pro', type:'saas', status:'on_track', users:18, projects:4, mrr:'$3,800', deadline:'2026-10-01', progress:55, overdue:1, health:68, domain:'dataflow.io', createdAt:'2026-03-01' },
  { id:'c6', name:'MediCore Health', plan:'enterprise', type:'business', status:'completed', users:32, projects:6, mrr:'$9,800', deadline:'2026-08-15', progress:100, overdue:0, health:95, domain:'medicore.com', createdAt:'2025-09-15' },
  { id:'c7', name:'WebLaunch Agency', plan:'starter', type:'design', status:'delayed', users:8, projects:2, mrr:'$1,200', deadline:'2026-05-01', progress:15, overdue:4, health:20, domain:'weblaunch.io', createdAt:'2026-04-01' },
  { id:'c8', name:'CloudBase', plan:'pro', type:'saas', status:'on_track', users:15, projects:3, mrr:'$2,900', deadline:'2026-11-01', progress:42, overdue:0, health:72, domain:'cloudbase.dev', createdAt:'2026-01-05' },
];

export const activities = [
  { id:'a1', user:'Sarah Chen', action:'logged in', time:'10s ago', type:'login' },
  { id:'a2', user:'System', action:'New company signup — DesignStudio', time:'3m ago', type:'signup' },
  { id:'a3', user:'John Admin', action:'Upgraded GlobalSoft to Pro plan', time:'7m ago', type:'upgrade' },
  { id:'a4', user:'Sarah Chen', action:'Created admin account for Lisa Thompson', time:'15m ago', type:'admin' },
  { id:'a5', user:'System', action:'Payment failed for TechStart Inc', time:'32m ago', type:'payment' },
  { id:'a6', user:'John Admin', action:'Exported company analytics report', time:'1h ago', type:'export' },
  { id:'a7', user:'System', action:'Auto-renewed Acme Corp Enterprise plan', time:'2h ago', type:'renewal' },
];

export const admins = [
  { id:'ad1', name:'Sarah Chen', email:'sarah@360dmmc.com', status:'active', lastLogin:'2026-06-13T14:30:00', role:'super_admin', companies:8 },
  { id:'ad2', name:'John Admin', email:'john@360dmmc.com', status:'active', lastLogin:'2026-06-13T12:15:00', role:'admin', companies:5 },
  { id:'ad3', name:'Lisa Thompson', email:'lisa@360dmmc.com', status:'idle', lastLogin:'2026-06-12T09:00:00', role:'admin', companies:3 },
  { id:'ad4', name:'Mike Rivera', email:'mike@360dmmc.com', status:'active', lastLogin:'2026-06-13T11:00:00', role:'support', companies:8 },
  { id:'ad5', name:'Emma Davis', email:'emma@360dmmc.com', status:'inactive', lastLogin:'2026-06-10T16:00:00', role:'admin', companies:2 },
  { id:'ad6', name:'Alex Kim', email:'alex@360dmmc.com', status:'active', lastLogin:'2026-06-13T13:00:00', role:'support', companies:4 },
];

export const companyDetailTabs = [
  { key:'overview', label:'Overview', icon:'📊' },
  { key:'users', label:'Users', icon:'👥' },
  { key:'projects', label:'Projects', icon:'📁' },
  { key:'resources', label:'Resources', icon:'📎' },
  { key:'activity', label:'Activity', icon:'📋' },
  { key:'billing', label:'Billing', icon:'💳' },
];

export const healthChecks = [
  { id:'hc1', name:'API Server', status:'pass', latency:'45ms', uptime:'99.97%' },
  { id:'hc2', name:'Database', status:'pass', latency:'12ms', uptime:'99.99%' },
  { id:'hc3', name:'Payment Processor', status:'pass', latency:'210ms', uptime:'99.95%' },
  { id:'hc4', name:'Email Service', status:'pass', latency:'180ms', uptime:'99.90%' },
  { id:'hc5', name:'File Storage', status:'warn', latency:'350ms', uptime:'98.50%' },
  { id:'hc6', name:'AI Service', status:'fail', latency:'—', uptime:'95.20%' },
];
