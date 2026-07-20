import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';
import SelfPatientQueryPanel from '../components/SelfPatientQueryPanel';

export default function SelfPatientQuery() {
  return (
    <Layout activePage="self-patient-query">
      <main className="dash-main self-patient-query-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li>Self Patient Query</li>
          </ul>
        </nav>
        <SelfPatientQueryPanel title="Self Patient Query" />
      </main>
      <Footer />
    </Layout>
  );
}
