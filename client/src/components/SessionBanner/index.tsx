import './index.css';

interface SessionBannerProps {
  eventName?: string;
  circuitName?: string;
  country?: string;
  year?: number;
}

export default function SessionBanner({ 
  eventName,
  circuitName,
  country,
  year
}: SessionBannerProps) {
  const getCountryFlag = (countryName: string): string => {
    const flagMap: Record<string, string> = {
      'Bahrain': 'Bahrain',
      'Saudi Arabia': 'Saudi_Arabia',
      'Australia': 'Australia',
      'Japan': 'Japan',
      'China': 'China',
      'USA': 'USA',
      'United States': 'USA',
      'Italy': 'Italy',
      'Monaco': 'Monaco',
      'Spain': 'Spain',
      'Canada': 'Canada',
      'Austria': 'Austria',
      'UK': 'UK',
      'Great Britain': 'UK',
      'Hungary': 'Hungary',
      'Belgium': 'Belgium',
      'Netherlands': 'Netherlands',
      'Singapore': 'Singapore',
      'Azerbaijan': 'Azerbaijan',
      'Mexico': 'Mexico',
      'Brazil': 'Brazil',
      'UAE': 'UAE',
      'Qatar': 'Qatar',
      'Abu Dhabi': 'Abu_Dhabi',
    };
    return flagMap[countryName] || '🏁';
  };

  return (
    <div className="session-banner">
      <div className="event-info-container">
        {/* Left: Grand Prix Name + Year */}
        <div className="event-section-left">
          <div className="grand-prix-name">{year} {eventName || 'GRAND PRIX'}</div>
        </div>
        
        {/* Right: Location + Flag */}
        <div className="event-section-right">
          {country && (
            <img src={`/src/assets/flags/Flag_of_${getCountryFlag(country)}.png`} alt={`${country} flag`} className="country-flag" />
          )}
          <div className="location-info">
            {circuitName && (
              <div className="circuit-name">{circuitName}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
