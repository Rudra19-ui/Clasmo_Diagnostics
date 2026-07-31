import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';

export default function FranchiseStub({ title, description, activePage }) {
  return (
    <Layout activePage={activePage}>
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/dashboard">Home</Link></li>
            <li>{title}</li>
          </ul>
        </nav>
        <h2 className="page-heading">{title}</h2>
        <section className="content-panel">
          <p>{description || 'Franchise portal module. Content will be connected to live data next.'}</p>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
