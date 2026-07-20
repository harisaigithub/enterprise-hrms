import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function Tasks() {
  return (
    <MainLayout>
      <ModuleStub
        title="Task Management"
        description="Lightweight project and task tracking with time logging for internal teams."
        features={[
  "Boards and list views",
  "Task assignment and due dates",
  "Time logging per task",
  "Priority and label tagging",
  "Progress reporting",
        ]}
      />
    </MainLayout>
  );
}
