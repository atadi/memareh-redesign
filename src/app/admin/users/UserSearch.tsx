"use client";

export function UserSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      placeholder="جستجوی ایمیل کاربران..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: 8,
        width: 280,
        border: "1px solid #ccc",
        borderRadius: 6,
      }}
    />
  );
}
