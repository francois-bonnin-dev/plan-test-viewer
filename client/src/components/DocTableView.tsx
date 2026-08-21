import type { DocTable } from '../../../src/api-types.js';
import { FormattedText } from './FormattedText.js';

// Nommé DocTableView (pas DocTable) pour ne pas entrer en collision avec le
// type DocTable importé de src/api-types.ts.
export function DocTableView({ table }: { table: DocTable }) {
  return (
    <table className="doc-table">
      <thead>
        <tr>
          {table.header.map((h, i) => (
            <th key={i}>
              <FormattedText text={h} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>
                <FormattedText text={cell} />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
