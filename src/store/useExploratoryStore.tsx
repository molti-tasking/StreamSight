import { Input } from "@/components/ui/input";
import { fetchResearchCompletion } from "@/app/actions/ai-chat";
import { DataProcessingSettings } from "@/lib/settings/DataProcessingSettings";
import { useState } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export type ExplorationEvent = {
  userMessage?: string | undefined;
  systemMessage?: string | undefined;
  payload: object;
};

interface DataStore {
  events: ExplorationEvent[];
  suggestion: string | undefined;
  isSelecting: boolean;

  activateIdeaSelection: () => void;
  addSettingUpdateEvent: (
    pastSettings: DataProcessingSettings,
    newSettings: DataProcessingSettings
  ) => void;
  addDataIdeaEvent: (payload: object) => void;

  requestSuggestion: () => Promise<void>;
}

const FeedbackForm = ({
  onSubmitFeedback,
}: {
  onSubmitFeedback: (positive: boolean, text: string) => void;
}) => {
  const [feedback, setFeedback] = useState<string>("");

  return (
    <div>
      <div className="max-w-sm mb-1">
        <Input
          type="search"
          id="clusterAssignmentHistoryDepth"
          placeholder="Your feedback... (optional)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
        />
      </div>
      <div className="flex flex-row gap-1 items-center">
        <Button onClick={() => onSubmitFeedback(true, feedback)}>Good</Button>
        <Button onClick={() => onSubmitFeedback(false, feedback)}>Bad</Button>
      </div>
    </div>
  );
};

export const useExploratoryStore = create<DataStore>((set, get) => {
  console.log("init exploratory store");

  const requestSettingUpdateFeedback = () => {
    const onSubmitFeedback = (positive: boolean, text: string) => {
      const currentEvents = get().events;
      const newUserEvents: ExplorationEvent[] = [
        ...currentEvents,
        {
          systemMessage: `The user rated the last settings update ${
            positive ? "positively" : "negatively"
          }${!!text?.length ? `: ${text}` : "."}`,
          payload: {},
        },
      ];
      set({ events: newUserEvents });
    };

    toast("You updated the view settings.", {
      description: "How helpful was it?",
      action: <FeedbackForm onSubmitFeedback={onSubmitFeedback} />,
    });
  };

  const addSettingUpdateEvent = async (
    pastSettings: DataProcessingSettings,
    newSettings: DataProcessingSettings
  ) => {
    const timeout = setTimeout(() => {
      console.log("Now get feedback :)");
      requestSettingUpdateFeedback();
    }, 5000);
    console.log("Updated settings, timeout: ", timeout);
    const currentEvents = get().events;
    const newUserEvents: ExplorationEvent[] = [
      ...currentEvents,
      {
        systemMessage: "The user updated the settings.",
        payload: { pastSettings, newSettings },
      },
    ];

    set({ events: newUserEvents });
  };

  const activateIdeaSelection = () => {
    set({ isSelecting: true });
  };

  const addDataIdeaEvent = (payload: object) => {
    set({ isSelecting: false });

    const feedback = prompt(
      "Please enter your thoughts on your selected graph",
      "This data visualization is interesting, because..."
    );

    const newEvent: ExplorationEvent = {
      systemMessage: `The user gave feedback "${feedback}" to a data visualisation of the data in the payload.`,
      payload,
    };

    const currentEvents = get().events;
    const newUserEvents: ExplorationEvent[] = [...currentEvents, newEvent];
    set({ events: newUserEvents });
  };

  const requestSuggestion = async () => {
    try {
      const answer = await fetchResearchCompletion(get().events);
      console.log("answer", answer);
      if (typeof answer === "string") {
        set({ suggestion: answer });
      }
    } catch (error) {
      alert(
        `We couldn't generate data: ${String(
          error instanceof Error ? error.message : error
        )}`
      );
    }
  };

  return {
    events: [],
    suggestion: undefined,
    isSelecting: false,

    activateIdeaSelection,
    addDataIdeaEvent,
    addSettingUpdateEvent,
    requestSuggestion,
  };
});
