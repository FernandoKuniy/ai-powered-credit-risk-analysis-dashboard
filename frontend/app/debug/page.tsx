"use client";
import { useAuth } from "../../lib/auth";

export default function AuthDebug() {
  const { user, session, loading } = useAuth();

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Authentication Debug</h3>
      <div className="space-y-2 text-sm">
        <div><strong>Loading:</strong> {loading ? 'true' : 'false'}</div>
        <div><strong>Session:</strong> {session ? 'exists' : 'null'}</div>
        <div><strong>User:</strong> {user ? 'exists' : 'null'}</div>
        {user && (
          <>
            <div><strong>User ID:</strong> {user.id}</div>
            <div><strong>Email:</strong> {user.email}</div>
            <div><strong>Role:</strong> {user.profile.role}</div>
          </>
        )}
        {session && (
          <>
            <div><strong>Access Token:</strong> {session.access_token ? 'exists' : 'null'}</div>
          </>
        )}
      </div>
    </div>
  );
}
