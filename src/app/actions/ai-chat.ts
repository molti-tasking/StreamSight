"use server";
import { ExplorationEvent } from "@/store/useExploratoryStore";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export async function fetchResearchCompletion(
  events: ExplorationEvent[]
): Promise<string> {
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
        content: JSON.stringify(events),
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
    console.error("Error:", response.status, response.statusText);
    const errorDetails = await response.json();
    console.error("Details:", errorDetails);
    throw new Error("ERROR: " + String(errorDetails));
  }

  const data = await response.json();
  console.log("Response: ", data);
  const content = data.choices[0].message.content;
  return content;
}
