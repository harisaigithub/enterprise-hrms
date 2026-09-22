import { Router } from "express";
import {
  organizationManagementController,
} from "./organizationManagement.controller";

import { authenticate } from "../../middlewares/auth";
import { requirePermission } from "../../middlewares/rbac";

const router = Router();

router.use(authenticate, requirePermission("orgmanagement:read|orgmanagement:write"));

const requireOrganizationWrite = requirePermission("orgmanagement:write");

// =========================================================
// COMPANY
// =========================================================

router.get(
  "/company",
  organizationManagementController.getCompany.bind(
    organizationManagementController
  )
);

router.put(
  "/company",
  requireOrganizationWrite,
  organizationManagementController.updateCompany.bind(
    organizationManagementController
  )
);

// =========================================================
// BUSINESS UNITS
// =========================================================

router.get(
  "/business-units",
  organizationManagementController.getBusinessUnits.bind(
    organizationManagementController
  )
);

router.post(
  "/business-units",
  requireOrganizationWrite,
  organizationManagementController.addBusinessUnit.bind(
    organizationManagementController
  )
);

// =========================================================
// DEPARTMENTS
// =========================================================

router.get(
  "/departments",
  organizationManagementController.getDepartments.bind(
    organizationManagementController
  )
);

router.post(
  "/departments",
  requireOrganizationWrite,
  organizationManagementController.addDepartment.bind(
    organizationManagementController
  )
);

// =========================================================
// LOCATIONS
// =========================================================

router.get(
  "/locations",
  organizationManagementController.getLocations.bind(
    organizationManagementController
  )
);

router.post(
  "/locations",
  requireOrganizationWrite,
  organizationManagementController.addLocation.bind(
    organizationManagementController
  )
);

router.put(
  "/locations/:id/deactivate",
  requireOrganizationWrite,
  organizationManagementController.deactivateLocation.bind(
    organizationManagementController
  )
);

// =========================================================
// COST CENTERS
// =========================================================

router.get(
  "/cost-centers",
  organizationManagementController.getCostCenters.bind(
    organizationManagementController
  )
);

router.post(
  "/cost-centers",
  requireOrganizationWrite,
  organizationManagementController.addCostCenter.bind(
    organizationManagementController
  )
);

// =========================================================
// DESIGNATIONS
// =========================================================

router.get(
  "/designations",
  organizationManagementController.getDesignations.bind(
    organizationManagementController
  )
);

router.post(
  "/designations",
  requireOrganizationWrite,
  organizationManagementController.addDesignation.bind(
    organizationManagementController
  )
);

// =========================================================
// GRADES
// =========================================================

router.get(
  "/grades",
  organizationManagementController.getGrades.bind(
    organizationManagementController
  )
);

router.post(
  "/grades",
  requireOrganizationWrite,
  organizationManagementController.addGrade.bind(
    organizationManagementController
  )
);

// =========================================================
// REPORTING STRUCTURE
// =========================================================

router.get(
  "/roster",
  organizationManagementController.getRoster.bind(
    organizationManagementController
  )
);

router.put(
  "/employees/:employeeId/reporting-manager",
  requireOrganizationWrite,
  organizationManagementController.updateReportingManager.bind(
    organizationManagementController
  )
);

router.post(
  "/employees/bulk-reassign-department",
  requireOrganizationWrite,
  organizationManagementController.bulkReassignDepartment.bind(
    organizationManagementController
  )
);

// =========================================================
// AUDIT LOG
// =========================================================

router.get(
  "/audit-log",
  organizationManagementController.getAuditLog.bind(
    organizationManagementController
  )
);

// =========================================================
// DESIGNATIONS UPDATE & CHART
// =========================================================

router.put(
  "/designations/:id",
  requireOrganizationWrite,
  organizationManagementController.updateDesignation.bind(
    organizationManagementController
  )
);

router.get(
  "/chart",
  organizationManagementController.getOrganizationChart.bind(
    organizationManagementController
  )
);

// =========================================================
// HOLIDAYS
// =========================================================

router.get(
  "/holidays",
  organizationManagementController.getHolidays.bind(
    organizationManagementController
  )
);

router.post(
  "/holidays",
  requireOrganizationWrite,
  organizationManagementController.addHoliday.bind(
    organizationManagementController
  )
);

router.delete(
  "/holidays/:id",
  requireOrganizationWrite,
  organizationManagementController.deleteHoliday.bind(
    organizationManagementController
  )
);

export default router;
