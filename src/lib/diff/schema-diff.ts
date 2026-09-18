import {
  DatabaseAST,
  SchemaDiffResult,
  TableDiff,
  ColumnDiff,
  SchemaField,
} from '@/types/ast';

/**
 * Migration Diff Engine
 * ---------------------
 * Compares two DatabaseAST snapshots and produces:
 *   - A structured `SchemaDiffResult` (table + column diffs)
 *   - Forward (up) SQL migration statements
 *   - Rollback (down) SQL migration statements
 */
export class SchemaDiffEngine {
  public static compare(
    previousAST: DatabaseAST,
    currentAST: DatabaseAST,
  ): SchemaDiffResult {
    const tableDiffs: TableDiff[] = [];
    const upSql: string[] = [];
    const downSql: string[] = [];

    const prevTables = Object.keys(previousAST.tables);
    const currTables = Object.keys(currentAST.tables);

    // Added Tables
    for (const name of currTables) {
      if (!previousAST.tables[name]) {
        const table = currentAST.tables[name];
        tableDiffs.push({
          action: 'CREATE',
          tableName: name,
          table,
          columnDiffs: [],
        });
        const cols = table.fields.map((f) => this.columnToSql(f)).join(',\n  ');
        upSql.push(`CREATE TABLE "${name}" (\n  ${cols}\n);`);
        downSql.push(`DROP TABLE IF EXISTS "${name}" CASCADE;`);
      }
    }

    // Dropped Tables
    for (const name of prevTables) {
      if (!currentAST.tables[name]) {
        const table = previousAST.tables[name];
        tableDiffs.push({
          action: 'DROP',
          tableName: name,
          table,
          columnDiffs: [],
        });
        upSql.push(`DROP TABLE IF EXISTS "${name}" CASCADE;`);
        const cols = table.fields.map((f) => this.columnToSql(f)).join(',\n  ');
        downSql.push(`CREATE TABLE "${name}" (\n  ${cols}\n);`);
      }
    }

    // Altered Columns (tables present in both)
    for (const name of currTables) {
      if (previousAST.tables[name]) {
        const pTable = previousAST.tables[name];
        const cTable = currentAST.tables[name];
        const colDiffs = this.compareColumns(name, pTable.fields, cTable.fields);

        if (colDiffs.length > 0) {
          tableDiffs.push({
            action: 'ALTER',
            tableName: name,
            columnDiffs: colDiffs,
          });
          for (const d of colDiffs) {
            if (d.action === 'CREATE' && d.newField) {
              upSql.push(
                `ALTER TABLE "${name}" ADD COLUMN ${this.columnToSql(d.newField)};`,
              );
              downSql.push(
                `ALTER TABLE "${name}" DROP COLUMN "${d.columnName}";`,
              );
            } else if (d.action === 'DROP' && d.oldField) {
              upSql.push(
                `ALTER TABLE "${name}" DROP COLUMN "${d.columnName}";`,
              );
              downSql.push(
                `ALTER TABLE "${name}" ADD COLUMN ${this.columnToSql(d.oldField)};`,
              );
            } else if (d.action === 'ALTER' && d.newField && d.oldField) {
              if (d.newField.type !== d.oldField.type) {
                upSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" TYPE ${d.newField.type};`,
                );
                downSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" TYPE ${d.oldField.type};`,
                );
              }
              const prevNull = d.oldField.constraints.isNullable;
              const currNull = d.newField.constraints.isNullable;
              if (prevNull && currNull === false) {
                upSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" SET NOT NULL;`,
                );
                downSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" DROP NOT NULL;`,
                );
              } else if (prevNull === false && currNull) {
                upSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" DROP NOT NULL;`,
                );
                downSql.push(
                  `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" SET NOT NULL;`,
                );
              }
              if (
                d.newField.constraints.defaultValue !==
                d.oldField.constraints.defaultValue
              ) {
                if (d.newField.constraints.defaultValue) {
                  upSql.push(
                    `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" SET DEFAULT ${d.newField.constraints.defaultValue};`,
                  );
                } else {
                  upSql.push(
                    `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" DROP DEFAULT;`,
                  );
                }
                if (d.oldField.constraints.defaultValue) {
                  downSql.push(
                    `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" SET DEFAULT ${d.oldField.constraints.defaultValue};`,
                  );
                } else {
                  downSql.push(
                    `ALTER TABLE "${name}" ALTER COLUMN "${d.columnName}" DROP DEFAULT;`,
                  );
                }
              }
            }
          }
        }
      }
    }

    return { tables: tableDiffs, upSql, downSql };
  }

  private static compareColumns(
    tableName: string,
    prev: SchemaField[],
    curr: SchemaField[],
  ): ColumnDiff[] {
    const diffs: ColumnDiff[] = [];
    const prevMap = new Map(prev.map((f) => [f.name, f]));
    const currMap = new Map(curr.map((f) => [f.name, f]));

    for (const [name, field] of currMap) {
      if (!prevMap.has(name)) {
        diffs.push({
          action: 'CREATE',
          tableName,
          columnName: name,
          newField: field,
        });
      } else {
        const oldField = prevMap.get(name)!;
        const typeChanged = oldField.type !== field.type;
        const nullChanged =
          oldField.constraints.isNullable !== field.constraints.isNullable;
        const defaultChanged =
          oldField.constraints.defaultValue !==
          field.constraints.defaultValue;
        const pkChanged =
          oldField.constraints.isPrimaryKey !==
          field.constraints.isPrimaryKey;
        const uqChanged =
          oldField.constraints.isUnique !== field.constraints.isUnique;

        if (typeChanged || nullChanged || defaultChanged || pkChanged || uqChanged) {
          diffs.push({
            action: 'ALTER',
            tableName,
            columnName: name,
            oldField,
            newField: field,
          });
        }
      }
    }

    for (const [name, field] of prevMap) {
      if (!currMap.has(name)) {
        diffs.push({
          action: 'DROP',
          tableName,
          columnName: name,
          oldField: field,
        });
      }
    }

    return diffs;
  }

  private static columnToSql(field: SchemaField): string {
    const parts = [`"${field.name}"`, field.type];
    if (field.constraints.isPrimaryKey) parts.push('PRIMARY KEY');
    if (field.constraints.isUnique && !field.constraints.isPrimaryKey)
      parts.push('UNIQUE');
    if (field.constraints.isNullable === false) parts.push('NOT NULL');
    if (field.constraints.defaultValue)
      parts.push(`DEFAULT ${field.constraints.defaultValue}`);
    if (field.constraints.isAutoincrement) parts.push('AUTOINCREMENT');
    return parts.join(' ');
  }
}
