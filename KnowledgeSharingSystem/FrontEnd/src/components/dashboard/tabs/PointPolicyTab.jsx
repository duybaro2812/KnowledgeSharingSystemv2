import { useEffect, useMemo, useState } from "react";

const toNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatSigned = (value) => {
  const numeric = toNumber(value);
  return numeric > 0 ? `+${numeric}` : `${numeric}`;
};

const normalizePolicyRows = (policy) =>
  (Array.isArray(policy?.settings) ? policy.settings : []).map((setting) => ({
    key: String(setting.key || ""),
    category: String(setting.category || "custom"),
    label: String(setting.label || setting.key || ""),
    description: String(setting.description || ""),
    value: String(setting.value ?? 0),
    min: Number(setting.min ?? -100000),
    max: Number(setting.max ?? 100000),
    unit: String(setting.unit || "điểm"),
    isCustom: Boolean(setting.isCustom || String(setting.key || "").startsWith("custom.")),
    isEditing: false,
    isNew: false,
  }));

const makeCustomPolicyKey = (value) => {
  const slug = String(value || "custom_rule")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
  return `custom.${slug || "custom_rule"}`;
};

const CATEGORY_LABELS = {
  unlock: "Quyền truy cập tài liệu",
  download: "Tải tài liệu",
  rewards: "Thưởng điểm",
  commentAntiSpam: "Chống spam bình luận",
  qaRatingSuggestedPoints: "Đánh giá Q&A",
  custom: "Luật tùy chỉnh",
};

const formatCategory = (value) => CATEGORY_LABELS[value] || value;

