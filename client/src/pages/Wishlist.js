import React, { useContext } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import { Context } from "..";
import DeviceItem from "../components/DeviceItem";
import { STORE_ROUTE } from "../utils/const";
import { FaRegHeart } from "react-icons/fa";

const Wishlist = observer(() => {
  const { wishlist } = useContext(Context);
  const navigate = useNavigate();

  return (
    <div className="wishlist-page">
      <div className="wishlist-header">
        <h1 className="wishlist-title">Wishlist</h1>
        {wishlist.count > 0 && (
          <span className="wishlist-count">{wishlist.count} item{wishlist.count !== 1 ? "s" : ""}</span>
        )}
        {wishlist.count > 0 && (
          <button className="wishlist-clear" onClick={() => wishlist.clear()}>
            Clear all
          </button>
        )}
      </div>

      {wishlist.count === 0 ? (
        <div className="wishlist-empty">
          <FaRegHeart className="wishlist-empty-icon" />
          <p>Your wishlist is empty</p>
          <button className="wishlist-go-store" onClick={() => navigate(STORE_ROUTE)}>
            Browse catalog
          </button>
        </div>
      ) : (
        <div className="device-list-container">
          {wishlist.items.map((device) => (
            <DeviceItem key={device.id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
});

export default Wishlist;
