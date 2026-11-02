import { useEffect, useMemo, useState } from 'react';
import { getAdminPosts, removeAdminPost } from '../utils/adminApi';

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [busyPostId, setBusyPostId] = useState('');

  useEffect(() => {
    let isMounted = true;
    getAdminPosts()
      .then((result) => {
        if (isMounted) {
          setPosts(result);
          setStatus('ready');
        }
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(error.message || 'Could not load property posts.');
          setStatus('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => (
      [post.title, post.city, post.location, post.owner.fullName, post.owner.email]
        .some((value) => value?.toLowerCase().includes(query))
    ));
  }, [posts, search]);

  const handleRemove = async (post) => {
    if (!window.confirm(`Permanently remove "${post.title}"? This will remove it from public listings.`)) return;
    setBusyPostId(post.id);
    setErrorMessage('');
    try {
      await removeAdminPost(post.id);
      setPosts((items) => items.filter((item) => item.id !== post.id));
    } catch (error) {
      setErrorMessage(error.message || 'Could not remove this post.');
    } finally {
      setBusyPostId('');
    }
  };

  return (
    <>
      <section className="admin-page-heading">
        <span className="admin-page-eyebrow">CONTENT MODERATION</span>
        <h1>Property posts</h1>
        <p>Review published listings and remove posts that should no longer be on the platform.</p>
      </section>
      <div className="admin-toolbar">
        <input
          className="admin-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search title, location, or owner"
          aria-label="Search property posts"
        />
        <span className="admin-table-secondary">{status === 'ready' ? `${filteredPosts.length} posts` : ''}</span>
      </div>
      {errorMessage && <p className="admin-page-error" role="alert">{errorMessage}</p>}
      {status === 'loading' && <p className="admin-page-state" role="status">Loading property posts…</p>}
      {status === 'error' && <section className="admin-page-state">Property posts could not be loaded.</section>}
      {status === 'ready' && (
        filteredPosts.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Property</th><th>Owner</th><th>Rent</th><th>Status</th><th>Posted</th><th>Action</th></tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id}>
                    <td>
                      <span className="admin-table-primary">{post.title}</span>
                      <span className="admin-table-secondary">{[post.location, post.city].filter(Boolean).join(', ')}</span>
                    </td>
                    <td>
                      <span className="admin-table-primary">{post.owner.fullName || 'Owner'}</span>
                      <span className="admin-table-secondary">{post.owner.email}</span>
                    </td>
                    <td>৳{Number(post.monthlyRent || 0).toLocaleString()}</td>
                    <td><span className={`admin-status-pill is-${post.status.toLowerCase()}`}>{post.status}</span></td>
                    <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '—'}</td>
                    <td>
                      <button
                        className="admin-table-action is-danger"
                        type="button"
                        disabled={busyPostId === post.id}
                        onClick={() => handleRemove(post)}
                      >
                        {busyPostId === post.id ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <section className="admin-page-state">{search ? 'No posts match your search.' : 'There are no property posts yet.'}</section>
        )
      )}
    </>
  );
}

export default AdminPosts;