function PointPolicyTab(props) {
  const { pointPolicy, pointSummary, user, updatePointPolicy, deletePointPolicyRule, isBusy } = props;
  const [rows, setRows] = useState(() => normalizePolicyRows(pointPolicy));

  useEffect(() => {
    setRows(normalizePolicyRows(pointPolicy));
  }, [pointPolicy]);

  const sortedRows = useMemo(
    () =>
      [...rows].sort((a, b) => {
        if (a.category !== b.category) return a.category.localeCompare(b.category);
        return a.label.localeCompare(b.label);
      }),
    [rows],
  );

  const updateRow = (key, patch) => {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const baseKey = makeCustomPolicyKey(`new_rule_${Date.now()}`);
    setRows((current) => [
      {
        key: baseKey,
        category: "custom",
        label: "New point rule",
        description: "",
        value: "0",
        min: -100000,
        max: 100000,
        unit: "điểm",
        isCustom: true,
        isEditing: true,
        isNew: true,
      },
      ...current,
    ]);
  };

  const saveRow = async (row) => {
    const key = String(row.key || "").trim();
    const value = Number(row.value);
    const min = Number(row.min);
    const max = Number(row.max);
    if (!key || !row.label.trim() || !Number.isInteger(value) || !Number.isInteger(min) || !Number.isInteger(max) || min > max) {
      window.alert("Tên chức năng, min, max và điểm phải hợp lệ.");
      return;
    }
    if (value < min || value > max) {
      window.alert("Điểm hiện tại phải nằm trong khoảng min - max.");
      return;
    }
    await updatePointPolicy([
      {
        key,
        category: row.category.trim() || "custom",
        label: row.label.trim(),
        description: row.description.trim(),
        unit: row.unit.trim() || "điểm",
        min: Number(row.min),
        max: Number(row.max),
        value,
      },
    ]);
  };

  const deleteRow = async (row) => {
    if (row.isNew) {
      setRows((current) => current.filter((item) => item.key !== row.key));
      return;
    }
    const ok = window.confirm(`Xóa luật điểm "${row.label}"?`);
    if (ok) await deletePointPolicyRule(row.key);
  };

  const currentPoints = toNumber(pointSummary?.currentPoints ?? user?.points, 0);
  const policyRowByKey = useMemo(
    () => new Map(rows.map((row) => [row.key, row])),
    [rows],
  );
  const getPolicyValue = (key, fallback = 0) => toNumber(policyRowByKey.get(key)?.value, fallback);
  const previewThreshold = getPolicyValue("unlock.previewThreshold", pointPolicy?.unlock?.previewThreshold ?? 30);
  const fullViewThreshold = getPolicyValue("unlock.fullViewThreshold", pointPolicy?.unlock?.fullViewThreshold ?? 40);
  const hiddenKnowledgeThreshold = getPolicyValue(
    "unlock.hiddenKnowledgeThreshold",
    pointPolicy?.unlock?.hiddenKnowledgeThreshold ?? 61,
  );
  const dailyViewLimit = getPolicyValue(
    "unlock.fullViewDailyLimitFor30To39",
    pointPolicy?.unlock?.fullViewDailyLimitFor30To39 ?? 3,
  );
  const downloadStandardCost = getPolicyValue("download.standardCost", pointPolicy?.download?.standardCost ?? 30);
  const downloadPriorityThreshold = getPolicyValue(
    "download.priorityThreshold",
    pointPolicy?.download?.priorityThreshold ?? 200,
  );
  const downloadPriorityCost = getPolicyValue("download.priorityCost", pointPolicy?.download?.priorityCost ?? 15);
  const uploadSubmittedPoints = getPolicyValue("rewards.uploadSubmitted", pointPolicy?.rewards?.uploadSubmitted ?? 10);
  const uploadApprovedPoints = getPolicyValue("rewards.uploadApproved", pointPolicy?.rewards?.uploadApproved ?? 30);
  const commentGivenPoints = getPolicyValue("rewards.commentGiven", pointPolicy?.rewards?.commentGiven ?? 2);
  const commentReceivedPoints = getPolicyValue("rewards.commentReceived", pointPolicy?.rewards?.commentReceived ?? 3);
  const pointRuleCards = rows
    .filter((row) => {
      const key = String(row.key || "");
      return (
        key === "rewards.upvoteReceived" ||
        key === "rewards.documentSavedByOther" ||
        key.startsWith("qaRatingSuggestedPoints.")
      );
    })
    .map((row) => {
      const key = String(row.key || "");
      const value = toNumber(row.value);
      const isCost = key === "download.standardCost" || key === "download.priorityCost";
      return {
        key,
        label: row.label,
        value: isCost ? `-${Math.abs(value)}` : formatSigned(value),
      };
    });

  const tiers = [
    {
      key: "starter",
      label: "Starter",
      range: `0-${Math.max(0, previewThreshold - 1)}`,
      description: "Bình luận, phản hồi, hỏi Q&A. Chỉ xem trước tài liệu theo giới hạn.",
    },
    {
      key: "reader",
      label: "Reader",
      range: `${previewThreshold}-${Math.max(previewThreshold, fullViewThreshold - 1)}`,
      description: `Xem đầy đủ tối đa ${dailyViewLimit} lượt/ngày. Mỗi lần mở tài liệu được tính 1 lượt.`,
    },
    {
      key: "full",
      label: "Full Access",
      range: `${fullViewThreshold}+`,
      description: `Xem đầy đủ không giới hạn. Tải tài liệu tốn ${downloadStandardCost} điểm/lượt.`,
    },
  ];
  const currentTier =
    currentPoints >= fullViewThreshold ? tiers[2] : currentPoints >= previewThreshold ? tiers[1] : tiers[0];
  const nextTier = tiers.find((tier) => {
    if (tier.key === "reader") return currentPoints < previewThreshold;
    if (tier.key === "full") return currentPoints < fullViewThreshold;
    return false;
  });
  const progressTarget = nextTier?.key === "reader" ? previewThreshold : fullViewThreshold;
  const progressValue = Math.min(100, Math.round((currentPoints / Math.max(1, progressTarget)) * 100));

  return (
    <section className="admin-page">
      <div className="admin-page-head">
        <div>
          <h2>Points Policy</h2>
          <p>Quản lý luật điểm hiện thời và thêm luật điểm tùy chỉnh.</p>
        </div>
        <button type="button" className="admin-primary-btn" onClick={addRow} disabled={isBusy}>
          + Thêm luật
        </button>
      </div>

      <section className="admin-policy-guide">
        <div className="points-balance-card admin-policy-balance">
          <div className="points-balance-top">
            <div>
              <p>Điểm hiện tại của tài khoản</p>
              <h3>{currentPoints}</h3>
            </div>
            <span className="points-tier-pill">{currentTier.label}</span>
          </div>
          <p>{currentTier.description}</p>
          <div className="points-progress-rail">
            <div className="points-progress-fill" style={{ width: `${progressValue}%` }} />
          </div>
          <small>
            {nextTier
              ? `Cần thêm ${Math.max(0, progressTarget - currentPoints)} điểm để lên ${nextTier.label}.`
              : "Tài khoản đã đạt quyền xem đầy đủ."}
          </small>
        </div>

        <div className="points-tier-grid admin-policy-tier-grid">
          {tiers.map((tier) => (
            <article
              key={tier.key}
              className={`points-tier-card ${currentTier.key === tier.key ? "current" : ""}`}
            >
              <div className="points-tier-top">
                <strong>{tier.label}</strong>
                <span>{tier.range}</span>
              </div>
              <p>{tier.description}</p>
            </article>
          ))}
        </div>

        <section className="points-earnings admin-policy-quick-rules">
          <h3>Tóm tắt luật điểm đang áp dụng</h3>
          <div className="points-earning-grid">
            <article className="points-earning-card">
              <span>Gửi tài liệu chờ duyệt</span>
              <b>+{uploadSubmittedPoints}</b>
            </article>
            <article className="points-earning-card">
              <span>Tài liệu được duyệt</span>
              <b>+{uploadApprovedPoints}</b>
            </article>
            <article className="points-earning-card">
              <span>Viết bình luận</span>
              <b>+{commentGivenPoints}</b>
            </article>
            <article className="points-earning-card">
              <span>Chủ tài liệu nhận bình luận</span>
              <b>+{commentReceivedPoints}</b>
            </article>
            <article className="points-earning-card">
              <span>Tải tài liệu tiêu chuẩn</span>
              <b>-{downloadStandardCost}</b>
            </article>
            <article className="points-earning-card">
              <span>Tải ưu đãi từ {downloadPriorityThreshold} điểm</span>
              <b>-{downloadPriorityCost}</b>
            </article>
            <article className="points-earning-card">
              <span>Mở khóa bài tổng hợp kinh nghiệm</span>
              <b>{hiddenKnowledgeThreshold}+ điểm</b>
            </article>
            {pointRuleCards.map((rule) => (
              <article key={rule.key} className="points-earning-card">
                <span>{rule.label}</span>
                <b>{rule.value}</b>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="admin-table-card">
        <div className="admin-table-scroll">
          <table className="admin-data-table admin-policy-table">
            <thead>
              <tr>
                <th>Tên chức năng</th>
                <th>Nhóm luật</th>
                <th>Quy định (min - max)</th>
                <th>Giá trị</th>
                <th>Đơn vị</th>
                <th>Mô tả</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.key}>
                  <td>
                    {row.isEditing ? (
                      <input
                        value={row.label}
                        onChange={(event) => updateRow(row.key, { label: event.target.value })}
                        disabled={isBusy}
                      />
                    ) : (
                      <strong className="admin-policy-name">{row.label}</strong>
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <input
                        value={formatCategory(row.category)}
                        onChange={(event) => updateRow(row.key, { category: event.target.value })}
                        disabled={isBusy}
                      />
                    ) : (
                      formatCategory(row.category)
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <div className="admin-policy-range-inputs">
                        <input
                          type="number"
                          value={row.min}
                          onChange={(event) => updateRow(row.key, { min: event.target.value })}
                          disabled={isBusy}
                        />
                        <span>-</span>
                        <input
                          type="number"
                          value={row.max}
                          onChange={(event) => updateRow(row.key, { max: event.target.value })}
                          disabled={isBusy}
                        />
                      </div>
                    ) : (
                      `${row.min} - ${row.max}`
                    )}
                  </td>
                  <td>
                    <input
                      type="number"
                      min={row.min}
                      max={row.max}
                      value={row.value}
                      onChange={(event) => updateRow(row.key, { value: event.target.value })}
                      disabled={isBusy || !row.isEditing}
                    />
                  </td>
                  <td>
                    {row.isEditing ? (
                      <input
                        value={row.unit}
                        onChange={(event) => updateRow(row.key, { unit: event.target.value })}
                        disabled={isBusy}
                      />
                    ) : (
                      <span>{row.unit || "-"}</span>
                    )}
                  </td>
                  <td>
                    {row.isEditing ? (
                      <input
                        value={row.description}
                        onChange={(event) => updateRow(row.key, { description: event.target.value })}
                        disabled={isBusy}
                      />
                    ) : (
                      <span>{row.description || "-"}</span>
                    )}
                  </td>
                  <td>
                    <div className="table-action-row">
                      {row.isEditing ? (
                        <button type="button" className="admin-policy-action save" onClick={() => saveRow(row)} disabled={isBusy}>
                          Lưu
                        </button>
                      ) : (
                        <button type="button" className="admin-policy-action" onClick={() => updateRow(row.key, { isEditing: true })} disabled={isBusy}>
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        className="admin-policy-action delete"
                        onClick={() => deleteRow(row)}
                        disabled={isBusy}
                      >
                        Xóa
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

export default PointPolicyTab;
