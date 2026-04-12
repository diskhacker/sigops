import CrudTable from "../components/CrudTable.js";

const SEL_PLACEHOLDER = `# SEL — SigOps Execution Language
# Each step:  tool <name> { key: value, ... }
#
# tool sigops.notify_slack {
#   channel: "#ops-alerts",
#   message: "Deploy starting"
# }
# tool sigops.wait { seconds: 5 }
# tool sigops.http {
#   url: "https://api.example.com/deploy",
#   method: "POST"
# }
`;

export default function WorkflowsPage() {
  return (
    <CrudTable
      title="Workflows"
      resource="workflows"
      columns={[
        { key: "name", label: "Name" },
        { key: "description", label: "Description" },
        { key: "isActive", label: "Active" },
        { key: "version", label: "Version" },
      ]}
      fields={[
        { key: "name", label: "Name", required: true },
        { key: "description", label: "Description" },
        {
          key: "selCode",
          label: `SEL Code\n${SEL_PLACEHOLDER}`,
          type: "code",
          rows: 14,
          required: true,
        },
        {
          key: "triggerRules",
          label: "Trigger Rules (JSON)",
          type: "json",
          required: true,
        },
        { key: "isActive", label: "Active (true/false)" },
      ]}
    />
  );
}
