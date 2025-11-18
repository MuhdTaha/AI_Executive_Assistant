import { Test, TestingModule } from '@nestjs/testing';
import { CalendarRepoService } from './calendar.repo.service';

describe('CalendarRepoService', () => {
  let service: CalendarRepoService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CalendarRepoService],
    }).compile();

    service = module.get<CalendarRepoService>(CalendarRepoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
