import clasmoLogo from '../../assets/clasmo-logo.png';

export default function LandingFooterBrand() {
  return (
    <div className="landing-footer-brand">
      <img src={clasmoLogo} alt="" className="landing-footer-brand-logo" aria-hidden="true" />
      <div className="landing-footer-brand-stack">
        <p className="landing-footer-brand-heading">
          <span className="landing-footer-brand-copy">©</span>
          <span className="landing-footer-brand-clasmo">CLASMO</span>
        </p>
        <span className="landing-footer-brand-diagnostics">DIAGNOSTICS</span>
        <span className="landing-footer-brand-pvt">PVT LTD</span>
      </div>
    </div>
  );
}
