// ---------------------------------------------------------------------------
// NOA Inventory -- Settings Page
// Manage reminders, data exports, and application preferences.
// ---------------------------------------------------------------------------

import { TwoFactorSettings } from '../components/settings/TwoFactorSettings';
import { ReminderSettings } from '../components/settings/ReminderSettings';
import { DataExport } from '../components/settings/DataExport';

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function SettingsPage() {
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-primary-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-primary-500">
          Manage reminders, data exports, and application preferences.
        </p>
      </div>

      {/* Settings sections */}
      <div className="space-y-8">
        <TwoFactorSettings />
        <ReminderSettings />
        <DataExport />
      </div>
    </div>
  );
}
