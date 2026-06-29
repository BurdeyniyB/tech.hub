import React, { useEffect, useRef, useState } from "react";
import { FaRobot, FaTimes, FaPaperPlane } from "react-icons/fa";
import { adminAiChat, getDashboardStats } from "../../http/dashboardAPI";

const AdminAiChat = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const inputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    if (!stats) getDashboardStats("30d").then(setStats).catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleToggle = () => setOpen((prev) => !prev);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const history = updated.slice(0, -1);
      const { reply } = await adminAiChat(text, history, stats);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className={`admin-ai-overlay ${open ? "admin-ai-overlay--visible" : ""}`}
        onClick={handleToggle}
      />

      <aside className={`admin-ai-drawer ${open ? "admin-ai-drawer--open" : ""}`}>
        <div className="admin-ai-header">
          <FaRobot className="admin-ai-header-icon" />
          <span>AI Assistant</span>
          <button className="admin-ai-close" onClick={handleToggle} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        <div className="admin-ai-messages">
          {messages.length === 0 && (
            <p className="admin-ai-empty">
              Ask me anything about your store — revenue trends, top products, order patterns, or business recommendations.
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`admin-ai-msg admin-ai-msg--${msg.role}`}>
              {msg.content}
            </div>
          ))}
          {loading && (
            <div className="admin-ai-msg admin-ai-msg--assistant admin-ai-typing">
              <span /><span /><span />
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="admin-ai-form" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="admin-ai-input"
            type="text"
            placeholder="Ask about revenue, orders, products…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button
            className="admin-ai-send"
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send"
          >
            {loading ? <span className="admin-ai-spinner" /> : <FaPaperPlane />}
          </button>
        </form>
      </aside>

      <button
        className={`admin-ai-fab ${open ? "active" : ""}`}
        onClick={handleToggle}
        aria-label="AI Assistant"
      >
        <FaRobot />
        <span>AI</span>
      </button>
    </>
  );
};

export default AdminAiChat;
