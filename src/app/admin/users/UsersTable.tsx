"use client";

import { useEffect, useState } from "react";
import { AdminUser } from "./types";
import { UserRow } from "./UserRow";
import { UserSearch } from "./UserSearch";

export function UsersTable() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/users", {
    cache: "no-store",
    credentials: "include",
    });
    const json = await res.json();
    setUsers(json.users);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function saveName(id: string, name: string) {
    await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    credentials: "include", // 👈 REQUIRED
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
    },
    body: JSON.stringify({ display_name: name }),
    });
    await load();
  }

  const filtered = users.filter((u) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        <UserSearch value={search} onChange={setSearch} />
      </div>

      {loading ? (
        <div>Loading users…</div>
      ) : (
        <div style={{ border: "1px solid #ddd", borderRadius: 8 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "3fr 2fr 2fr 2fr 120px",
              gap: 12,
              padding: 10,
              fontWeight: 700,
              background: "#fafafa",
            }}
          >
            <div>ایمیل</div>
            <div>نام نمایشی</div>
            <div>تاریخ ایجاد</div>
            <div>آخرین ورود</div>
            <div />
          </div>

          {filtered.map((u) => (
            <UserRow key={u.id} user={u} onSave={saveName} />
          ))}
        </div>
      )}
    </div>
  );
}
