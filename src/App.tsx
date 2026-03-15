import './App.css'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '@/hooks/useWorkspaceStore'
import { AgentList } from '@/components/shared'
import { DashboardView } from '@/views/DashboardView'
import { TimelineView } from '@/views/TimelineView'
import { AlertsView } from '@/views/AlertsView'
import { GovernanceView } from '@/views/GovernanceView'
import { SettingsView } from '@/views/SettingsView'
import { formatTimestamp, getInsight } from '@/engine'
import { viewMeta } from '@/constants/viewMeta'
import { severityLabels, severityRank } from '@/constants/labels'
import { connectedSurfaces } from '@/constants/surfaces'
import { getEffectivePolicyRolloutMode } from '@/lib/policyHelpers'
import { formatCaseAge } from '@/lib/formatCaseAge'
import { getReviewState } from '@/lib/caseHelpers'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/auth'
import { LoginPage } from '@/components/LoginPage'
import { LandingPage } from '@/views/LandingPage'
import { FeaturesPage } from '@/views/FeaturesPage'
import { PricingPage } from '@/views/PricingPage'
import { setApiTokenProvider } from '@/services/apiClient'
import { LiveEventFeed } from '@/components/LiveEventFeed'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import type { ViewId } from '@/types'

function LandingRoute() {
  const navigate = useNavigate()

  return (
    <LandingPage
      onGetStarted={() => navigate('/app')}
    />
  )
}

