import { Router } from "express";
import {
  organizationManagementController,
} from "./organizationManagement.controller";

import { authenticate } from "../../middlewares/auth";

const router = Router();

router.use(authenticate);

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
  organizationManagementController.addLocation.bind(
    organizationManagementController
  )
);

router.put(
  "/locations/:id/deactivate",
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
  organizationManagementController.updateReportingManager.bind(
    organizationManagementController
  )
);

router.post(
  "/employees/bulk-reassign-department",
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

export default router;