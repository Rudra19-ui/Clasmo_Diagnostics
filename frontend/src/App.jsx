import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Administration from './pages/Administration';
import Dashboard from './pages/Dashboard';
import ElabPay from './pages/ElabPay';
import Help from './pages/Help';
import Login from './pages/Login';
import Registration from './pages/Registration';
import Reports from './pages/Reports';
import Search from './pages/Search';
import TestResult from './pages/TestResult';
import ReportPreview from './pages/clinical/ReportPreview';
import ResultEntry from './pages/clinical/ResultEntry';
import TestParameterMaster from './pages/clinical/TestParameterMaster';
import DeviceStub from './pages/device/DeviceStub';
import { ROLES } from './utils/roles';
import MessageToLab from './pages/device/MessageToLab';
import PickupRequest from './pages/device/PickupRequest';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/search" replace />} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/registration" element={<ProtectedRoute><Registration /></ProtectedRoute>} />
          <Route path="/test-result" element={<ProtectedRoute><TestResult /></ProtectedRoute>} />
          <Route path="/administration" element={<ProtectedRoute adminOnly><Administration /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/elab-pay" element={<ProtectedRoute><ElabPay /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/clinical/test-parameters" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]}><TestParameterMaster /></ProtectedRoute>} />
          <Route path="/clinical/result-entry" element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.TECHNICIAN]}><ResultEntry /></ProtectedRoute>} />
          <Route path="/clinical/report-preview" element={<ProtectedRoute><ReportPreview /></ProtectedRoute>} />
          <Route path="/device/pickup-request" element={<ProtectedRoute><PickupRequest /></ProtectedRoute>} />
          <Route path="/device/patient-appointment" element={<ProtectedRoute><DeviceStub title="Patient Appointment" description="Schedule home visits and appointments." /></ProtectedRoute>} />
          <Route path="/device/message-to-lab" element={<ProtectedRoute><MessageToLab /></ProtectedRoute>} />
          <Route path="/device/schedular" element={<ProtectedRoute><DeviceStub title="Schedular" description="Collection and trip schedule calendar." /></ProtectedRoute>} />
          <Route path="/device/trip-management" element={<ProtectedRoute><DeviceStub title="Trip Management" description="Active trips list and management." /></ProtectedRoute>} />
          <Route path="/device/batch-upload" element={<ProtectedRoute><DeviceStub title="Batch Upload" description="Upload CSV/XLSX registration batch files."><input type="file" accept=".csv,.xlsx" /></DeviceStub></ProtectedRoute>} />
          <Route path="/device/test-result-batch" element={<ProtectedRoute><DeviceStub title="Test Result Batch" description="Batch import of analyzer results."><input type="file" /></DeviceStub></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/search" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
