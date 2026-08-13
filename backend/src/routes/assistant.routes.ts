import { Router } from "express";
import { z } from "zod";
import { optionalAuth, AuthedRequest } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { runMandiAgent, ChatMessage } from "../agents/mandiGraph.js";
import { answerWithFallback } from "../services/fallbackAssistant.service.js";

export const assistantRouter = Router();

const chatSchema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(1000) }))
    .min(1)
    .max(20),
});

// Stateless per the sibling Restaurant project's pattern: the client resends
// the full conversation each turn, so there's no server-side chat session.
assistantRouter.post("/chat", optionalAuth, asyncHandler<AuthedRequest>(async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const messages = parsed.data.messages as ChatMessage[];

  if (!process.env.ANTHROPIC_API_KEY) {
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const fallback = await answerWithFallback(lastUser?.content ?? "");
    return res.json(fallback);
  }

  try {
    const result = await runMandiAgent(messages, req.user);
    res.json({ ...result, degraded: false });
  } catch (err) {
    console.error("Mandi agent unavailable, falling back:", (err as Error).message);
    const lastUser = [...messages].reverse().find((m) => m.role === "user");
    const fallback = await answerWithFallback(lastUser?.content ?? "");
    res.json(fallback);
  }
}));
