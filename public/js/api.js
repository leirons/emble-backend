(function () {
  const STORAGE_KEY = 'emble.auth';

  function loadAuth() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || null;
    } catch {
      return null;
    }
  }
  function saveAuth(auth) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }
  function clearAuth() {
    localStorage.removeItem(STORAGE_KEY);
  }

  let refreshing = null;

  async function refreshTokens() {
    const auth = loadAuth();
    if (!auth || !auth.refreshToken) throw new Error('no refresh token');
    const res = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: auth.refreshToken }),
    });
    if (!res.ok) throw new Error('refresh failed');
    const data = await res.json();
    saveAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
    return data.accessToken;
  }

  async function request(path, { method = 'GET', body, auth = true, retry = true, isFormData = false } = {}) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';
    if (auth) {
      const stored = loadAuth();
      if (stored && stored.accessToken) headers.Authorization = `Bearer ${stored.accessToken}`;
    }
    const res = await fetch(path, {
      method,
      headers,
      body: isFormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 401 && auth && retry) {
      try {
        if (!refreshing) refreshing = refreshTokens().finally(() => { refreshing = null; });
        await refreshing;
        return request(path, { method, body, auth, retry: false, isFormData });
      } catch {
        clearAuth();
        throw new ApiError('Сессия истекла, войдите снова', 401);
      }
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try { data = JSON.parse(text); } catch { data = null; }
    }

    if (!res.ok) {
      let message = (data && data.error && data.error.message) || `Ошибка запроса (${res.status})`;
      const fieldErrors = data && data.error && data.error.details && data.error.details.fieldErrors;
      if (fieldErrors) {
        const detail = Object.values(fieldErrors).flat().filter(Boolean).join('; ');
        if (detail) message = `${message}: ${detail}`;
      }
      throw new ApiError(message, res.status, data);
    }
    return data;
  }

  class ApiError extends Error {
    constructor(message, status, data) {
      super(message);
      this.status = status;
      this.data = data;
    }
  }

  window.EmbleApi = {
    ApiError,
    loadAuth,
    saveAuth,
    clearAuth,
    isAuthed: () => !!(loadAuth() && loadAuth().accessToken),
    register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
    login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
    logout: async () => {
      const auth = loadAuth();
      try {
        if (auth && auth.refreshToken) {
          await request('/auth/logout', { method: 'POST', body: { refreshToken: auth.refreshToken }, auth: false });
        }
      } finally {
        clearAuth();
      }
    },
    me: () => request('/auth/me'),
    listTemplates: () => request('/agents/templates'),
    listAgents: () => request('/agents'),
    getAgent: (id) => request(`/agents/${id}`),
    createAgent: (payload) => request('/agents', { method: 'POST', body: payload }),
    updateAgent: (id, payload) => request(`/agents/${id}`, { method: 'PATCH', body: payload }),
    deleteAgent: (id) => request(`/agents/${id}`, { method: 'DELETE' }),
    publishAgent: (id) => request(`/agents/${id}/publish`, { method: 'POST' }),
    unpublishAgent: (id) => request(`/agents/${id}/unpublish`, { method: 'POST' }),
    updateBranding: (id, payload) => request(`/agents/${id}/branding`, { method: 'PATCH', body: payload }),
    listDomains: (id) => request(`/agents/${id}/domains`),
    addDomain: (id, domain) => request(`/agents/${id}/domains`, { method: 'POST', body: { domain } }),
    removeDomain: (id, domainId) => request(`/agents/${id}/domains/${domainId}`, { method: 'DELETE' }),

    getSettings: (id) => request(`/agents/${id}/settings`),
    updateSettings: (id, payload) => request(`/agents/${id}/settings`, { method: 'PATCH', body: payload }),

    getAnalytics: (id, days) => request(`/agents/${id}/analytics${days ? `?days=${days}` : ''}`),
    resolveUnanswered: (id, questionId) => request(`/agents/${id}/analytics/unanswered/${questionId}/resolve`, { method: 'POST' }),
    listLeads: (id) => request(`/agents/${id}/leads?limit=500`),
    getConversationMessages: (id, conversationId) => request(`/agents/${id}/conversations/${conversationId}/messages`),
    exportLeadsCsv: async (id) => {
      const auth = loadAuth();
      const res = await fetch(`/agents/${id}/leads/export.csv`, { headers: auth && auth.accessToken ? { Authorization: `Bearer ${auth.accessToken}` } : {} });
      if (!res.ok) throw new ApiError('Не удалось выгрузить CSV', res.status);
      return res.blob();
    },

    // --- База знаний ---
    listKnowledge: (id) => request(`/agents/${id}/knowledge`),
    addKnowledgeUrl: (id, payload) => request(`/agents/${id}/knowledge/url`, { method: 'POST', body: payload }),
    addKnowledgeText: (id, payload) => request(`/agents/${id}/knowledge/text`, { method: 'POST', body: payload }),
    addKnowledgeFile: (id, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request(`/agents/${id}/knowledge/file`, { method: 'POST', body: fd, isFormData: true });
    },
    updateKnowledgeSource: (id, sourceId, payload) =>
      request(`/agents/${id}/knowledge/${sourceId}`, { method: 'PATCH', body: payload }),
    resyncKnowledgeSource: (id, sourceId) => request(`/agents/${id}/knowledge/${sourceId}/resync`, { method: 'POST' }),
    deleteKnowledgeSource: (id, sourceId) => request(`/agents/${id}/knowledge/${sourceId}`, { method: 'DELETE' }),

    // --- Q&A ---
    listQaPairs: (id) => request(`/agents/${id}/knowledge/qa`),
    createQaPair: (id, payload) => request(`/agents/${id}/knowledge/qa`, { method: 'POST', body: payload }),
    updateQaPair: (id, qaId, payload) => request(`/agents/${id}/knowledge/qa/${qaId}`, { method: 'PATCH', body: payload }),
    deleteQaPair: (id, qaId) => request(`/agents/${id}/knowledge/qa/${qaId}`, { method: 'DELETE' }),

    // --- Каталог товаров ---
    listProducts: (id) => request(`/agents/${id}/knowledge/products`),
    createProduct: (id, payload) => request(`/agents/${id}/knowledge/products`, { method: 'POST', body: payload }),
    updateProduct: (id, productId, payload) =>
      request(`/agents/${id}/knowledge/products/${productId}`, { method: 'PATCH', body: payload }),
    deleteProduct: (id, productId) => request(`/agents/${id}/knowledge/products/${productId}`, { method: 'DELETE' }),
    clearProducts: (id) => request(`/agents/${id}/knowledge/products`, { method: 'DELETE' }),
    importProducts: (id, file) => {
      const fd = new FormData();
      fd.append('file', file);
      return request(`/agents/${id}/knowledge/products/import`, { method: 'POST', body: fd, isFormData: true });
    },
    importProductsFromUrl: (id, payload) =>
      request(`/agents/${id}/knowledge/products/import-url`, { method: 'POST', body: payload }),
    previewFeed: (id, payload) =>
      request(`/agents/${id}/knowledge/products/import-url/preview`, { method: 'POST', body: payload }),
    importJobStatus: (id, jobId) =>
      request(`/agents/${id}/knowledge/products/import-jobs/${jobId}`),

    // --- Сценарии (flows) ---
    listFlows: (id) => request(`/agents/${id}/flows`),
    createFlow: (id, payload) => request(`/agents/${id}/flows`, { method: 'POST', body: payload }),
    updateFlow: (id, flowId, payload) => request(`/agents/${id}/flows/${flowId}`, { method: 'PATCH', body: payload }),
    deleteFlow: (id, flowId) => request(`/agents/${id}/flows/${flowId}`, { method: 'DELETE' }),
    activateFlow: (id, flowId) => request(`/agents/${id}/flows/${flowId}/activate`, { method: 'POST' }),
    deactivateFlow: (id, flowId) => request(`/agents/${id}/flows/${flowId}/deactivate`, { method: 'POST' }),

    // --- Custom actions ---
    listActions: (id) => request(`/agents/${id}/actions`),
    createAction: (id, payload) => request(`/agents/${id}/actions`, { method: 'POST', body: payload }),
    updateAction: (id, actionId, payload) => request(`/agents/${id}/actions/${actionId}`, { method: 'PATCH', body: payload }),
    deleteAction: (id, actionId) => request(`/agents/${id}/actions/${actionId}`, { method: 'DELETE' }),
    listActionLogs: (id, actionId) => request(`/agents/${id}/actions/${actionId}/logs`),
    testAction: (id, payload) => request(`/agents/${id}/actions/test`, { method: 'POST', body: payload }),
  };
})();
