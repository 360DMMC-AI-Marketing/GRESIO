import React, { useState, useEffect, useCallback } from 'react';
import { cerebrum } from '../services/api';

var BG = '#0A0A0C';
var CARD = '#0F0F12';
var CARD_HOVER = '#141418';
var BORDER = '#1A1A20';
var TP = '#F0F0F4';
var TS = '#919199';
var TM = '#5A5A64';
var TD = '#3A3A44';
var LINE = '#18181E';
var ACCENT = '#7C6FF7';
var ACCENT_GLOW = 'rgba(124, 111, 247, 0.12)';
var RED = '#F04452';
var RED_BG = 'rgba(240, 68, 82, 0.08)';
var AMBER = '#F5A524';
var AMBER_BG = 'rgba(245, 165, 36, 0.08)';
var GREEN = '#22C55E';
var GREEN_BG = 'rgba(34, 197, 94, 0.08)';
var BLUE = '#3B82F6';
var FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Roboto, sans-serif';
var TIME_OPTS = { hour: '2-digit', minute: '2-digit', hour12: false };
var DATE_OPTS = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };

function fmtDay() { return (new Date()).toLocaleDateString('en-US', DATE_OPTS); }

export default function DailyBriefing() {
  var _a = useState(null), data = _a[0], setData = _a[1];
  var _b = useState(true), loading = _b[0], setLoading = _b[1];
  var _c = useState(null), error = _c[0], setError = _c[1];
  var _d = useState(function() { return new Date(); }), now = _d[0], setNow = _d[1];

  useEffect(function() {
    function tick() { setNow(new Date()); }
    tick();
    var id = setInterval(tick, 10000);
    return function() { clearInterval(id); };
  }, []);

  var fetchData = useCallback(function() {
    (async function() {
      try {
        setLoading(true);
        var res = await cerebrum.getTeamInsights();
        setData(res.data);
        setError(null);
      } catch (err) {
        setError(err.response && err.response.data && err.response.data.error ? err.response.data.error : 'Failed to load team insights');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(function() { fetchData(); var id = setInterval(fetchData, 120000); return function() { clearInterval(id); }; }, [fetchData]);

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorS error={error} onRetry={fetchData} />;

  var pulse = data.pulse;
  var attentionItems = data.attentionItems || [];
  var blockers = data.blockers || [];
  var workDist = data.workDistribution || {};
  var delivery = data.deliverySignals || {};
  var tips = data.coachingTips || [];
  var teamHealth = data.teamHealth || {};

  var greeting = (function() {
    var h = now.getHours();
    if (h < 12) return 'Good morning.';
    if (h < 17) return 'Good afternoon.';
    return 'Good evening.';
  })();

  var healthColor = teamHealth.label === 'Critical' ? RED : teamHealth.label === 'Needs Attention' ? AMBER : GREEN;

  return (
    <div style={{ background: BG, color: TP, minHeight: 'calc(100vh - 140px)', fontFamily: FONT, WebkitFontSmoothing: 'antialiased', display: 'flex', justifyContent: 'center', padding: '80px 24px' }}>
      <div style={{ maxWidth: 640, width: '100%' }}>
        <Header greeting={greeting} now={now} />
        <TeamPulse pulse={pulse} healthColor={healthColor} teamHealth={teamHealth} />
        <SectionNumber n="01" label="Who needs your attention today" />
        <AttentionItems items={attentionItems} />
        <SectionNumber n="02" label="What is blocking delivery" />
        {blockers.length > 0 ? <BlockerList items={blockers} /> : <EmptyCard msg="No blockers reported in the last 7 days." />}
        <SectionNumber n="03" label="Work distribution" />
        <WorkDistribution dist={workDist} />
        <SectionNumber n="04" label="Who to check in with today" />
        <CoachingTips items={tips} />
        <SectionNumber n="05" label="Delivery signals" />
        <DeliverySignals d={delivery} pulse={pulse} />
        <Footer now={now} />
      </div>
    </div>
  );
}

function Loading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', background: BG, fontFamily: FONT, color: TM, fontSize: 13, letterSpacing: '0.3px' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ACCENT, opacity: 0.5, marginRight: 10, display: 'inline-block' }} />
      Loading your team briefing...
    </div>
  );
}

function ErrorS(props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 140px)', background: BG, gap: 14, fontFamily: FONT }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: RED_BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: RED, fontSize: 18, fontWeight: 600 }}>!</span>
      </div>
      <div style={{ color: TP, fontSize: 14, fontWeight: 500 }}>Team data unavailable</div>
      <div style={{ color: TM, fontSize: 12 }}>{props.error}</div>
      <button onClick={props.onRetry}
        style={{ marginTop: 4, padding: '10px 24px', fontSize: 12, fontWeight: 600, color: '#FFF', background: ACCENT, border: 'none', borderRadius: 10, cursor: 'pointer', transition: '0.2s' }}
        onMouseEnter={function(e) { e.currentTarget.style.opacity = '0.85'; }}
        onMouseLeave={function(e) { e.currentTarget.style.opacity = '1'; }}>
        Retry
      </button>
    </div>
  );
}

function Header(props) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 34, fontWeight: 600, color: '#FFF', margin: 0, letterSpacing: '-0.8px', lineHeight: 1.15 }}>{props.greeting}</h1>
        <time style={{ fontSize: 12, color: TM, fontVariantNumeric: 'tabular-nums' }}>{props.now.toLocaleTimeString('en-US', TIME_OPTS)}</time>
      </div>
      <p style={{ fontSize: 14, color: TS, margin: 0, lineHeight: 1.5, fontWeight: 400 }}>
        {fmtDay()} &mdash; Your team operations briefing. No numbers, no money &mdash; just people and delivery.
      </p>
      <div style={{ height: 1, background: LINE, marginTop: 20 }} />
    </div>
  );
}

