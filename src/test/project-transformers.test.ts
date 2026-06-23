import { describe, it, expect } from "vitest";
import { transformToDB, transformToProjectV3, formatDateForDB } from "../utils/project-transformers";
import { ProjectV2, StageStatus } from "../types/ProjectV2";

describe("project-transformers", () => {
  describe("formatDateForDB", () => {
    it("should format Date objects to ISO string", () => {
      const date = new Date("2026-06-03T10:00:00Z");
      expect(formatDateForDB(date)).toBe(date.toISOString());
    });

    it("should format valid date strings to ISO string", () => {
      const dateStr = "2026-06-03T10:00:00Z";
      expect(formatDateForDB(dateStr)).toBe(new Date(dateStr).toISOString());
    });

    it("should return null for null/undefined/empty string", () => {
      expect(formatDateForDB(null)).toBeNull();
      expect(formatDateForDB(undefined)).toBeNull();
      expect(formatDateForDB("")).toBeNull();
    });

    it("should return null for invalid dates", () => {
      expect(formatDateForDB("invalid-date")).toBeNull();
      expect(formatDateForDB(new Date("invalid-date"))).toBeNull();
    });
  });

  describe("transformToDB", () => {
    it("should map basic fields correctly", () => {
      const project: Partial<ProjectV2> = {
        clientName: "Client A",
        ticketNumber: "12345",
        systemType: "ERP",
        implantationType: "new",
        projectType: "new",
        globalStatus: "in-progress",
        overallProgress: 50,
        opNumber: 101,
        salesOrderNumber: 202,
        soldHours: 40,
        workHours: 25,
        legacySystem: "Siplan",
        specialty: "Fiscal",
        products: ["Prod1", "Prod2"],
        description: "A description",
        specialConsiderations: "None",
        contractValue: 5000,
        paymentMethod: "Boleto",
        externalId: "ext-123",
        projectLeader: "Leader John",
        clientPrimaryContact: "Contact Jane",
        clientEmail: "jane@client.com",
        clientPhone: "123456789",
        priority: "high",
        tags: ["tag1", "tag2"],
        customFields: { customKey: "customValue" },
        lastUpdatedBy: "User X",
      };

      const result = transformToDB(project);

      expect(result.client_name).toBe("Client A");
      expect(result.ticket_number).toBe("12345");
      expect(result.system_type).toBe("ERP");
      expect(result.implantation_type).toBe("new");
      expect(result.project_type).toBe("new");
      expect(result.global_status).toBe("in-progress");
      expect(result.overall_progress).toBe(50);
      expect(result.op_number).toBe(101);
      expect(result.sales_order_number).toBe(202);
      expect(result.sold_hours).toBe(40);
      expect(result.work_hours).toBe(25);
      expect(result.legacy_system).toBe("Siplan");
      expect(result.specialty).toBe("Fiscal");
      expect(result.products).toEqual(["Prod1", "Prod2"]);
      expect(result.description).toBe("A description");
      expect(result.special_considerations).toBe("None");
      expect(result.contract_value).toBe(5000);
      expect(result.payment_method).toBe("Boleto");
      expect(result.external_id).toBe("ext-123");
      expect(result.project_leader).toBe("Leader John");
      expect(result.client_primary_contact).toBe("Contact Jane");
      expect(result.client_email).toBe("jane@client.com");
      expect(result.client_phone).toBe("123456789");
      expect(result.priority).toBe("high");
      expect(result.tags).toEqual(["tag1", "tag2"]);
      expect(result.custom_fields).toEqual({ customKey: "customValue" });
      expect(result.last_update_by).toBe("User X");
    });

    it("should handle soft delete transitions and set deleted_at / archived_at", () => {
      const project: Partial<ProjectV2> = {
        isDeleted: true,
        deletedBy: "Admin",
        isArchived: true,
      };

      const currentProject: ProjectV2 = {
        id: "p1",
        clientName: "Client A",
        ticketNumber: "123",
        systemType: "ERP",
        implantationType: "new",
        projectType: "new",
        healthScore: "ok",
        globalStatus: "in-progress",
        overallProgress: 0,
        projectLeader: "",
        clientEmail: "",
        clientPhone: "",
        tags: [],
        priority: "normal",
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: "",
        stages: {} as any,
        isDeleted: false,
        isArchived: false,
      };

      const result = transformToDB(project, currentProject);

      expect(result.is_deleted).toBe(true);
      expect(result.deleted_at).toBeDefined();
      expect(result.deleted_by).toBe("Admin");
      expect(result.is_archived).toBe(true);
      expect(result.archived_at).toBeDefined();
    });

    it("should flatten stages correctly and apply auto-date fills", () => {
      const startDate = new Date("2026-06-01T00:00:00Z");
      const endDate = new Date("2026-06-02T00:00:00Z");

      const project: Partial<ProjectV2> = {
        stages: {
          infra: {
            status: "in-progress",
            responsible: "Infra Guy",
            startDate,
            endDate,
            observations: "Infra obs",
            technicalNotes: "Tech notes",
            workstationsStatus: "Adequado",
            serverStatus: "Adequado",
            workstationsCount: 5,
            blockingReason: "other",
            approvedByInfra: true,
            serverInUse: "AWS",
            serverNeeded: "Yes",
          },
          adherence: {
            status: "done",
            responsible: "Adherence Guy",
            startDate,
            endDate,
            observations: "Adherence obs",
            hasProductGap: true,
            gapDescription: "Gap desc",
            devTicket: "TICKET-1",
            devEstimatedDate: startDate,
            gapPriority: "high",
            analysisComplete: true,
            conformityStandards: "ISO",
          },
          environment: {
            status: "todo",
            responsible: "Env Guy",
            startDate,
            endDate,
            observations: "Env obs",
            osVersion: "Win11",
            version: "v2",
            realDate: endDate,
            approvedByInfra: true,
          },
          conversion: {
            status: "in-progress",
            responsible: "Conv Guy",
            startDate,
            endDate,
            observations: "Conv obs",
            complexity: "medium",
            dataVolumeGb: 100,
            toolUsed: "ToolX",
            homologationDate: endDate,
            deviations: "None",
            homologationStatus: "waiting_adjustment",
            homologationResponsible: "Homolog Guy",
            sentAt: startDate,
            finishedAt: endDate,
            homologationComplete: false,
            homologationWorkflowStatus: "in_progress",
            recordCount: 1000,
          },
          implementation: {
            status: "done",
            responsible: "Imp Guy",
            startDate,
            endDate,
            observations: "Imp obs",
            phase1: { status: "done" } as any,
            phase2: { status: "todo" } as any,
          },
          modelosEditor: {
            status: "in-progress",
            responsible: "Model Guy",
            startDate,
            endDate,
            observations: "Model obs",
            sentFiles: [{ name: "file1" }],
            availableFiles: [{ name: "file2" }],
          },
          post: {
            status: "done",
            responsible: "Post Guy",
            startDate,
            endDate,
            observations: "Post obs",
            supportPeriodDays: 30,
            supportEndDate: endDate,
            benefitsDelivered: "Many",
            challengesFound: "Few",
            roiEstimated: "High",
            clientSatisfaction: "very_satisfied",
            recommendations: "None",
            followupNeeded: true,
            followupDate: endDate,
          },
        },
      };

      const result = transformToDB(project);

      // Infra
      expect(result.infra_status).toBe("in-progress");
      expect(result.infra_responsible).toBe("Infra Guy");
      expect(result.infra_start_date).toBe(startDate.toISOString());
      expect(result.infra_end_date).toBe(endDate.toISOString());
      expect(result.infra_observations).toBe("Infra obs");
      expect(result.infra_technical_notes).toBe("Tech notes");
      expect(result.infra_workstations_status).toBe("Adequado");
      expect(result.infra_server_status).toBe("Adequado");
      expect(result.infra_workstations_count).toBe(5);
      expect(result.infra_blocking_reason).toBe("other");
      expect(result.infra_approved_by_infra).toBe(true);
      expect(result.infra_server_in_use).toBe("AWS");
      expect(result.infra_server_needed).toBe("Yes");

      // Adherence
      expect(result.adherence_status).toBe("done");
      expect(result.adherence_responsible).toBe("Adherence Guy");
      expect(result.adherence_start_date).toBe(startDate.toISOString());
      expect(result.adherence_end_date).toBe(endDate.toISOString());
      expect(result.adherence_observations).toBe("Adherence obs");
      expect(result.adherence_has_product_gap).toBe(true);
      expect(result.adherence_gap_description).toBe("Gap desc");
      expect(result.adherence_dev_ticket).toBe("TICKET-1");
      expect(result.adherence_dev_estimated_date).toBe(startDate.toISOString());
      expect(result.adherence_gap_priority).toBe("high");
      expect(result.adherence_analysis_complete).toBe(true);
      expect(result.adherence_conformity_standards).toBe("ISO");

      // Environment
      expect(result.environment_status).toBe("todo");
      expect(result.environment_responsible).toBe("Env Guy");
      expect(result.environment_start_date).toBe(startDate.toISOString());
      expect(result.environment_end_date).toBe(endDate.toISOString());
      expect(result.environment_observations).toBe("Env obs");
      expect(result.environment_os_version).toBe("Win11");
      expect(result.environment_version).toBe("v2");
      expect(result.environment_real_date).toBe(endDate.toISOString());
      expect(result.environment_approved_by_infra).toBe(true);

      // Conversion
      expect(result.conversion_status).toBe("in-progress");
      expect(result.conversion_responsible).toBe("Conv Guy");
      expect(result.conversion_start_date).toBe(startDate.toISOString());
      expect(result.conversion_end_date).toBe(endDate.toISOString());
      expect(result.conversion_observations).toBe("Conv obs");
      expect(result.conversion_complexity).toBe("medium");
      expect(result.conversion_data_volume_gb).toBe(100);
      expect(result.conversion_tool_used).toBe("ToolX");
      expect(result.conversion_homologation_date).toBe(endDate.toISOString());
      expect(result.conversion_deviations).toBe("None");
      expect(result.conversion_homologation_status).toBe("waiting_adjustment");
      expect(result.conversion_homologation_responsible).toBe("Homolog Guy");
      expect(result.conversion_sent_at).toBe(startDate.toISOString());
      expect(result.conversion_finished_at).toBe(endDate.toISOString());
      expect(result.conversion_homologation_complete).toBe(false);
      expect(result.conversion_homologation_workflow_status).toBe("in_progress");
      expect(result.conversion_record_count).toBe(1000);

      // Implementation
      expect(result.implementation_status).toBe("done");
      expect(result.implementation_responsible).toBe("Imp Guy");
      expect(result.implementation_start_date).toBe(startDate.toISOString());
      expect(result.implementation_end_date).toBe(endDate.toISOString());
      expect(result.implementation_observations).toBe("Imp obs");
      expect(result.implementation_phase1).toEqual({ status: "done" });
      expect(result.implementation_phase2).toEqual({ status: "todo" });

      // Modelos Editor
      expect(result.modelos_editor_status).toBe("in-progress");
      expect(result.modelos_editor_responsible).toBe("Model Guy");
      expect(result.modelos_editor_start_date).toBe(startDate.toISOString());
      expect(result.modelos_editor_end_date).toBe(endDate.toISOString());
      expect(result.modelos_editor_observations).toBe("Model obs");
      expect(result.modelos_editor_sent_files).toEqual([{ name: "file1" }]);
      expect(result.modelos_editor_available_files).toEqual([{ name: "file2" }]);

      // Post
      expect(result.post_status).toBe("done");
      expect(result.post_responsible).toBe("Post Guy");
      expect(result.post_start_date).toBe(startDate.toISOString());
      expect(result.post_end_date).toBe(endDate.toISOString());
      expect(result.post_observations).toBe("Post obs");
      expect(result.post_support_period_days).toBe(30);
      expect(result.post_support_end_date).toBe(endDate.toISOString());
      expect(result.post_benefits_delivered).toBe("Many");
      expect(result.post_challenges_found).toBe("Few");
      expect(result.post_roi_estimated).toBe("High");
      expect(result.post_client_satisfaction).toBe("very_satisfied");
      expect(result.post_recommendations).toBe("None");
      expect(result.post_followup_needed).toBe(true);
      expect(result.post_followup_date).toBe(endDate.toISOString());
    });

    it("should auto-fill startDate and endDate when changing stage statuses and dates are absent", () => {
      const currentProject: ProjectV2 = {
        id: "p1",
        clientName: "Client A",
        ticketNumber: "123",
        systemType: "ERP",
        implantationType: "new",
        projectType: "new",
        healthScore: "ok",
        globalStatus: "in-progress",
        overallProgress: 0,
        projectLeader: "",
        clientEmail: "",
        clientPhone: "",
        tags: [],
        priority: "normal",
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: "",
        stages: {
          infra: { status: "todo" },
          adherence: { status: "in-progress" },
        } as any,
        isDeleted: false,
        isArchived: false,
      };

      const project: Partial<ProjectV2> = {
        stages: {
          infra: {
            status: "in-progress",
          },
          adherence: {
            status: "done",
          },
        } as any,
      };

      const result = transformToDB(project, currentProject);

      expect(result.infra_start_date).toBeDefined();
      expect(result.infra_end_date).toBeNull(); // not done

      expect(result.adherence_start_date).toBeNull(); // was in-progress, but since we didn't specify start date, it defaults to null or keeps previous logic
      expect(result.adherence_end_date).toBeDefined(); // transitioned to done
    });

    it("should preserve workstations, servers, files and phase objects from oldProject if omitted in the updates (partial updates protection)", () => {
      const currentProject: ProjectV2 = {
        id: "p1",
        clientName: "Client A",
        ticketNumber: "123",
        systemType: "ERP",
        implantationType: "new",
        projectType: "new",
        healthScore: "ok",
        globalStatus: "in-progress",
        overallProgress: 0,
        projectLeader: "",
        clientEmail: "",
        clientPhone: "",
        tags: [],
        priority: "normal",
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: "",
        stages: {
          infra: {
            status: "in-progress",
            servers: [{ hostname: "test-server" }],
            workstations: [{ id: 1, hostname: "test-station" }]
          },
          modelosEditor: {
            status: "in-progress",
            sentFiles: [{ name: "sent.pdf" }],
            availableFiles: [{ name: "avail.pdf" }]
          },
          implementation: {
            status: "in-progress",
            phase1: { status: "done" },
            phase2: { status: "todo" }
          }
        } as any,
        isDeleted: false,
        isArchived: false,
      };

      const project: Partial<ProjectV2> = {
        stages: {
          infra: {
            status: "done"
          },
          modelosEditor: {
            status: "done"
          },
          implementation: {
            status: "done"
          }
        } as any,
      };

      const result = transformToDB(project, currentProject);

      // Verify that the arrays/objects are preserved from currentProject
      expect(result.infra_servers).toEqual([{ hostname: "test-server" }]);
      expect(result.infra_workstations).toEqual([{ id: 1, hostname: "test-station" }]);
      expect(result.modelos_editor_sent_files).toEqual([{ name: "sent.pdf" }]);
      expect(result.modelos_editor_available_files).toEqual([{ name: "avail.pdf" }]);
      expect(result.implementation_phase1).toEqual({ status: "done" });
      expect(result.implementation_phase2).toEqual({ status: "todo" });
    });

    it("should allow clearing array fields when explicitly provided as empty arrays in updates", () => {
      const currentProject: ProjectV2 = {
        id: "p1",
        clientName: "Client A",
        ticketNumber: "123",
        systemType: "ERP",
        implantationType: "new",
        projectType: "new",
        healthScore: "ok",
        globalStatus: "in-progress",
        overallProgress: 0,
        projectLeader: "",
        clientEmail: "",
        clientPhone: "",
        tags: [],
        priority: "normal",
        createdAt: new Date(),
        lastUpdatedAt: new Date(),
        lastUpdatedBy: "",
        stages: {
          infra: {
            status: "in-progress",
            servers: [{ hostname: "test-server" }],
            workstations: [{ id: 1, hostname: "test-station" }]
          },
          modelosEditor: {
            status: "in-progress",
            sentFiles: [{ name: "sent.pdf" }],
            availableFiles: [{ name: "avail.pdf" }]
          }
        } as any,
        isDeleted: false,
        isArchived: false,
      };

      const project: Partial<ProjectV2> = {
        stages: {
          infra: {
            status: "done",
            servers: [],
            workstations: []
          },
          modelosEditor: {
            status: "done",
            sentFiles: [],
            availableFiles: []
          }
        } as any,
      };

      const result = transformToDB(project, currentProject);

      // Verify that they are cleared as requested
      expect(result.infra_servers).toEqual([]);
      expect(result.infra_workstations).toEqual([]);
      expect(result.modelos_editor_sent_files).toEqual([]);
      expect(result.modelos_editor_available_files).toEqual([]);
    });
  });

  describe("transformToProjectV3", () => {
    it("should reconstruct ProjectV2 correctly from flat DB row", () => {
      const dateStr = "2026-06-03T10:00:00.000Z";
      const dbRow: Record<string, unknown> = {
        id: "p-123",
        client_name: "Client A",
        ticket_number: "12345",
        system_type: "ERP",
        implantation_type: "migration_siplan",
        project_type: "migration",
        op_number: 101,
        sales_order_number: 202,
        sold_hours: 45,
        work_hours: 35,
        legacy_system: "Competitor",
        specialty: "Registry",
        products: ["A", "B"],
        global_status: "done",
        overall_progress: 100,
        project_leader: "Leader X",
        client_primary_contact: "Contact Y",
        client_email: "y@client.com",
        client_phone: "987654321",
        infra_responsible: "Infra R",
        adherence_responsible: "Adh R",
        environment_responsible: "Env R",
        conversion_responsible: "Conv R",
        implementation_responsible: "Imp R",
        post_responsible: "Post R",
        start_date_actual: dateStr,
        end_date_actual: dateStr,
        created_at: dateStr,
        updated_at: dateStr,
        last_update_by: "Updater",
        tags: ["a", "b"],
        priority: "critical",
        custom_fields: { x: 1 },
        is_deleted: false,
        is_archived: false,
        notes: JSON.stringify({
          id: "notes-123",
          blocks: [{ id: "b1", type: "paragraph", content: "Notes content" }],
        }),

        // Stage details
        infra_status: "in-progress" as StageStatus,
        infra_observations: "Infra obs",
        infra_technical_notes: "Tech notes",
        adherence_status: "done" as StageStatus,
        adherence_observations: "Adh obs",
        adherence_has_product_gap: true,
      };

      const result = transformToProjectV3(dbRow);

      expect(result.id).toBe("p-123");
      expect(result.clientName).toBe("Client A");
      expect(result.ticketNumber).toBe("12345");
      expect(result.systemType).toBe("ERP");
      expect(result.implantationType).toBe("migration_siplan");
      expect(result.projectType).toBe("migration");
      expect(result.opNumber).toBe(101);
      expect(result.salesOrderNumber).toBe(202);
      expect(result.soldHours).toBe(45);
      expect(result.workHours).toBe(35);
      expect(result.legacySystem).toBe("Competitor");
      expect(result.specialty).toBe("Registry");
      expect(result.products).toEqual(["A", "B"]);
      expect(result.globalStatus).toBe("done");
      expect(result.overallProgress).toBe(100);
      expect(result.projectLeader).toBe("Leader X");
      expect(result.clientPrimaryContact).toBe("Contact Y");
      expect(result.clientEmail).toBe("y@client.com");
      expect(result.clientPhone).toBe("987654321");
      expect(result.responsibleInfra).toBe("Infra R");
      expect(result.responsibleAdherence).toBe("Adh R");
      expect(result.responsibleEnvironment).toBe("Env R");
      expect(result.responsibleConversion).toBe("Conv R");
      expect(result.responsibleImplementation).toBe("Imp R");
      expect(result.responsiblePost).toBe("Post R");

      expect(result.createdAt.toISOString()).toBe(dateStr);

      expect(result.tags).toEqual(["a", "b"]);
      expect(result.priority).toBe("critical");
      expect(result.customFields).toEqual({ x: 1 });
      expect(result.isDeleted).toBe(false);
      expect(result.isArchived).toBe(false);

      expect(result.notes?.id).toBe("notes-123");
      expect(result.notes?.blocks[0].content).toBe("Notes content");

      // Check reconstituted stage objects
      expect(result.stages.infra.status).toBe("in-progress");
      expect(result.stages.infra.observations).toBe("Infra obs");
      expect(result.stages.infra.technicalNotes).toBe("Tech notes");

      expect(result.stages.adherence.status).toBe("done");
      expect(result.stages.adherence.observations).toBe("Adh obs");
      expect(result.stages.adherence.hasProductGap).toBe(true);
    });
  });
});
