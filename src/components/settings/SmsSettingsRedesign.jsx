import { Link } from 'react-router-dom';
import SmsSetupWizard from './SmsSetupWizard';

function Field({ label, hint, tooltip, children }) {
  return (
    <div>
      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
        <span>{label}</span>
        {tooltip ? (
          <span
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-200 text-[11px] font-semibold text-slate-500"
            title={tooltip}
          >
            ?
          </span>
        ) : null}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SummaryBadge({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function ToggleCard({ title, description, checked, onChange, compact = false, disabled = false }) {
  return (
    <label className={`flex items-start gap-3 rounded-3xl border border-slate-200 ${compact ? 'bg-slate-50 p-4' : 'bg-white p-5'} ${disabled ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="checkbox-green mt-1 h-4 w-4 rounded border-gray-300 focus:ring-primary-500"
        disabled={disabled}
      />
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </label>
  );
}

function CollapsePanel({ title, subtitle, isOpen, onToggle, action = null, children }) {
  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <button type="button" onClick={onToggle} className="text-left">
          <div className="flex items-center gap-3">
            <span className="text-lg text-slate-400">{isOpen ? '▼' : '▶'}</span>
            <div>
              <h4 className="text-base font-semibold text-slate-900">{title}</h4>
              {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
            </div>
          </div>
        </button>
        {action}
      </div>
      {isOpen ? <div className="mt-5">{children}</div> : null}
    </section>
  );
}

function TemplateCard({ title, preview, onEdit }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
      <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
      <div className="mt-3 rounded-2xl border border-white bg-white px-4 py-3 text-sm text-slate-600">
        {preview || 'No custom template set. Built-in template will be used.'}
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="mt-4 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
      >
        Edit Template
      </button>
    </div>
  );
}

function ExpandableTemplateRow({ title, value, onEdit }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="mt-2 text-sm text-slate-500">{value || 'No custom override set. The default template will be used.'}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
      >
        Edit
      </button>
    </div>
  );
}

function StickyActionBar({ hasUnsavedChanges, saving, onCancel }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {hasUnsavedChanges ? 'Unsaved changes' : 'All changes saved'}
          </p>
          <p className="text-xs text-slate-500">
            {hasUnsavedChanges ? 'Review your updates, then save or cancel.' : 'The current SMS configuration matches the last saved version.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={!hasUnsavedChanges || saving}
            className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !hasUnsavedChanges}
            className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TemplateEditorModal({ editor, value, onClose, onChange }) {
  if (!editor) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/45" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl rounded-[28px] bg-white shadow-2xl">
          <div className="rounded-t-[28px] bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-100">Template Editor</p>
            <h3 className="mt-2 text-xl font-semibold text-white">{editor.label}</h3>
            {editor.description ? <p className="mt-2 text-sm text-emerald-100">{editor.description}</p> : null}
          </div>
          <div className="space-y-4 px-6 py-5">
            <Field label="Template" hint="Leave blank to fall back to the built-in Merxus default.">
              <textarea
                rows="8"
                className="input-field"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={editor.placeholder}
              />
            </Field>
          </div>
          <div className="flex justify-end border-t border-slate-200 bg-slate-50 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:border-slate-300"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SmsSettingsRedesign(props) {
  const {
    copy,
    settings,
    error,
    success,
    activeTab,
    setActiveTab,
    summaryItems,
    expandedPanels,
    togglePanel,
    form,
    updateField,
    updateLink,
    updateTemplate,
    updateSlackField,
    updateSlackEventChannel,
    toggleChannel,
    toggleDigestGroup,
    toggleAlertEscalationGroup,
    slackDiscovery,
    loadingSlackDiscovery,
    syncingSlackUsers,
    provisioningSlackChannels,
    sendingSlackTest,
    slackValidation,
    selectedSlackChannelId,
    setSelectedSlackChannelId,
    handleConnectSlack,
    handleCopySlackRedirectUrl,
    handleRefreshSlack,
    handleDisconnectSlack,
    handleMatchSlackUsers,
    handleCreateSlackCommandCenter,
    handleUseExistingSlackChannel,
    handleProvisionSlackChannels,
    handleSendSlackTest,
    formatSlackSyncTimestamp,
    routing,
    addContact,
    updateContact,
    toggleContactChannel,
    removeContact,
    toggleGroupAssignment,
    openTemplateEditor,
    slackCommandUrl,
    slackInteractionUrl,
    sendingCommandCenterDemo,
    handleSendCommandCenterDemo,
    loadingCommandCenterHistory,
    commandCenterHistory,
    policyPreview,
    testNumber,
    setTestNumber,
    handleTestSend,
    sendingTest,
    hasUnsavedChanges,
    saving,
    handleCancelChanges,
    handleSave,
    saveCurrentSettings,
    syncWizardTeamUsers,
    tenantType,
    templateEditor,
    setTemplateEditor,
    notificationTemplateFields,
    smsNavTabs,
    commandCenterEventOptions,
    formatCommandCenterDate,
    formatCommandCenterStatus,
    checkboxClass,
  } = props;

  const templateValue =
    templateEditor?.type === 'field'
      ? form?.[templateEditor.key] || ''
      : form?.[templateEditor?.type || 'notificationTemplates']?.[templateEditor?.key] || '';

  return (
    <>
      <SmsSetupWizard
        copy={copy}
        form={form}
        routing={routing}
        settings={settings}
        tenantType={tenantType}
        setActiveTab={setActiveTab}
        saveCurrentSettings={saveCurrentSettings}
        syncWizardTeamUsers={syncWizardTeamUsers}
        saving={saving}
        slackDiscovery={slackDiscovery}
        handleConnectSlack={handleConnectSlack}
      />

      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">{copy.title}</h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{copy.subtitle}</p>
          </div>
          <Link to={copy.inboxRoute} className="btn-primary whitespace-nowrap">
            Open SMS Inbox
          </Link>
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-600">SMS Status</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {summaryItems.map((item) => (
              <SummaryBadge key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
        ) : null}
      </section>

      <form onSubmit={handleSave} className="mt-6 pb-28">
        <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-0 xl:h-screen xl:overflow-y-auto">
            <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">SMS Messaging</p>
              <nav className="mt-3 space-y-1">
                {smsNavTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-3 text-left text-sm transition ${
                      activeTab === tab.id
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="font-medium">{tab.label}</span>
                    {activeTab === tab.id ? <span className="text-xs font-semibold uppercase">Open</span> : null}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          <div className="space-y-6">
            {activeTab === 'overview' ? (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  <ToggleCard title="Enable SMS" description="Turns on texting for this tenant number." checked={form.enabled} onChange={(value) => updateField('enabled', value)} />
                  <ToggleCard title="AI SMS Replies" description="Allows automatic responses to inbound texts." checked={form.aiEnabled} onChange={(value) => updateField('aiEnabled', value)} />
                  <ToggleCard title="Caller Confirmations" description="Send concise confirmations to callers when the outcome is actionable." checked={form.callerConfirmationEnabled} onChange={(value) => updateField('callerConfirmationEnabled', value)} />
                  <ToggleCard title="Staff Alerts" description="Notify configured contact groups for meaningful events." checked={form.staffAlertsEnabled} onChange={(value) => updateField('staffAlertsEnabled', value)} />
                </div>

                <CollapsePanel
                  title="Quick Safety Settings"
                  subtitle="Most teams should be able to configure SMS from this tab alone."
                  isOpen={expandedPanels.overview_safety}
                  onToggle={() => togglePanel('overview_safety')}
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Minimum Call Duration (seconds)" tooltip="Calls shorter than this duration will not trigger SMS notifications.">
                      <input type="number" min="0" className="input-field" value={form.minimumCallDurationSeconds} onChange={(event) => updateField('minimumCallDurationSeconds', Number(event.target.value || 0))} />
                    </Field>
                    <Field label="Daily Text Limit" tooltip="Limits automatic outbound texts to the same caller within a 24 hour window.">
                      <input type="number" min="1" className="input-field" value={form.maxAutoTextsPerCallerPer24h} onChange={(event) => updateField('maxAutoTextsPerCallerPer24h', Number(event.target.value || 1))} />
                    </Field>
                  </div>
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <ToggleCard title="Require Meaningful Interaction" description="Suppress alerts for weak or inconclusive calls." checked={form.requireMeaningfulInteraction} onChange={(value) => updateField('requireMeaningfulInteraction', value)} compact />
                    <ToggleCard title="Require Callback Details" description="Only send caller confirmations when Merxus captured usable callback data." checked={form.requireCapturedContact} onChange={(value) => updateField('requireCapturedContact', value)} compact />
                    <ToggleCard title="Suppress Spam / Dead Air" description="Blocks caller and staff notifications for spam-like calls." checked={form.suppressSpam} onChange={(value) => updateField('suppressSpam', value)} compact />
                    <ToggleCard title="Suppress General Questions" description="Prevents routine informational calls from spamming staff." checked={form.suppressGeneralQuestion} onChange={(value) => updateField('suppressGeneralQuestion', value)} compact />
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <label className="flex items-center gap-3">
                      <input type="checkbox" checked={form.quietHoursEnabled} onChange={(event) => updateField('quietHoursEnabled', event.target.checked)} className={checkboxClass} />
                      <span className="text-sm font-medium text-slate-900">Enable quiet hours</span>
                    </label>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <Field label="Quiet Hours Start"><input type="time" className="input-field" value={form.quietHoursStart} onChange={(event) => updateField('quietHoursStart', event.target.value)} disabled={!form.quietHoursEnabled} /></Field>
                      <Field label="Quiet Hours End"><input type="time" className="input-field" value={form.quietHoursEnd} onChange={(event) => updateField('quietHoursEnd', event.target.value)} disabled={!form.quietHoursEnabled} /></Field>
                    </div>
                  </div>
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'caller' ? (
              <>
                <CollapsePanel title="Caller Messaging Templates" subtitle="Use template cards instead of exposing a wall of text boxes." isOpen={expandedPanels.caller_templates} onToggle={() => togglePanel('caller_templates')}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {notificationTemplateFields.filter((field) => field.key.startsWith('caller.')).map((field) => (
                      <TemplateCard
                        key={field.key}
                        title={field.label}
                        preview={form.notificationTemplates[field.key] || '{{tenantName}} ...'}
                        onEdit={() => openTemplateEditor({ key: field.key, label: field.label, type: 'notificationTemplates', placeholder: '{{tenantName}} ...', description: 'Caller-facing confirmation template.' })}
                      />
                    ))}
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Caller Messaging Rules" subtitle="Keep the caller workflow readable and safe." isOpen={expandedPanels.overview_safety} onToggle={() => togglePanel('overview_safety')}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <ToggleCard title="Enable Caller Confirmations" description="Turns caller confirmation templates on for qualified events." checked={form.callerConfirmationEnabled} onChange={(value) => updateField('callerConfirmationEnabled', value)} compact />
                    <ToggleCard title="AI SMS Replies" description="Allows Merxus to reply automatically to inbound texts." checked={form.aiEnabled} onChange={(value) => updateField('aiEnabled', value)} compact />
                    <ToggleCard title="Require Callback Details" description="Only send caller confirmations when callback information is usable." checked={form.requireCapturedContact} onChange={(value) => updateField('requireCapturedContact', value)} compact />
                    <ToggleCard title="Legacy Post-Call Follow-up" description="Keeps the conservative post-call text workflow active." checked={form.postCallFollowupEnabled} onChange={(value) => updateField('postCallFollowupEnabled', value)} compact />
                  </div>
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Caller Channels</p>
                    <div className="mt-3 flex gap-3">
                      {['sms'].map((channel) => (
                        <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                          <input type="checkbox" checked={form.callerChannels.includes(channel)} onChange={() => toggleChannel('callerChannels', channel)} className={checkboxClass} />
                          {channel.toUpperCase()}
                        </label>
                      ))}
                    </div>
                  </div>
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'staff' ? (
              <CollapsePanel title="Staff Alerts" subtitle="Organize alert delivery by the event categories your team already understands." isOpen={expandedPanels.staff_alerts} onToggle={() => togglePanel('staff_alerts')}>
                <div className="grid gap-4 lg:grid-cols-2">
                  {notificationTemplateFields.filter((field) => field.key.startsWith('staff.')).map((field) => (
                    <TemplateCard
                      key={field.key}
                      title={field.label}
                      preview={form.notificationTemplates[field.key] || '{{tenantName}} ...'}
                      onEdit={() => openTemplateEditor({ key: field.key, label: field.label, type: 'notificationTemplates', placeholder: '{{tenantName}} ...', description: 'Staff-facing alert template.' })}
                    />
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <label className="flex items-center gap-3">
                    <input type="checkbox" checked={form.staffAlertsEnabled} onChange={(event) => updateField('staffAlertsEnabled', event.target.checked)} className={checkboxClass} />
                    <span className="text-sm font-medium text-slate-900">Enable staff alerts</span>
                  </label>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                      <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={form.staffChannels.includes(channel)} onChange={() => toggleChannel('staffChannels', channel)} className={checkboxClass} />
                        {channel.toUpperCase()}
                      </label>
                    ))}
                  </div>
                </div>
              </CollapsePanel>
            ) : null}

            {activeTab === 'routing' ? (
              <>
                <CollapsePanel title="Routing Groups" subtitle="Visual routing cards make event ownership easier to understand." isOpen={expandedPanels.routing_groups} onToggle={() => togglePanel('routing_groups')}>
                  <div className="grid gap-4 lg:grid-cols-2">
                    {routing.definitions.map((definition) => (
                      <div key={definition.key} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                        <h4 className="text-sm font-semibold text-slate-900">{definition.label}</h4>
                        <p className="mt-2 text-xs text-slate-500">Handles: {definition.eventTypes.join(', ')}</p>
                        <div className="mt-4 space-y-2">
                          {routing.contacts.length === 0 ? (
                            <p className="text-sm text-slate-500">Add contacts first, then assign them here.</p>
                          ) : routing.contacts.map((contact) => (
                            <label key={`${definition.key}-${contact.id}`} className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={(routing.groups?.[definition.key] || []).includes(contact.id)} onChange={() => toggleGroupAssignment(definition.key, contact.id)} className={checkboxClass} />
                              {contact.name || contact.email || contact.phone || contact.id}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Staff Contact Directory" subtitle="Contacts can receive SMS, email, push, Slack, Teams, and webhook alerts." isOpen={expandedPanels.routing_contacts} onToggle={() => togglePanel('routing_contacts')} action={<button type="button" onClick={addContact} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700">Add Contact</button>}>
                  {routing.contacts.length === 0 ? (
                    <p className="text-sm text-slate-500">No staff contacts configured yet.</p>
                  ) : (
                    <div className="space-y-4">
                      {routing.contacts.map((contact, index) => (
                        <div key={contact.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            <Field label="Name"><input type="text" className="input-field" value={contact.name} onChange={(event) => updateContact(index, 'name', event.target.value)} placeholder="Front Desk" /></Field>
                            <Field label="Role"><input type="text" className="input-field" value={contact.role} onChange={(event) => updateContact(index, 'role', event.target.value)} placeholder="host, manager, support" /></Field>
                            <Field label="Phone"><input type="tel" className="input-field" value={contact.phone} onChange={(event) => updateContact(index, 'phone', event.target.value)} placeholder="+15551234567" /></Field>
                            <Field label="Email"><input type="email" className="input-field" value={contact.email} onChange={(event) => updateContact(index, 'email', event.target.value)} placeholder="owner@example.com" /></Field>
                            <Field label="Webhook URL"><input type="url" className="input-field" value={contact.webhookUrl} onChange={(event) => updateContact(index, 'webhookUrl', event.target.value)} placeholder="https://hooks.slack.com/..." /></Field>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                              <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                                <input type="checkbox" checked={contact.channels.includes(channel)} onChange={() => toggleContactChannel(index, channel)} className={checkboxClass} />
                                {channel.toUpperCase()}
                              </label>
                            ))}
                            <label className="flex items-center gap-2 text-sm text-slate-700">
                              <input type="checkbox" checked={contact.isActive} onChange={(event) => updateContact(index, 'isActive', event.target.checked)} className={checkboxClass} />
                              Active
                            </label>
                            <button type="button" onClick={() => removeContact(index)} className="ml-auto text-sm font-medium text-red-600 hover:text-red-700">Remove</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'templates' ? (
              <>
                <CollapsePanel title="SMS Templates" subtitle="Keep message editors tucked behind expandable rows." isOpen={expandedPanels.templates_replies} onToggle={() => togglePanel('templates_replies')}>
                  <div className="space-y-3">
                    <ExpandableTemplateRow title="HELP Message" value={form.replyHelpMessage} onEdit={() => openTemplateEditor({ key: 'replyHelpMessage', label: 'HELP Message', type: 'field', placeholder: 'Thanks for messaging...', description: 'Sent when users text HELP.' })} />
                    <ExpandableTemplateRow title="STOP Message" value={form.replyStopMessage} onEdit={() => openTemplateEditor({ key: 'replyStopMessage', label: 'STOP Message', type: 'field', placeholder: 'You have been unsubscribed...', description: 'Sent when users text STOP.' })} />
                    <ExpandableTemplateRow title="Post Call Follow-up" value={form.inlineTemplates.post_call_generic} onEdit={() => openTemplateEditor({ key: 'post_call_generic', label: 'Post Call Follow-up', type: 'inlineTemplates', placeholder: 'Thanks for calling {{businessName}}...', description: 'Optional post-call follow-up override.' })} />
                    <ExpandableTemplateRow title="Inbound Auto Reply" value={form.inlineTemplates.inbound_default} onEdit={() => openTemplateEditor({ key: 'inbound_default', label: 'Inbound Auto Reply', type: 'inlineTemplates', placeholder: 'Thanks for messaging {{businessName}}...', description: 'Optional default inbound reply override.' })} />
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Notification Template Overrides" subtitle="Collapsed by default because most users should never need all of these." isOpen={expandedPanels.templates_overrides} onToggle={() => togglePanel('templates_overrides')}>
                  <div className="grid gap-3 lg:grid-cols-2">
                    {notificationTemplateFields.map((field) => (
                      <ExpandableTemplateRow
                        key={field.key}
                        title={field.label}
                        value={form.notificationTemplates[field.key]}
                        onEdit={() => openTemplateEditor({ key: field.key, label: field.label, type: 'notificationTemplates', placeholder: '{{tenantName}} ...', description: 'Optional override. Leave blank to use the built-in template.' })}
                      />
                    ))}
                  </div>
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'integrations' ? (
              <>
                <CollapsePanel title="Slack" subtitle="Connect a workspace, discover channels and users, then match your staff contacts by email." isOpen={expandedPanels.integrations_slack} onToggle={() => togglePanel('integrations_slack')}>
                  <div className="rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Slack Upgrade</p>
                        <h5 className="mt-2 text-lg font-semibold text-slate-900">
                          {form.slack.connected
                            ? `Connected${form.slack.teamName ? ` to ${form.slack.teamName}` : ''}`
                            : 'Boost Your Team Visibility'}
                        </h5>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                          {form.slack.connected
                            ? 'Slack is now connected. Merxus can send alerts, leads, and live AI activity into your team workspace.'
                            : 'Want real-time alerts, leads, and AI activity sent directly to your team? Connect Slack in one step, then choose where alerts should land.'}
                        </p>
                        {!form.slack.connected ? (
                          <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white bg-white px-4 py-3">Instant team notifications</div>
                            <div className="rounded-2xl border border-white bg-white px-4 py-3">Live Command Center</div>
                            <div className="rounded-2xl border border-white bg-white px-4 py-3">Team collaboration</div>
                            <div className="rounded-2xl border border-white bg-white px-4 py-3">Faster response times</div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {!form.slack.connected ? (
                          <button type="button" onClick={handleConnectSlack} className="btn-primary">
                            Connect Slack (Recommended)
                          </button>
                        ) : null}
                        {form.slack.connected ? (
                          <>
                            <button
                              type="button"
                              onClick={handleProvisionSlackChannels}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                              disabled={provisioningSlackChannels}
                            >
                              {provisioningSlackChannels ? 'Applying…' : 'Advanced Channel Plan'}
                            </button>
                            <button
                              type="button"
                              onClick={handleRefreshSlack}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                              disabled={loadingSlackDiscovery}
                            >
                              {loadingSlackDiscovery ? 'Refreshing…' : 'Refresh Workspace'}
                            </button>
                            <button
                              type="button"
                              onClick={handleMatchSlackUsers}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                              disabled={syncingSlackUsers}
                            >
                              {syncingSlackUsers ? 'Matching…' : 'Match Staff by Email'}
                            </button>
                            <button
                              type="button"
                              onClick={handleSendSlackTest}
                              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                              disabled={sendingSlackTest}
                            >
                              {sendingSlackTest ? 'Sending Test…' : 'Send Slack Test'}
                            </button>
                            <button
                              type="button"
                              onClick={handleDisconnectSlack}
                              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 hover:border-rose-300"
                            >
                              Disconnect
                            </button>
                          </>
                        ) : null}
                        {!form.slack.connected ? (
                          <button type="button" onClick={() => setActiveTab('overview')} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-300">
                            Skip for Now
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      <SummaryBadge
                        label="Workspace"
                        value={form.slack.teamName || slackDiscovery?.workspace?.teamName || 'Not connected'}
                      />
                      <SummaryBadge
                        label="Channels Found"
                        value={String(slackDiscovery?.channels?.length || form.slack.discoveredChannelsCount || 0)}
                      />
                      <SummaryBadge
                        label="Users Found"
                        value={String(slackDiscovery?.users?.length || form.slack.discoveredUsersCount || 0)}
                      />
                      <SummaryBadge
                        label="Last Sync"
                        value={formatSlackSyncTimestamp(form.slack.lastSyncAt || slackDiscovery?.installation?.discoverySummary?.lastSyncAt)}
                      />
                    </div>
                  </div>

                  {!form.slack.connected ? (
                    <div className="mt-4 grid gap-4 lg:grid-cols-2">
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">Connect Slack Workspace</p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          Click <span className="font-semibold text-slate-900">Connect Slack</span>. If Slack opens normally, you are done with setup on that side.
                        </p>
                      </div>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-slate-900">If Slack says the redirect URL does not match</p>
                        <ol className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                          <li>1. Open the Slack Developer Portal</li>
                          <li>2. Select the <span className="font-semibold text-slate-900">Merxus AI</span> app</li>
                          <li>3. Open <span className="font-semibold text-slate-900">OAuth &amp; Permissions</span></li>
                          <li>4. Add this Redirect URL</li>
                        </ol>
                        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                          <input
                            type="text"
                            className="input-field"
                            value={slackValidation?.expected_redirect_url || 'https://api.merxus.ai/api/integrations/slack/oauth/callback'}
                            readOnly
                          />
                          <button
                            type="button"
                            onClick={handleCopySlackRedirectUrl}
                            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                          >
                            Copy URL
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleConnectSlack}
                          className="mt-3 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                        >
                          Retry Connection
                        </button>
                      </div>
                    </div>
                  ) : (
                  <div className="mt-4 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Slack Connected Successfully</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Workspace: <span className="font-semibold text-slate-900">{form.slack.teamName || slackDiscovery?.workspace?.teamName || 'Connected workspace'}</span>
                      </p>
                      <div className="mt-4 rounded-2xl border border-white bg-white px-4 py-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">Preview</p>
                        <p className="mt-2">📢 New Lead Captured</p>
                        <p>John Smith — Interested in services</p>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Where should we send your alerts?</p>
                      <div className="mt-3 space-y-2 text-sm text-slate-600">
                        <button
                          type="button"
                          onClick={handleCreateSlackCommandCenter}
                          className="btn-primary"
                          disabled={provisioningSlackChannels}
                        >
                          {provisioningSlackChannels ? 'Setting Up…' : 'Create New #merxus-command-center'}
                        </button>
                        <p className="pt-2">Or use an existing channel:</p>
                        <select
                          className="input-field"
                          value={selectedSlackChannelId}
                          onChange={(event) => setSelectedSlackChannelId(event.target.value)}
                        >
                          <option value="">Select existing channel</option>
                          {(slackDiscovery?.channels || []).map((channel) => (
                            <option key={channel.id} value={channel.id}>
                              #{channel.name}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={handleUseExistingSlackChannel}
                          className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700"
                          disabled={provisioningSlackChannels || !selectedSlackChannelId}
                        >
                          Use Selected Channel
                        </button>
                        <p className="pt-2">Current alert channel: <span className="font-semibold text-slate-900">{form.slack.commandCenterChannel || form.slack.defaultChannel || 'Not configured yet'}</span></p>
                      </div>
                    </div>
                  </div>
                  )}

                  {slackDiscovery?.recommendedChannels?.length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold text-slate-900">Recommended channel plan</p>
                      <p className="mt-1 text-xs text-slate-500">When you apply the plan, Merxus reuses exact name matches first and creates any missing channels automatically.</p>
                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        {slackDiscovery.recommendedChannels.map((item) => (
                          <div key={item.key} className="rounded-2xl border border-white bg-white px-4 py-3">
                            <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                            <p className="mt-1 text-sm text-slate-600">#{item.suggestedName}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 md:grid-cols-2">
                    <ToggleCard title="Enable Slack Integration" description="Turns Slack posting on for this tenant after the workspace is connected." checked={form.slack.enabled} onChange={(value) => updateSlackField('enabled', value)} compact disabled={!form.slack.connected && !form.slack.webhookUrl} />
                    <ToggleCard title="Live AI Command Center" description="Posts incoming-call and structured-event activity into a live Slack feed." checked={form.slack.commandCenterEnabled} onChange={(value) => updateSlackField('commandCenterEnabled', value)} compact disabled={!form.slack.enabled} />
                    <ToggleCard title="Signed Slack Slash Commands" description="Supports /merxus help, activity, alerts, inbox, notifications, and intelligence." checked={form.slack.slashCommandsEnabled} onChange={(value) => updateSlackField('slashCommandsEnabled', value)} compact disabled={!form.slack.enabled} />
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Slack Delivery Mode" hint="Merxus now prefers a connected Slack workspace. The webhook is retained only as a compatibility fallback for existing delivery code.">
                      <input type="text" className="input-field" value={form.slack.connected ? 'Connected workspace' : (form.slack.webhookUrl ? 'Legacy webhook fallback' : 'Not configured')} readOnly />
                    </Field>
                    <Field label="Legacy Webhook Override" hint="Only use this if you intentionally want to keep the older webhook-based posting path or your Slack app did not return an incoming webhook URL.">
                      <input type="url" className="input-field" value={form.slack.webhookUrl} onChange={(event) => updateSlackField('webhookUrl', event.target.value)} placeholder="https://hooks.slack.com/services/..." />
                    </Field>
                    <Field label="Default Slack Channel"><input type="text" className="input-field" value={form.slack.defaultChannel} onChange={(event) => updateSlackField('defaultChannel', event.target.value)} placeholder="#merxus-activity" disabled={!form.slack.enabled} /></Field>
                    <Field label="Command Center Channel"><input type="text" className="input-field" value={form.slack.commandCenterChannel} onChange={(event) => updateSlackField('commandCenterChannel', event.target.value)} placeholder="#merxus-command-center" disabled={!form.slack.enabled || !form.slack.commandCenterEnabled} /></Field>
                  </div>

                  {form.slack.connected && slackDiscovery?.mappings?.length ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-900">Staff email matching</p>
                          <p className="mt-1 text-xs text-slate-500">These matches come from comparing your Team / SMS staff emails to Slack workspace users.</p>
                        </div>
                      </div>
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                          <thead className="bg-white">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium text-slate-600">Merxus Contact</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-600">Email</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-600">Slack User</th>
                              <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {slackDiscovery.mappings.map((item) => (
                              <tr key={`${item.contactId || item.email}-${item.slackUserId || 'missing'}`}>
                                <td className="px-3 py-2 text-slate-900">{item.contactName || item.role || 'Contact'}</td>
                                <td className="px-3 py-2 text-slate-600">{item.email || 'No email'}</td>
                                <td className="px-3 py-2 text-slate-600">{item.slackDisplayName || 'Not found in Slack'}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'matched' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {item.status === 'matched' ? 'Matched' : 'Invite to Slack first'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Per-Event Channel Routing</p>
                    <p className="mt-1 text-xs text-slate-500">Leave blank to use the Command Center channel.</p>
                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      {commandCenterEventOptions.map((item) => (
                        <Field key={item.key} label={item.label}>
                          <input type="text" className="input-field" value={form.slack.eventChannels?.[item.key] || ''} onChange={(event) => updateSlackEventChannel(item.key, event.target.value)} placeholder={form.slack.commandCenterChannel || '#merxus-command-center'} disabled={!form.slack.enabled || !form.slack.commandCenterEnabled} />
                        </Field>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Slack Command URL"><input type="text" className="input-field" value={slackCommandUrl} readOnly /></Field>
                    <Field label="Slack Interactivity URL"><input type="text" className="input-field" value={slackInteractionUrl} readOnly /></Field>
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Command Center" subtitle="Demo tools and recent delivery history." isOpen={expandedPanels.integrations_command_center} onToggle={() => togglePanel('integrations_command_center')} action={<button type="button" onClick={handleSendCommandCenterDemo} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700" disabled={sendingCommandCenterDemo || !form.slack.enabled || !form.slack.commandCenterEnabled || (!form.slack.webhookUrl && !form.slack.connected)}>{sendingCommandCenterDemo ? 'Sending Demo…' : 'Send Demo Event'}</button>}>
                  {loadingCommandCenterHistory ? (
                    <p className="text-sm text-slate-500">Loading Command Center history…</p>
                  ) : commandCenterHistory.length === 0 ? (
                    <p className="text-sm text-slate-500">No Command Center events recorded yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Time</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Event</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Channel</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Status</th>
                            <th className="px-3 py-2 text-left font-medium text-slate-600">Summary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {commandCenterHistory.map((item) => (
                            <tr key={item.id}>
                              <td className="px-3 py-2 text-slate-600">{formatCommandCenterDate(item.createdAt)}</td>
                              <td className="px-3 py-2 text-slate-900">{item.eventType ? item.eventType.replace(/_/g, ' ') : 'Unknown event'}</td>
                              <td className="px-3 py-2 text-slate-600">{item.slackChannel || 'Default'}</td>
                              <td className="px-3 py-2 text-slate-600">{formatCommandCenterStatus(item.status)}</td>
                              <td className="px-3 py-2 text-slate-600">{item.summary || item.subject || item.reason || 'No summary'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'automation' ? (
              <>
                <CollapsePanel title="Retry Policy" subtitle="Retry attempts and delay belong here." isOpen={expandedPanels.automation_retry} onToggle={() => togglePanel('automation_retry')}>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                    <input type="checkbox" checked={form.notificationRetryEnabled} onChange={(event) => updateField('notificationRetryEnabled', event.target.checked)} className={checkboxClass} />
                    Enable automatic retries
                  </label>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Max Retry Attempts"><input type="number" min="1" max="10" className="input-field" value={form.notificationRetryMaxAttempts} onChange={(event) => updateField('notificationRetryMaxAttempts', Number(event.target.value || 1))} disabled={!form.notificationRetryEnabled} /></Field>
                    <Field label="Retry Delay (minutes)"><input type="number" min="1" max="1440" className="input-field" value={form.notificationRetryDelayMinutes} onChange={(event) => updateField('notificationRetryDelayMinutes', Number(event.target.value || 1))} disabled={!form.notificationRetryEnabled} /></Field>
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Escalation Rules" subtitle="Hidden until a team actually needs them." isOpen={expandedPanels.automation_escalation} onToggle={() => togglePanel('automation_escalation')}>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                    <input type="checkbox" checked={form.alertEscalationEnabled} onChange={(event) => updateField('alertEscalationEnabled', event.target.checked)} className={checkboxClass} />
                    Enable escalation rules
                  </label>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="First Escalation Delay (hours)"><input type="number" min="1" max="168" className="input-field" value={form.alertEscalationDelayHours} onChange={(event) => updateField('alertEscalationDelayHours', Number(event.target.value || 1))} disabled={!form.alertEscalationEnabled} /></Field>
                    <Field label="Repeat Every (hours)"><input type="number" min="1" max="168" className="input-field" value={form.alertEscalationRepeatHours} onChange={(event) => updateField('alertEscalationRepeatHours', Number(event.target.value || 1))} disabled={!form.alertEscalationEnabled} /></Field>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Escalation channels</p>
                      <div className="flex flex-wrap gap-3">
                        {['email', 'sms', 'slack', 'teams', 'webhook'].map((channel) => (
                          <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={form.alertEscalationChannels.includes(channel)} onChange={() => toggleChannel('alertEscalationChannels', channel)} className={checkboxClass} disabled={!form.alertEscalationEnabled} />
                            {channel.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Escalation recipient groups</p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {routing.definitions.map((definition) => (
                          <label key={definition.key} className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={(form.alertEscalationRecipientGroupKeys || []).includes(definition.key)} onChange={() => toggleAlertEscalationGroup(definition.key)} className={checkboxClass} disabled={!form.alertEscalationEnabled} />
                            {definition.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Daily Digest" subtitle="Optional summary delivery for staff who want one digest instead of constant alerts." isOpen={expandedPanels.automation_digest} onToggle={() => togglePanel('automation_digest')}>
                  <label className="flex items-center gap-3 text-sm font-medium text-slate-900">
                    <input type="checkbox" checked={form.dailyDigestEnabled} onChange={(event) => updateField('dailyDigestEnabled', event.target.checked)} className={checkboxClass} />
                    Enable daily digest
                  </label>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Field label="Digest Send Time"><input type="time" className="input-field" value={form.dailyDigestTime} onChange={(event) => updateField('dailyDigestTime', event.target.value)} disabled={!form.dailyDigestEnabled} /></Field>
                    <div>
                      <p className="mb-2 text-sm font-medium text-slate-700">Digest channels</p>
                      <div className="flex flex-wrap gap-3">
                        {['sms', 'email', 'push', 'slack', 'teams', 'webhook'].map((channel) => (
                          <label key={channel} className="flex items-center gap-2 text-sm text-slate-700">
                            <input type="checkbox" checked={form.dailyDigestChannels.includes(channel)} onChange={() => toggleChannel('dailyDigestChannels', channel)} className={checkboxClass} disabled={!form.dailyDigestEnabled} />
                            {channel.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 md:grid-cols-2">
                    {routing.definitions.map((definition) => (
                      <label key={definition.key} className="flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={(form.dailyDigestRecipientGroupKeys || []).includes(definition.key)} onChange={() => toggleDigestGroup(definition.key)} className={checkboxClass} disabled={!form.dailyDigestEnabled} />
                        {definition.label}
                      </label>
                    ))}
                  </div>
                </CollapsePanel>
              </>
            ) : null}

            {activeTab === 'advanced' ? (
              <>
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                  <p className="font-semibold">Advanced settings affect system automation.</p>
                  <p className="mt-1">Only modify these if you know why the default behavior is insufficient or Merxus support instructed you to.</p>
                </div>

                <CollapsePanel title="Links and Overrides" subtitle="These are hidden by default to reduce first-view overload." isOpen={expandedPanels.advanced_links} onToggle={() => togglePanel('advanced_links')}>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Business Name"><input type="text" className="input-field" value={form.businessName} onChange={(event) => updateField('businessName', event.target.value)} placeholder="Business name" /></Field>
                    <Field label="Display Name"><input type="text" className="input-field" value={form.displayName} onChange={(event) => updateField('displayName', event.target.value)} placeholder="Merxus AI" /></Field>
                    <Field label="Primary Website Link"><input type="url" className="input-field" value={form.links.primaryLink} onChange={(event) => updateLink('primaryLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Menu Link"><input type="url" className="input-field" value={form.links.menuLink} onChange={(event) => updateLink('menuLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Order Link"><input type="url" className="input-field" value={form.links.orderLink} onChange={(event) => updateLink('orderLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Reservation Link"><input type="url" className="input-field" value={form.links.reservationLink} onChange={(event) => updateLink('reservationLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Listings Link"><input type="url" className="input-field" value={form.links.listingLink} onChange={(event) => updateLink('listingLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Showing Link"><input type="url" className="input-field" value={form.links.showingLink} onChange={(event) => updateLink('showingLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Service Request Link"><input type="url" className="input-field" value={form.links.serviceLink} onChange={(event) => updateLink('serviceLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Appointment Link"><input type="url" className="input-field" value={form.links.appointmentLink} onChange={(event) => updateLink('appointmentLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Quote Link"><input type="url" className="input-field" value={form.links.quoteLink} onChange={(event) => updateLink('quoteLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Payment Link"><input type="url" className="input-field" value={form.links.paymentLink} onChange={(event) => updateLink('paymentLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Application Link"><input type="url" className="input-field" value={form.links.applicationLink} onChange={(event) => updateLink('applicationLink', event.target.value)} placeholder="https://..." /></Field>
                    <Field label="Hours / Location Link"><input type="url" className="input-field" value={form.links.hoursLink} onChange={(event) => updateLink('hoursLink', event.target.value)} placeholder="https://..." /></Field>
                  </div>
                </CollapsePanel>

                <CollapsePanel title="Debug and Test Tools" subtitle="Operational previews and test sends are available without being buried at the bottom." isOpen={expandedPanels.advanced_debug} onToggle={() => togglePanel('advanced_debug')}>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-900">Configuration Summary</p>
                    <p className="mt-2 text-sm text-slate-600">{policyPreview}</p>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Test SMS</h4>
                      <p className="text-xs text-slate-500">Send yourself a quick verification message after updating settings.</p>
                    </div>
                    <Link to={copy.inboxRoute} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-emerald-200 hover:text-emerald-700">Go to Inbox</Link>
                  </div>
                  <div className="mt-4 flex flex-col gap-3 md:flex-row">
                    <input type="tel" className="input-field" value={testNumber} onChange={(event) => setTestNumber(event.target.value)} placeholder="+15551234567" />
                    <button type="button" onClick={handleTestSend} className="btn-primary whitespace-nowrap" disabled={sendingTest}>
                      {sendingTest ? 'Sending…' : 'Send Test SMS'}
                    </button>
                  </div>
                </CollapsePanel>
              </>
            ) : null}
          </div>
        </div>

        <StickyActionBar hasUnsavedChanges={hasUnsavedChanges} saving={saving} onCancel={handleCancelChanges} />
      </form>

      <TemplateEditorModal
        editor={templateEditor}
        value={templateValue}
        onClose={() => setTemplateEditor(null)}
        onChange={(value) => {
          if (!templateEditor) return;
          if (templateEditor.type === 'field') {
            updateField(templateEditor.key, value);
            return;
          }
          updateTemplate(templateEditor.key, value, templateEditor.type);
        }}
      />
    </>
  );
}
