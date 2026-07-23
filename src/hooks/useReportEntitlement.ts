import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getReportEntitlement } from "@/lib/payments.functions";

export function useReportEntitlement(quizResultId: string | undefined) {
  const getEntitlement = useServerFn(getReportEntitlement);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!quizResultId) {
      setUnlocked(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getEntitlement({ data: { quizResultId } });
      setUnlocked(result.unlocked);
    } catch {
      setUnlocked(false);
    } finally {
      setLoading(false);
    }
  }, [quizResultId, getEntitlement]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { unlocked, loading, refetch };
}
