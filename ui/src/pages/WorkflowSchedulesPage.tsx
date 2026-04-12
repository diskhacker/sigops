import CrudTable from "../components/CrudTable.js";

export default function WorkflowSchedulesPage() {
  return (
    <CrudTable
      title="Workflow Schedules"
      resource="workflow-schedules"
      columns={[
        { key: "workflowId", label: "Workflow" },
        { key: "cronExpression", label: "Cron" },
      ]}
      fields={[
        { key: "workflowId", label: "Workflow ID", required: true },
        { key: "cronExpression", label: "Cron Expression", required: true },
      ]}
    />
  );
}
