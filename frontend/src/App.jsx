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
import FranchisePricingCredits from './pages/admin/FranchisePricingCredits';
import FranchiseSupremeList from './pages/admin/FranchiseSupremeList';
import FranchiseAddSignUp from './pages/admin/FranchiseAddSignUp';
import FranchiseBulkPricing from './pages/admin/FranchiseBulkPricing';
import FranchiseTransferPricing from './pages/admin/FranchiseTransferPricing';
import EnquireBox from './pages/EnquireBox';
import UserSignUp from './pages/UserSignUp';
import SelfPatientQuery from './pages/SelfPatientQuery';
import TestQuorum from './pages/TestQuorum';
import { getAllAdminModules } from './utils/adminModules';
import GiveFeedback from './pages/GiveFeedback';
import Dashboard from './pages/Dashboard';
import ElabPay from './pages/ElabPay';
import Help from './pages/Help';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Registration from './pages/Registration';
import Reports from './pages/Reports';
import Search from './pages/Search';
import BarcodePrinting from './pages/BarcodePrinting';
import BarcodeLink from './pages/BarcodeLink';
import SampleScan from './pages/SampleScan';
import OpenBarcode from './pages/OpenBarcode';
import BillReceipt from './pages/BillReceipt';
import TestResultEntry from './pages/TestResultEntry';
import TestResult from './pages/TestResult';
import ReportPreview from './pages/clinical/ReportPreview';
import ResultEntry from './pages/clinical/ResultEntry';
import TestParameterMaster from './pages/clinical/TestParameterMaster';
import DeviceStub from './pages/device/DeviceStub';
import TestResultBatch from './pages/device/TestResultBatch';
import ResponsiveProvider from './components/ResponsiveProvider';
import { NavProvider } from './context/NavContext';
import { ROLES, ALL_ROLES, SAMPLE_SCAN_ROLES, USER_CREATOR_ROLES, FRANCHISE_ROLES, PATIENT_ENTRY_ROLES, PRICING_WALLET_ROLES, ADMIN_ROLES, ADMINISTRATION_ROLES, TEST_PORTFOLIO_ROLES, HOLD_STAFF_ROLES, REJECTION_STAFF_ROLES, EXTRA_SAMPLE_ROLES } from './utils/roles';
import MessageToLab from './pages/device/MessageToLab';
import PickupRequest from './pages/device/PickupRequest';
import TestList from './pages/portfolio/TestList';
import TestProfile from './pages/portfolio/TestProfile';
import SampleReport from './pages/portfolio/SampleReport';
import FranchiseStub from './pages/franchise/FranchiseStub';
import TestAddition from './pages/franchise/TestAddition';
import EditEntry from './pages/franchise/EditEntry';
import AllReports from './pages/franchise/AllReports';
import SearchReports from './pages/franchise/SearchReports';
import ReportDetail from './pages/franchise/ReportDetail';
import FindBarcode from './pages/franchise/FindBarcode';
import ClinicalHistory from './pages/franchise/ClinicalHistory';
import TestCancellation from './pages/franchise/TestCancellation';
import FranchiseHold from './pages/franchise/FranchiseHold';
import FranchiseRejection from './pages/franchise/FranchiseRejection';
import HoldTests from './pages/HoldTests';
import SampleRejection from './pages/SampleRejection';
import MakeBill from './pages/franchise/MakeBill';
import BillingList from './pages/franchise/BillingList';
import TrackLedger from './pages/franchise/TrackLedger';
import FranchiseDownstreamBulkPricing from './pages/franchise/FranchiseDownstreamBulkPricing';
import FranchiseDownstreamTransferPricing from './pages/franchise/FranchiseDownstreamTransferPricing';
import Analytics from './pages/franchise/Analytics';
import OnlinePayment from './pages/franchise/OnlinePayment';
import ReceptionModule from './pages/reception/ReceptionModule';
import OutSources from './pages/reception/OutSources';
import OutReceived from './pages/reception/OutReceived';
import SampleAccession from './pages/reception/SampleAccession';
import ScanLog from './pages/reception/ScanLog';
import Scan from './pages/Scan';
import { ExtraSampleProvider } from './context/ExtraSampleContext';
import { RECEPTION_PAGES, RECEPTION_WORKFLOW_ROLES } from './utils/receptionNav';

