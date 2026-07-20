import LandingBrandTitle from './LandingBrandTitle';

export default function LandingFooterBrand() {
  return (
    <div className="landing-footer-brand">
      <LandingBrandTitle showLogo variant="footer" />
      <span className="landing-footer-brand-copy">©</span>
    </div>
  );
}