function SectionNumber(props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, marginTop: 48 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: TD, fontVariantNumeric: 'tabular-nums' }}>{props.n}</span>
      <span style={{ flex: 1, height: 1, background: LINE }} />
      <span style={{ fontSize: 11, fontWeight: 500, color: TM }}>{props.label}</span>
    </div>
  );
}

function EmptyCard(props) {
  return (
    <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: TM, lineHeight: 1.6 }}>{props.msg}</div>
    </div>
  );
}

/* ───── TEAM PULSE ───── */

function TeamPulse(props) {
  var p = props.pulse;
  var healthColor = props.healthColor;

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 20, padding: 36, marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: TM, marginBottom: 16, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
          Team Operations
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 56, fontWeight: 500, color: '#FFF', letterSpacing: '-1.5px', lineHeight: 1 }}>{p.active}</span>
          <span style={{ fontSize: 20, fontWeight: 400, color: TS }}>/{p.total} active</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: healthColor }}>{props.teamHealth.label}</span>
          <span style={{ width: 3, height: 3, borderRadius: '50%', background: TD }} />
          <span style={{ fontSize: 12, color: TM }}>{p.activePercent}% engagement</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <PulseStat label="Idle" count={p.idle} color={TS} />
          <PulseStat label="Disengaged" count={p.disengaged} color={p.disengaged > 0 ? AMBER : TS} />
          <PulseStat label="Overloaded" count={p.overloaded} color={p.overloaded > 0 ? RED : TS} />
          <PulseStat label="Unassigned" count={p.unassigned} color={p.unassigned > 0 ? BLUE : TS} />
        </div>
      </div>
    </div>
  );
}

function PulseStat(props) {
  return (
    <div style={{ background: '#08080A', borderRadius: 10, padding: '14px 10px', textAlign: 'center', border: '1px solid ' + LINE }}>
      <div style={{ fontSize: 18, fontWeight: 500, color: '#FFF', fontVariantNumeric: 'tabular-nums' }}>{props.count}</div>
      <div style={{ fontSize: 9, color: props.color || TM, fontWeight: 500, marginTop: 4, letterSpacing: '0.3px' }}>{props.label}</div>
    </div>
  );
}

/* ───── ATTENTION ITEMS ───── */

