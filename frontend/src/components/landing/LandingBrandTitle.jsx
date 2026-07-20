import clasmoLogo from '../../assets/clasmo-logo.png';

export default function LandingBrandTitle({
  showLogo = false,
  compact = false,
  variant = 'default',
  className = '',
  logoClassName = '',
}) {
  const rootClass = [
    'clasmo-brand-stack',
    showLogo && 'clasmo-brand-stack--with-logo',
    compact && 'clasmo-brand-stack--compact',
    variant !== 'default' && `clasmo-brand-stack--${variant}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClass}>
      {showLogo && (
        <img
          src={clasmoLogo}
          alt="Clasmo Diagnostics logo"
          className={`clasmo-brand-logo ${logoClassName}`.trim()}
        />
      )}
      <div className="clasmo-brand-text">
        <span className="clasmo-brand-clasmo">CLASMO</span>
        <span className="clasmo-brand-diagnostics">DIAGNOSTICS</span>
        <span className="clasmo-brand-pvt">PVT LTD</span>
      </div>
    </div>
  );
}
