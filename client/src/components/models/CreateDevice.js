import React, { useContext, useEffect, useState } from "react";
import { Context } from "../../";
import { createDevice, fetchBrands, fetchTypes } from "../../http/deviceAPI";
import { observer } from "mobx-react-lite";
import { MdClose, MdAdd, MdDelete, MdCloudUpload } from "react-icons/md";

const CreateDevice = observer(({ show, onHide }) => {
  const { device } = useContext(Context);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [sale, setSale] = useState("");
  const [inStock, setInStock] = useState(true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [info, setInfo] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!show) return;
    fetchTypes().then((data) => device.setTypes(data));
    fetchBrands().then((data) => device.setBrands(data));
  }, [show, device]);

  useEffect(() => {
    if (show) return;
    setName(""); setDescription(""); setPrice(""); setSale("");
    setInStock(true); setFile(null); setPreview(null); setInfo([]);
  }, [show]);

  useEffect(() => {
    if (!show) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [show]);

  const selectFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const addInfo = () =>
    setInfo((prev) => [...prev, { title: "", description: "", number: Date.now() }]);
  const removeInfo = (number) =>
    setInfo((prev) => prev.filter((i) => i.number !== number));
  const changeInfo = (key, value, number) =>
    setInfo((prev) => prev.map((i) => (i.number === number ? { ...i, [key]: value } : i)));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", String(price));
      if (sale) formData.append("sale", String(sale));
      formData.append("inStock", String(inStock));
      formData.append("img", file);
      formData.append("brandId", device.selectedBrand.id);
      formData.append("typeId", device.selectedType.id);
      formData.append("info", JSON.stringify(info));
      await createDevice(formData);
      onHide();
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="cd-overlay" onClick={onHide}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>

        <div className="cd-header">
          <span className="cd-title">Add Device</span>
          <button className="cd-close" onClick={onHide} aria-label="Close">
            <MdClose />
          </button>
        </div>

        <div className="cd-body">
          <div className="cd-row-2">
            <div className="cd-field">
              <label className="cd-label">Type</label>
              <select
                className="cd-select"
                value={device.selectedType?.id || ""}
                onChange={(e) => {
                  const t = device.types.find((t) => String(t.id) === e.target.value);
                  if (t) device.setSelectedType(t);
                }}
              >
                <option value="">Choose type</option>
                {device.types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="cd-field">
              <label className="cd-label">Brand</label>
              <select
                className="cd-select"
                value={device.selectedBrand?.id || ""}
                onChange={(e) => {
                  const b = device.brands.find((b) => String(b.id) === e.target.value);
                  if (b) device.setSelectedBrand(b);
                }}
              >
                <option value="">Choose brand</option>
                {device.brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="cd-field">
            <label className="cd-label">Name</label>
            <input
              className="cd-input"
              placeholder="e.g. Samsung Galaxy S24, 256GB"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="cd-field">
            <label className="cd-label">Description</label>
            <textarea
              className="cd-textarea"
              placeholder="Product description…"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="cd-row-2">
            <div className="cd-field">
              <label className="cd-label">Price ($)</label>
              <input
                className="cd-input"
                type="number"
                min={0}
                placeholder="0.00"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="cd-field">
              <label className="cd-label">Sale (%)</label>
              <input
                className="cd-input"
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={sale}
                onChange={(e) => setSale(e.target.value)}
              />
            </div>
          </div>

          <label className="cd-checkbox-row">
            <input
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
            />
            <span>In Stock</span>
          </label>

          <div className="cd-field">
            <label className="cd-label">Image</label>
            <label className="cd-upload">
              {preview ? (
                <img src={preview} alt="preview" className="cd-upload-preview" />
              ) : (
                <>
                  <MdCloudUpload className="cd-upload-icon" />
                  <span className="cd-upload-hint">Click to upload</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                className="cd-upload-input"
                onChange={selectFile}
              />
            </label>
          </div>

          <div className="cd-specs-header">
            <span className="cd-label" style={{ margin: 0 }}>Specifications</span>
            <button className="cd-add-spec" type="button" onClick={addInfo}>
              <MdAdd /> Add property
            </button>
          </div>

          {info.map((i) => (
            <div key={i.number} className="cd-spec-row">
              <input
                className="cd-input"
                placeholder="Property name"
                value={i.title}
                onChange={(e) => changeInfo("title", e.target.value, i.number)}
              />
              <input
                className="cd-input"
                placeholder="Value"
                value={i.description}
                onChange={(e) => changeInfo("description", e.target.value, i.number)}
              />
              <button
                className="cd-spec-remove"
                type="button"
                onClick={() => removeInfo(i.number)}
              >
                <MdDelete />
              </button>
            </div>
          ))}
        </div>

        <div className="cd-footer">
          <button className="cd-btn-cancel" onClick={onHide} disabled={saving}>
            Cancel
          </button>
          <button
            className="cd-btn-submit"
            onClick={handleSubmit}
            disabled={saving || !name.trim() || !price}
          >
            {saving ? "Adding…" : "Add Device"}
          </button>
        </div>

      </div>
    </div>
  );
});

export default CreateDevice;
