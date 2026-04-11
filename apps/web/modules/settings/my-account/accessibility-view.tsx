"use client";

import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import SectionBottomActions from "@calcom/features/settings/SectionBottomActions";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { userMetadata } from "@calcom/prisma/zod-utils";
import type { RouterOutputs } from "@calcom/trpc/react";
import { trpc } from "@calcom/trpc/react";
import type { TUpdateUserMetadataAllowedKeys } from "@calcom/trpc/server/routers/viewer/me/updateProfile.schema";
import classNames from "@calcom/ui/classNames";
import { Button } from "@calcom/ui/components/button";
import { Checkbox } from "@calcom/ui/components/form/checkbox";
import { Label } from "@calcom/ui/components/form/inputs/Label";
import { showToast } from "@calcom/ui/components/toast";
import type { CheckedState } from "@radix-ui/react-checkbox";
import type { ReactElement } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

type MeUser = RouterOutputs["viewer"]["me"]["get"];

const sectionTitleClass = "font-bold text-base text-emphasis leading-6";
/** One horizontal strip: each pair is [checkbox][label]; pairs sit in one flex row (wraps when needed). */
const inclusiveFieldStripClass = "flex flex-row flex-wrap items-center gap-x-6 gap-y-2";

const CHECKBOX_TRUE = "true";

type AccessibilityFormState = {
  deafClosedCaptions: boolean;
  deafNoteTaking: boolean;
  blind1: boolean;
  blind2: boolean;
  blind3: boolean;
  adhdWebsiteBlocker: boolean;
  adhdTtsReader: boolean;
  adhdFocusPlanner: boolean;
  adhdVisualNotes: boolean;
  dyslexiaTtsTools: boolean;
  dyslexiaFontTools: boolean;
  dyslexiaReadingDictation: boolean;
  dyslexiaBrowserExtension: boolean;
};

const emptyForm: AccessibilityFormState = {
  deafClosedCaptions: false,
  deafNoteTaking: false,
  blind1: false,
  blind2: false,
  blind3: false,
  adhdWebsiteBlocker: false,
  adhdTtsReader: false,
  adhdFocusPlanner: false,
  adhdVisualNotes: false,
  dyslexiaTtsTools: false,
  dyslexiaFontTools: false,
  dyslexiaReadingDictation: false,
  dyslexiaBrowserExtension: false,
};

type FieldRowSpec = {
  formKey: keyof AccessibilityFormState;
  labelKey: string;
  name: string;
};

const DEAF_FIELDS: FieldRowSpec[] = [
  {
    formKey: "deafClosedCaptions",
    labelKey: "inclusive_closed_captions",
    name: "inclusiveDeafClosedCaptionsInput",
  },
  {
    formKey: "deafNoteTaking",
    labelKey: "inclusive_note_taking",
    name: "inclusiveDeafNoteTakingInput",
  },
];

const BLIND_FIELDS: FieldRowSpec[] = [
  { formKey: "blind1", labelKey: "inclusive_blind_input_1", name: "inclusiveBlindInput1" },
  { formKey: "blind2", labelKey: "inclusive_blind_input_2", name: "inclusiveBlindInput2" },
  { formKey: "blind3", labelKey: "inclusive_blind_input_3", name: "inclusiveBlindInput3" },
];

const ADHD_FIELDS: FieldRowSpec[] = [
  {
    formKey: "adhdWebsiteBlocker",
    labelKey: "inclusive_adhd_website_blocker",
    name: "inclusiveAdhdWebsiteBlocker",
  },
  { formKey: "adhdTtsReader", labelKey: "inclusive_adhd_tts_reader", name: "inclusiveAdhdTtsReader" },
  {
    formKey: "adhdFocusPlanner",
    labelKey: "inclusive_adhd_focus_planner",
    name: "inclusiveAdhdFocusPlanner",
  },
  {
    formKey: "adhdVisualNotes",
    labelKey: "inclusive_adhd_visual_notes",
    name: "inclusiveAdhdVisualNotes",
  },
];

const DYSLEXIA_FIELDS: FieldRowSpec[] = [
  {
    formKey: "dyslexiaTtsTools",
    labelKey: "inclusive_dyslexia_tts",
    name: "inclusiveDyslexiaTtsTools",
  },
  {
    formKey: "dyslexiaFontTools",
    labelKey: "inclusive_dyslexia_font",
    name: "inclusiveDyslexiaFontTools",
  },
  {
    formKey: "dyslexiaReadingDictation",
    labelKey: "inclusive_dyslexia_reading",
    name: "inclusiveDyslexiaReadingDictation",
  },
  {
    formKey: "dyslexiaBrowserExtension",
    labelKey: "inclusive_dyslexia_browser_extension",
    name: "inclusiveDyslexiaBrowserExtension",
  },
];

function legacyStoredValueToChecked(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return false;
  }
  const v = value.trim().toLowerCase();
  if (v === "" || v === "false" || v === "0") {
    return false;
  }
  return true;
}

