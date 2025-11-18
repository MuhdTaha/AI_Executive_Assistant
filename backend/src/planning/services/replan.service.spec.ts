import { Test, TestingModule } from '@nestjs/testing';
import { ReplanService } from './replan.service';

describe('ReplanService', () => {
  let service: ReplanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReplanService],
    }).compile();

    service = module.get<ReplanService>(ReplanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
