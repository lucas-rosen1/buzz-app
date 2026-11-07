import { useSyncExternalStore } from "react";
import type { DeviceSetting } from "../../shared/device-settings";

const preferenceKey = "buzz-drafts-sent.v1";
const changedEvent = "buzz-drafts-sent-changed";
let unsavedPreference: boolean | undefined;

/** Device-local opt-in to the Drafts & sent destination in Messages. */
export function draftsSentPreference(): boolean {
  if (unsavedPreference !== undefined) return unsavedPreference;
  try {
    return localStorage.getItem(preferenceKey) === "on";
  } catch {
    return false;
  }
}
function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key !== preferenceKey && event.key !== null) return;
    unsavedPreference = undefined;
    listener();
  };
  window.addEventListener(changedEvent, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(changedEvent, listener);
    window.removeEventListener("storage", storage);
  };
}
export function useDraftsSentPreference() {
  const enabled = useSyncExternalStore(subscribe, draftsSentPreference);
  // Saving the same active choice changes recovery state, not its behavior.
  const unsaved = useSyncExternalStore(
    subscribe,
    () => unsavedPreference !== undefined,
  );
  return { enabled, unsaved };
}
export function setDraftsSentPreference(enabled: boolean): void {
  unsavedPreference = enabled;
  try {
    localStorage.setItem(preferenceKey, enabled ? "on" : "off");
    unsavedPreference = undefined;
  } catch {
    // Retain the active choice and its recovery state across settings remounts.
  }
  window.dispatchEvent(new Event(changedEvent));
}

/** Showing Drafts & sent as a device setting. */
export const draftsSentSetting: DeviceSetting = {
  key: "conversations.drafts_sent",
  description: "Shows Drafts & sent in the Messages sidebar and in search.",
  schema: { type: "boolean" },
  read: () => ({
    value: draftsSentPreference(),
    unsaved:
      unsavedPreference === undefined
        ? null
        : "This choice is active, but could not be saved on this device.",
  }),
  write: (value) => setDraftsSentPreference(value as boolean),
};
