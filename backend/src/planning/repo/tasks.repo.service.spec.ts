import { Test, TestingModule } from '@nestjs/testing';
import { TasksRepoService } from './tasks.repo.service';

describe('TasksRepoService', () => {
  let service: TasksRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TasksRepoService],
    }).compile();

    service = module.get<TasksRepoService>(TasksRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
