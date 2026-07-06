import React from "react";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info"
}) {
  if (!isOpen) return null;

  const getHeaderIcon = () => {
    switch (variant) {
      case "danger": return <AlertCircle size={24} color="var(--red)" />;
      case "warning": return <AlertTriangle size={24} color="var(--gold)" />;
      default: return <Info size={24} color="var(--blue)" />;
    }
  };

  const getConfirmButtonClass = () => {
    if (variant === "danger") return "confirm-btn-danger";
    if (variant === "warning") return "confirm-btn-warning";
    return "";
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ width: "420px" }}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {getHeaderIcon()}
            <h2>{title}</h2>
          </div>
          <button className="modal-close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, fontSize: "14px", lineHeight: "1.5", color: "var(--ink)" }}>
            {message}
          </p>
        </div>
        <div className="modal-footer">
          <button className="cancel" onClick={onCancel}>
            {cancelText}
          </button>
          <button className={getConfirmButtonClass()} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
