import { UsersTable } from "./UsersTable";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>
        مدیریت کاربران
      </h1>

      <UsersTable />
    </div>
  );
}
