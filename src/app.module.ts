import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestDataModule } from './test-data/test-data.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'admin',
      password: 'TickTack',
      database: 'test_data_management',
      autoLoadEntities: true,
      synchronize: true, //Disable this in production
    }),
    TestDataModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
