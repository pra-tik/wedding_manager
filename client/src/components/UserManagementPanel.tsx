import { useEffect, useMemo, useState } from 'react';
import type { AccessLevel, AppPageKey, AuthUser, UserItem } from '../types';

interface UserManagementPanelProps {
  currentUser: AuthUser;
  users: UserItem[];
  onCreateUser: (payload: {
    username: string;
    password: string;
    isAdmin: boolean;
    permissions: Partial<Record<AppPageKey, AccessLevel>>;
  }) => Promise<void>;
  onUpdateUser: (userId: number, payload: { isAdmin: boolean; permissions: Partial<Record<AppPageKey, AccessLevel>> }) => Promise<void>;
  onDeleteUser: (userId: number, username: string) => Promise<void>;
  onResetUserPassword: (userId: number, username: string) => Promise<void>;
}

const pages: AppPageKey[] = ['guests', 'analytics', 'timeline', 'todos', 'imports', 'users', 'stays'];
const levels: AccessLevel[] = ['none', 'read', 'edit'];

function defaultPermissions() {
  return pages.reduce<Record<AppPageKey, AccessLevel>>((acc, page) => {
    acc[page] = 'none';
    return acc;
  }, {} as Record<AppPageKey, AccessLevel>);
}

export function UserManagementPanel({
  currentUser,
  users,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onResetUserPassword
}: UserManagementPanelProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password');
  const [isAdmin, setIsAdmin] = useState(false);
  const [permissions, setPermissions] = useState<Record<AppPageKey, AccessLevel>>(defaultPermissions());
  const [submitting, setSubmitting] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, { isAdmin: boolean; permissions: Record<AppPageKey, AccessLevel> }>>({});
  const [savingUserId, setSavingUserId] = useState<number | null>(null);

  const creatablePermissions = useMemo(
    () => (isAdmin ? pages.reduce<Record<AppPageKey, AccessLevel>>((acc, page) => ({ ...acc, [page]: 'edit' }), {} as Record<AppPageKey, AccessLevel>) : permissions),
    [isAdmin, permissions]
  );

  useEffect(() => {
    const nextDrafts: Record<number, { isAdmin: boolean; permissions: Record<AppPageKey, AccessLevel> }> = {};
    for (const user of users) {
      nextDrafts[user.id] = {
        isAdmin: user.isAdmin,
        permissions: { ...user.permissions }
      };
    }
    setDrafts(nextDrafts);
  }, [users]);

  async function create() {
    setSubmitting(true);
    try {
      await onCreateUser({ username, password, isAdmin, permissions: creatablePermissions });
      setUsername('');
      setPassword('password');
      setIsAdmin(false);
      setPermissions(defaultPermissions());
    } finally {
      setSubmitting(false);
    }
  }

  async function saveUser(user: UserItem) {
    const draft = drafts[user.id];
    if (!draft) {
      return;
    }

    setSavingUserId(user.id);
    try {
      await onUpdateUser(user.id, {
        isAdmin: draft.isAdmin,
        permissions: draft.isAdmin
          ? pages.reduce<Record<AppPageKey, AccessLevel>>((acc, page) => ({ ...acc, [page]: 'edit' }), {} as Record<AppPageKey, AccessLevel>)
          : draft.permissions
      });
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="card space-y-4 p-3 sm:p-5">
        <h3 className="text-base font-semibold text-zinc-900">Add User</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <input className="input" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <input className="input" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <label className="flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-sm">
            <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
            Admin user
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <label key={page} className="space-y-1 rounded-xl border border-zinc-200 px-3 py-2 text-sm">
              <div className="font-medium text-zinc-700">{page}</div>
              <select
                className="input"
                value={isAdmin ? 'edit' : permissions[page]}
                onChange={(e) => setPermissions((prev) => ({ ...prev, [page]: e.target.value as AccessLevel }))}
                disabled={isAdmin}
              >
                {levels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <button className="btn-primary w-full sm:w-auto" onClick={create} disabled={submitting || !username || !password}>
          {submitting ? 'Creating...' : 'Create User'}
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-100 text-zinc-700">
              <tr>
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Admin</th>
                <th className="px-4 py-3 font-medium">Permissions</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-zinc-200">
                  <td className="px-4 py-3 font-medium text-zinc-900">{user.username}</td>
                  <td className="px-4 py-3 text-zinc-700">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={drafts[user.id]?.isAdmin ?? user.isAdmin}
                        onChange={(e) =>
                          setDrafts((prev) => ({
                            ...prev,
                            [user.id]: {
                              isAdmin: e.target.checked,
                              permissions: prev[user.id]?.permissions ?? { ...user.permissions }
                            }
                          }))
                        }
                      />
                      <span>{(drafts[user.id]?.isAdmin ?? user.isAdmin) ? 'Yes' : 'No'}</span>
                    </label>
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    <div className="grid gap-2 md:grid-cols-2">
                      {pages.map((page) => (
                        <label key={page} className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200 px-2 py-1">
                          <span className="text-xs font-medium">{page}</span>
                          <select
                            className="input max-w-[110px] py-1 text-xs"
                            value={(drafts[user.id]?.isAdmin ?? user.isAdmin) ? 'edit' : drafts[user.id]?.permissions?.[page] ?? user.permissions[page]}
                            onChange={(e) =>
                              setDrafts((prev) => ({
                                ...prev,
                                [user.id]: {
                                  isAdmin: prev[user.id]?.isAdmin ?? user.isAdmin,
                                  permissions: {
                                    ...(prev[user.id]?.permissions ?? user.permissions),
                                    [page]: e.target.value as AccessLevel
                                  }
                                }
                              }))
                            }
                            disabled={drafts[user.id]?.isAdmin ?? user.isAdmin}
                          >
                            {levels.map((level) => (
                              <option key={level} value={level}>
                                {level}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button className="btn-muted px-2 py-1 text-xs" onClick={() => saveUser(user)} disabled={savingUserId === user.id}>
                        {savingUserId === user.id ? 'Saving...' : 'Save Access'}
                      </button>
                      <button className="btn-muted px-2 py-1 text-xs" onClick={() => onResetUserPassword(user.id, user.username)}>
                        Reset Password
                      </button>
                      <button
                        className="btn-muted px-2 py-1 text-xs text-rose-700"
                        onClick={() => onDeleteUser(user.id, user.username)}
                        disabled={currentUser.id === user.id}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
