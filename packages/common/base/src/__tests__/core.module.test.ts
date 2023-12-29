import { Test, TestingModule } from '@nestjs/testing';
import { CoreModule } from '../core.module';

describe('CoreModule', () => {
  let coreModule: CoreModule;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [CoreModule],
    }).compile();

    coreModule = module.get<CoreModule>(CoreModule);
  });

  it('should be defined', () => {
    expect(coreModule).toBeDefined();
  });
});