const pickInclusiveMetadataChecked = (
  merged: Record<string, unknown>,
  inclusiveKey: string,
  legacyAccessibilityKey: string
): boolean => {
  const next = merged[inclusiveKey];
  if (next !== undefined && next !== null) {
    return legacyStoredValueToChecked(next);
  }
  const legacy = merged[legacyAccessibilityKey];
  return legacyStoredValueToChecked(legacy);
};

const getFormFromUser = (user: MeUser | undefined): AccessibilityFormState => {
  if (!user?.metadata) {
    return { ...emptyForm };
  }
  let raw: Record<string, unknown> = {};
  if (typeof user.metadata === "object" && user.metadata !== null && !Array.isArray(user.metadata)) {
    raw = user.metadata as Record<string, unknown>;
  }
  const parsed = userMetadata.safeParse(user.metadata);
  let m: Record<string, unknown> = {};
  if (parsed.success && parsed.data) {
    m = parsed.data as Record<string, unknown>;
  }
  const merged: Record<string, unknown> = { ...raw, ...m };

  return {
    deafClosedCaptions: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDeafClosedCaptionsInput",
      "accessibilityDeafClosedCaptionsInput"
    ),
    deafNoteTaking: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDeafNoteTakingInput",
      "accessibilityDeafNoteTakingInput"
    ),
    blind1: pickInclusiveMetadataChecked(merged, "inclusiveBlindInput1", "accessibilityBlindInput1"),
    blind2: pickInclusiveMetadataChecked(merged, "inclusiveBlindInput2", "accessibilityBlindInput2"),
    blind3: pickInclusiveMetadataChecked(merged, "inclusiveBlindInput3", "accessibilityBlindInput3"),
    adhdWebsiteBlocker: pickInclusiveMetadataChecked(
      merged,
      "inclusiveAdhdWebsiteBlocker",
      "accessibilityAdhdWebsiteBlocker"
    ),
    adhdTtsReader: pickInclusiveMetadataChecked(
      merged,
      "inclusiveAdhdTtsReader",
      "accessibilityAdhdTtsReader"
    ),
    adhdFocusPlanner: pickInclusiveMetadataChecked(
      merged,
      "inclusiveAdhdFocusPlanner",
      "accessibilityAdhdFocusPlanner"
    ),
    adhdVisualNotes: pickInclusiveMetadataChecked(
      merged,
      "inclusiveAdhdVisualNotes",
      "accessibilityAdhdVisualNotes"
    ),
    dyslexiaTtsTools: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDyslexiaTtsTools",
      "accessibilityDyslexiaTtsTools"
    ),
    dyslexiaFontTools: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDyslexiaFontTools",
      "accessibilityDyslexiaFontTools"
    ),
    dyslexiaReadingDictation: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDyslexiaReadingDictation",
      "accessibilityDyslexiaReadingDictation"
    ),
    dyslexiaBrowserExtension: pickInclusiveMetadataChecked(
      merged,
      "inclusiveDyslexiaBrowserExtension",
      "accessibilityDyslexiaBrowserExtension"
    ),
  };
};

function checkedToMetadataString(checked: boolean): string {
  if (checked) {
    return CHECKBOX_TRUE;
  }
  return "";
}

function buildMetadataFromForm(form: AccessibilityFormState): TUpdateUserMetadataAllowedKeys {
  return {
    inclusiveDeafClosedCaptionsInput: checkedToMetadataString(form.deafClosedCaptions),
    inclusiveDeafNoteTakingInput: checkedToMetadataString(form.deafNoteTaking),
    inclusiveBlindInput1: checkedToMetadataString(form.blind1),
    inclusiveBlindInput2: checkedToMetadataString(form.blind2),
    inclusiveBlindInput3: checkedToMetadataString(form.blind3),
    inclusiveAdhdWebsiteBlocker: checkedToMetadataString(form.adhdWebsiteBlocker),
    inclusiveAdhdTtsReader: checkedToMetadataString(form.adhdTtsReader),
    inclusiveAdhdFocusPlanner: checkedToMetadataString(form.adhdFocusPlanner),
    inclusiveAdhdVisualNotes: checkedToMetadataString(form.adhdVisualNotes),
    inclusiveDyslexiaTtsTools: checkedToMetadataString(form.dyslexiaTtsTools),
    inclusiveDyslexiaFontTools: checkedToMetadataString(form.dyslexiaFontTools),
    inclusiveDyslexiaReadingDictation: checkedToMetadataString(form.dyslexiaReadingDictation),
    inclusiveDyslexiaBrowserExtension: checkedToMetadataString(form.dyslexiaBrowserExtension),
  };
}

type CheckboxRowProps = {
  fields: FieldRowSpec[];
  form: AccessibilityFormState;
  onCheckedChange: (key: keyof AccessibilityFormState, checked: boolean) => void;
  isDisabled: boolean;
  t: (key: string) => string;
};

