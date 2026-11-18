import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAdminUsers, updateAdminUserStatus, warnAdminUser } from '../utils/adminApi';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [busyUserId, setBusyUserId] = useState('');
  const [warningTargetId, setWarningTargetId] = useState('');
  const [warningText, setWarningText] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminUsers()
      .then((result) => {
        if (isMounted) {
          setUsers(result);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load user accounts.');
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch = !query
        || [user.fullName, user.email, user.phone].some((value) => value?.toLowerCase().includes(query));
      return matchesSearch && (roleFilter === 'all' || user.role === roleFilter);
    });
  }, [users, search, roleFilter]);

  const handleStatusChange = async (user) => {
    const accountStatus = user.accountStatus === 'active' ? 'suspended' : 'active';
    const action = accountStatus === 'suspended' ? 'Suspend' : 'Reactivate';
    if (!window.confirm(`${action} ${user.fullName || user.email}'s account?`)) return;
    setBusyUserId(user.id);
    setErrorMessage('');
    try {
      await updateAdminUserStatus(user.id, accountStatus);
      setUsers((items) => items.map((item) => (
        item.id === user.id ? { ...item, accountStatus } : item
      )));
    } catch (error) {
      setErrorMessage(error.message || 'Could not update this account.');
    } finally {
      setBusyUserId('');
    }
  };

  const handleWarn = async (event, user) => {
    event.preventDefault();
    const reason = warningText.trim();
    if (!reason) return;
    setBusyUserId(user.id);
    setErrorMessage('');
    try {
      const result = await warnAdminUser(user.id, reason);
      setUsers((items) => items.map((item) => (
        item.id === user.id
          ? { ...item, warningCount: result.warningCount }
          : item
      )));
      setWarningTargetId('');
      setWarningText('');
    } catch (error) {
      setErrorMessage(error.message || 'Could not send this warning.');
    } finally {
      setBusyUserId('');
    }
  };

  return (
    <>
      <section className="admin-page-heading">
        <span className="admin-page-eyebrow">ACCOUNT MANAGEMENT</span>
        <h1>Users</h1>
        <p>Review accounts, issue written warnings, and suspend or reactivate access when needed.</p>
      </section>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, or phone"
          aria-label="Search users"
        />
        <select className="admin-filter" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} aria-label="Filter by role">
          <option value="all">All roles</option>
          <option value="owner">Owners</option>
          <option value="tenant">Tenants</option>
          <option value="admin">Admins</option>
        </select>
      </div>
      {errorMessage && <p className="admin-page-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="admin-page-state" role="status">Loading users…</p>}
      {status === 'error' && <section className="admin-page-state">User accounts could not be loaded.</section>}
      {status === 'ready' && (
        filteredUsers.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Verification</th><th>Warnings</th><th>Account</th><th>Joined</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <Link className="admin-user-detail-link admin-table-primary" to={`/admin/users/${encodeURIComponent(user.id)}`}>
                        {user.fullName || 'Member'}
                      </Link>
                      <Link className="admin-user-detail-link admin-table-secondary" to={`/admin/users/${encodeURIComponent(user.id)}`}>
                        {user.email}
                      </Link>
                      {user.phone && <span className="admin-table-secondary">{user.phone}</span>}
                    </td>
                    <td>{user.role}</td>
                    <td>{user.role === 'owner' && user.isVerified ? 'Verified owner' : '—'}</td>
                    <td>{user.warningCount || 0}</td>
                    <td><span className={`admin-status-pill is-${user.accountStatus}`}>{user.accountStatus}</span></td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      {user.role === 'admin' ? <span className="admin-table-secondary">Protected</span> : (
                        <>
                          <div className="admin-user-actions">
                            <button
                              className="admin-table-action"
                              type="button"
                              disabled={busyUserId === user.id}
                              onClick={() => {
                                setWarningTargetId((current) => current === user.id ? '' : user.id);
                                setWarningText('');
                              }}
                            >
                              Give warning
                            </button>
                            <button
                              className={`admin-table-action${user.accountStatus === 'active' ? ' is-danger' : ''}`}
                              type="button"
                              disabled={busyUserId === user.id}
                              onClick={() => handleStatusChange(user)}
                            >
                              {busyUserId === user.id
                                ? 'Saving…'
                                : user.accountStatus === 'active' ? 'Suspend' : 'Reactivate'}
                            </button>
                          </div>
                          {warningTargetId === user.id && (
                            <form className="admin-warning-form" onSubmit={(event) => handleWarn(event, user)}>
                              <label htmlFor={`warning-${user.id}`}>Warning message</label>
                              <textarea
                                id={`warning-${user.id}`}
                                value={warningText}
                                onChange={(event) => setWarningText(event.target.value)}
                                maxLength={300}
                                rows={3}
                                required
                              />
                              <button className="admin-table-action" type="submit" disabled={busyUserId === user.id || !warningText.trim()}>
                                {busyUserId === user.id ? 'Sending…' : 'Send warning'}
                              </button>
                            </form>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <section className="admin-page-state">{search ? 'No users match your search.' : 'There are no user accounts.'}</section>
        )
      )}
    </>
  );
}

export default AdminUsers;
