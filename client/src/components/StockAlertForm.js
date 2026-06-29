import React, { useState } from "react";
import { FaBell, FaCheck } from "react-icons/fa";
import { subscribeStockAlert } from "../http/deviceAPI";

const StockAlertForm = ({ deviceId, compact = false }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setError("");
    try {
      await subscribeStockAlert(deviceId, email);
      setDone(true);
      setOpen(false);
    } catch (err) {
      setError(err?.response?.data?.error || "Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className={`stock-alert-done${compact ? " stock-alert-done--compact" : ""}`}>
        <FaCheck /> We'll notify you!
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className={`stock-alert-btn${compact ? " stock-alert-btn--compact" : ""}`}
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        type="button"
      >
        <FaBell /> {compact ? "Notify me" : "Notify me when back in stock"}
      </button>
    );
  }

  return (
    <form
      className={`stock-alert-form${compact ? " stock-alert-form--compact" : ""}`}
      onSubmit={handleSubmit}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        className="stock-alert-input"
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoFocus
        required
      />
      <button className="stock-alert-submit" type="submit" disabled={loading}>
        {loading ? <span className="stock-alert-spinner" /> : <FaBell />}
      </button>
      {error && <span className="stock-alert-error">{error}</span>}
    </form>
  );
};

export default StockAlertForm;
