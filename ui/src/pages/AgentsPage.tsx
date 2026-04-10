import CrudTable from "../components/CrudTable.js";

export default function AgentsPage() {
  return (
    <CrudTable
      title="Agents"
      resource="agents"
      columns={[
        { key: "name", label: "Name" },
        { key: "hostname", label: "Host" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "hostname", label: "Hostname", required: true },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
