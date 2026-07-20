import LandingBrandTitle from './landing/LandingBrandTitle';

export default function AppBrandHeader({ className = '', compact = false }) {
  return (
    <LandingBrandTitle
      showLogo
      compact={compact}
      className={`app-brand-header${compact ? ' app-brand-header-compact' : ''}${className ? ` ${className}` : ''}`}
    />
  );
}
