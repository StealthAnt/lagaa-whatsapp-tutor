import { createWhatsAppAdapter } from "@chat-adapter/whatsapp";
import { createMemoryState } from "@chat-adapter/state-memory";
import type { Message, Thread } from "chat";
import { chatSdkChannel } from "eve/channels/chat-sdk";
import { handleObjectiveQuizMessage } from "../lib/objective-quiz.js";

export const { bot, channel, send } = chatSdkChannel({
  userName: "Lagaa",
  adapters: { whatsapp: createWhatsAppAdapter() },
  state: createMemoryState(),
});

const textOnlyNotice =
  "I can help with text questions for now. No personal details are needed. Type your question or choose a subject and SHS year (1, 2, or 3).";

bot.onNewMention(async (thread: Thread, message: Message) => {
  await thread.subscribe();
  const text = message.text.trim();
  if (await handleObjectiveQuizMessage(thread, text)) return;
  await send(text || textOnlyNotice, { thread });
});

bot.onSubscribedMessage(async (thread: Thread, message: Message) => {
  const text = message.text.trim();
  if (await handleObjectiveQuizMessage(thread, text)) return;
  await send(text || textOnlyNotice, { thread });
});

export default channel;

