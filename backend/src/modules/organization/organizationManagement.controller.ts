import { Request, Response } from "express";
import { organizationManagementService } from "./organizationManagement.service";

export class OrganizationManagementController {

  // =========================================================
  // COMPANY
  // =========================================================

  async getCompany(req: Request, res: Response) {
    try {
      const data = await organizationManagementService.getCompany();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getCompany error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get company",
      });
    }
  }

  async updateCompany(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.updateCompany(req.body);

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("updateCompany error:", error);

      return res.status(400).json({
        message: error.message || "Failed to update company",
      });
    }
  }

  // =========================================================
  // BUSINESS UNITS
  // =========================================================

  async getBusinessUnits(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getBusinessUnits();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getBusinessUnits error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get business units",
      });
    }
  }

  async addBusinessUnit(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addBusinessUnit(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addBusinessUnit error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create business unit",
      });
    }
  }

  // =========================================================
  // DEPARTMENTS
  // =========================================================

  async getDepartments(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getDepartments();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getDepartments error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get departments",
      });
    }
  }

  async addDepartment(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addDepartment(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addDepartment error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create department",
      });
    }
  }

  // =========================================================
  // LOCATIONS
  // =========================================================

  async getLocations(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getLocations();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getLocations error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get locations",
      });
    }
  }

  async addLocation(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addLocation(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addLocation error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create location",
      });
    }
  }

  async deactivateLocation(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.deactivateLocation(
          req.params.id
        );

      if (data.error) {
        return res.status(400).json(data);
      }

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("deactivateLocation error:", error);

      return res.status(500).json({
        message: error.message || "Failed to deactivate location",
      });
    }
  }

  // =========================================================
  // COST CENTERS
  // =========================================================

  async getCostCenters(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getCostCenters();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getCostCenters error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get cost centers",
      });
    }
  }

  async addCostCenter(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addCostCenter(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addCostCenter error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create cost center",
      });
    }
  }

  // =========================================================
  // DESIGNATIONS
  // =========================================================

  async getDesignations(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getDesignations();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getDesignations error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get designations",
      });
    }
  }

  async addDesignation(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addDesignation(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addDesignation error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create designation",
      });
    }
  }

  // =========================================================
  // GRADES
  // =========================================================

  async getGrades(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getGrades();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getGrades error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get grades",
      });
    }
  }

  async addGrade(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.addGrade(req.body);

      return res.status(201).json(data);
    } catch (error: any) {
      console.error("addGrade error:", error);

      return res.status(400).json({
        message: error.message || "Failed to create grade",
      });
    }
  }

  // =========================================================
  // REPORTING STRUCTURE
  // =========================================================

  async getRoster(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getRoster();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getRoster error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get employee roster",
      });
    }
  }

  async updateReportingManager(req: Request, res: Response) {
    try {
        const employeeId = req.params.employeeId;
        const { managerId } = req.body;

        const userId = req.auth?.sub;

        if (!userId) {
            return res.status(401).json({
                message: "Authentication required",
            });
        }

        const data =
            await organizationManagementService.updateReportingManager(
                employeeId,
                managerId || null,
                userId
            );

        if (data.error) {
            return res.status(400).json(data);
        }

        return res.status(200).json(data);
    } catch (error: any) {
        console.error("updateReportingManager error:", error);

        return res.status(500).json({
            message:
                error.message ||
                "Failed to update reporting manager",
        });
    }
}

  // =========================================================
  // BULK REASSIGN
  // =========================================================

  async bulkReassignDepartment(req: Request, res: Response) {
    try {
      const {
        employeeIds,
        newDepartmentId,
      } = req.body;

      const userId = req.auth?.sub;

      if (!userId) {
        return res.status(401).json({
          message: "Authentication required",
        });
      }

      const data =
        await organizationManagementService.bulkReassignDepartment(
          employeeIds,
          newDepartmentId,
          userId
        );

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("bulkReassignDepartment error:", error);

      return res.status(400).json({
        message:
          error.message ||
          "Failed to bulk reassign department",
      });
    }
  }

  // =========================================================
  // AUDIT LOG
  // =========================================================

  async getAuditLog(req: Request, res: Response) {
    try {
      const data =
        await organizationManagementService.getAuditLog();

      return res.status(200).json(data);
    } catch (error: any) {
      console.error("getAuditLog error:", error);

      return res.status(500).json({
        message: error.message || "Failed to get audit log",
      });
    }
  }
}

export const organizationManagementController =
  new OrganizationManagementController();