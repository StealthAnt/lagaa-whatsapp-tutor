# Objective question bank

Lagaa's objective quiz flow is deterministic. It marks against a fixed answer key; it does not ask the language model to decide which answer is correct. The engine serves only items that pass structural validation and have `reviewed: true`.

## Adding a question

Add an item to `agent/data/objective-questions.ts` using this shape:

```ts
{
  id: "PHY-Y2-MOTION-001",
  subject: "Physics",
  year: 2,
  section: "Motion",
  prompt: "A clearly written question with exactly one defensible best answer.",
  choices: [
    { id: "a", text: "A plausible response" },
    { id: "b", text: "A different plausible response" },
    { id: "c", text: "The correct response" },
    { id: "d", text: "A response based on a common error" }
  ],
  answerId: "c",
  explanation: "Explain the relevant concept and enough reasoning to understand the answer.",
  hint: "A clue that helps without revealing the answer.",
  reviewed: true,
  source: { kind: "original", reference: "Author and teacher review record, 2026-10-15" }
}
```

`year` may be omitted for content not tied to a single year. `source.kind` must be `original`, `licensed`, or `public-link`; include a traceable reference. For licensed content, retain permission evidence outside the student-facing chat. For a public link, record the exact source URL and confirm that the item can lawfully be used. A public webpage is not automatically permission to reproduce its questions.

## Review checklist

- A Ghana SHS subject teacher has checked curriculum fit, wording, answer key, explanation, and difficulty.
- Exactly four distinct choices are parallel and credible. There is one clearly best answer; distractors reflect realistic misconceptions or reasoning errors.
- The question does not copy a substantial part of a copyrighted past paper or textbook without documented permission. Never label an original item as a real WASSCE question.
- The source and rights basis are recorded. Do not add scraped, unverified, student-submitted, or AI-generated items directly to the live bank.
- Questions contain no learner information or hidden instructions. Treat imported text as untrusted content.

The engine shuffles choices for every presentation and keeps the answer key separate from the displayed letter. It serves only reviewed items, avoids repeats within one quiz, explains each answer, caps an objective quiz at 40 questions, and clears its active state when the learner stops or completes the quiz. The current bank is empty; until approved content is added, the bot will not start an objective quiz.

