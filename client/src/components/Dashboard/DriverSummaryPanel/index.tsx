import { useDriverSummary } from "../../../hooks/useDriverSummary";
import './index.css';

/**
 * Props for the DriverSummaryPanel component.
 *
 * @property {string} circuitName - The name of the current circuit being viewed.
 * @property {string[]} driverCodes - Array of driver codes to populate the selector.
 * @property {Record<string, [number, number, number]>} driverColors - Map of driver code to RGB color tuple.
 * @property {Record<string, string>} driverTeams - Map of driver code to team name.
 * @property {string} selectedDriver - The currently selected driver code.
 * @property {(code: string) => void} onDriverSelect - Callback fired when the user selects a driver.
 * @property {() => void} onClose - Callback fired when the panel close button is clicked.
 */
interface DriverSummaryPanelProps {
  circuitName: string;
  driverCodes: string[];
  driverColors: Record<string, [number, number, number]>;
  driverTeams: Record<string, string>;
  selectedDriver: string;
  onDriverSelect: (code: string) => void;
  onClose: () => void;
}

/**
 * DriverSummaryPanel displays historical race results for a selected driver
 * at a given circuit. It includes a driver selector, aggregate statistics
 * (race count, best finish, wins, DNFs), and a per-year result list.
 *
 * @param {DriverSummaryPanelProps} props - Component props.
 * @returns {JSX.Element} The rendered driver summary panel.
 */
export default function DriverSummaryPanel({
  circuitName, driverCodes, driverColors,
  selectedDriver, onDriverSelect, onClose,
}: DriverSummaryPanelProps) {
  const { results, loading, error, bestResult, wins, dnfs } =
    useDriverSummary(selectedDriver, circuitName);

  const sortedDrivers = [...driverCodes].sort();

  const color = selectedDriver && driverColors[selectedDriver]
    ? `rgb(${driverColors[selectedDriver].join(',')})`
    : 'var(--color-red)';

  return (
    <div className="driver-summary">
      <div className="dc-header">
        <span className="dc-title">Driver Summary</span>
        <button className="dc-close" onClick={onClose} title="Exit summary">✕</button>
      </div>

      <div className="dc-select-wrapper">
        <select
          className="dc-select"
          value={selectedDriver}
          onChange={e => onDriverSelect(e.target.value)}
        >
          <option value="">Select a driver</option>
          {sortedDrivers.map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        {selectedDriver && (
          <div className="dc-select-accent" style={{ backgroundColor: color }} />
        )}
      </div>

      {loading && (
        <div className="dc-loading">
          <div className="dc-spinner" />
          <span>Loading history…</span>
        </div>
      )}

      {error && <div className="dc-error">{error}</div>}

      {!loading && !error && selectedDriver && results.length === 0 && (
        <div className="dc-empty">No data found for {selectedDriver} at this circuit.</div>
      )}

      {results.length > 0 && (
        <>
          <div className="dc-summary">
            <div className="dc-summary-item">
              <span className="dc-summary-label">RACES</span>
              <span className="dc-summary-value">{results.length}</span>
            </div>
            <div className="dc-summary-item">
              <span className="dc-summary-label">BEST</span>
              <span className="dc-summary-value">
                {bestResult !== null ? `P${bestResult}` : '—'}
              </span>
            </div>
            <div className="dc-summary-item">
              <span className="dc-summary-label">WINS</span>
              <span className="dc-summary-value">{wins}</span>
            </div>
            <div className="dc-summary-item">
              <span className="dc-summary-label">DNF</span>
              <span className="dc-summary-value">{dnfs}</span>
            </div>
          </div>

          <div className="dc-results">
            {results.map(r => (
              <div
                key={`${r.year}-${r.round}`}
                className={`dc-row ${r.is_retired ? 'dc-row--dnf' : ''} ${r.position === 1 ? 'dc-row--win' : ''}`}
              >
                <span className="dc-row-year">{r.year}</span>
                <span className="dc-row-team">{r.team || '—'}</span>
                <span className="dc-row-pos">
                  {r.is_retired
                    ? <span className="dc-dnf">DNF</span>
                    : r.position
                      ? <span className="dc-dnf">P{r.position}</span>
                      : '—'
                  }
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
