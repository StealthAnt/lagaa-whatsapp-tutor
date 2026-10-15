import type { Thread } from "chat";
import { objectiveQuestions } from "./objective-questions.js";

const MAX_QUESTIONS = 40;
const CHOICES = ["A", "B", "C", "D"] as const;

type Choice = { id: string; text: string; closeness: 25 | 50 | 75 | 100 };
type ObjectiveQuestion = {
  id: string;
  subject: string;
  year?: 1 | 2 | 3;
  section: string;
  prompt: string;
  choices: Choice[];
  answerId: string;
  explanation: string;
  hint?: string;
  reviewed: boolean;
  source: { kind: "original" | "licensed" | "public-link"; reference: string };
};

type QuizState =
  | { mode: "awaiting-subject" }
  | { mode: "awaiting-count"; subject: string; year?: 1 | 2 | 3 }
  | {
      mode: "active";
      subject: string;
      year?: 1 | 2 | 3;
      questionIds: string[];
      position: number;
      score: number;
      optionIds: string[];
      asked: number;
    };

type StateContainer = { lagaaQuiz?: QuizState | null };

const reviewedBank = validateBank(objectiveQuestions as ObjectiveQuestion[]);

function validateBank(items: ObjectiveQuestion[]): ObjectiveQuestion[] {
  const ids = new Set<string>();
  return items.filter((question) => {
    if (
      !question ||
      typeof question.id !== "string" ||
      ids.has(question.id) ||
      question.reviewed !== true ||
      !question.subject?.trim() ||
      !question.section?.trim() ||
      !question.prompt?.trim() ||
      !question.explanation?.trim() ||
      !question.source?.reference?.trim() ||
      !["original", "licensed", "public-link"].includes(question.source.kind) ||
      !Array.isArray(question.choices) ||
      question.choices.length !== 4 ||
      question.choices.some((choice) => !choice.id?.trim() || !choice.text?.trim()) ||
      new Set(question.choices.map((choice) => choice.id)).size !== 4 ||
      !question.choices.some((choice) => choice.id === question.answerId && choice.closeness === 100) ||
      new Set(question.choices.map((choice) => choice.closeness)).size !== 4 ||
      ![25, 50, 75, 100].every((distance) => question.choices.some((choice) => choice.closeness === distance))
    ) {
      return false;
    }
    ids.add(question.id);
    return true;
  });
}

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

function shuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function questionLabel(question: ObjectiveQuestion, number: number, total: number, optionIds: string[]): string {
  const options = optionIds.map((id, index) => {
    const choice = question.choices.find((entry) => entry.id === id)!;
    return `${CHOICES[index]}. ${choice.text}`;
  });
  return `*${question.subject} · ${question.section}*\nQuestion ${number} of ${total}\n\n${question.prompt}\n\n${options.join("\n")}\n\nReply A, B, C, or D. Type *hint* for a clue, *skip* to see the answer, or *stop* to end.`;
}

function resolveOption(question: ObjectiveQuestion, optionIds: string[], letter: string): string | undefined {
  const index = CHOICES.indexOf(letter.toUpperCase() as (typeof CHOICES)[number]);
  return index < 0 ? undefined : optionIds[index];
}

function getQuestion(id: string): ObjectiveQuestion | undefined {
  return reviewedBank.find((question) => question.id === id);
}

async function readQuizState(thread: Thread): Promise<QuizState | null> {
  const state = (await thread.state) as StateContainer | null;
  return state?.lagaaQuiz ?? null;
}

async function writeQuizState(thread: Thread, lagaaQuiz: QuizState | null): Promise<void> {
  await thread.setState({ lagaaQuiz } as StateContainer);
}

