/* TASK 4 (see TEAM-TASKS.md) — replace this placeholder with the real panel.

   It is ALREADY WIRED: clicking any sector tile on the dashboard mounts this
   component with live props. Note the shapes, which are easy to get wrong:
     sector      the sector OBJECT from config — { id, name, waterPoints, kitchens }
     totalCases  number, last 6 hours
     bySyndrome  [{ syndrome: <label>, count }] sorted desc, screening excluded
     clinics     [{ id, name, sector, type }]
     onClose     () => void

   It renders a visible placeholder rather than null on purpose. Returning null
   made a clicked tile do nothing at all, which reads as a broken app and forced
   a "do not click a sector tile" line into the pitch run sheet. Naming the
   sector and saying the rest is unfinished is honest and harmless.

   The syndrome breakdown and clinic list are deliberately NOT rendered here —
   that is the task. */
export function SectorDetail({ sector, totalCases, onClose }) {
  if (!sector) return null
  return (
    <div className="panel sector-stub">
      <div className="chart-head">
        <h3>{sector.name}</h3>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
      <p><b>{totalCases ?? 0}</b> cases here in the last six hours.</p>
      <p className="chart-sub">
        The full sector breakdown is still being built. Festival-wide analysis is
        on the In-depth tab.
      </p>
    </div>
  )
}
