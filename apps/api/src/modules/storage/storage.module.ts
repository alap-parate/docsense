import { Module } from '@nestjs/common';
import { StorageService } from './services/storage.service';
import { S3Service } from './services/s3.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Folders } from './entities/folder.entity';
import { Files } from './entities/files.entity';
import { DocumentPages } from '../documents/entities/document-pages.entity';
import { ProcessingJobs } from '../processing/entities/processing-job.entity';
import { FolderRepository } from './repositories/folder.repository';
import { FileRepository } from './repositories/file.repository';
import { FoldersController } from './folders.controller';
import { FilesController } from './files.controller';
import { RecycleBinController } from './recycle-bin.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from 'src/core/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Folders,
      Files,
      DocumentPages,
      ProcessingJobs,
    ]),
    ConfigModule,
    TenantsModule,
    AuthModule,
  ],
  providers: [
    StorageService, 
    S3Service,
    FolderRepository,
    FileRepository,
  ],
  controllers: [
    FoldersController,
    FilesController,
    RecycleBinController,
  ],
  exports: [S3Service]
})
export class StorageModule {}
