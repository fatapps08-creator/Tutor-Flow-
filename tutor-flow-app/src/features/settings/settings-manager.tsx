"use client";

import { useEffect, useMemo, useState } from "react";
import type { Settings } from "@/src/types";
import { Icon } from "@/src/components/ui/icon";
import { getTranslations } from "@/src/i18n";
import { getSettings, updateSettings } from "@/src/features/settings/settings-service";
import { useSettings } from "@/src/features/settings/use-settings";

type SettingsValues = Omit<Settings, "id" | "tutorId">;
type SettingsErrors = Partial<Record<keyof SettingsValues, string>>;

const currencyOptions = [
  { value: "MYR", label: "MYR (RM)" },
  { value: "SGD", label: "SGD (S$)" },
  { value: "USD", label: "USD ($)" },
];

const timezoneOptions = [
  "Asia/Kuala_Lumpur",
  "Asia/Singapore",
  "UTC",
  "Europe/London",
  "America/New_York",
];

function settingsValues(settings: Settings): SettingsValues {
  return {
    tutorDisplayName: settings.tutorDisplayName,
    businessName: settings.businessName,
    currency: settings.currency,
    timezone: settings.timezone,
    language: settings.language,
    defaultSessionDurationMinutes: settings.defaultSessionDurationMinutes,
  };
}

