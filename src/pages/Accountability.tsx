import { Header } from '../components/Header';
import {
  ACCOUNTABILITY_COMMITMENTS,
  ACCOUNTABILITY_INTRO,
} from '../data/assorted-content';
import { useDetailsFromHash } from '../hooks/useDetailsFromHash';

export function AccountabilityPage() {
  useDetailsFromHash();

  return (
    <div className="container">
      <Header activeTab="assorted" />
      <div id="sorted-section" className="content-section">
        <div className="sorted-section-content">
          <div className="sorted-breadcrumb">
            <a href="/assorted">Assorted</a> / Accountability
          </div>
          <div className="accountability-intro mb-6">
            <p>{ACCOUNTABILITY_INTRO}</p>
          </div>
          <div className="flex flex-col">
            {ACCOUNTABILITY_COMMITMENTS.map((commitment) => {
              const statusKey = commitment.status.toLowerCase();
              const statusClass =
                statusKey === 'fulfilled'
                  ? ' accountability-status--fulfilled'
                  : statusKey === 'not fulfilled'
                    ? ' accountability-status--not-fulfilled'
                    : '';
              return (
                <details key={commitment.id} id={commitment.id} className="accountability-entry">
                  <summary className="accountability-summary">
                    <span className="accountability-title">{commitment.title}</span>
                    <span className={`accountability-status${statusClass}`}>{commitment.status}</span>
                    <button
                      type="button"
                      className="accountability-copy-link"
                      title="Copy link"
                      onClick={async (event) => {
                        event.preventDefault();
                        await navigator.clipboard.writeText(
                          `${window.location.origin}/assorted/accountability#${commitment.id}`,
                        );
                        const button = event.currentTarget;
                        const previous = button.textContent;
                        button.textContent = 'Copied!';
                        window.setTimeout(() => {
                          button.textContent = previous;
                        }, 1500);
                      }}
                    >
                      🔗
                    </button>
                  </summary>
                  <div className="accountability-details">
                    <div className="accountability-dates">
                      <span>{commitment.dates}</span>
                    </div>
                    {commitment.outcome && (
                      <div className={`accountability-outcome accountability-outcome--${commitment.outcome.variant}`}>
                        <div className="accountability-outcome-title">{commitment.outcome.title}</div>
                        <p className="accountability-outcome-text">{commitment.outcome.text}</p>
                        {commitment.outcome.href && (
                          <a href={commitment.outcome.href} target="_blank" rel="noreferrer" className="accountability-outcome-link">
                            {commitment.outcome.hrefLabel ?? commitment.outcome.href} ↗
                          </a>
                        )}
                      </div>
                    )}
                    <ul className="accountability-bullets">
                      {commitment.bullets.map((bullet) => (
                        <li key={bullet.label}>
                          <strong>{bullet.label}:</strong> {bullet.text}
                        </li>
                      ))}
                    </ul>
                    <div className="accountability-onchain">
                      {commitment.onchain.map((item) => (
                        <p key={item.label}>
                          <strong>{item.label}:</strong>{' '}
                          {item.href ? (
                            <a href={item.href} target="_blank" rel="noreferrer">
                              {item.code ? <code>{item.text}</code> : item.text}
                            </a>
                          ) : item.code ? (
                            <code>{item.text}</code>
                          ) : (
                            item.text
                          )}
                        </p>
                      ))}
                    </div>
                    {commitment.note ? <p className="accountability-note">{commitment.note}</p> : null}
                  </div>
                </details>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