function AppRoute() {
  const { isAuthenticated, isDemoMode, isLoading: authLoading, user, logout, getAccessToken } = useAuth()

  useEffect(() => {
    if (isAuthenticated) {
      setApiTokenProvider(getAccessToken)
    }
  }, [isAuthenticated, getAccessToken])

  if (authLoading) {
    return (
      <div className="login-page">
        <div className="login-card" style={{ textAlign: 'center' }}>
          <span className="brand-kicker">Copilot Flight Recorder</span>
          <p style={{ color: '#5d6e88' }}>Authenticating...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  return <AuthenticatedApp userName={user?.name ?? 'User'} userEmail={user?.email ?? ''} onLogout={logout} isDemoMode={isDemoMode} />
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/features" element={<FeaturesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/app" element={<AppRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AuthenticatedApp({ userName, userEmail, onLogout, isDemoMode }: { userName: string; userEmail: string; onLogout: () => void; isDemoMode: boolean }) {
  const navigate = useNavigate()
  const {
    workspace,
    activeView,
    searchQuery,
    selectedAlertId,
    caseActivity,
    policyRolloutModes,
    focusedPolicyId,
    getSelectedAgent,
    getLiveAlerts,
    getSearchResults,
    setSearchQuery,
    setSelectedAgentId,
    setSelectedAlertId,
    setFocusedPolicyId,
    updateAlertStatus,
    setPolicyRollout,
    openView,
    openSearchResult,
    handleSelectAgent,
  } = useWorkspaceStore()

  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const toggleHelp = useCallback(() => setShowShortcutsHelp((prev) => !prev), [])
  useKeyboardShortcuts({ onToggleHelp: toggleHelp })

  const selectedAgent = getSelectedAgent()
  const liveAlerts = getLiveAlerts()
  const searchResults = getSearchResults()

  const openAlertCount = liveAlerts.filter((alert) => alert.status === 'open').length
  const criticalOpenCount = liveAlerts.filter((alert) => alert.status === 'open' && alert.severity === 'critical').length
  const enabledPolicyCount = workspace.policies.filter((policy) => getEffectivePolicyRolloutMode(policy, liveAlerts, policyRolloutModes) !== 'draft').length
  const connectedSurfaceCount = connectedSurfaces.filter((surface) => surface.status === 'connected').length
  const currentViewMeta = viewMeta[activeView]
  const latestWorkspaceEvent = [...workspace.events].sort((left, right) => right.timestamp.localeCompare(left.timestamp))[0]
  const selectedAgentAlerts = liveAlerts.filter((alert) => alert.agentId === selectedAgent.id)
  const linkedIncident =
    selectedAgentAlerts.find((alert) => alert.id === selectedAlertId) ??
    [...selectedAgentAlerts].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0]
  const linkedPolicy = linkedIncident ? workspace.policies.find((policy) => policy.id === linkedIncident.policyId) : null
  const linkedCaseActivity = linkedIncident ? caseActivity[linkedIncident.id] ?? [] : []
  const effectivePolicyId = focusedPolicyId ?? linkedPolicy?.id

  const workspaceRibbon = [
    { label: 'Incident posture', value: `${openAlertCount} open`, helper: criticalOpenCount > 0 ? `${criticalOpenCount} critical` : 'No critical cases' },
    { label: 'Control coverage', value: `${enabledPolicyCount} active policies`, helper: `${workspace.policies.length} total rules in model` },
    {
      label: 'Connected surfaces',
      value: `${connectedSurfaceCount}/${connectedSurfaces.length} linked`,
      helper: connectedSurfaces.filter((surface) => surface.status !== 'connected').map((surface) => surface.name).join(' / ') || 'Full coverage in current sample',
    },
    { label: 'Selected asset', value: selectedAgent.name, helper: `${selectedAgent.owner} / Trust ${getInsight(workspace, selectedAgent.id)?.trustScore ?? '--'}` },
  ]
  const tenantSummary = [
    { label: 'Open incidents', value: openAlertCount },
    { label: 'Live policies', value: enabledPolicyCount },
    { label: 'Connected surfaces', value: `${connectedSurfaceCount}/${connectedSurfaces.length}` },
    { label: 'Average trust', value: useWorkspaceStore.getState().metrics.averageTrust },
  ]
  const caseReviewState = getReviewState(linkedIncident)
  const caseResponseWindow =
    linkedIncident?.severity === 'critical'
      ? '15 min response'
      : linkedIncident?.severity === 'high'
        ? '1 hour review'
        : 'Working cycle'
  const caseDecision =
    linkedIncident?.status === 'resolved'
      ? 'Document the containment path and keep the control in place.'
      : linkedIncident?.status === 'acknowledged'
        ? 'Finish owner review, confirm the decision, and decide whether the policy needs tuning.'
        : linkedIncident
          ? linkedIncident.recommendedAction
          : 'No active case is steering the workspace right now.'
  const caseRibbonCards = linkedIncident
    ? [
        { label: 'Review state', value: caseReviewState.label, detail: caseReviewState.detail },
        { label: 'Policy boundary', value: linkedPolicy?.name ?? 'Derived signal', detail: linkedPolicy ? `${linkedPolicy.scope} / ${linkedPolicy.action}` : 'No direct policy mapping is attached to this case.' },
        { label: 'Decision window', value: caseResponseWindow, detail: caseDecision },
      ]
    : []
  const investigationRail = [
    { label: 'Asset', title: selectedAgent.name, detail: `${selectedAgent.owner} / ${selectedAgent.environment}`, actionLabel: 'Open incident view', targetView: 'timeline' as ViewId },
    {
      label: 'Incident',
      title: linkedIncident?.title ?? 'No active incident',
      detail: linkedIncident ? `${severityLabels[linkedIncident.severity]} severity / ${linkedIncident.status}` : 'No linked incident on the selected asset',
      actionLabel: 'Open alert center',
      targetView: 'alerts' as ViewId,
    },
    {
      label: 'Policy',
      title: linkedPolicy?.name ?? 'No linked policy',
      detail: linkedPolicy ? `${linkedPolicy.scope} / ${linkedPolicy.action}` : 'No policy mapped from the current incident',
      actionLabel: 'Open governance',
      targetView: 'governance' as ViewId,
    },
  ]
  const topbarActions =
    activeView === 'dashboard'
      ? [
          { label: 'Review queue', kind: 'primary' as const, onClick: () => openView('alerts') },
          { label: 'Open policies', kind: 'secondary' as const, onClick: () => openView('governance') },
          { label: 'Inspect incident', kind: 'secondary' as const, onClick: () => openView(linkedIncident ? 'timeline' : 'dashboard') },
        ]
      : activeView === 'timeline'
        ? [
            { label: 'Back to queue', kind: 'primary' as const, onClick: () => openView('alerts') },
            { label: 'Open policy', kind: 'secondary' as const, onClick: () => openView('governance') },
            { label: 'Overview', kind: 'secondary' as const, onClick: () => openView('dashboard') },
          ]
        : activeView === 'alerts'
          ? [
              { label: 'Open incident', kind: 'primary' as const, onClick: () => openView('timeline') },
              { label: 'Open policy', kind: 'secondary' as const, onClick: () => openView('governance') },
              { label: 'Overview', kind: 'secondary' as const, onClick: () => openView('dashboard') },
            ]
          : [
              { label: 'Review queue', kind: 'primary' as const, onClick: () => openView('alerts') },
              { label: 'Open incident', kind: 'secondary' as const, onClick: () => openView('timeline') },
              { label: 'Overview', kind: 'secondary' as const, onClick: () => openView('dashboard') },
            ]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <button type="button" className="brand-home-link" onClick={() => navigate('/')}>
            <span className="brand-kicker">Copilot Flight Recorder</span>
          </button>
          <h1>Admin center for Copilot agent operations.</h1>
          <p>
            Review incidents, rollout controls, and policy pressure across monitored agents and connected surfaces.
          </p>
        </div>

        {isDemoMode && (
          <div className="demo-banner">
            <span className="demo-banner-badge">Demo</span>
            <p>You are viewing sample data. <button type="button" className="demo-banner-link" onClick={() => navigate('/')}>Connect your tenant</button></p>
          </div>
        )}

        <div className="tenant-card">
          <span className="eyebrow">Sample tenant</span>
          <strong>Northwind Global</strong>
          <p>Governed rollout with review, publishing controls, and tenant-level visibility.</p>
          <div className="tenant-summary-grid">
            {tenantSummary.map((item) => (
              <div key={item.label} className="tenant-summary-item">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <nav className="nav-list" aria-label="Primary">
          {([
            ['dashboard', 'Overview'],
            ['timeline', 'Incident'],
            ['alerts', 'Queue'],
            ['governance', 'Policies'],
            ['settings', 'Settings'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`nav-button ${activeView === value ? 'active' : ''} ${value === 'alerts' && openAlertCount > 0 ? 'alerting' : ''}`}
              onClick={() => openView(value)}
            >
              <span>{label}</span>
              {value === 'alerts' && openAlertCount > 0 ? (
                <span className="nav-alert-badge" aria-label={`${openAlertCount} open alerts`}>
                  {openAlertCount}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <AgentList selectedAgentId={selectedAgent.id} onSelect={handleSelectAgent} searchQuery={searchQuery} alerts={liveAlerts} />

        <div className="user-profile">
          <div className="user-profile-info">
            <span className="user-avatar">{userName.charAt(0).toUpperCase()}</span>
            <div>
              <strong>{userName}</strong>
              <span>{userEmail}</span>
            </div>
          </div>
          <button type="button" className="user-logout-button" onClick={onLogout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">{currentViewMeta.eyebrow}</p>
            <h2>{currentViewMeta.title}</h2>
            <p className="topbar-copy">{currentViewMeta.description}</p>
          </div>
          <div className="topbar-tools">
            <label className="search-shell" htmlFor="workspace-search">
              <span className="search-label">Search</span>
              <input id="workspace-search" type="text" placeholder="Search assets, incidents, or policies" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
            </label>
            <div className="topbar-meta">
              <span className="context-chip">Northwind Global</span>
              <span className="context-chip">Updated {latestWorkspaceEvent ? formatTimestamp(latestWorkspaceEvent.timestamp) : 'now'}</span>
              <span className="context-chip">{selectedAgent.name}</span>
              <span className="trust-chip large">Trust {getInsight(workspace, selectedAgent.id)?.trustScore ?? '--'}</span>
              <span className={`pill ${selectedAgent.status}`}>{selectedAgent.status}</span>
            </div>
            <div className="command-bar" aria-label="Workspace actions">
              {topbarActions.map((action) => (
                <button key={action.label} type="button" className={`command-bar-button ${action.kind === 'primary' ? 'primary' : ''}`} onClick={action.onClick}>
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {searchResults.length > 0 ? (
          <section className="search-results-panel" aria-label="Workspace search results">
            <div className="panel-header compact">
              <div>
                <p className="eyebrow">Search results</p>
                <h2>Jump directly to the right workspace object</h2>
              </div>
              <span className="subtle">{searchResults.length} result{searchResults.length > 1 ? 's' : ''} for {searchQuery.trim()}</span>
            </div>
            <div className="search-results-grid">
              {searchResults.map((result) => (
                <button key={`${result.kind}-${result.id}`} type="button" className="search-result-card" onClick={() => openSearchResult(result)}>
                  <div className="search-result-top">
                    <span className="dossier-label">{result.subtitle}</span>
                    <span className="context-chip small-chip">{result.kind}</span>
                  </div>
                  <strong>{result.title}</strong>
                  <p>{result.detail}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        <section className="workspace-ribbon" aria-label="Workspace summary">
          {workspaceRibbon.map((item) => (
            <article key={item.label} className="workspace-ribbon-card">
              <span className="dossier-label">{item.label}</span>
              <strong>{item.value}</strong>
              <p>{item.helper}</p>
            </article>
          ))}
        </section>

        <section className="investigation-rail" aria-label="Linked investigation">
          {investigationRail.map((item) => (
            <article key={item.label} className={`investigation-node ${activeView === item.targetView ? 'active' : ''}`}>
              <span className="dossier-label">{item.label}</span>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
              <button type="button" className={`investigation-link ${activeView === item.targetView ? 'active' : ''}`} onClick={() => openView(item.targetView)}>
                {item.actionLabel}
              </button>
            </article>
          ))}
        </section>

        {linkedIncident ? (
          <section className="case-ribbon" aria-label="Active case context">
            <div className="case-ribbon-header">
              <div>
                <span className="eyebrow">Active case</span>
                <h3>{linkedIncident.title}</h3>
                <p>{linkedIncident.description}</p>
              </div>
              <div className="case-ribbon-meta">
                <span className={`pill ${linkedIncident.severity}`}>{severityLabels[linkedIncident.severity]}</span>
                <span className={`pill ${caseReviewState.tone}`}>{caseReviewState.label}</span>
                <span className="context-chip">Age {formatCaseAge(linkedIncident.createdAt)}</span>
                <span className="context-chip">Owner {selectedAgent.owner}</span>
              </div>
            </div>
            <div className="case-ribbon-grid">
              {caseRibbonCards.map((item) => (
                <div key={item.label} className="case-ribbon-card">
                  <span className="dossier-label">{item.label}</span>
                  <strong>{item.value}</strong>
                  <p>{item.detail}</p>
                </div>
              ))}
            </div>
            <div className="case-ribbon-actions">
              <button type="button" className="action-button primary" onClick={() => openView('timeline')}>Open case</button>
              <button type="button" className="action-button subtle" onClick={() => openView('governance')}>Open policy</button>
              <button type="button" className="action-button" onClick={() => updateAlertStatus(linkedIncident.id, linkedIncident.status === 'acknowledged' ? 'open' : 'acknowledged')}>
                {linkedIncident.status === 'acknowledged' ? 'Return to open' : 'Acknowledge'}
              </button>
              <button type="button" className="action-button subtle" onClick={() => updateAlertStatus(linkedIncident.id, linkedIncident.status === 'resolved' ? 'open' : 'resolved')}>
                {linkedIncident.status === 'resolved' ? 'Reopen' : 'Resolve'}
              </button>
            </div>
            {linkedCaseActivity[0] ? (
              <div className="case-ribbon-latest">
                <span className="dossier-label">Latest decision</span>
                <strong>{linkedCaseActivity[0].action}</strong>
                <p>{linkedCaseActivity[0].detail}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {activeView === 'dashboard' ? (
          <DashboardView selectedAgent={selectedAgent} alerts={liveAlerts} rolloutModes={policyRolloutModes}
            onOpenIncident={(alertId) => { if (alertId) { setSelectedAlertId(alertId) } openView('alerts') }}
            onSelectAgent={handleSelectAgent} onOpenPolicies={() => openView('governance')} />
        ) : null}
        {activeView === 'timeline' ? (
          <TimelineView selectedAgent={selectedAgent} agentAlerts={selectedAgentAlerts} highlightedAlert={linkedIncident}
            caseActivity={linkedCaseActivity} onOpenAlertCenter={() => openView('alerts')} onOpenGovernance={() => openView('governance')} />
        ) : null}
        {activeView === 'alerts' ? (
          <AlertsView alerts={liveAlerts} selectedAlertId={selectedAlertId} caseActivity={caseActivity}
            onSelectAlert={setSelectedAlertId} onUpdateAlertStatus={updateAlertStatus} onOpenIncident={() => openView('timeline')}
            onOpenGovernance={() => openView('governance')} onSelectAgent={handleSelectAgent} />
        ) : null}
        {activeView === 'governance' ? (
          <GovernanceView highlightedPolicyId={effectivePolicyId} alerts={liveAlerts} caseActivity={caseActivity}
            rolloutModes={policyRolloutModes} onSelectAgent={handleSelectAgent}
            onOpenIncident={(alertId) => { if (alertId) { const a = liveAlerts.find((i) => i.id === alertId); if (a) setSelectedAgentId(a.agentId); setSelectedAlertId(alertId) } openView('timeline') }}
            onOpenQueue={(alertId) => { if (alertId) { const a = liveAlerts.find((i) => i.id === alertId); if (a) setSelectedAgentId(a.agentId); setSelectedAlertId(alertId) } openView('alerts') }}
            onSetPolicyRollout={(policyId, mode) => setPolicyRollout(policyId, mode)} onFocusPolicy={setFocusedPolicyId} />
        ) : null}
        {activeView === 'settings' ? <SettingsView /> : null}
      </main>

      <LiveEventFeed />
      {showShortcutsHelp && <ShortcutsHelp onClose={() => setShowShortcutsHelp(false)} />}
    </div>
  )
}

export default App
