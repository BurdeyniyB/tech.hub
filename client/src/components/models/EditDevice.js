import React, { useEffect, useState } from "react";
import { updateDevice, fetchBrands, fetchTypes } from "../../http/deviceAPI";
import { MdClose, MdCloudUpload } from "react-icons/md";

const EditDevice = ({ device, onHide }) => {
  const [name, setName] = useState(device.name || "");
  const [description, setDescription] = useState(device.description || "");
  const [price, setPrice] = useState(device.price || "");
  const [sale, setSale] = useState(device.sale || "");
  const [inStock, setInStock] = useState(device.inStock ?? true);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [brands, setBrands] = useState([]);
  const [types, setTypes] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState({ id: device.brandId, name: "" });
  const [selectedType, setSelectedType] = useState({ id: device.typeId, name: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBrands().then((data) => {
      setBrands(data);
      const found = data.find((b) => b.id === device.brandId);
      if (found) setSelectedBrand(found);
    });
    fetchTypes().then((data) => {
      setTypes(data);
      const found = data.find((t) => t.id === device.typeId);
      if (found) setSelectedType(found);
    });
  }, [device.brandId, device.typeId]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const selectFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", String(price));
      formData.append("sale", String(sale || 0));
      formData.append("inStock", String(inStock));
      if (selectedBrand.id) formData.append("brandId", String(selectedBrand.id));
      if (selectedType.id) formData.append("typeId", String(selectedType.id));
      if (file) formData.append("img", file);
      await updateDevice(device.id, formData);
      onHide();
    } catch (e) {
      console.error("Failed to update device:", e);
    } finally {
      setSaving(false);
    }
  };

  const currentImg = preview || (Array.isArray(device.img) ? device.img[0] : device.img);

  return (
    <div className="cd-overlay" onClick={onHide}>
      <div className="cd-modal" onClick={(e) => e.stopPropagation()}>

        <div className="cd-header">
          <span className="cd-title">
            Edit Device <span className="cd-title-id">#{device.id}</span>
          </span>
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
                value={selectedType?.id || ""}
                onChange={(e) => {
                  const t = types.find((t) => String(t.id) === e.target.value);
                  if (t) setSelectedType(t);
                }}
              >
                <option value="">Choose type</option>
                {types.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="cd-field">
              <label className="cd-label">Brand</label>
              <select
                className="cd-select"
                value={selectedBrand?.id || ""}
                onChange={(e) => {
                  const b = brands.find((b) => String(b.id) === e.target.value);
                  if (b) setSelectedBrand(b);
                }}
              >
                <option value="">Choose brand</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="cd-field">
            <label className="cd-label">Name</label>
            <input
              className="cd-input"
              placeholder="Device name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="cd-field">
            <label className="cd-label">Description</label>
            <textarea
              className="cd-textarea"
              placeholder="Description"
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
              {currentImg ? (
                <img src={currentImg} alt="preview" className="cd-upload-preview" />
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
        </div>

        <div className="cd-footer">
          <button className="cd-btn-cancel" onClick={onHide} disabled={saving}>
            Cancel
          </button>
          <button
            className="cd-btn-submit"
            onClick={handleSave}
            disabled={saving || !name.trim()}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

      </div>
    </div>
  );
};

export default EditDevice;
