import CrudTable from "../components/CrudTable.js";

export default function ExecutionsPage() {
  return (
    <CrudTable
      title="Executions"
      resource="executions"
      columns={[
        { key: "workflowId", label: "Workflow" },
        { key: "signalId", label: "Signal" },
        { key: "status", label: "Status" },
      ]}
      fields={[
        { key: "workflowId", label: "Workflow ID", required: true },
        { key: "signalId", label: "Signal ID", required: true },
        { key: "status", label: "Status" },
      ]}
    />
  );
}
