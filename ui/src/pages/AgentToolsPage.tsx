import CrudTable from "../components/CrudTable.js";

export default function AgentToolsPage() {
  return (
    <CrudTable
      title="Agent Tools"
      resource="agent-tools"
      canCreate={false}
      canEdit={false}
      canDelete={false}
      columns={[
        { key: "agentId", label: "Agent" },
        { key: "toolName", label: "Tool" },
        { key: "version", label: "Version" },
        { key: "capabilities", label: "Capabilities" },
        { key: "discoveredAt", label: "Discovered" },
      ]}
      fields={[]}
    />
  );
}
