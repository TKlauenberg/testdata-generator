import { Module } from '@nestjs/common';
import { TestDataService } from './test-data.service';
import { TestDataController } from './test-data.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestData } from './test-data.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TestData])],
  providers: [TestDataService],
  controllers: [TestDataController],
})
export class TestDataModule {}
