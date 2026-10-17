"use client";

import { useId, useState } from "react";
import type { FormState } from "@/app/actions/auth";
import { CONTENT_KINDS, DRIP_TYPES, LESSON_KINDS } from "@/lib/validation";
import { ActionForm, Field, FormError, SavedNote, SubmitButton, useFormValues } from "./form";
import { Callout } from "./ui/callout";

export const KIND_LABEL: Record<string, string> = { video: "Video", pdf: "PDF", text: "Text", link: "Link", quiz: "Quiz" };
const DRIP_LABEL: Record<string, string> = {
  none: "Available immediately",
  days_after_enroll: "N days after the learner joins",
  on_date: "On a fixed date",
  after_previous: "After the previous lesson is completed",
};

export type LessonDefaults = {
  title: string; kind: string; url: string; body: string; requiredForCompletion: boolean;
  dripType: string; dripDays: number | null; dripDate: string; // dripDate: yyyy-mm-dd (IST)
};

function Fields({ lesson, sections }: { lesson?: LessonDefaults; sections?: Array<{ id: string; title: string }> }) {
  const submitted = useFormValues();
  const typeLabelId = useId();
  const [pickedKind, setPickedKind] = useState<string | null>(null);
  const [pickedDrip, setPickedDrip] = useState<string | null>(null);
  // Derived from submitted values, not mirrored: React resets the form DOM after every action.
  const kind = pickedKind ?? submitted?.kind ?? lesson?.kind ?? "video";
  const drip = pickedDrip ?? submitted?.dripType ?? lesson?.dripType ?? "none";
  const isQuizEdit = lesson?.kind === "quiz";
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
        <Field name="title" label="Title" defaultValue={lesson?.title} placeholder="Lesson 1: Getting started" required />
        {isQuizEdit ? (
          <div>
            {/* A quiz cannot become another kind, so Type is a static row. The hidden input keeps `kind=quiz` in the post. */}
            <span id={typeLabelId} className="label">Type</span>
            <div role="group" aria-labelledby={typeLabelId} className="flex items-center rounded-control border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-muted pointer-coarse:min-h-11">Quiz</div>
            <input type="hidden" name="kind" value="quiz" />
          </div>
        ) : (
          <Field name="kind" label="Type" as="select" defaultValue={kind} onChange={setPickedKind}>
            {(lesson ? CONTENT_KINDS : LESSON_KINDS).map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
          </Field>
        )}
      </div>

      {sections && (
        <Field name="sectionId" label="Section" as="select" defaultValue="">
          <option value="">Lessons (no section)</option>
          {sections.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </Field>
      )}

      {kind === "text" ? (
        <Field name="body" label="Text" as="textarea" rows={5} defaultValue={lesson?.body} />
      ) : kind === "quiz" ? (
        <Callout>{isQuizEdit ? "Use Edit questions to change this quiz's questions." : "Add the questions after creating the lesson."}</Callout>
      ) : (
        <Field name="url" label={kind === "video" ? "Video link" : kind === "pdf" ? "PDF link" : "Link"} type="url" defaultValue={lesson?.url}
          placeholder="https://" hint={kind === "video" ? "YouTube and Vimeo links play inside Tysonpe; others open in a new tab." : undefined} />
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field name="required" label="Counts toward completion" as="select" defaultValue={lesson?.requiredForCompletion === false ? "no" : "yes"}>
          <option value="yes">Yes, required</option>
          <option value="no">No, optional</option>
        </Field>
        <Field name="dripType" label="Release" as="select" defaultValue={drip} onChange={setPickedDrip}>
          {DRIP_TYPES.map((d) => <option key={d} value={d}>{DRIP_LABEL[d]}</option>)}
        </Field>
      </div>
      {drip === "days_after_enroll" && (
        <Field name="dripDays" label="Days after joining" type="number" defaultValue={lesson?.dripDays ?? ""} placeholder="7" hint="0 means the day they join." />
      )}
      {drip === "on_date" && (
        <Field name="dripDate" label="Release date" type="date" defaultValue={lesson?.dripDate} hint="Opens at 12:00 am India time." />
      )}
    </>
  );
}

export function LessonForm({
  action, lesson, sections, submitLabel,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  lesson?: LessonDefaults;
  sections?: Array<{ id: string; title: string }>;
  submitLabel: string;
}) {
  // After a successful ADD, remount the fields so choices like "release on a date" don't carry over to the next lesson.
  const [resetKey, setResetKey] = useState(0);
  const wrapped = async (prev: FormState, fd: FormData) => {
    const res = await action(prev, fd);
    if (!lesson && !res) setResetKey((k) => k + 1);
    return res;
  };
  return (
    <ActionForm action={wrapped} className="space-y-3">
      <Fields key={resetKey} lesson={lesson} sections={sections} />
      <FormError />
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary" size="sm" className="pointer-coarse:min-h-11" pendingText="Saving…">{submitLabel}</SubmitButton>
        <SavedNote />
      </div>
    </ActionForm>
  );
}
