import { ChatAnthropic } from "@langchain/anthropic";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { StateGraph, Annotation, START, END } from "@langchain/langgraph";
import type { AIMessage } from "@langchain/core/messages";
import { z } from "zod";
import { SPECIALISTS, SPECIALIST_KEYS } from "./specialists.js";
import { createMandiTools, AgentUserContext } from "./tools.js";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GraphState = Annotation.Root({
  messages: Annotation<ChatMessage[]>({
    reducer: (_curr, update) => update,
    default: () => [],
  }),
  route: Annotation<string>({ reducer: (_curr, update) => update, default: () => "faq_support" }),
  reply: Annotation<string>({ reducer: (_curr, update) => update, default: () => "" }),
});

const routingSchema = z.object({
  specialist: z.enum(SPECIALIST_KEYS).describe("Which specialist should handle this message"),
});

function lastAiText(messages: unknown[]): string {
  const aiMessages = messages as AIMessage[];
  const last = [...aiMessages].reverse().find((m) => (m as { getType?: () => string }).getType?.() === "ai");
  const content = last?.content;
  return typeof content === "string" ? content : "";
}

/**
 * One compiled graph per request (mirrors the sibling Restaurant project's
 * stateless-server pattern): the client resends the full conversation each
 * turn, so there's no server-side session to manage. A supervisor node
 * classifies intent via structured output, then a conditional edge routes to
 * exactly one of 15 specialist nodes — each its own system prompt and, where
 * relevant, its own DB-backed tools (never the LLM's own invented numbers).
 */
export function buildMandiGraph(user: AgentUserContext | undefined) {
  const llm = new ChatAnthropic({ model: MODEL, apiKey: process.env.ANTHROPIC_API_KEY, temperature: 0.3 });
  const router = llm.withStructuredOutput(routingSchema);
  const tools = createMandiTools(user);

  const routingMenu = SPECIALISTS.map((s) => `- ${s.key}: ${s.routingHint}`).join("\n");

  async function supervisorNode(state: typeof GraphState.State) {
    const lastUser = [...state.messages].reverse().find((m) => m.role === "user");
    const result = await router.invoke([
      {
        role: "system",
        content: `You route user messages to the right specialist agent on Mandi, a farmer marketplace.
Specialists:\n${routingMenu}\nPick exactly one, the best fit. Default to faq_support if nothing else fits well.`,
      },
      { role: "user", content: lastUser?.content ?? "" },
    ]);
    return { route: result.specialist };
  }

  const graph = new StateGraph(GraphState).addNode("supervisor", supervisorNode);

  for (const specialist of SPECIALISTS) {
    const agent = createReactAgent({
      llm,
      tools: specialist.tools.map((name) => tools[name]),
      prompt: specialist.systemPrompt,
    });

    graph.addNode(specialist.key as never, (async (state: typeof GraphState.State) => {
      const result = await agent.invoke({
        messages: state.messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return { reply: lastAiText(result.messages) };
    }) as never);
    graph.addEdge(specialist.key as never, END);
  }

  const routeMap = Object.fromEntries(SPECIALISTS.map((s) => [s.key, s.key])) as Record<string, string>;
  graph.addConditionalEdges("supervisor", (state: typeof GraphState.State) => state.route, routeMap as never);
  graph.addEdge(START, "supervisor");

  return graph.compile();
}

export async function runMandiAgent(messages: ChatMessage[], user: AgentUserContext | undefined) {
  const app = buildMandiGraph(user);
  const result = await app.invoke({ messages });
  const specialist = SPECIALISTS.find((s) => s.key === result.route);
  return { reply: result.reply, agent: specialist?.label ?? "Mandi Assistant" };
}
