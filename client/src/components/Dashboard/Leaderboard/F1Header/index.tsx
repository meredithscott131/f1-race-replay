import f1Logo from '../../../../assets/F1_Logo.png';
import './index.css';

export default function F1Header() {
  return (
    <div className="f1-header">
      <div className="f1-logo">
        <img src={f1Logo} alt="F1 Logo" className="f1-logo-img" />
      </div>
    </div>
  );
}