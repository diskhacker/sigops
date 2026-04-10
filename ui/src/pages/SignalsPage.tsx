import CrudTable from "../components/CrudTable.js";

export default function SignalsPage() {
  return (
    <CrudTable
      title="Signals"
      resource="signals"
      columns={[
        { key: "source", label: "Source" },
        { key: "title", label: "Title" },
        { key: "severity", label: "Severity" },
      ]}
      fields={[
        { key: "source", label: "Source", required: true },
        { key: "title", label: "Title", required: true },
        { key: "body", label: "Body (JSON)", type: "json", required: true },
        { key: "severity", label: "Severity" },
      ]}
    />
  );
}
