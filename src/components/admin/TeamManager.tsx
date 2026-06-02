'use client';

import { useActionState, useState } from 'react';
import {
  addAdmin,
  updateMember,
  type TeamFormState,
} from '@/app/admin/(panel)/team/actions';
import { GRANTABLE_PAGES } from '@/lib/admin/pages';

export type TeamMember = {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  pages: string[];
};

const initial: TeamFormState = {};
const INPUT =
  'mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm';

export default function TeamManager({ members }: { members: TeamMember[] }) {
  return (
    <div className="space-y-8">
      <AddAdminForm />

      <section className="space-y-4">
        <h2 className="font-semibold">Admins ({members.length})</h2>
        {members.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-600">
            No admins yet. Add the first one above.
          </div>
        ) : (
          <ul className="space-y-4">
            {members.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ---------- Add admin ----------

function AddAdminForm() {
  const [state, action, pending] = useActionState(addAdmin, initial);
  const err = (k: string) => state.fieldErrors?.[k];

  return (
    <section className="space-y-4 rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <div>
        <h2 className="font-semibold">Add an admin</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Creates a new login with the password you set so they can sign in
          right away. If a login already exists for the email, it&apos;s promoted
          instead and the password is left unchanged.
        </p>
      </div>

      {state.error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{state.error}</div>
      )}
      {state.saved && (
        <div className="rounded-md bg-green-50 p-3 text-sm text-green-800">
          ✓ {state.message ?? 'Admin added.'}
        </div>
      )}

      <form action={action} className="grid gap-4 sm:grid-cols-2 sm:items-start">
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Email</span>
          <input name="email" type="email" placeholder="staff@waronretail.com" className={INPUT} />
          {err('email') && <span className="mt-1 block text-xs text-red-600">{err('email')}</span>}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Full name</span>
          <input name="full_name" type="text" placeholder="Jane Doe" className={INPUT} />
          {err('full_name') && (
            <span className="mt-1 block text-xs text-red-600">{err('full_name')}</span>
          )}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Temporary password</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            className={INPUT}
          />
          {err('password') ? (
            <span className="mt-1 block text-xs text-red-600">{err('password')}</span>
          ) : (
            <span className="mt-1 block text-xs text-gray-500">
              Share it with them; they can change it later via “Forgot password”.
            </span>
          )}
        </label>
        <label className="block text-sm">
          <span className="font-medium text-gray-700">Role</span>
          <select name="role" defaultValue="admin" className={INPUT}>
            <option value="admin">Admin</option>
            <option value="super_admin">Super admin</option>
          </select>
        </label>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {pending ? 'Adding…' : 'Add admin'}
          </button>
        </div>
      </form>
    </section>
  );
}

// ---------- One admin row ----------

function MemberRow({ member }: { member: TeamMember }) {
  const [state, action, pending] = useActionState(updateMember, initial);
  const [role, setRole] = useState<TeamMember['role']>(member.role);
  const isSuper = role === 'super_admin';

  return (
    <li className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
      <form action={action} className="space-y-4">
        <input type="hidden" name="admin_user_id" value={member.id} />

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900">{member.full_name}</p>
            <p className="text-sm text-gray-500">{member.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-sm">
              <span className="mr-2 font-medium text-gray-700">Role</span>
              <select
                name="role"
                value={role}
                onChange={(e) => setRole(e.target.value as TeamMember['role'])}
                className="rounded-md border-gray-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super admin</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={member.is_active}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="font-medium text-gray-700">Active</span>
            </label>
          </div>
        </div>

        {isSuper ? (
          <p className="rounded-md bg-blue-50 p-3 text-xs text-blue-900">
            Super admins have access to every section, including Team.
          </p>
        ) : (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-gray-700">Section access</legend>
            <p className="text-xs text-gray-500">
              The dashboard is always available. Tick the other sections this
              admin may use.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {GRANTABLE_PAGES.map((p) => (
                <label key={p.key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="pages"
                    value={p.key}
                    defaultChecked={member.pages.includes(p.key)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span aria-hidden>{p.icon}</span>
                  <span className="text-gray-700">{p.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 disabled:opacity-60"
          >
            {pending ? 'Saving…' : 'Save'}
          </button>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          {state.saved && <span className="text-sm text-green-700">✓ Saved</span>}
        </div>
      </form>
    </li>
  );
}