const FRANCHISE_PAGES = [
  {
    path: 'payment-history',
    title: 'Payment History',
    activePage: 'payment-history',
    description: 'Historical payment records.',
    allowedRoles: [...FRANCHISE_ROLES, ...ADMIN_ROLES],
  },
  { path: 'my-staff', title: 'My Staff', activePage: 'my-staff', description: 'Staff accounts under this franchise.' },
  { path: 'sub-franchisee', title: 'Sub Franchisee', activePage: 'sub-franchisee', description: 'Manage sub-franchisee accounts.' },
  { path: 'sub-franchisee-credits', title: 'SubFranchisee Credits', activePage: 'sub-franchisee-credits', description: 'Credits allocated to sub-franchisees.' },
  { path: 'update-profile', title: 'Update Profile', activePage: 'update-profile', description: 'Update franchise profile details.' },
];

export default function App() {
  return (
    <AuthProvider>
      <ExtraSampleProvider>
      <BrowserRouter>
        <NavProvider>
        <ResponsiveProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/test-quorum" element={<TestQuorum />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/search" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><Search /></ProtectedRoute>} />
          <Route path="/open" element={<ProtectedRoute><OpenBarcode /></ProtectedRoute>} />
          <Route path="/barcode-print" element={<ProtectedRoute><BarcodePrinting /></ProtectedRoute>} />
          <Route path="/barcode-link" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><BarcodeLink /></ProtectedRoute>} />
          <Route
            path="/sample-scan"
            element={(
              <ProtectedRoute allowedRoles={SAMPLE_SCAN_ROLES}>
                <SampleScan />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications/find-barcode"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <FindBarcode />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications/clinical-history"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <ClinicalHistory />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications/test-cancellation"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <TestCancellation />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/notifications/scan"
            element={(
              <ProtectedRoute allowedRoles={EXTRA_SAMPLE_ROLES}>
                <Scan activePage="barcode-scan" />
              </ProtectedRoute>
            )}
          />
          <Route path="/notifications/extra-sample" element={<Navigate to="/notifications/scan" replace />} />
          <Route
            path="/reception/out-sources"
            element={(
              <ProtectedRoute allowedRoles={RECEPTION_WORKFLOW_ROLES}>
                <OutSources />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reception/out-received"
            element={(
              <ProtectedRoute allowedRoles={RECEPTION_WORKFLOW_ROLES}>
                <OutReceived />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reception/extra-sample"
            element={(
              <ProtectedRoute allowedRoles={RECEPTION_WORKFLOW_ROLES}>
                <Scan activePage="extra-sample" pageTitle="Extra Sample" />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reception/sample-accession"
            element={(
              <ProtectedRoute allowedRoles={RECEPTION_WORKFLOW_ROLES}>
                <SampleAccession />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reception/scan-log"
            element={(
              <ProtectedRoute allowedRoles={[...RECEPTION_WORKFLOW_ROLES, ...ADMIN_ROLES]}>
                <ScanLog />
              </ProtectedRoute>
            )}
          />
          {RECEPTION_PAGES.filter((page) => !['out-sources', 'out-received', 'extra-sample', 'sample-accession', 'scan-log'].includes(page.path)).map((page) => (
            <Route
              key={page.path}
              path={`/reception/${page.path}`}
              element={(
                <ProtectedRoute allowedRoles={RECEPTION_WORKFLOW_ROLES}>
                  <ReceptionModule
                    title={page.title}
                    activePage={page.activePage}
                    description={page.description}
                  />
                </ProtectedRoute>
              )}
            />
          ))}
          <Route
            path="/hold-tests"
            element={(
              <ProtectedRoute allowedRoles={HOLD_STAFF_ROLES}>
                <HoldTests />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/sample-rejection"
            element={(
              <ProtectedRoute allowedRoles={REJECTION_STAFF_ROLES}>
                <SampleRejection />
              </ProtectedRoute>
            )}
          />
          <Route path="/bill-receipt" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><BillReceipt /></ProtectedRoute>} />
          <Route path="/test-result-entry" element={<ProtectedRoute><TestResultEntry /></ProtectedRoute>} />
          <Route path="/registration" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><Navigate to="/entry/new" replace /></ProtectedRoute>} />
          <Route
            path="/entry"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <Navigate to="/entry/new" replace />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/entry/new"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <Registration
                  activePage="registration-entry"
                  pageTitle="New Entry"
                  successNoun="Entry"
                />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/entry/list"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <EditEntry />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/entry/test-addition"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <TestAddition />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reports-section"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <Navigate to="/reports-section/all" replace />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reports-section/all"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <AllReports />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reports-section/search"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <SearchReports />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/reports-section/detail/:labCode"
            element={(
              <ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}>
                <ReportDetail />
              </ProtectedRoute>
            )}
          />
          <Route path="/test-result" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><TestResult /></ProtectedRoute>} />
          <Route path="/portfolio/test-list" element={<ProtectedRoute allowedRoles={TEST_PORTFOLIO_ROLES}><TestList /></ProtectedRoute>} />
          <Route path="/portfolio/test-profile" element={<ProtectedRoute allowedRoles={TEST_PORTFOLIO_ROLES}><TestProfile /></ProtectedRoute>} />
          <Route path="/portfolio/sample-report" element={<ProtectedRoute allowedRoles={TEST_PORTFOLIO_ROLES}><SampleReport /></ProtectedRoute>} />
          <Route path="/user-signup" element={<ProtectedRoute allowedRoles={USER_CREATOR_ROLES}><UserSignUp /></ProtectedRoute>} />
          <Route path="/enquire-box" element={<ProtectedRoute adminOnly><EnquireBox /></ProtectedRoute>} />
          <Route path="/self-patient-query" element={<ProtectedRoute><SelfPatientQuery /></ProtectedRoute>} />
          <Route path="/give-feedback" element={<ProtectedRoute><GiveFeedback /></ProtectedRoute>} />
          <Route path="/admin/enquiries" element={<Navigate to="/enquire-box" replace />} />
          <Route path="/administration" element={<ProtectedRoute allowedRoles={ADMINISTRATION_ROLES}><Administration /></ProtectedRoute>} />
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
          <Route path="/admin/franchise-pricing-credits" element={<ProtectedRoute allowedRoles={PRICING_WALLET_ROLES}><FranchisePricingCredits /></ProtectedRoute>} />
          <Route path="/admin/list-franchisee" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><FranchiseSupremeList /></ProtectedRoute>} />
          <Route path="/admin/add-franchisee" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><FranchiseAddSignUp /></ProtectedRoute>} />
          <Route path="/admin/franchise-bulk-pricing" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><FranchiseBulkPricing /></ProtectedRoute>} />
          <Route path="/admin/franchise-transfer-pricing" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><FranchiseTransferPricing /></ProtectedRoute>} />
          {getAllAdminModules()
            .filter((module) => !['change-password', 'role-management', 'membership', 'collection-center-boy', 'discount-reason', 'discount-authority', 'whatsapp-logger', 'expense-type', 'collection-center-management', 'doctor-management', 'patient-management', 'lab-configuration', 'services-in-area', 'create-activity', 'activities', 'franchise-pricing-credits'].includes(module.slug))
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
          <Route path="/reports" element={<ProtectedRoute allowedRoles={PATIENT_ENTRY_ROLES}><Reports /></ProtectedRoute>} />
          <Route path="/elab-pay" element={<ProtectedRoute><ElabPay /></ProtectedRoute>} />
          <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
          <Route path="/clinical/test-parameters" element={<ProtectedRoute allowedRoles={ADMIN_ROLES}><TestParameterMaster /></ProtectedRoute>} />
          <Route path="/clinical/result-entry" element={<ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.TECHNICIAN]}><ResultEntry /></ProtectedRoute>} />
          <Route path="/clinical/report-preview" element={<ProtectedRoute><ReportPreview /></ProtectedRoute>} />
          <Route path="/device/pickup-request" element={<ProtectedRoute><PickupRequest /></ProtectedRoute>} />
          <Route path="/device/patient-appointment" element={<ProtectedRoute><DeviceStub title="Patient Appointment" description="Schedule home visits and appointments." /></ProtectedRoute>} />
          <Route path="/device/message-to-lab" element={<ProtectedRoute><MessageToLab /></ProtectedRoute>} />
          <Route path="/device/schedular" element={<ProtectedRoute><DeviceStub title="Schedular" description="Collection and trip schedule calendar." /></ProtectedRoute>} />
          <Route path="/device/trip-management" element={<ProtectedRoute><DeviceStub title="Trip Management" description="Active trips list and management." /></ProtectedRoute>} />
          <Route path="/device/batch-upload" element={<ProtectedRoute><DeviceStub title="Batch Upload" description="Upload CSV/XLSX registration batch files."><input type="file" accept=".csv,.xlsx" /></DeviceStub></ProtectedRoute>} />
          <Route path="/device/test-result-batch" element={<ProtectedRoute><TestResultBatch /></ProtectedRoute>} />
          <Route
            path="/franchise/analytics"
            element={(
              <ProtectedRoute allowedRoles={[ROLES.SUPER_FRANCHISEE, ROLES.FRANCHISEE]}>
                <Analytics />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-booking/new"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <Registration
                  activePage="manage-booking"
                  pageTitle="New Entry"
                  successNoun="Booking"
                />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-booking/list"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <EditEntry />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-booking/test-addition"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <TestAddition />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-reports/all"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <AllReports />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-reports/search"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <SearchReports />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-reports/detail/:labCode"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <ReportDetail />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/find-barcode"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <FindBarcode />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/clinical-history"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <ClinicalHistory />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/test-cancellation"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <TestCancellation />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/hold"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <FranchiseHold />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/rejection"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <FranchiseRejection />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/make-bill"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <MakeBill />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/billing-list"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <BillingList />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/track-ledger"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <TrackLedger />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/pricing-credits"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <FranchisePricingCredits franchiseMode />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/online-payment"
            element={(
              <ProtectedRoute allowedRoles={[...FRANCHISE_ROLES, ...ADMIN_ROLES]}>
                <OnlinePayment />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/franchisee-pricing"
            element={(
              <ProtectedRoute allowedRoles={[ROLES.SUPER_FRANCHISEE]}>
                <FranchiseDownstreamBulkPricing forcedRole={ROLES.SUPER_FRANCHISEE} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/franchisee-transfer-pricing"
            element={(
              <ProtectedRoute allowedRoles={[ROLES.SUPER_FRANCHISEE]}>
                <FranchiseDownstreamTransferPricing forcedRole={ROLES.SUPER_FRANCHISEE} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/sub-franchisee-pricing"
            element={(
              <ProtectedRoute allowedRoles={[ROLES.FRANCHISEE]}>
                <FranchiseDownstreamBulkPricing forcedRole={ROLES.FRANCHISEE} />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/sub-franchisee-transfer-pricing"
            element={(
              <ProtectedRoute allowedRoles={[ROLES.FRANCHISEE]}>
                <FranchiseDownstreamTransferPricing forcedRole={ROLES.FRANCHISEE} />
              </ProtectedRoute>
            )}
          />
          <Route path="/franchise/clinical" element={<Navigate to="/franchise/clinical-history" replace />} />
          <Route
            path="/franchise/scan"
            element={(
              <ProtectedRoute allowedRoles={EXTRA_SAMPLE_ROLES}>
                <Scan activePage="barcode-scan" />
              </ProtectedRoute>
            )}
          />
          <Route path="/franchise/extra-sample" element={<Navigate to="/franchise/scan" replace />} />
          {FRANCHISE_PAGES.map((page) => (
            <Route
              key={page.path}
              path={`/franchise/${page.path}`}
              element={(
                <ProtectedRoute allowedRoles={page.allowedRoles || FRANCHISE_ROLES}>
                  <FranchiseStub
                    title={page.title}
                    description={page.description}
                    activePage={page.activePage}
                  />
                </ProtectedRoute>
              )}
            />
          ))}
          <Route
            path="/franchise/manage-booking"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <Navigate to="/franchise/manage-booking/new" replace />
              </ProtectedRoute>
            )}
          />
          <Route
            path="/franchise/manage-reports"
            element={(
              <ProtectedRoute allowedRoles={FRANCHISE_ROLES}>
                <Navigate to="/franchise/manage-reports/all" replace />
              </ProtectedRoute>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ResponsiveProvider>
        </NavProvider>
      </BrowserRouter>
      </ExtraSampleProvider>
    </AuthProvider>
  );
}