function parseQuizRequest(text: string): { subject: string; year?: 1 | 2 | 3; count?: number } | null {
  const match = text.match(/^\s*(?:objective\s+)?quiz(?:\s+me)?\b\s*(.*)$/i);
  if (!match) return null;
  let rest = match[1].trim();
  const yearMatch = rest.match(/\b(?:year|shs)\s*([1-3])\b/i);
  const year = yearMatch ? (Number(yearMatch[1]) as 1 | 2 | 3) : undefined;
  if (yearMatch) rest = rest.replace(yearMatch[0], " ").trim();
  const countMatch = rest.match(/\b(\d{1,3})\b/);
  const count = countMatch ? Number(countMatch[1]) : undefined;
  if (countMatch) rest = rest.replace(countMatch[0], " ").trim();
  rest = rest.replace(/\b(?:with|on|about|in|for|questions?|qns?)\b/gi, " ").trim();
  return rest ? { subject: rest, year, count } : { subject: "", year, count };
}

function matchingQuestions(subject: string, year?: 1 | 2 | 3): ObjectiveQuestion[] {
  const target = normalize(subject);
  return reviewedBank.filter((question) => {
    const sameSubject = normalize(question.subject) === target;
    const sameYear = year === undefined || question.year === undefined || question.year === year;
    return sameSubject && sameYear;
  });
}

async function startQuiz(
  thread: Thread,
  subject: string,
  year: 1 | 2 | 3 | undefined,
  requestedCount: number,
): Promise<void> {
  if (requestedCount > MAX_QUESTIONS) {
    await writeQuizState(thread, null);
    await thread.post("One objective quiz can have up to 40 questions. Send a new request for 40 or fewer when you’re ready.");
    return;
  }
  if (requestedCount < 1) {
    await thread.post("Choose between 1 and 40 questions for this quiz.");
    return;
  }
  const available = shuffle(matchingQuestions(subject, year));
  if (available.length === 0) {
    await writeQuizState(thread, null);
    await thread.post(`I don’t have teacher-reviewed objective questions for ${subject}${year ? `, SHS Year ${year}` : ""} yet. I won’t invent an answer key. You can still ask me to teach a topic in ${subject}.`);
    return;
  }
  const selected = available.slice(0, requestedCount);
  const first = selected[0];
  const optionIds = shuffle(first.choices.map((choice) => choice.id));
  await writeQuizState(thread, {
    mode: "active",
    subject: first.subject,
    year,
    questionIds: selected.map((question) => question.id),
    position: 0,
    score: 0,
    optionIds,
    asked: 1,
  });
  const limitNote = selected.length < requestedCount ? ` I have ${selected.length} reviewed question${selected.length === 1 ? "" : "s"} available, so this quiz will use those.` : "";
  await thread.post(`${limitNote}\n\n${questionLabel(first, 1, selected.length, optionIds)}`.trim());
}

async function advance(
  thread: Thread,
  state: Extract<QuizState, { mode: "active" }>,
  question: ObjectiveQuestion,
  learnerAnswer?: string,
): Promise<void> {
  const selectedChoiceId = learnerAnswer ? resolveOption(question, state.optionIds, learnerAnswer) : undefined;
  const correct = selectedChoiceId === question.answerId;
  const correctIndex = state.optionIds.indexOf(question.answerId);
  const correctLetter = correctIndex >= 0 ? CHOICES[correctIndex] : "?";
  const correctChoice = question.choices.find((choice) => choice.id === question.answerId);
  const score = state.score + (correct ? 1 : 0);
  const nextPosition = state.position + 1;
  if (nextPosition >= state.questionIds.length) {
    await writeQuizState(thread, null);
    await thread.post(`${correct ? "Correct." : "Not quite."} The answer is ${correctLetter}. ${question.explanation}\n\nQuiz complete: ${score}/${state.questionIds.length}. This score stays in this conversation only.`);
    return;
  }
  const nextQuestion = getQuestion(state.questionIds[nextPosition]);
  if (!nextQuestion) {
    await writeQuizState(thread, null);
    await thread.post("This quiz stopped because one of its reviewed questions is unavailable. No score was saved.");
    return;
  }
  const nextOptionIds = shuffle(nextQuestion.choices.map((choice) => choice.id));
  await writeQuizState(thread, {
    ...state,
    position: nextPosition,
    score,
    optionIds: nextOptionIds,
    asked: state.asked + 1,
  });
  const feedback = learnerAnswer
    ? `${correct ? "Correct." : `Not quite. The answer is ${correctLetter} (${correctChoice?.text ?? "unavailable"}).`} ${question.explanation}`
    : `Skipped. The answer is ${correctLetter} (${correctChoice?.text ?? "unavailable"}). ${question.explanation}`;
  await thread.post(`${feedback}\n\n${questionLabel(nextQuestion, nextPosition + 1, state.questionIds.length, nextOptionIds)}`);
}

