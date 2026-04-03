import { ROLES_KEY } from '@hena-wadeena/nest-common';
import type { JwtPayload } from '@hena-wadeena/nest-common';
import { UserRole } from '@hena-wadeena/types';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BusinessInquiriesController } from './business-inquiries.controller';
import { BusinessInquiriesService } from './business-inquiries.service';
import type { CreateBusinessInquiryDto } from './dto/create-business-inquiry.dto';
import type { QueryBusinessInquiriesDto } from './dto/query-business-inquiries.dto';
import type { ReplyBusinessInquiryDto } from './dto/reply-business-inquiry.dto';

type ControllerMethod = (...args: unknown[]) => unknown;

describe('BusinessInquiriesController', () => {
  let controller: BusinessInquiriesController;
  let service: {
    submit: ReturnType<typeof vi.fn>;
    findReceived: ReturnType<typeof vi.fn>;
    findSent: ReturnType<typeof vi.fn>;
    markRead: ReturnType<typeof vi.fn>;
    reply: ReturnType<typeof vi.fn>;
  };

  const currentUser: JwtPayload = {
    sub: 'investor-1',
    email: 'investor@example.com',
    role: UserRole.INVESTOR,
    lang: 'en',
    jti: 'jti-1',
  };

  beforeEach(() => {
    service = {
      submit: vi.fn(),
      findReceived: vi.fn(),
      findSent: vi.fn(),
      markRead: vi.fn(),
      reply: vi.fn(),
    };

    controller = new BusinessInquiriesController(service as unknown as BusinessInquiriesService);
  });

  it('declares the controller root path', () => {
    const submit = Object.getOwnPropertyDescriptor(
      BusinessInquiriesController.prototype,
      'submit',
    )?.value;

    expect(Reflect.getMetadata(PATH_METADATA, BusinessInquiriesController)).toBe('/');
    expect(Reflect.getMetadata(METHOD_METADATA, submit)).toBe(RequestMethod.POST);
  });

  it('restricts inquiry actions to investor and admin roles', () => {
    const submit = Object.getOwnPropertyDescriptor(BusinessInquiriesController.prototype, 'submit')
      ?.value as ControllerMethod;
    const findReceived = Object.getOwnPropertyDescriptor(
      BusinessInquiriesController.prototype,
      'findReceived',
    )?.value as ControllerMethod;
    const markRead = Object.getOwnPropertyDescriptor(
      BusinessInquiriesController.prototype,
      'markRead',
    )?.value as ControllerMethod;
    const reply = Object.getOwnPropertyDescriptor(BusinessInquiriesController.prototype, 'reply')
      ?.value as ControllerMethod;

    expect(Reflect.getMetadata(ROLES_KEY, submit)).toEqual([UserRole.INVESTOR, UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, findReceived)).toEqual([
      UserRole.INVESTOR,
      UserRole.ADMIN,
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, markRead)).toEqual([UserRole.INVESTOR, UserRole.ADMIN]);
    expect(Reflect.getMetadata(ROLES_KEY, reply)).toEqual([UserRole.INVESTOR, UserRole.ADMIN]);
  });

  it('delegates received inquiry lookup to the service', async () => {
    const query: QueryBusinessInquiriesDto = { offset: 0, limit: 20 };

    await controller.findReceived(currentUser, query);

    expect(service.findReceived).toHaveBeenCalledWith(currentUser.sub, query);
  });

  it('delegates inquiry submission to the service', async () => {
    const dto: CreateBusinessInquiryDto = {
      contactName: 'Investor User',
      contactEmail: 'investor@example.com',
      contactPhone: '01000000000',
      message: 'Interested in your startup.',
    };

    await controller.submit('business-1', currentUser, dto);

    expect(service.submit).toHaveBeenCalledWith('business-1', currentUser.sub, dto);
  });

  it('delegates replies to the service', async () => {
    const dto: ReplyBusinessInquiryDto = { message: 'Let us schedule a meeting.' };

    await controller.reply('inquiry-1', currentUser, dto);

    expect(service.reply).toHaveBeenCalledWith('inquiry-1', currentUser.sub, dto);
  });
});