export function SettingsManager() {
  const t = getTranslations();
  const settings = useSettings();
  const [draft, setDraft] = useState(() => settingsValues(settings));
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string }>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        getSettings();
        setLoading(false);
      } catch {
        setFeedback({ type: "error", message: t.settingsLoadFailed });
        setLoading(false);
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [t.settingsLoadFailed]);

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(settingsValues(settings)),
    [draft, settings],
  );

  function updateField<K extends keyof SettingsValues>(field: K, value: SettingsValues[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFeedback(undefined);
  }

  function save() {
    const nextErrors: SettingsErrors = {};
    if (!draft.tutorDisplayName.trim()) nextErrors.tutorDisplayName = "required";
    if (!draft.businessName.trim()) nextErrors.businessName = "required";
    if (!draft.currency) nextErrors.currency = "required";
    if (!draft.timezone) nextErrors.timezone = "required";
    if (!Number.isInteger(draft.defaultSessionDurationMinutes)
      || draft.defaultSessionDurationMinutes < 1
      || draft.defaultSessionDurationMinutes > 720) {
      nextErrors.defaultSessionDurationMinutes = "invalid";
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setFeedback({ type: "error", message: t.settingsValidationFailed });
      return;
    }

    try {
      updateSettings(draft);
      setFeedback({ type: "success", message: t.settingsSaved });
    } catch {
      setFeedback({ type: "error", message: t.settingsSaveFailed });
    }
  }

  function reset() {
    setDraft(settingsValues(settings));
    setErrors({});
    setFeedback(undefined);
  }

  function fieldError(field: keyof SettingsErrors, message: string) {
    return errors[field] ? (
      <span className="field-error" id={`settings-${field}-error`}>{message}</span>
    ) : null;
  }

  return (
    <div className="page-container settings-page">
      <header className="page-header settings-page-header">
        <div>
          <p className="page-eyebrow">{t.dashboardOverview}</p>
          <h1>{t.settings}</h1>
          <p className="page-description">{t.settingsPageDescription}</p>
        </div>
      </header>

      {feedback && (
        <div
          className={`student-feedback feedback-${feedback.type}`}
          role={feedback.type === "error" ? "alert" : "status"}
        >
          <Icon name={feedback.type === "success" ? "check" : "clipboard"} />
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(undefined)} aria-label={t.close}>
            <Icon name="close" />
          </button>
        </div>
      )}

      <section className="students-panel settings-panel" aria-label={t.settings} aria-busy={loading}>
        <div className="settings-panel-header">
          <div>
            <h2>{t.workspacePreferences}</h2>
            <p>{t.settingsPanelDescription}</p>
          </div>
        </div>

        {loading ? (
          <div className="students-loading" role="status">
            <span className="student-loading-spinner" aria-hidden="true" />
            <span>{t.loadingSettings}</span>
          </div>
        ) : (
          <form
            className="settings-form"
            onSubmit={(event) => {
              event.preventDefault();
              save();
            }}
            noValidate
          >
            <div className="student-form-grid">
              <label className="student-field">
                <span>{t.tutorDisplayName} <span className="required-mark">*</span></span>
                <input
                  autoComplete="name"
                  value={draft.tutorDisplayName}
                  onChange={(event) => updateField("tutorDisplayName", event.target.value)}
                  aria-invalid={Boolean(errors.tutorDisplayName)}
                  aria-describedby={errors.tutorDisplayName ? "settings-tutorDisplayName-error" : undefined}
                />
                {fieldError("tutorDisplayName", t.tutorDisplayNameRequired)}
              </label>

              <label className="student-field">
                <span>{t.businessName} <span className="required-mark">*</span></span>
                <input
                  autoComplete="organization"
                  value={draft.businessName}
                  onChange={(event) => updateField("businessName", event.target.value)}
                  aria-invalid={Boolean(errors.businessName)}
                  aria-describedby={errors.businessName ? "settings-businessName-error" : undefined}
                />
                {fieldError("businessName", t.businessNameRequired)}
              </label>

              <label className="student-field">
                <span>{t.currency} <span className="required-mark">*</span></span>
                <select
                  value={draft.currency}
                  onChange={(event) => updateField("currency", event.target.value)}
                  aria-invalid={Boolean(errors.currency)}
                  aria-describedby={errors.currency ? "settings-currency-error" : undefined}
                >
                  {currencyOptions.map((currency) => (
                    <option key={currency.value} value={currency.value}>{currency.label}</option>
                  ))}
                </select>
                {fieldError("currency", t.currencyRequired)}
              </label>

              <label className="student-field">
                <span>{t.timezone} <span className="required-mark">*</span></span>
                <select
                  value={draft.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  aria-invalid={Boolean(errors.timezone)}
                  aria-describedby={errors.timezone ? "settings-timezone-error" : undefined}
                >
                  {timezoneOptions.map((timezone) => (
                    <option key={timezone} value={timezone}>{timezone.replaceAll("_", " ")}</option>
                  ))}
                </select>
                {fieldError("timezone", t.timezoneRequired)}
              </label>

              <label className="student-field">
                <span>{t.defaultLanguage} <span className="required-mark">*</span></span>
                <select
                  value={draft.language}
                  onChange={(event) => updateField("language", event.target.value as Settings["language"])}
                >
                  <option value="en">{t.english}</option>
                  <option value="ms">{t.bahasaMelayu}</option>
                </select>
              </label>

              <label className="student-field">
                <span>{t.defaultSessionDuration} <span className="required-mark">*</span></span>
                <div className="settings-duration-input">
                  <input
                    type="number"
                    min="1"
                    max="720"
                    step="1"
                    inputMode="numeric"
                    value={draft.defaultSessionDurationMinutes}
                    onChange={(event) => updateField(
                      "defaultSessionDurationMinutes",
                      event.target.value === "" ? 0 : Number(event.target.value),
                    )}
                    aria-invalid={Boolean(errors.defaultSessionDurationMinutes)}
                    aria-describedby={
                      errors.defaultSessionDurationMinutes
                        ? "settings-defaultSessionDurationMinutes-error"
                        : undefined
                    }
                  />
                  <span>{t.minutes}</span>
                </div>
                {fieldError("defaultSessionDurationMinutes", t.sessionDurationInvalid)}
              </label>
            </div>

            <footer className="settings-form-footer">
              <button
                className="student-button student-button-secondary"
                type="button"
                onClick={reset}
                disabled={!isDirty}
              >
                {t.discardChanges}
              </button>
              <button className="student-button student-button-primary" type="submit" disabled={!isDirty}>
                {t.saveSettings}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
}
