import type {
  ColumnDiscoverySummary,
  ColumnSummaryItem,
  HypercubeDataPage,
  QixLayout,
  RowRecord,
} from "./types.ts";

function pickFirst(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function deriveColumnsFromLayout(layout: QixLayout | null): ColumnSummaryItem[] {
  const hc = layout?.qHyperCube;
  if (!hc) return [];

  const dimensions = (hc.qDimensionInfo ?? []).map((d, index): ColumnSummaryItem => ({
    columnIndex: index,
    title: pickFirst(d.qFallbackTitle, d.qGroupFallbackTitles?.[0]),
    kind: "dimension",
    qType: d.qType ?? null,
    tags: d.qTags ?? [],
    numFormat: d.qNumFormat ?? null,
  }));

  const measures = (hc.qMeasureInfo ?? []).map((m, index): ColumnSummaryItem => ({
    columnIndex: dimensions.length + index,
    title: pickFirst(m.qFallbackTitle, m.qLabel),
    kind: "measure",
    qType: m.qType ?? null,
    tags: m.qTags ?? [],
    numFormat: m.qNumFormat ?? null,
  }));

  return [...dimensions, ...measures];
}

export function isHypercubeLayout(layout: QixLayout | null): boolean {
  return !!layout?.qHyperCube;
}

export function extractPreviewRowCount(dataPages: HypercubeDataPage[]): number | null {
  const firstPage = dataPages[0];
  const matrix = firstPage?.qMatrix;
  if (!Array.isArray(matrix)) return null;
  return matrix.length;
}

export function buildMetadataSummary(input: {
  appId: string;
  objectId: string;
  syncKey: string;
  objectType: string | null;
  layout: QixLayout | null;
  dataPages: HypercubeDataPage[];
}): ColumnDiscoverySummary {
  const columns = deriveColumnsFromLayout(input.layout);
  return {
    appId: input.appId,
    objectId: input.objectId,
    syncKey: input.syncKey,
    objectType: input.objectType,
    isHypercube: isHypercubeLayout(input.layout),
    columnCount: columns.length,
    columns,
    previewRowCount: extractPreviewRowCount(input.dataPages),
  };
}

export function buildRowRecords(
  columns: ColumnSummaryItem[],
  dataPages: HypercubeDataPage[],
): RowRecord[] {
  const rows: RowRecord[] = [];

  for (const page of dataPages) {
    const matrix = page.qMatrix ?? [];
    for (const rowCells of matrix) {
      const row: RowRecord = {};
      columns.forEach((column, index) => {
        const key = column.title || `column_${column.columnIndex}`;
        row[key] = rowCells[index] ?? null;
      });
      rows.push(row);
    }
  }

  return rows;
}
