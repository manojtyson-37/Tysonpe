// Display names for lesson kinds. Kept out of LessonForm.tsx ("use client"): a server page that reads a constant
// from a client module gets a client reference, and `KIND_LABEL[kind]` on it throws in a production build.
export const KIND_LABEL: Record<string, string> = { video: "Video", pdf: "PDF", text: "Text", link: "Link", quiz: "Quiz" };
