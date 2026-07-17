import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import Administration from './pages/Administration';
import AdminModule from './pages/admin/AdminModule';
import ChangePassword from './pages/admin/ChangePassword';
import RoleManagement from './pages/admin/RoleManagement';
import Membership from './pages/admin/Membership';
import CollectionCenterBoy from './pages/admin/CollectionCenterBoy';
import DiscountReason from './pages/admin/DiscountReason';
import DiscountAuthority from './pages/admin/DiscountAuthority';
import WhatsAppLogger from './pages/admin/WhatsAppLogger';
import ExpenseType from './pages/admin/ExpenseType';
import CollectionCenterManagement from './pages/admin/CollectionCenterManagement';
import DoctorManagement from './pages/admin/DoctorManagement';
import PatientManagement from './pages/admin/PatientManagement';
import LabConfiguration from './pages/admin/LabConfiguration';
import ServicesInArea from './pages/admin/ServicesInArea';
import CreateActivity from './pages/admin/CreateActivity';
import Activities from './pages/admin/Activities';
import EnquireBox from './pages/EnquireBox';
import UserSignUp from './pages/UserSignUp';
import TestQuorum from './pages/TestQuorum';
import { getAllAdminModules } from './utils/adminModules';
import Dashboard from './pages/Dashboard';
import ElabPay from './pages/ElabPay';
import Help from './pages/Help';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Registration from './pages/Registration';
import Reports from './pages/Reports';
import Search from './pages/Search';
import BarcodePrinting from './pages/BarcodePrinting';
import BillReceipt from './pages/BillReceipt';
import TestResultEntry from './pages/TestResultEntry';
import TestResult from './pages/TestResult';
import ReportPreview from './pages/clinical/ReportPreview';
import ResultEntry from './pages/clinical/ResultEntry';
import TestParameterMaster from './pages/clinical/TestParameterMaster';
import DeviceStub from './pages/device/DeviceStub';
import { ROLES, ALL_ROLES } from './utils/roles';
import MessageToLab from './pages/device/MessageToLab';
import PickupRequest from './pages/device/PickupRequest';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/test-quorum" element={<TestQuorum />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
          <Route path="/barcode-print" element={<ProtectedRoute><BarcodePrinting /></ProtectedRoute>} />
          <Route path="/bill-receipt" element={<ProtectedRoute><BillReceipt /></ProtectedRoute>} />
          <Route path="/test-result-entry" element={<ProtectedRoute><TestResultEntry /></ProtectedRoute>} />
          <Route path="/registration" element={<ProtectedRoute><Registration /></ProtectedRoute>} />
          <Route path="/test-result" element={<ProtectedRoute><TestResult /></ProtectedRoute>} />
          <Route path="/user-signup" element={<ProtectedRoute adminOnly><UserSignUp /></ProtectedRoute>} />
          <Route path="/enquire-box" element={<ProtectedRoute adminOnly><EnquireBox /></ProtectedRoute>} />
          <Route path="/admin/enquiries" element={<Navigate to="/enquire-box" replace />} />
          <Route path="/administration" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Administration /></ProtectedRoute>} />
          <Route path="/admin/change-password" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ChangePassword /></ProtectedRoute>} />
          <Route path="/admin/role-management" element={<ProtectedRoute allowedRoles={ALL_ROLES}><RoleManagement /></ProtectedRoute>} />
          <Route path="/admin/membership" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Membership /></ProtectedRoute>} />
          <Route path="/admin/collection-center-boy" element={<ProtectedRoute allowedRoles={ALL_ROLES}><CollectionCenterBoy /></ProtectedRoute>} />
          <Route path="/admin/discount-reason" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DiscountReason /></ProtectedRoute>} />
          <Route path="/admin/discount-authority" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DiscountAuthority /></ProtectedRoute>} />
          <Route path="/admin/whatsapp-logger" element={<ProtectedRoute allowedRoles={ALL_ROLES}><WhatsAppLogger /></ProtectedRoute>} />
          <Route path="/admin/expense-type" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ExpenseType /></ProtectedRoute>} />
          <Route path="/admin/collection-center-management" element={<ProtectedRoute allowedRoles={ALL_ROLES}><CollectionCenterManagement /></ProtectedRoute>} />
          <Route path="/admin/doctor-management" element={<ProtectedRoute allowedRoles={ALL_ROLES}><DoctorManagement /></ProtectedRoute>} />
          <Route path="/admin/patient-management" element={<ProtectedRoute allowedRoles={ALL_ROLES}><PatientManagement /></ProtectedRoute>} />
          <Route path="/admin/lab-configuration" element={<ProtectedRoute allowedRoles={ALL_ROLES}><LabConfiguration /></ProtectedRoute>} />
          <Route path="/admin/services-in-area" element={<ProtectedRoute allowedRoles={ALL_ROLES}><ServicesInArea /></ProtectedRoute>} />
          <Route path="/admin/create-activity" element={<ProtectedRoute allowedRoles={ALL_ROLES}><CreateActivity /></ProtectedRoute>} />
          <Route path="/admin/activities" element={<ProtectedRoute allowedRoles={ALL_ROLES}><Activities /></ProtectedRoute>} />
          {getAllAdminModules()
            .filter((module) => !['change-password', 'role-management', 'membership', 'collection-center-boy', 'discount-reason', 'discount-authority', 'whatsapp-logger', 'expense-type', 'collection-center-management', 'doctor-management', 'patient-management', 'lab-configuration', 'services-in-area', 'create-activity', 'activities'].includes(module.slug))
            .map((module) => (
            <Route
              key={module.slug}
              path={module.path}
              element={(
                <ProtectedRoute allowedRoles={ALL_ROLES}>
                  <AdminModule module={module} />
                </ProtectedRoute>
              )}
            />
          ))}
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
