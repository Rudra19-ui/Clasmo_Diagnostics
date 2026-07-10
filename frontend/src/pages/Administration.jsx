import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';

export default function Administration() {
  return (
    <Layout activePage="administration">
      <main className="dash-main admin-content-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li>Administration</li>
          </ul>
        </nav>
        <h2 className="page-heading">Administration</h2>
        <section className="content-panel admin-welcome-panel">
          <h3>Welcome to Administration</h3>
          <p>Select any module from the sidebar to manage users, lab settings, accounting, and test master data.</p>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
