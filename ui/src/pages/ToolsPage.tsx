import CrudTable from "../components/CrudTable.js";

export default function ToolsPage() {
  return (
    <CrudTable
      title="Tools"
      resource="tools"
      columns={[
        { key: "name", label: "Name" },
        { key: "kind", label: "Kind" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "kind", label: "Kind", required: true },
        { key: "schema", label: "Schema (JSON)", type: "json", required: true },
      ]}
    />
  );
}
