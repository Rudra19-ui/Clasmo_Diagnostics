import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import EnquireBoxPanel from '../components/EnquireBoxPanel';
import Layout from '../components/Layout';

export default function EnquireBox() {
  return (
    <Layout activePage="enquire-box">
      <main className="dash-main enquire-box-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Dashboard</Link></li>
            <li>Enquire Box</li>
          </ul>
        </nav>
        <EnquireBoxPanel title="Enquire Box" />
      </main>
      <Footer />
    </Layout>
  );
}