function InclusiveCheckboxRow({
  fields,
  form,
  onCheckedChange,
  isDisabled,
  t,
}: CheckboxRowProps): ReactElement {
  const baseId = useId();
  return (
    <div className={inclusiveFieldStripClass}>
      {fields.map((f) => {
        const id = `${baseId}-${f.name}`;
        return (
          <div key={f.name} className="flex min-w-0 flex-row items-center gap-2">
            <Checkbox
              id={id}
              checked={form[f.formKey]}
              onCheckedChange={(state: CheckedState) => onCheckedChange(f.formKey, state === true)}
              disabled={isDisabled}
            />
            <Label
              htmlFor={id}
              className="mb-0 shrink-0 cursor-pointer whitespace-nowrap font-medium text-emphasis text-sm leading-none">
              {t(f.labelKey)}
            </Label>
          </div>
        );
      })}
    </div>
  );
}

const AccessibilityView = (): ReactElement => {
  const { t } = useLocale();
  const utils = trpc.useUtils();

  const { data: user, isPending: isUserLoading } = trpc.viewer.me.get.useQuery();

  const saved = useMemo(() => getFormFromUser(user), [user]);

  const [form, setForm] = useState<AccessibilityFormState>(emptyForm);

  useEffect(() => {
    setForm(saved);
  }, [saved]);

  const updateProfile = trpc.viewer.me.updateProfile.useMutation({
    onSuccess: async () => {
      await utils.viewer.me.invalidate();
      showToast(t("settings_updated_successfully"), "success");
    },
    onError: () => {
      showToast(t("error_updating_settings"), "error");
    },
  });

  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);

  const handleCancel = (): void => {
    setForm(saved);
  };

  const handleSave = (): void => {
    if (!isDirty) return;
    updateProfile.mutate({ metadata: buildMetadataFromForm(form) });
  };

  const onInclusiveCheckedChange = useCallback((key: keyof AccessibilityFormState, checked: boolean) => {
    setForm((prev) => ({ ...prev, [key]: checked }));
  }, []);

  const disabled = isUserLoading || updateProfile.isPending;

  return (
    <SettingsHeader
      title={t("inclusive")}
      description={t("inclusive_description")}
      borderInShellHeader={true}
      headerClassName="bg-subtle">
      <div
        className={classNames(
          "rounded-b-xl border-subtle border-x border-b",
          isUserLoading && "pointer-events-none opacity-60"
        )}>
        <section aria-labelledby="inclusive-deaf-heading" className="px-6 py-6">
          <h2 id="inclusive-deaf-heading" className={classNames(sectionTitleClass, "mb-4")}>
            {t("inclusive_deaf")}
          </h2>
          <InclusiveCheckboxRow
            fields={DEAF_FIELDS}
            form={form}
            onCheckedChange={onInclusiveCheckedChange}
            isDisabled={disabled}
            t={t}
          />
        </section>

        <div className="border-subtle border-t" role="presentation" />

        <section aria-labelledby="inclusive-blind-heading" className="px-6 py-6">
          <h2 id="inclusive-blind-heading" className={classNames(sectionTitleClass, "mb-4")}>
            {t("inclusive_blind")}
          </h2>
          <InclusiveCheckboxRow
            fields={BLIND_FIELDS}
            form={form}
            onCheckedChange={onInclusiveCheckedChange}
            isDisabled={disabled}
            t={t}
          />
        </section>

        <div className="border-subtle border-t" role="presentation" />

        <section aria-labelledby="inclusive-adhd-heading" className="px-6 py-6">
          <h2 id="inclusive-adhd-heading" className={classNames(sectionTitleClass, "mb-4")}>
            {t("inclusive_adhd")}
          </h2>
          <InclusiveCheckboxRow
            fields={ADHD_FIELDS}
            form={form}
            onCheckedChange={onInclusiveCheckedChange}
            isDisabled={disabled}
            t={t}
          />
        </section>

        <div className="border-subtle border-t" role="presentation" />

        <section aria-labelledby="inclusive-dyslexia-heading" className="px-6 py-6">
          <h2 id="inclusive-dyslexia-heading" className={classNames(sectionTitleClass, "mb-4")}>
            {t("inclusive_dyslexia")}
          </h2>
          <InclusiveCheckboxRow
            fields={DYSLEXIA_FIELDS}
            form={form}
            onCheckedChange={onInclusiveCheckedChange}
            isDisabled={disabled}
            t={t}
          />
        </section>

        <SectionBottomActions align="start" className="gap-2 rounded-b-xl">
          <Button color="minimal" type="button" disabled={!isDirty || disabled} onClick={handleCancel}>
            {t("cancel")}
          </Button>
          <Button
            color="primary"
            type="button"
            loading={updateProfile.isPending}
            disabled={!isDirty || isUserLoading}
            onClick={handleSave}>
            {t("save")}
          </Button>
        </SectionBottomActions>
      </div>
    </SettingsHeader>
  );
};

export default AccessibilityView;
