"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsModule = void 0;
const common_1 = require("@nestjs/common");
const jobs_controller_1 = require("./jobs.controller");
const jobs_service_1 = require("./jobs.service");
const slots_module_1 = require("../slots/slots.module");
const schedule_module_1 = require("../schedule/schedule.module");
const payments_module_1 = require("../payments/payments.module");
const notification_module_1 = require("../notifications/notification.module");
const activity_module_1 = require("../activity/activity.module");
const job_access_service_1 = require("./services/job-access.service");
const job_assignment_service_1 = require("./services/job-assignment.service");
const job_creation_service_1 = require("./services/job-creation.service");
const job_draft_service_1 = require("./services/job-draft.service");
const job_collaboration_service_1 = require("./services/job-collaboration.service");
const job_lifecycle_service_1 = require("./services/job-lifecycle.service");
const job_query_service_1 = require("./services/job-query.service");
let JobsModule = class JobsModule {
};
exports.JobsModule = JobsModule;
exports.JobsModule = JobsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            slots_module_1.SlotsModule,
            schedule_module_1.ScheduleModule,
            payments_module_1.PaymentsModule,
            notification_module_1.NotificationModule,
            activity_module_1.ActivityModule,
        ],
        controllers: [jobs_controller_1.JobsController],
        providers: [
            jobs_service_1.JobsService,
            job_access_service_1.JobAccessService,
            job_assignment_service_1.JobAssignmentService,
            job_draft_service_1.JobDraftService,
            job_query_service_1.JobQueryService,
            job_creation_service_1.JobCreationService,
            job_lifecycle_service_1.JobLifecycleService,
            job_collaboration_service_1.JobCollaborationService,
        ],
        exports: [jobs_service_1.JobsService],
    })
], JobsModule);
//# sourceMappingURL=jobs.module.js.map