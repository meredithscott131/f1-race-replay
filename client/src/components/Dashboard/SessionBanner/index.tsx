import { flagUrl } from "../../../lib/assets";
import './index.css';

interface SessionBannerProps {
  eventName?: string;
  circuitName?: string;
  country?: string;
  year?: number;
}

export default function SessionBanner({ eventName, circuitName, country, year }: SessionBannerProps) {
  return (
    <div className="session-banner">
      <div className="event-info-container">
        <div className="event-section-left">
          <div className="grand-prix-name">{year} {eventName || 'GRAND PRIX'}</div>
        </div>

        <div className="event-section-right">
          {country && (
            <img
              src={flagUrl(`Flag_of_${country.replace(/\s/g, '_')}.png`)}
              alt={`${country} flag`}
              className="country-flag"
              onError={e => { (e.target as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          )}
          {circuitName && (
            <div className="location-info">
              <div className="circuit-name">{circuitName}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}