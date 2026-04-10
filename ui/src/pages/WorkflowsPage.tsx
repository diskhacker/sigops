import CrudTable from "../components/CrudTable.js";

export default function WorkflowsPage() {
  return (
    <CrudTable
      title="Workflows"
      resource="workflows"
      columns={[
        { key: "name", label: "Name" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "definition", label: "Definition (JSON)", type: "json", required: true },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
