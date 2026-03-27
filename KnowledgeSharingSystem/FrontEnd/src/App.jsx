import { useEffect, useState } from 'react';
import { apiRequest } from './api';

const initialLogin = { username: '', password: '', adminLogin: false };
const initialRegister = {
  name: '',
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
};
const hasModeratorRole = (role) => role === 'admin' || role === 'moderator';

const roleTabs = {
  user: ['home', 'upload', 'notifications', 'categories'],
  moderator: ['home', 'upload', 'moderation', 'categories'],
  admin: ['home', 'upload', 'moderation', 'categories'],
};

const tabLabel = {
  home: 'Home',
  upload: 'Upload',
  moderation: 'Moderation',
  notifications: 'Notifications',
  categories: 'Categories',
};

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  });
  const [activeTab, setActiveTab] = useState('home');
  const [loginForm, setLoginForm] = useState(initialLogin);
  const [registerForm, setRegisterForm] = useState(initialRegister);
  const [authMode, setAuthMode] = useState('login');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpPreview, setOtpPreview] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  const [categories, setCategories] = useState([]);
  const [docs, setDocs] = useState([]);
  const [pendingDocs, setPendingDocs] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [duplicateByDocId, setDuplicateByDocId] = useState({});

  const [docFilter, setDocFilter] = useState({ keyword: '', categoryId: '', categoryKeyword: '' });
  const [uploadForm, setUploadForm] = useState({ title: '', description: '', categoryNames: '', file: null });
  const [newCategoryForm, setNewCategoryForm] = useState({ name: '', description: '' });

  const isModerator = hasModeratorRole(user?.role);
  const visibleTabs = user?.role ? roleTabs[user.role] || roleTabs.user : [];

  const setSession = (nextToken, nextUser) => {
    setToken(nextToken);
    setUser(nextUser);
    localStorage.setItem('token', nextToken);
    localStorage.setItem('user', JSON.stringify(nextUser));
  };

  const clearSession = () => {
    setToken('');
    setUser(null);
    setActiveTab('home');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const call = async (fn) => {
    setError('');
    setStatus('');
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    }
  };

  const loadCategories = async (keyword = '') => {
    const payload = await apiRequest('/categories', { query: { keyword } });
    setCategories(payload.data || []);
  };

  const loadDocuments = async () => {
    const payload = await apiRequest('/documents', { query: docFilter });
    setDocs(payload.data || []);
  };

  const loadMyDocuments = async () => {
    if (!token) return;
    const payload = await apiRequest('/documents/my-uploaded', { token });
    setMyDocs(payload.data || []);
  };

  const loadPendingDocuments = async (authToken = token) => {
    if (!authToken) return;
    const payload = await apiRequest('/documents/pending', { token: authToken });
    setPendingDocs(payload.data || []);
  };

  const loadNotifications = async () => {
    if (!token || isModerator) {
      setNotifications([]);
      return;
    }
    const payload = await apiRequest('/notifications/my', { token });
    setNotifications(payload.data || []);
  };

  useEffect(() => {
    call(async () => {
      await loadCategories();
      await loadDocuments();
      if (token) {
        await loadMyDocuments();
        await loadNotifications();
        if (hasModeratorRole(user?.role)) {
          await loadPendingDocuments(token);
        }
      }
    });
  }, [token, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (activeTab !== 'moderation' || !token || !isModerator) return;
    call(async () => {
      await loadPendingDocuments(token);
    });
  }, [activeTab, token, isModerator]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authMode !== 'verify-otp' || resendCooldown <= 0) return;
    const timerId = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timerId);
  }, [authMode, resendCooldown]);

  const handleLogin = async (e) => {
    e.preventDefault();
    await call(async () => {
      const path = loginForm.adminLogin ? '/auth/login/admin' : '/auth/login';
      const payload = await apiRequest(path, {
        method: 'POST',
        body: { username: loginForm.username, password: loginForm.password },
      });
      const nextToken = payload.data.token;
      const nextUser = payload.data.user;
      setSession(nextToken, nextUser);
      setActiveTab('home');
      setStatus('Login successful.');
      await loadMyDocuments();
      if (!hasModeratorRole(nextUser?.role)) {
        await loadNotifications();
      }
      if (hasModeratorRole(nextUser?.role)) {
        await loadPendingDocuments(nextToken);
      }
    });
  };

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    await call(async () => {
      const payload = await apiRequest('/auth/register/request-otp', {
        method: 'POST',
        body: registerForm,
      });
      setOtpEmail(payload.data.email);
      setOtpPreview(payload.data.otpPreview || '');
      setAuthMode('verify-otp');
      setResendCooldown(60);
      setStatus('OTP sent. Please check your email.');
    });
  };

  const handleResendOtp = async () => {
    await call(async () => {
      const payload = await apiRequest('/auth/register/request-otp', {
        method: 'POST',
        body: registerForm,
      });
      setOtpEmail(payload.data.email);
      setOtpPreview(payload.data.otpPreview || '');
      setResendCooldown(60);
      setStatus('OTP resent. Please check your email.');
    });
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    await call(async () => {
      await apiRequest('/auth/register/verify-otp', {
        method: 'POST',
        body: {
          email: otpEmail,
          otp: otpCode,
        },
      });
      setStatus('Register successful. Please login now.');
      setAuthMode('login');
      setRegisterForm(initialRegister);
      setOtpCode('');
      setOtpEmail('');
      setOtpPreview('');
    });
  };

  const resolveFileUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://')) return fileUrl;
    return `http://localhost:3000${fileUrl}`;
  };

  const parseCategoryNames = (raw) => {
    if (!raw) return [];
    return [...new Set(raw.split(',').map((name) => name.trim()).filter(Boolean))];
  };

  const ensureCategoryIdsByNames = async (names) => {
    let current = [...categories];
    const ids = [];

    for (const name of names) {
      let found = current.find((c) => c.name.toLowerCase() === name.toLowerCase());

      if (!found) {
        try {
          const created = await apiRequest('/categories', {
            method: 'POST',
            token,
            body: { name, description: '' },
          });
          found = created.data;
          current = [...current, found];
        } catch (e) {
          if (!String(e.message).toLowerCase().includes('already exists')) throw e;
          const refreshed = await apiRequest('/categories', { query: { keyword: name } });
          current = refreshed.data || current;
          found = current.find((c) => c.name.toLowerCase() === name.toLowerCase());
          if (!found) throw new Error(`Cannot resolve category: ${name}`);
        }
      }

      ids.push(found.categoryId);
    }

    setCategories(current);
    return ids;
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    await call(async () => {
      const payload = await apiRequest('/categories', {
        method: 'POST',
        token,
        body: newCategoryForm,
      });
      setUploadForm((prev) => ({
        ...prev,
        categoryNames: prev.categoryNames ? `${prev.categoryNames}, ${payload.data.name}` : payload.data.name,
      }));
      setNewCategoryForm({ name: '', description: '' });
      setStatus('Category created.');
      await loadCategories();
    });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    await call(async () => {
      const names = parseCategoryNames(uploadForm.categoryNames);
      if (!names.length) throw new Error('Please input at least one category name.');

      const categoryIds = await ensureCategoryIdsByNames(names);

      const fd = new FormData();
      fd.append('title', uploadForm.title);
      fd.append('description', uploadForm.description);
      fd.append('categoryIds', categoryIds.join(','));
      if (uploadForm.file) fd.append('documentFile', uploadForm.file);

      await apiRequest('/documents', { method: 'POST', token, body: fd, isForm: true });
      setStatus('Upload successful. Document is pending review.');
      setUploadForm({ title: '', description: '', categoryNames: '', file: null });
      await loadMyDocuments();
      await loadPendingDocuments();
      await loadCategories();
    });
  };

  const moderateDocument = async (documentId, decision) => {
    const note = decision === 'rejected' ? prompt('Rejection reason:') || '' : 'Upload success';
    if (decision === 'rejected' && !note.trim()) return;
    await call(async () => {
      await apiRequest(`/documents/${documentId}/review`, {
        method: 'PATCH',
        token,
        body: { decision, note },
      });
      setStatus(`${decision} document #${documentId} successfully.`);
      await loadPendingDocuments();
      await loadMyDocuments();
    });
  };

  const lockUnlockDelete = async (documentId, action) => {
    await call(async () => {
      if (action === 'delete') {
        await apiRequest(`/documents/${documentId}`, { method: 'DELETE', token });
      } else if (action === 'lock') {
        await apiRequest(`/documents/${documentId}/lock`, {
          method: 'PATCH',
          token,
          body: { reason: 'Reported for review' },
        });
      } else {
        await apiRequest(`/documents/${documentId}/unlock`, {
          method: 'PATCH',
          token,
          body: { note: 'Legit document' },
        });
      }
      setStatus(`${action} document #${documentId} successfully.`);
      await loadDocuments();
      await loadPendingDocuments();
      await loadMyDocuments();
    });
  };

  const loadDuplicateCandidates = async (documentId) => {
    await call(async () => {
      const payload = await apiRequest(`/documents/${documentId}/duplicate-candidates`, { token });
      setDuplicateByDocId((prev) => ({ ...prev, [documentId]: payload.data || [] }));
    });
  };

  const markRead = async (id) => {
    await call(async () => {
      await apiRequest(`/notifications/${id}/read`, { method: 'PATCH', token });
      await loadNotifications();
    });
  };

  const stats = {
    uploads: myDocs.length,
    approved: myDocs.filter((d) => d.status === 'approved').length,
    pending: myDocs.filter((d) => d.status === 'pending').length,
  };

  if (!token) {
    return (
      <div className="auth-shell">
        <div className="auth-left">
          <h1>NeoShare</h1>
          <p>Learning hub for shared documents, moderated quality, and trusted academic collaboration.</p>
          <ul>
            <li>Upload by topic name</li>
            <li>Auto-create categories</li>
            <li>Moderator review workflow</li>
          </ul>
        </div>
        {authMode === 'login' && (
          <form className="auth-card" onSubmit={handleLogin}>
            <h2>Sign in</h2>
            <input
              placeholder="Username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((p) => ({ ...p, username: e.target.value }))}
            />
            <input
              placeholder="Password"
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((p) => ({ ...p, password: e.target.value }))}
            />
            <label className="auth-check">
              <input
                type="checkbox"
                checked={loginForm.adminLogin}
                onChange={(e) => setLoginForm((p) => ({ ...p, adminLogin: e.target.checked }))}
              />
              Use admin login endpoint
            </label>
            <button type="submit" className="primary-btn">Login</button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
                setStatus('');
              }}
            >
              Create account
            </button>
            {error && <p className="err">{error}</p>}
          </form>
        )}

        {authMode === 'register' && (
          <form className="auth-card" onSubmit={handleRequestOtp}>
            <h2>Create account</h2>
            <input
              placeholder="Name"
              value={registerForm.name}
              onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              placeholder="Username"
              value={registerForm.username}
              onChange={(e) => setRegisterForm((p) => ({ ...p, username: e.target.value }))}
            />
            <input
              placeholder="Email"
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm((p) => ({ ...p, email: e.target.value }))}
            />
            <input
              placeholder="Password"
              type="password"
              value={registerForm.password}
              onChange={(e) => setRegisterForm((p) => ({ ...p, password: e.target.value }))}
            />
            <input
              placeholder="Confirm password"
              type="password"
              value={registerForm.confirmPassword}
              onChange={(e) => setRegisterForm((p) => ({ ...p, confirmPassword: e.target.value }))}
            />
            <button type="submit" className="primary-btn">Register & send OTP</button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError('');
                setStatus('');
              }}
            >
              Back to login
            </button>
            {error && <p className="err">{error}</p>}
          </form>
        )}

        {authMode === 'verify-otp' && (
          <form className="auth-card" onSubmit={handleVerifyOtp}>
            <h2>Verify OTP</h2>
            <input value={otpEmail} readOnly />
            <input
              placeholder="Enter OTP code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
            />
            <div className="auth-actions">
              <button type="submit" className="primary-btn">Verify OTP</button>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                title={resendCooldown > 0 ? `Wait ${resendCooldown}s` : 'Resend OTP'}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError('');
                setStatus('');
              }}
            >
              Back
            </button>
            {otpPreview && <p className="hint">Dev OTP: {otpPreview}</p>}
            {error && <p className="err">{error}</p>}
          </form>
        )}
        {status && <p className="ok">{status}</p>}
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">NeoShare</div>
        <div className="profile">
          <div className="avatar">{(user?.name || 'U').slice(0, 1).toUpperCase()}</div>
          <div>
            <div className="profile-name">{user?.name}</div>
            <div className="profile-role">{user?.role}</div>
          </div>
        </div>
        <div className="stats">
          <div><b>{stats.uploads}</b><span>Uploads</span></div>
          <div><b>{stats.approved}</b><span>Approved</span></div>
          <div><b>{stats.pending}</b><span>Pending</span></div>
        </div>
        <div className="menu">
          {visibleTabs.map((tab) => (
            <button
              key={tab}
              className={`menu-item ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tabLabel[tab]}
            </button>
          ))}
        </div>
        <button className="ghost-btn" onClick={clearSession}>Logout</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h1>Knowledge Sharing Workspace</h1>
            <p>API endpoint ready: local backend is connected.</p>
          </div>
          <div className="top-actions">
            <input
              placeholder="Quick search by title..."
              value={docFilter.keyword}
              onChange={(e) => setDocFilter((p) => ({ ...p, keyword: e.target.value }))}
            />
            <button className="primary-btn" onClick={() => call(loadDocuments)}>Search</button>
          </div>
        </header>

        {status && <p className="ok">{status}</p>}
        {error && <p className="err">{error}</p>}

        {activeTab === 'home' && (
          <>
            <section className="panel">
              <h2>Discover Documents</h2>
              <div className="filters">
                <input
                  placeholder="category keyword"
                  value={docFilter.categoryKeyword}
                  onChange={(e) => setDocFilter((p) => ({ ...p, categoryKeyword: e.target.value }))}
                />
                <input
                  placeholder="category id"
                  value={docFilter.categoryId}
                  onChange={(e) => setDocFilter((p) => ({ ...p, categoryId: e.target.value }))}
                />
                <button onClick={() => call(loadDocuments)}>Apply filters</button>
              </div>
              <div className="cards-grid">
                {docs.map((d) => (
                  <article key={d.documentId} className="doc-card">
                    <h3>{d.title}</h3>
                    <p>{d.description || 'No description'}</p>
                    <a href={resolveFileUrl(d.fileUrl)} target="_blank" rel="noreferrer">Open file</a>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              <h2>My uploads</h2>
              <ul className="list">
                {myDocs.map((d) => (
                  <li key={d.documentId}>
                    <span>#{d.documentId} - {d.title}</span>
                    <span className={`badge ${d.status}`}>{d.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        {activeTab === 'upload' && (
          <section className="panel">
            <h2>Upload new document</h2>
            <form className="upload-grid" onSubmit={handleUpload}>
              <input
                placeholder="Title"
                value={uploadForm.title}
                onChange={(e) => setUploadForm((p) => ({ ...p, title: e.target.value }))}
              />
              <input
                placeholder="Description"
                value={uploadForm.description}
                onChange={(e) => setUploadForm((p) => ({ ...p, description: e.target.value }))}
              />
              <input
                list="category-suggestions"
                placeholder="Topic/Category names (Physics, Algebra)"
                value={uploadForm.categoryNames}
                onChange={(e) => setUploadForm((p) => ({ ...p, categoryNames: e.target.value }))}
              />
              <input
                type="file"
                onChange={(e) => setUploadForm((p) => ({ ...p, file: e.target.files?.[0] || null }))}
              />
              <button className="primary-btn" type="submit">Upload</button>
            </form>
            <datalist id="category-suggestions">
              {categories.map((c) => <option key={c.categoryId} value={c.name} />)}
            </datalist>
            <p className="hint">Multiple categories: separate by comma.</p>
          </section>
        )}

        {activeTab === 'moderation' && (
          <section className="panel">
            <h2>Moderation queue</h2>
            {!isModerator ? (
              <p>No permission.</p>
            ) : pendingDocs.length === 0 ? (
              <p>No pending documents.</p>
            ) : (
              <div className="moderation-list">
                {pendingDocs.map((d) => (
                  <article key={d.documentId} className="moderation-item">
                    <h3>#{d.documentId} - {d.title}</h3>
                    <p>Owner: {d.ownerName} ({d.ownerEmail})</p>
                    <p>
                      File: <a href={resolveFileUrl(d.fileUrl)} target="_blank" rel="noreferrer">Open for review</a>
                    </p>
                    <div className="action-row">
                      <button onClick={() => loadDuplicateCandidates(d.documentId)}>Check duplicate</button>
                      <button onClick={() => moderateDocument(d.documentId, 'approved')}>Approve</button>
                      <button onClick={() => moderateDocument(d.documentId, 'rejected')}>Reject</button>
                      <button onClick={() => lockUnlockDelete(d.documentId, 'lock')}>Lock</button>
                      <button onClick={() => lockUnlockDelete(d.documentId, 'unlock')}>Unlock</button>
                      <button className="danger" onClick={() => lockUnlockDelete(d.documentId, 'delete')}>Delete</button>
                    </div>
                    {duplicateByDocId[d.documentId] && (
                      <div className="duplicates-box">
                        {duplicateByDocId[d.documentId].length === 0 ? (
                          <p>No duplicate found.</p>
                        ) : (
                          <ul>
                            {duplicateByDocId[d.documentId].map((dup) => (
                              <li key={`${d.documentId}-${dup.documentId}`}>
                                #{dup.documentId} - {dup.title} ({dup.duplicateReason})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {activeTab === 'notifications' && (
          <section className="panel">
            <h2>Notifications</h2>
            <ul className="list">
              {notifications.map((n) => (
                <li key={n.notificationId}>
                  <div>
                    <b>{n.title}</b>
                    <p>{n.message}</p>
                  </div>
                  {!n.isRead && <button onClick={() => markRead(n.notificationId)}>Mark read</button>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {activeTab === 'categories' && (
          <section className="panel">
            <h2>Category manager</h2>
            <form className="filters" onSubmit={handleCreateCategory}>
              <input
                placeholder="New category name"
                value={newCategoryForm.name}
                onChange={(e) => setNewCategoryForm((p) => ({ ...p, name: e.target.value }))}
              />
              <input
                placeholder="Description"
                value={newCategoryForm.description}
                onChange={(e) => setNewCategoryForm((p) => ({ ...p, description: e.target.value }))}
              />
              <button>Create category</button>
            </form>
            <div className="cards-grid compact">
              {categories.map((c) => (
                <article key={c.categoryId} className="cat-card">
                  <h3>{c.name}</h3>
                  <p>ID #{c.categoryId}</p>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
