import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useExploratoryStore } from "@/store/useExploratoryStore";
import { Loader2, MountainIcon, StarsIcon } from "lucide-react";
import { useState } from "react";

export const ExplorationStuff = () => {
  const activateIdeaSelection = useExploratoryStore(
    (state) => state.activateIdeaSelection
  );
  const requestSuggestion = useExploratoryStore(
    (state) => state.requestSuggestion
  );
  const events = useExploratoryStore((state) => state.events);
  const suggestion = useExploratoryStore((state) => state.suggestion);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onRequest = async () => {
    setIsLoading(true);
    await requestSuggestion().finally(() => setIsLoading(false));
  };

  return (
    <Dialog>
      <DialogTrigger>
        <StarsIcon />
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>AI Data Exploration</DialogTitle>
          <DialogDescription>
            This controls allow you to highlight certain parts and share your
            domain expert knowledge with a LLM in order to help you to construct
            a hypthesis about your data.
          </DialogDescription>
        </DialogHeader>
        <div className="my-2">
          You already collected {events.length} Events.
        </div>

        {suggestion && (
          <div className="py-2">
            <strong className="flex items-center gap-2 mb-2">
              AI Suggestion <StarsIcon />
            </strong>

            <div className="bg-blue-100 rounded-md p-4">
              <pre className="whitespace-break-spaces max-h-80 overflow-scroll">
                {suggestion}
              </pre>
            </div>
          </div>
        )}
        <DialogFooter>
          <DialogClose>
            <Button
              variant={"secondary"}
              onClick={() => activateIdeaSelection()}
            >
              <MountainIcon className="mr-2" /> Highlight Data
            </Button>
          </DialogClose>
          <Button
            variant={"secondary"}
            disabled={!events.length || isLoading}
            onClick={onRequest}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <StarsIcon className="mr-2" />
            )}
            Generate Hypothesis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
