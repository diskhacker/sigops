import CrudTable from "../components/CrudTable.js";

export default function SignalRulesPage() {
  return (
    <CrudTable
      title="Signal Rules"
      resource="signal-rules"
      columns={[
        { key: "name", label: "Name" },
        { key: "pattern", label: "Pattern" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "pattern", label: "Pattern", required: true },
        { key: "workflowId", label: "Workflow ID", required: true },
      ]}
    />
  );
}
