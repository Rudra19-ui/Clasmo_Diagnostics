const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('clasmo_token');
}

function handleUnauthorized() {
  localStorage.removeItem('clasmo_token');
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
  }
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const message = data.detail || data.non_field_errors?.[0] || Object.values(data)[0]?.[0] || 'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

async function requestForm(path, formData, method = 'POST') {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Token ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      handleUnauthorized();
    }
    const message = data.detail || data.non_field_errors?.[0] || Object.values(data)[0]?.[0] || 'Request failed';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }
  return data;
}

export const api = {
  login: (username, password, options = {}) =>
    request('/auth/login/', {
      method: 'POST',
      body: JSON.stringify({
        username,
        password,
        save_credentials: Boolean(options.saveCredentials),
        save_info: Boolean(options.saveInfo),
      }),
    }),
  register: (payload) =>
    request('/auth/register/', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  me: () => request('/auth/me/'),
  changePassword: (oldPassword, newPassword) =>
    request('/auth/change-password/', {
      method: 'POST',
      body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
    }),
  getTests: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/tests/${query ? `?${query}` : ''}`);
  },
  getTestCategories: () => request('/test-categories/'),
  getTestPackages: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/test-packages/${query ? `?${query}` : ''}`);
  },
  getReportFormats: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/report-formats/${query ? `?${query}` : ''}`);
  },
  searchRegistrations: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/registrations/${query ? `?${query}` : ''}`);
  },
  getWorksheet: (ids) => request(`/registrations/worksheet/?ids=${ids}`),
  getWorkflowHistory: (id) => request(`/registrations/workflow/?id=${id}`),
  getBarcodeData: (id) => request(`/registrations/barcode/?id=${id}`),
  getBillReceipt: (id) => request(`/registrations/bill-receipt/?id=${id}`),
  getMultipleBillReceipts: (ids) => request(`/registrations/bill-receipt/?ids=${ids}`),
  saveBillReceipt: (payload) =>
    request('/registrations/bill-receipt/', { method: 'PATCH', body: JSON.stringify(payload) }),
  getNotificationPrefill: (id) => request(`/registrations/notifications/?id=${id}`),
  sendNotification: (payload) =>
    request('/registrations/notifications/', { method: 'POST', body: JSON.stringify(payload) }),
  sendBulkNotification: (payload) =>
    request('/registrations/notifications/bulk/', { method: 'POST', body: JSON.stringify(payload) }),
  createRegistration: (payload) =>
    request('/registrations/create/', { method: 'POST', body: JSON.stringify(payload) }),
  getNextLabCode: () => request('/registrations/next-lab-code/'),
  getNextPatientId: () => request('/registrations/next-patient-id/'),
  getRegistration: (labCode) => request(`/registrations/${encodeURIComponent(labCode)}/`),
  updateRegistration: (labCode, payload) =>
    request(`/registrations/${encodeURIComponent(labCode)}/edit/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  addRegistrationTests: (labCode, payload) =>
    request(`/registrations/${encodeURIComponent(labCode)}/add-tests/`, {
      method: 'POST',
      body: JSON.stringify(
        Array.isArray(payload)
          ? { test_ids: payload }
          : payload,
      ),
    }),
  cancelRegistrationTests: (labCode, payload) =>
    request(`/registrations/${encodeURIComponent(labCode)}/cancel-tests/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  generateMrpBill: (labCode, payload = {}) =>
    request(`/registrations/${encodeURIComponent(labCode)}/generate-mrp-bill/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getFranchiseLedger: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/franchise/ledger/${query ? `?${query}` : ''}`);
  },
  getFranchiseSampleUsage: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/franchise/sample-usage/${query ? `?${query}` : ''}`);
  },
  getPatientBarcodes: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/patient-barcodes/${query ? `?${query}` : ''}`);
  },
  lookupPatientBarcode: (barcode) =>
    request(`/patient-barcodes/lookup/?barcode=${encodeURIComponent(barcode)}`),
  scanSampleBarcode: (barcode) =>
    request(`/patient-barcodes/scan/?barcode=${encodeURIComponent(barcode)}`),
  linkPatientBarcodes: (payload) =>
    request('/patient-barcodes/link/', { method: 'POST', body: JSON.stringify(payload) }),
  getDashboardSummary: (params = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value)) {
        value.forEach((item) => query.append(key, item));
      } else {
        query.append(key, value);
      }
    });
    const qs = query.toString();
    return request(`/dashboard/summary/${qs ? `?${qs}` : ''}`);
  },
  getReportSummary: (type) => request(`/reports/summary/?type=${type}`),
  createPickupRequest: (payload) =>
    request('/pickup-requests/', { method: 'POST', body: JSON.stringify(payload) }),
  getPickupRequests: () => request('/pickup-requests/'),
  createMessage: (message) =>
    request('/messages/', { method: 'POST', body: JSON.stringify({ message }) }),
  getMessages: () => request('/messages/'),
  globalSearch: (q) => request(`/search/global/?q=${encodeURIComponent(q)}`),
  getUsers: (params = {}) => {
    const query = new URLSearchParams();
    if (params.role) query.set('role', params.role);
    if (params.is_active) query.set('is_active', params.is_active === true ? 'true' : String(params.is_active));
    const suffix = query.toString() ? `?${query.toString()}` : '';
    return request(`/users/${suffix}`);
  },
  getRoles: () => request('/roles/'),
  getRole: (code) => request(`/roles/${code}/`),
  updateRole: (code, payload) =>
    request(`/roles/${code}/`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateUserRole: (userId, role) =>
    request(`/users/${userId}/role/`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  getMembershipTypes: () => request('/membership-types/'),
  getMemberships: () => request('/memberships/'),
  createMembership: (formData) => requestForm('/memberships/', formData),
  getCollectionCenters: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/collection-centers/${query ? `?${query}` : ''}`);
  },
  createCollectionCenter: (payload) =>
    request('/collection-centers/', { method: 'POST', body: JSON.stringify(payload) }),
  updateCollectionCenter: (id, payload) =>
    request(`/collection-centers/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCollectionCenter: (id) =>
    request(`/collection-centers/${id}/`, { method: 'DELETE' }),
  getAreas: () => request('/areas/'),
  getRateMasters: () => request('/rate-masters/'),
  getCollectionCenterBoys: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/collection-center-boys/${query ? `?${query}` : ''}`);
  },
  createCollectionCenterBoy: (payload) =>
    request('/collection-center-boys/', { method: 'POST', body: JSON.stringify(payload) }),
  updateCollectionCenterBoy: (id, payload) =>
    request(`/collection-center-boys/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCollectionCenterBoy: (id) =>
    request(`/collection-center-boys/${id}/`, { method: 'DELETE' }),
  getDiscountReasons: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/discount-reasons/${query ? `?${query}` : ''}`);
  },
  createDiscountReason: (payload) =>
    request('/discount-reasons/', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiscountReason: (id, payload) =>
    request(`/discount-reasons/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDiscountReason: (id) =>
    request(`/discount-reasons/${id}/`, { method: 'DELETE' }),
  getDiscountAuthorities: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/discount-authorities/${query ? `?${query}` : ''}`);
  },
  createDiscountAuthority: (payload) =>
    request('/discount-authorities/', { method: 'POST', body: JSON.stringify(payload) }),
  updateDiscountAuthority: (id, payload) =>
    request(`/discount-authorities/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDiscountAuthority: (id) =>
    request(`/discount-authorities/${id}/`, { method: 'DELETE' }),
  getWhatsAppLogs: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)),
    ).toString();
    return request(`/whatsapp-logs/${query ? `?${query}` : ''}`);
  },
  getExpenseTypes: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/expense-types/${query ? `?${query}` : ''}`);
  },
  createExpenseType: (payload) =>
    request('/expense-types/', { method: 'POST', body: JSON.stringify(payload) }),
  updateExpenseType: (id, payload) =>
    request(`/expense-types/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteExpenseType: (id) =>
    request(`/expense-types/${id}/`, { method: 'DELETE' }),
  getDoctors: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/doctors/${query ? `?${query}` : ''}`);
  },
  createDoctor: (payload) =>
    request('/doctors/', { method: 'POST', body: JSON.stringify(payload) }),
  updateDoctor: (id, payload) =>
    request(`/doctors/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteDoctor: (id) =>
    request(`/doctors/${id}/`, { method: 'DELETE' }),
  getAffiliations: () => request('/affiliations/'),
  getSalesReferences: () => request('/sales-references/'),
  getPatients: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/patients/${query ? `?${query}` : ''}`);
  },
  getPatient: (id) => request(`/patients/${id}/`),
  createPatient: (payload) =>
    request('/patients/', { method: 'POST', body: JSON.stringify(payload) }),
  updatePatient: (id, payload) =>
    request(`/patients/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deletePatient: (id) =>
    request(`/patients/${id}/`, { method: 'DELETE' }),
  getLabConfiguration: () => request('/lab-configuration/'),
  updateLabConfiguration: (payload) =>
    request('/lab-configuration/', { method: 'PATCH', body: JSON.stringify(payload) }),
  uploadLabQrCode: (formData) => requestForm('/lab-configuration/qr-code/', formData),
  getServiceAreaPincodes: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value)),
    ).toString();
    return request(`/service-area-pincodes/${query ? `?${query}` : ''}`);
  },
  createServiceAreaPincode: (payload) =>
    request('/service-area-pincodes/', { method: 'POST', body: JSON.stringify(payload) }),
  deleteServiceAreaPincode: (id) =>
    request(`/service-area-pincodes/${id}/`, { method: 'DELETE' }),

  submitJoinRequest: (payload) =>
    request('/join-requests/', { method: 'POST', body: JSON.stringify(payload) }),
  submitJoinRequestForm: (formData) => requestForm('/join-requests/', formData),
  getPublicPatientReport: (payload) =>
    request('/public/patient-report/', { method: 'POST', body: JSON.stringify(payload) }),
  getJoinRequests: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)),
    ).toString();
    return request(`/join-requests/${query ? `?${query}` : ''}`);
  },
  updateJoinRequest: (id, payload) =>
    request(`/join-requests/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteJoinRequest: (id) =>
    request(`/join-requests/${id}/`, { method: 'DELETE' }),

  submitSelfPatientQuery: (formData) => requestForm('/self-patient-queries/', formData),
  getSelfPatientQueries: (params = {}) => {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null)),
    ).toString();
    return request(`/self-patient-queries/${query ? `?${query}` : ''}`);
  },
  updateSelfPatientQuery: (id, payload) =>
    request(`/self-patient-queries/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),

  getActivities: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/activities/${query ? `?${query}` : ''}`);
  },
  createActivity: (payload) =>
    request('/activities/', { method: 'POST', body: JSON.stringify(payload) }),
  updateActivity: (id, payload) =>
    request(`/activities/${id}/`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteActivity: (id) =>
    request(`/activities/${id}/`, { method: 'DELETE' }),

  // Clinical module
  getTestParameters: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/test-parameters/${query ? `?${query}` : ''}`);
  },
  createTestParameter: (payload) =>
    request('/test-parameters/', { method: 'POST', body: JSON.stringify(payload) }),
  updateTestParameter: (id, payload) =>
    request(`/test-parameters/${id}/`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTestParameter: (id) =>
    request(`/test-parameters/${id}/`, { method: 'DELETE' }),
  getReport: (registrationId) => request(`/reports/${registrationId}/`),
  submitReport: (registrationId, payload) =>
    request(`/reports/${registrationId}/`, { method: 'POST', body: JSON.stringify(payload) }),
  verifyReport: (registrationId) =>
    request(`/reports/${registrationId}/verify/`, { method: 'PATCH', body: '{}' }),
  ingestInstrumentResults: (payload) =>
    request('/instrument/results/', { method: 'POST', body: JSON.stringify(payload) }),
  getPatientReportByBarcode: (barcode, params = {}) => {
    const query = new URLSearchParams({ barcode, ...params }).toString();
    return request(`/instrument/patient-report/?${query}`);
  },
};
