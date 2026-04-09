import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';

import { JOB_DEMO_USERS } from './jobs.seed';
import { JobsService } from './jobs.service';

describe('JobsService', () => {
  let service: JobsService;

  beforeEach(() => {
    service = new JobsService();
  });

  it('lists seeded jobs and applies public filters', async () => {
    const allJobs = await service.findAll({ offset: 0, limit: 12 });
    const agricultureJobs = await service.findAll({
      category: 'agriculture',
      offset: 0,
      limit: 12,
    });

    expect(allJobs.data.length).toBeGreaterThan(0);
    expect(allJobs.total).toBeGreaterThan(0);
    expect(agricultureJobs.data.every((job) => job.category === 'agriculture')).toBe(true);
  });

  it('creates a job and returns it in poster listings', async () => {
    const created = await service.create(
      {
        title: 'عامل تعبئة تمور',
        descriptionAr: 'مطلوب عامل تعبئة لموسم التمور.',
        category: 'agriculture',
        area: 'kharga',
        compensation: 45000,
        compensationType: 'daily',
        slots: 2,
      },
      JOB_DEMO_USERS.merchant,
    );

    const myPosts = await service.findMyPosts(JOB_DEMO_USERS.merchant);

    expect(created.posterId).toBe(JOB_DEMO_USERS.merchant);
    expect(created.status).toBe('open');
    expect(myPosts.data.some((job) => job.id === created.id)).toBe(true);
  });

  it('accepts one application per user and returns it in my applications', async () => {
    const jobs = await service.findAll({ offset: 0, limit: 12 });
    const targetJob = jobs.data[0];
    expect(targetJob).toBeDefined();
    if (!targetJob) {
      throw new Error('Expected a seeded job');
    }

    const application = await service.apply(targetJob.id, JOB_DEMO_USERS.resident, {
      noteAr: 'أستطيع البدء فوراً.',
    });

    const myApplications = await service.findMyApplications(JOB_DEMO_USERS.resident);

    expect(application.jobId).toBe(targetJob.id);
    expect(application.status).toBe('pending');
    expect(myApplications.data.some((app) => app.id === application.id)).toBe(true);

    await expect(service.apply(targetJob.id, JOB_DEMO_USERS.resident, {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('prevents posters from applying to their own jobs', async () => {
    const jobs = await service.findAll({ offset: 0, limit: 12 });
    const targetJob = jobs.data[0];
    expect(targetJob).toBeDefined();
    if (!targetJob) {
      throw new Error('Expected a seeded job');
    }

    await expect(service.apply(targetJob.id, targetJob.posterId, {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('lets the poster manage applications through completion and submit a review', async () => {
    const created = await service.create(
      {
        title: 'منسق حجوزات سياحية',
        descriptionAr: 'وظيفة موسمية لتنسيق حجوزات الواحات.',
        category: 'tourism',
        area: 'dakhla',
        compensation: 120000,
        compensationType: 'fixed',
        slots: 1,
      },
      JOB_DEMO_USERS.merchant,
    );

    const application = await service.apply(created.id, JOB_DEMO_USERS.student, {
      noteAr: 'لدي خبرة في خدمة العملاء.',
    });

    await service.updateApplicationStatus(created.id, application.id, JOB_DEMO_USERS.merchant, {
      status: 'accepted',
    });
    await service.updateApplicationStatus(created.id, application.id, JOB_DEMO_USERS.merchant, {
      status: 'in_progress',
    });
    const completed = await service.updateApplicationStatus(
      created.id,
      application.id,
      JOB_DEMO_USERS.merchant,
      {
        status: 'completed',
      },
    );
    const review = await service.submitReview(
      created.id,
      application.id,
      JOB_DEMO_USERS.merchant,
      {
        rating: 5,
        comment: 'ملتزم وسريع.',
      },
    );
    const posterReviews = await service.findUserReviews(JOB_DEMO_USERS.merchant);

    expect(completed.status).toBe('completed');
    expect(review.direction).toBe('poster_rates_worker');
    expect(posterReviews.some((item) => item.id === review.id)).toBe(true);
  });
});
