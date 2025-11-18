import { Test, TestingModule } from '@nestjs/testing';
import { FreetimeService } from './freetime.service';

describe('FreetimeService', () => {
  let service: FreetimeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FreetimeService],
    }).compile();

    service = module.get<FreetimeService>(FreetimeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
