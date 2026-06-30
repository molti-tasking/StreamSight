"use server";
import { ExplorationEvent } from "@/store/useExploratoryStore";
import { z } from "zod";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Server Actions are publicly callable endpoints. Validate and bound the
// untrusted `events` payload before it is forwarded into the billed LLM call
// to limit cost/abuse and reject malformed/oversized input.
const MAX_EVENTS = 200;
const MAX_STRING = 4000;

const explorationEventSchema = z.object({
  userMessage: z.string().max(MAX_STRING).optional(),
  systemMessage: z.string().max(MAX_STRING).optional(),
  // payload is arbitrary structured metadata; cap its serialized size below.
  payload: z.record(z.string(), z.unknown()),
});

const eventsSchema = z.array(explorationEventSchema).max(MAX_EVENTS);

export async function fetchResearchCompletion(
  rawEvents: ExplorationEvent[]
): Promise<string> {
  const parsed = eventsSchema.safeParse(rawEvents);
  if (!parsed.success) {
    throw new Error("Invalid request payload.");
  }
  const events = parsed.data;

  const serializedEvents = JSON.stringify(events);
  if (serializedEvents.length > 100_000) {
    throw new Error("Request payload too large.");
  }

  if (!OPENAI_API_KEY) {
    throw new Error("Research completion is not configured.");
  }

  const url = "https://api.openai.com/v1/chat/completions";

  const requestBody = {
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "We are domain experts with a lot of time based data. We have many parallel time series and we explore the data in order to generate hypothesis for our research. In the next message we have collected certain user events and meta data.",
      },
      {
        role: "user",
        content: serializedEvents,
      },
      {
        role: "user",
        content:
          "Based on this information, generate one or more precise research hypothesis.",
      },
    ],
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    // Avoid leaking upstream provider error details to the client.
    console.error("Research completion upstream error:", response.status);
    throw new Error("Failed to generate research completion.");
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("Unexpected response from completion provider.");
  }
  return content;
}
