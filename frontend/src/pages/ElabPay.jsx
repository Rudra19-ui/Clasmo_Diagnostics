import Footer from '../components/Footer';
import Layout from '../components/Layout';

export default function ElabPay() {
  return (
    <Layout activePage="elab-pay">
      <main className="dash-main">
        <h2 className="page-heading">Elab-PAY</h2>
        <section className="content-panel">
          <p>Online payment gateway for patient bills and settlements.</p>
          <ul>
            <li>Pending payments</li>
            <li>Settlement history</li>
            <li>Refund processing</li>
          </ul>
        </section>
      </main>
      <Footer />
    </Layout>
  );
}
