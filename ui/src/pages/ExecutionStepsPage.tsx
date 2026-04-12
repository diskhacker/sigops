import CrudTable from "../components/CrudTable.js";

export default function ExecutionStepsPage() {
  return (
    <CrudTable
      title="Execution Steps"
      resource="execution-steps"
      canCreate={false}
      canEdit={false}
      canDelete={false}
      columns={[
        { key: "executionId", label: "Execution" },
        { key: "stepIndex", label: "#" },
        { key: "toolName", label: "Tool" },
        { key: "status", label: "Status" },
        { key: "agentId", label: "Agent" },
        { key: "durationMs", label: "Duration (ms)" },
        { key: "error", label: "Error" },
      ]}
      fields={[]}
    />
  );
}
