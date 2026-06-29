import React, { useEffect, useState } from "react";
import DeviceItem from "./DeviceItem";

const RecentlyViewed = ({ excludeId }) => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
      const filtered = excludeId
        ? stored.filter((d) => d.id !== Number(excludeId))
        : stored;
      setItems(filtered.slice(0, 8));
    } catch {}
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <div className="recently-section">
      <h2 className="recently-title">Recently Viewed</h2>
      <div className="recently-list">
        {items.map((device) => (
          <div key={device.id} className="recently-item">
            <DeviceItem device={device} />
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentlyViewed;