function AttentionItems(props) {
  var items = props.items;
  if (items.length === 0) {
    return <EmptyCard msg="Everyone is in good shape. No one needs special attention right now." />;
  }
  return (
    <div>
      {items.map(function(item, i) {
        var cfg = item.type === 'overload' ? { color: RED, bg: RED_BG, label: 'OVERLOADED' }
          : item.type === 'disengaged' ? { color: AMBER, bg: AMBER_BG, label: 'DISENGAGED' }
          : { color: BLUE, bg: 'rgba(59, 130, 246, 0.08)', label: 'UNASSIGNED' };
        return (
          <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: 24, marginBottom: 10, transition: '0.2s' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = CARD_HOVER; e.currentTarget.style.borderColor = '#22222E'; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = CARD; e.currentTarget.style.borderColor = BORDER; }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: cfg.color, background: cfg.bg, padding: '4px 10px', borderRadius: 6 }}>{cfg.label}</span>
              <span style={{ fontSize: 12, color: TM }}>{item.userRole}</span>
            </div>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#FFF', marginBottom: 6, lineHeight: 1.4 }}>
              {item.userName}
            </div>
            <div style={{ fontSize: 12, color: TS, lineHeight: 1.6, marginBottom: 10 }}>
              {item.detail}
            </div>
            <div style={{ fontSize: 11, color: ACCENT, fontWeight: 500 }}>
              {'\u2192'} {item.action}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───── BLOCKERS ───── */

function BlockerList(props) {
  return (
    <div>
      {props.items.map(function(item, i) {
        return (
          <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: 20, marginBottom: 10, transition: '0.2s' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = CARD_HOVER; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = CARD; }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <span style={{ fontSize: 14, color: RED, flexShrink: 0, marginTop: 1 }}>&#x26A0;</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#FFF' }}>{item.projectName}</span>
                  <span style={{ fontSize: 10, color: RED, fontWeight: 500 }}>{item.sinceDays}d</span>
                </div>
                <div style={{ fontSize: 12, color: TS, marginBottom: 4 }}>{item.userName}</div>
                <div style={{ fontSize: 12, color: TM, lineHeight: 1.5 }}>{item.blocker}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───── WORK DISTRIBUTION ───── */

function WorkDistribution(props) {
  var dist = props.dist;
  var barTotal = 0;
  (dist.details || []).forEach(function(d) { if (d.projectCount > barTotal) barTotal = d.projectCount; });
  if (barTotal < 1) barTotal = 1;

  return (
    <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 16, padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontSize: 12, color: dist.balanced ? GREEN : AMBER, fontWeight: 500 }}>
          {dist.balanced ? 'Evenly distributed' : 'Imbalanced'}
        </span>
        {dist.mostLoaded && (
          <span style={{ fontSize: 11, color: TM }}>
            Most: {dist.mostLoaded.name} ({dist.mostLoaded.projectCount})
          </span>
        )}
      </div>
      {(dist.details || []).map(function(d, i) {
        var w = Math.round((d.projectCount / barTotal) * 100);
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 11, color: TS, width: 90, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
            <div style={{ flex: 1, height: 6, background: LINE, borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: w + '%', height: '100%', background: d.projectCount >= 4 ? RED : d.projectCount <= 1 ? BLUE : GREEN, borderRadius: 3, opacity: 0.8 }} />
            </div>
            <span style={{ fontSize: 10, color: TM, width: 20, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{d.projectCount}</span>
          </div>
        );
      })}
      <div style={{ marginTop: 12, fontSize: 10, color: TD, display: 'flex', gap: 16 }}>
        <span><span style={{ color: RED }}>&#x25CF;</span> Overloaded (4+)</span>
        <span><span style={{ color: GREEN }}>&#x25CF;</span> Balanced</span>
        <span><span style={{ color: BLUE }}>&#x25CF;</span> Underloaded (1)</span>
      </div>
    </div>
  );
}

/* ───── COACHING TIPS ───── */

function CoachingTips(props) {
  var items = props.items;
  if (items.length === 0) {
    return <EmptyCard msg="No coaching suggestions for today." />;
  }
  return (
    <div>
      {items.map(function(item, i) {
        return (
          <div key={i} style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: 18, marginBottom: 8, display: 'flex', gap: 12, transition: '0.2s' }}
            onMouseEnter={function(e) { e.currentTarget.style.background = CARD_HOVER; }}
            onMouseLeave={function(e) { e.currentTarget.style.background = CARD; }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{'\uD83D\uDCAC'}</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#FFF', marginBottom: 2 }}>{item.userName}</div>
              <div style={{ fontSize: 11, color: TM, marginBottom: 4 }}>{item.role}</div>
              <div style={{ fontSize: 12, color: TS, lineHeight: 1.5 }}>{item.tip}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ───── DELIVERY SIGNALS ───── */

function DeliverySignals(props) {
  var d = props.d;
  var pulse = props.pulse;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      <Metric label="Completed today" value={d.completedLast24h || 0} color={d.completedLast24h > 0 ? GREEN : TM} />
      <Metric label="New blockers" value={d.newBlockers || 0} color={d.newBlockers > 0 ? RED : TM} />
      <Metric label="Stalled members" value={d.stalledMembers || 0} color={d.stalledMembers > 0 ? AMBER : TM} />
    </div>
  );
}

function Metric(props) {
  return (
    <div style={{ background: CARD, border: '1px solid ' + BORDER, borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 10, fontWeight: 500, color: TM, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{props.label}</div>
      <div style={{ fontSize: 24, fontWeight: 500, color: props.color || '#FFF', fontVariantNumeric: 'tabular-nums' }}>{props.value}</div>
    </div>
  );
}

/* ───── FOOTER ───── */

function Footer(props) {
  return (
    <div style={{ marginTop: 64, paddingTop: 20, borderTop: '1px solid ' + LINE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ fontSize: 9, color: TD, letterSpacing: '1px' }}>
        CIOS CEREBRUM &middot; TEAM OPERATIONS
      </div>
      <div style={{ fontSize: 9, color: TD, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums' }}>
        {props.now.toLocaleTimeString('en-US', TIME_OPTS)}
      </div>
    </div>
  );
}
