import Footer from '../components/Footer';
import Layout from '../components/Layout';

const CARDS = [
  { id: 'users', title: 'User Management', desc: 'Manage lab users, roles, and permissions.' },
  { id: 'tests', title: 'Test Master', desc: 'Add or edit tests, profiles, and categories.' },
  { id: 'centers', title: 'Collection Center', desc: 'Configure collection centers and affiliations.' },
  { id: 'doctors', title: 'Doctor Master', desc: 'Referring doctors and affiliations.' },
  { id: 'rates', title: 'Rate Master', desc: 'Pricing, discounts, and MRP settings.' },
];

export default function Administration() {
  return (
    <Layout activePage="administration">
      <main className="dash-main">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ul><li><a href="/search">Home</a></li><li>Administration</li></ul>
        </nav>
        <h2 className="page-heading">Administration</h2>
        <div className="admin-grid">
          {CARDS.map((card) => (
            <section className="admin-card" id={card.id} key={card.id}>
              <h3>{card.title}</h3>
              <p>{card.desc}</p>
              <button type="button" className="btn-blue">Open</button>
            </section>
          ))}
        </div>
      </main>
      <Footer />
    </Layout>
  );
}
