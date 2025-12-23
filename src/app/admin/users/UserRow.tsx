"use client";

import { useState } from "react";
import { AdminUser } from "./types";

export function UserRow({
  user,
  onSave,
}: {
  user: AdminUser;
  onSave: (id: string, name: string) => Promise<void>;
}) {
  const [value, setValue] = useState(user.display_name);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(user.id, value);
    setSaving(false);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "3fr 2fr 2fr 2fr 120px",
        gap: 12,
        padding: 10,
        borderBottom: "1px solid #eee",
        alignItems: "center",
      }}
    >
      <div>{user.email}</div>

      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{ padding: 6 }}
      />

      <div>{new Date(user.created_at).toLocaleDateString()}</div>
      <div>
        {user.last_sign_in_at
          ? new Date(user.last_sign_in_at).toLocaleDateString()
          : "—"}
      </div>

      <button onClick={handleSave} disabled={saving}>
        {saving ? "در حال ذخیره..." : "ذخیره"}
      </button>
    </div>
  );
}
