import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import Layout from '../components/Layout';

export default function Help() {
  return (
    <Layout activePage="help">
      <main className="dash-main">
        <h2 className="page-heading">Help &amp; Support</h2>
        <section className="content-panel">
          <h3>Contact</h3>
          <ul>
            <li>Phone: +91-8975273383 / +91-9146188320</li>
            <li>Email: support@clasmodiagnostics.com</li>
          </ul>
          <h3>Quick guides</h3>
          <ul>
            <li><Link to="/registration">How to register a patient test</Link></li>
            <li><Link to="/search">How to search records</Link></li>
            <li><Link to="/test-result">How to enter and authorize results</Link></li>
          </ul>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
