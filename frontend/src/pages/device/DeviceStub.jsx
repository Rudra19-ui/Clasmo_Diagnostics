import Footer from '../../components/Footer';
import Layout from '../../components/Layout';

export default function DeviceStub({ title, description, children }) {
  return (
    <Layout activePage="device-request">
      <main className="dash-main">
        <nav className="breadcrumb"><ul><li><a href="/search">Home</a></li><li>{title}</li></ul></nav>
        <h2 className="page-heading">{title}</h2>
        <section className="content-panel">
          {description && <p>{description}</p>}
          {children || <div className="card-placeholder">Feature coming soon</div>}
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
