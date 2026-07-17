import clasmoLogo from '../assets/clasmo-logo.png';
import LandingBrandTitle from './landing/LandingBrandTitle';
import '../styles/landing.css';

export default function AppBrandHeader({ className = '', compact = false }) {
  return (
    <div className={`app-brand-header${compact ? ' app-brand-header-compact' : ''}${className ? ` ${className}` : ''}`}>
      <img src={clasmoLogo} alt="Clasmo Diagnostics logo" className="app-brand-logo" />
      <LandingBrandTitle />
    </div>
  );
}
