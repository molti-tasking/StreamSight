import { create } from "zustand";
import { useStreamClustersSettingsStore } from "./useStreamClustersSettingsStore";

type StoreValues = {
  values: string[];
};

export type StreamSelectionStore = StoreValues & {
  toggle: (value: string) => void;
  add: (value: string) => void;
  remove: (value: string) => void;
  removeAtIndex: (index: number) => void;
};

export const useStreamSelectionStore = create<StreamSelectionStore>(
  (set, get) => {
    return {
      values: [],
      toggle(value) {
        const index = get().values.indexOf(value);
        if (index >= 0) {
          this.removeAtIndex(index);
        } else {
          this.add(value);
        }
      },

      add(value) {
        const { showStreamLabel } = useStreamClustersSettingsStore.getState();
        if (showStreamLabel) {
          set(({ values }) => ({ values: [...values, value] }));
        }
      },
      removeAtIndex(index) {
        set(({ values }) => ({
          values: values.filter((currValue, currIndex) => currIndex !== index),
        }));
      },
      remove(value) {
        set(({ values }) => ({
          values: values.filter((currValue) => currValue !== value),
        }));
      },
    };
  }
);
