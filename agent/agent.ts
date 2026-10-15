import { defineAgent } from "eve";
import { google } from "@ai-sdk/google";

export default defineAgent({
  defaultTools: false,
  tool: false,
  model: google.interactions("gemini-3.5-flash-lite"),
});
