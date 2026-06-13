import { useMemo } from "react";
import { toast as sonnerToast } from "sonner";

/**
 * Custom hook for triggering toast notifications.
 * This abstraction centralizes user feedback across the app,
 * allowing for future pre-processing, localization, or metric-logging behavior.
 */
export function useToast() {
  const toast = useMemo(() => {
    const customToast = (
      message: Parameters<typeof sonnerToast>[0],
      data?: Parameters<typeof sonnerToast>[1]
    ) => {
      // Inject pre-processing, localization, or metrics here
      return sonnerToast(message, data);
    };

    customToast.success = (
      message: Parameters<typeof sonnerToast.success>[0],
      data?: Parameters<typeof sonnerToast.success>[1]
    ) => {
      // Inject pre-processing, localization, or metrics here
      return sonnerToast.success(message, data);
    };

    customToast.error = (
      message: Parameters<typeof sonnerToast.error>[0],
      data?: Parameters<typeof sonnerToast.error>[1]
    ) => {
      // Inject pre-processing, localization, or metrics here
      return sonnerToast.error(message, data);
    };

    customToast.info = (
      message: Parameters<typeof sonnerToast.info>[0],
      data?: Parameters<typeof sonnerToast.info>[1]
    ) => {
      // Inject pre-processing, localization, or metrics here
      return sonnerToast.info(message, data);
    };

    customToast.warning = (
      message: Parameters<typeof sonnerToast.warning>[0],
      data?: Parameters<typeof sonnerToast.warning>[1]
    ) => {
      // Inject pre-processing, localization, or metrics here
      return sonnerToast.warning(message, data);
    };

    customToast.promise = sonnerToast.promise;
    customToast.custom = sonnerToast.custom;
    customToast.dismiss = sonnerToast.dismiss;

    return customToast;
  }, []);

  return { toast };
}
