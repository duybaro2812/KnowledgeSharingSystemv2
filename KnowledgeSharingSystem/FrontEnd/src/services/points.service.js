import { apiRequest } from "../api";

export function createPointsFeature(ctx) {
  const {
    token,
    call,
    user,
    setPointSummary,
    setPointTransactions,
    setMyPointEvents,
    setPointPolicy,
    setUser,
  } = ctx;

  const loadPointSummary = async () => {
    if (!token) {
      setPointSummary(null);
      return;
    }
    const payload = await apiRequest("/points/me/summary", { token });
    const summary = payload.data || null;
    setPointSummary(summary);
    if (summary && typeof summary.currentPoints === "number") {
      setUser((prev) => {
        if (!prev) return prev;
        return { ...prev, points: summary.currentPoints };
      });
    }
  };

  const loadPointTransactions = async (limit = 50) => {
    if (!token) {
      setPointTransactions([]);
      return;
    }
    const payload = await apiRequest("/points/me/transactions", {
      token,
      query: { limit },
    });
    setPointTransactions(payload.data || []);
  };

  const loadMyPointEvents = async (status = "", limit = 50) => {
    if (!token) {
      setMyPointEvents([]);
      return;
    }
    const query = { limit };
    if (status) query.status = status;

    const payload = await apiRequest("/points/me/events", {
      token,
      query,
    });
    setMyPointEvents(payload.data || []);
  };

  const loadPointPolicy = async () => {
    if (!token) {
      setPointPolicy(null);
      return;
    }
    const payload = await apiRequest("/points/policy", { token });
    setPointPolicy(payload.data || null);
  };

  const loadAllPointData = async () => {
    await call(async () => {
      const safeRun = async (fn) => {
        try {
          await fn();
          return null;
        } catch (error) {
          return error;
        }
      };

      const [summaryError, transactionsError, eventsError, policyError] = await Promise.all([
        safeRun(() => loadPointSummary()),
        safeRun(() => loadPointTransactions(50)),
        safeRun(() => loadMyPointEvents("", 50)),
        safeRun(() => loadPointPolicy()),
      ]);

      const errors = [summaryError, transactionsError, eventsError, policyError].filter(Boolean);
      const non404Error = errors.find((e) => !String(e?.message || "").includes("404"));

      if (summaryError && String(summaryError?.message || "").includes("404")) {
        const currentPoints = Number(user?.points || 0);
        setPointSummary({
          currentPoints,
          totalEarned: 0,
          totalSpent: 0,
          pendingEvents: 0,
          approvedEvents: 0,
          rejectedEvents: 0,
        });
      }

      if (transactionsError && String(transactionsError?.message || "").includes("404")) {
        setPointTransactions([]);
      }

      if (eventsError && String(eventsError?.message || "").includes("404")) {
        setMyPointEvents([]);
      }

      if (policyError && String(policyError?.message || "").includes("404")) {
        setPointPolicy(null);
      }

      if (non404Error) {
        throw non404Error;
      }
    });
  };

  return {
    loadPointSummary,
    loadPointTransactions,
    loadMyPointEvents,
    loadPointPolicy,
    loadAllPointData,
  };
}
