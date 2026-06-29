import { makeAutoObservable } from "mobx";

const LS_KEY = "wishlist";

export default class WishlistStore {
  _items = [];

  constructor() {
    makeAutoObservable(this);
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
      if (Array.isArray(saved)) this._items = saved;
    } catch {}
  }

  _save() {
    localStorage.setItem(LS_KEY, JSON.stringify(this._items));
  }

  get items() {
    return this._items;
  }

  get count() {
    return this._items.length;
  }

  has(id) {
    return this._items.some((d) => d.id === id);
  }

  toggle(device) {
    if (this.has(device.id)) {
      this._items = this._items.filter((d) => d.id !== device.id);
    } else {
      this._items = [...this._items, device];
    }
    this._save();
  }

  remove(id) {
    this._items = this._items.filter((d) => d.id !== id);
    this._save();
  }

  clear() {
    this._items = [];
    this._save();
  }
}
