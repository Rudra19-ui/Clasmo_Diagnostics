import { Link } from 'react-router-dom';
import Footer from '../../components/Footer';
import Layout from '../../components/Layout';

export default function AdminModule({ module }) {
  return (
    <Layout activePage="administration">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul>
            <li><Link to="/search">Home</Link></li>
            <li><Link to="/administration">Administration</Link></li>
            <li>{module.columnTitle}</li>
            <li>{module.label}</li>
          </ul>
        </nav>
        <div className="admin-module-header">
          <div>
            <p className="admin-module-category">{module.columnTitle}</p>
            <h2 className="page-heading">{module.label}</h2>
            <p className="admin-module-desc">{module.desc}</p>
          </div>
          <Link to="/administration" className="btn-outline">← Back to Administration</Link>
        </div>
        <section className="content-panel admin-module-panel">
          <div className="admin-module-placeholder">
            <span className="admin-module-icon" aria-hidden>⚙</span>
            <h3>{module.label}</h3>
            <p>This module is available from the Administration menu.</p>
          </div>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
