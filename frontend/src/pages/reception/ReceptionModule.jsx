import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';

export default function ReceptionModule({ title, description, activePage }) {
  return (
    <Layout activePage={activePage}>
      <main className="dash-main franchise-module-page">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>{title}</li>
          </ul>
        </nav>
        <h2 className="page-heading">{title}</h2>
        <p className="portfolio-intro">{description}</p>
        <section className="content-panel franchise-module-panel">
          <p>This module is ready for live data integration. Use the sidebar to move between reception workflows.</p>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
