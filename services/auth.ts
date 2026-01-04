
import { LoggerService } from "./logger";
import { LogCategory } from "../types";

export class AuthService {
  /**
   * Checks if an API key has already been selected in the AI Studio environment.
   */
  static async checkApiKeyStatus(): Promise<boolean> {
    if (!(window as any).aistudio) {
      console.warn("AI Studio environment not detected.");
      return false;
    }
    
    try {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (hasKey) {
        LoggerService.log(LogCategory.SYSTEM, "Neural core authenticated via existing session");
      }
      return hasKey;
    } catch (err) {
      console.error("Auth status check failed:", err);
      return false;
    }
  }

  /**
   * Opens the API key selection dialog. 
   * Per instructions: Assumes success after the dialog is triggered to mitigate race conditions.
   */
  static async selectApiKey(): Promise<boolean> {
    if (!(window as any).aistudio) {
      alert("AI Studio environment is required for key selection.");
      return false;
    }

    try {
      await (window as any).aistudio.openSelectKey();
      LoggerService.log(LogCategory.SECURITY, "API key selection dialog triggered");
      // Proceeding immediately as per instructions to avoid race condition with hasSelectedApiKey()
      return true; 
    } catch (err) {
      LoggerService.log(LogCategory.SECURITY, "Failed to initiate key selection", { error: err });
      return false;
    }
  }

  /**
   * Resets the local authentication state.
   */
  static handleAuthReset() {
    LoggerService.log(LogCategory.SECURITY, "Neural core authentication reset triggered");
  }
}
