import React from "react";
import { FaCheck } from "react-icons/fa";

const Toast = ({ visible, message }) => (
  <div className={`toast-popup${visible ? " toast-popup--visible" : ""}`} aria-live="polite">
    <FaCheck className="toast-icon" />
    {message}
  </div>
);

export default Toast;
