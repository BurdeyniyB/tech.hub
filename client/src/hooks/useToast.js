import { useState, useCallback, useRef } from "react";

export const useToast = (duration = 2500) => {
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef(null);

  const showToast = useCallback((msg) => {
    setMessage(msg);
    setVisible(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(false), duration);
  }, [duration]);

  return { showToast, toastVisible: visible, toastMessage: message };
};
