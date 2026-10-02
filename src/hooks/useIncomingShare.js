// Hook / Module for Incoming Share Intent Listener
import { 
  initIncomingShareListener, 
  handleIncomingSharePayload, 
  getIncomingSharedLink, 
  setIncomingSharedLink,
  checkUrlShareParams 
} from "../services/shareIntentHandler.js";

/**
 * useIncomingShare
 * Can be used as a setup routine in App initialization or as a functional hook.
 */
export function useIncomingShare(onShareReceived) {
  initIncomingShareListener();

  if (typeof onShareReceived === "function") {
    const existing = getIncomingSharedLink();
    if (existing) {
      onShareReceived(existing);
    }

    const listener = (e) => {
      if (e && e.detail) {
        onShareReceived(e.detail);
      }
    };
    window.addEventListener("flashgramIncomingShare", listener);
    return () => {
      window.removeEventListener("flashgramIncomingShare", listener);
    };
  }

  return {
    incomingSharedLink: getIncomingSharedLink(),
    handleIncomingSharePayload,
    checkUrlShareParams
  };
}

export default useIncomingShare;
