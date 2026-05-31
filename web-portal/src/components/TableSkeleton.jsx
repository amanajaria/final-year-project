export default function TableSkeleton({ rows = 5, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j}>
              <div className="h-4 bg-white/10 rounded animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}