/** Handles objective quiz commands locally so quiz marking never goes to the model. */
export async function handleObjectiveQuizMessage(thread: Thread, rawText: string): Promise<boolean> {
  const text = rawText.trim();
  const lower = text.toLocaleLowerCase();
  let state = await readQuizState(thread);

  if (/^(?:stop|end|cancel|quit|menu|change subject|change mode)$/i.test(text)) {
    if (state) {
      await writeQuizState(thread, null);
      await thread.post(/^(?:stop|end|cancel|quit)$/i.test(text) ? "Quiz stopped. No learner profile or long-term score was saved." : "Quiz cleared. Tell me what subject or mode you want next.");
      return true;
    }
    return false;
  }

  if (state?.mode === "awaiting-count") {
    const count = text.match(/^\s*(\d{1,3})\s*$/)?.[1];
    if (!count) {
      await thread.post("Reply with a question count from 1 to 40, or type *stop*.");
      return true;
    }
    await startQuiz(thread, state.subject, state.year, Number(count));
    return true;
  }

  if (state?.mode === "awaiting-subject") {
    const request = parseQuizRequest(`quiz ${text}`);
    if (!request?.subject) {
      await thread.post("Tell me the subject, for example *quiz Biology Year 2, 10*. Type *stop* to cancel.");
      return true;
    }
    if (request.count === undefined) {
      await writeQuizState(thread, { mode: "awaiting-count", subject: request.subject, year: request.year });
      await thread.post("How many questions would you like? Choose 1–40. No personal details are needed.");
      return true;
    }
    await startQuiz(thread, request.subject, request.year, request.count);
    return true;
  }

  if (state?.mode === "active") {
    if (/^(?:hint|help)$/i.test(text)) {
      const question = getQuestion(state.questionIds[state.position]);
      if (!question) {
        await writeQuizState(thread, null);
        await thread.post("This quiz stopped because its current question is unavailable.");
        return true;
      }
      await thread.post(question.hint?.trim() ? `Hint: ${question.hint}` : "Think about the key idea in the question. I don’t have an extra hint for this item.");
      return true;
    }
    const question = getQuestion(state.questionIds[state.position]);
    if (!question) {
      await writeQuizState(thread, null);
      await thread.post("This quiz stopped because its current question is unavailable.");
      return true;
    }
    if (/^skip$/i.test(text)) {
      await advance(thread, state, question);
      return true;
    }
    if (/^[A-D]$/i.test(text)) {
      await advance(thread, state, question, text.toUpperCase());
      return true;
    }
    if (
      /^(?:objective\s+)?quiz\b/i.test(text) ||
      /\b(?:switch|change)\s+(?:subject|mode)\b/i.test(lower) ||
      /\b(?:learn|teach|explain|study|full exam|mock|menu)\b/i.test(lower)
    ) {
      await writeQuizState(thread, null);
      state = null;
    } else {
      await thread.post("Reply with A, B, C, or D. Type *hint*, *skip*, or *stop*; I won’t send your quiz answer to the AI tutor.");
      return true;
    }
  }

  const request = parseQuizRequest(text);
  if (!request) return false;
  if (!request.subject) {
    await writeQuizState(thread, { mode: "awaiting-subject" });
    await thread.post("Which subject should I quiz you on? You can include the year and count, for example: *quiz Biology Year 2, 10*.");
    return true;
  }
  if (request.count === undefined) {
    await writeQuizState(thread, { mode: "awaiting-count", subject: request.subject, year: request.year });
    await thread.post("How many questions would you like? Choose 1–40. No personal details are needed.");
    return true;
  }
  await startQuiz(thread, request.subject, request.year, request.count);
  return true;
}

