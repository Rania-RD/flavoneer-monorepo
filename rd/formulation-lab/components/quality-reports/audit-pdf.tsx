import {
  Document,
  Page,
  pdf,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";

interface AuditRecord {
  departmentName: string;
  displaySerial: string;
  events: {
    action: string;
    actorName: string;
    recordRevision: number;
    createdAt: number;
  }[];
  inspectionAt: number;
  printedBatchCode?: string;
  productionHallCode: "A" | "B";
  productName: string;
  qcUserName: string;
  readings: {
    readingKey: string;
    readingIndex: number;
    value: number;
    unit: string;
    minimum: number;
    maximum: number;
    withinLimit: boolean;
  }[];
  specificationVersion: number;
  status: string;
}

interface AuditLabels {
  actor: string;
  actual: string;
  batch: string;
  department: string;
  eventHistory: string;
  hall: string;
  inspectionTime: string;
  inspector: string;
  limits: string;
  outsideLimit: string;
  parameter: string;
  product: string;
  readings: string;
  result: string;
  revision: string;
  serial: string;
  specification: string;
  status: string;
  title: string;
  withinLimit: string;
}

const styles = StyleSheet.create({
  page: { padding: 34, fontSize: 9, color: "#173e33", fontFamily: "Helvetica" },
  title: { fontSize: 20, fontWeight: 700, marginBottom: 18 },
  meta: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  metaItem: { width: "50%", paddingBottom: 8 },
  label: { color: "#527568", fontSize: 7, textTransform: "uppercase" },
  value: { marginTop: 2, fontSize: 10 },
  heading: {
    marginTop: 12,
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#d2f2d4",
    paddingBottom: 4,
    fontSize: 12,
    fontWeight: 700,
  },
  row: {
    display: "flex",
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#eef8eb",
    paddingVertical: 5,
  },
  cellWide: { width: "34%" },
  cell: { width: "22%" },
  eventAction: { width: "44%" },
  eventActor: { width: "24%" },
  eventTime: { width: "24%" },
  eventRevision: { width: "8%" },
});

function AuditDocument({
  labels,
  locale,
  record,
}: {
  labels: AuditLabels;
  locale: string;
  record: AuditRecord;
}) {
  const date = (value: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  const readingValue = (value: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{labels.title}</Text>
        <View style={styles.meta}>
          {[
            [labels.serial, record.displaySerial],
            [labels.batch, record.printedBatchCode ?? "—"],
            [labels.product, record.productName],
            [labels.hall, record.productionHallCode],
            [labels.department, record.departmentName],
            [labels.inspector, record.qcUserName],
            [labels.inspectionTime, date(record.inspectionAt)],
            [labels.specification, `v${record.specificationVersion}`],
            [labels.status, record.status],
          ].map(([label, value]) => (
            <View key={label} style={styles.metaItem}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.heading}>{labels.readings}</Text>
        {record.readings.map((reading) => (
          <View
            key={`${reading.readingKey}-${reading.readingIndex}`}
            style={styles.row}
          >
            <Text style={styles.cellWide}>{reading.readingKey}</Text>
            <Text
              style={styles.cell}
            >{`${readingValue(reading.value)} ${reading.unit}`}</Text>
            <Text
              style={styles.cell}
            >{`${readingValue(reading.minimum)}–${readingValue(reading.maximum)} ${reading.unit}`}</Text>
            <Text style={styles.cell}>
              {reading.withinLimit ? labels.withinLimit : labels.outsideLimit}
            </Text>
          </View>
        ))}
        <Text style={styles.heading}>{labels.eventHistory}</Text>
        {record.events.map((event) => (
          <View
            key={`${event.recordRevision}-${event.createdAt}`}
            style={styles.row}
          >
            <Text style={styles.eventAction}>{event.action}</Text>
            <Text style={styles.eventActor}>{event.actorName}</Text>
            <Text style={styles.eventTime}>{date(event.createdAt)}</Text>
            <Text style={styles.eventRevision}>{event.recordRevision}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function downloadAuditPdf(
  record: AuditRecord,
  labels: AuditLabels,
  locale: string
) {
  const blob = await pdf(
    <AuditDocument labels={labels} locale={locale} record={record} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${record.displaySerial.replaceAll(" ", "-")}.pdf`;
  anchor.click();
  URL.revokeObjectURL(url);
}
