import MainLayout from "../../components/layout/MainLayout";
import ModuleStub from "../../components/shared/ModuleStub";

export default function SecurityAdmin() {
  return (
    <MainLayout>
      <ModuleStub
        title="Security & Administration"
        description="Users, roles, permissions, SSO and MFA configuration for the entire HRMS platform."
        features={[
  "User management and provisioning",
  "Role and permission management (RBAC)",
  "SSO configuration (SAML / OIDC)",
  "MFA setup and enforcement",
  "Audit log viewer and export",
        ]}
      />
    </MainLayout>
  );
}
