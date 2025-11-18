import { Test, TestingModule } from '@nestjs/testing';
import { TaskBlocksRepoService } from './task-blocks.repo.service';

describe('TaskBlocksRepoService', () => {
  let service: TaskBlocksRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TaskBlocksRepoService],
    }).compile();

    service = module.get<TaskBlocksRepoService>(TaskBlocksRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
