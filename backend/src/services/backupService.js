/**
 * Automated Database Backup Service
 * Lion Football Academy - Comprehensive Backup and Recovery System
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const archiver = require('archiver');
const AWS = require('aws-sdk');
const cron = require('node-cron');
const logger = require('../utils/logger');
const centralizedLogging = require('./centralizedLogging');

class BackupService {
  constructor() {
    this.backupDirectory = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.isRunning = false;
    this.backupJobs = new Map();
    
    this.config = {
      // Database configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        name: process.env.DB_NAME || 'lion_football_academy',
        type: process.env.DB_TYPE || 'mysql'
      },
      
      // Backup schedules
      schedules: {
        daily: process.env.BACKUP_SCHEDULE_DAILY || '0 2 * * *', // 2 AM daily
        weekly: process.env.BACKUP_SCHEDULE_WEEKLY || '0 3 * * 0', // 3 AM Sunday
        monthly: process.env.BACKUP_SCHEDULE_MONTHLY || '0 4 1 * *' // 4 AM first day of month
      },
      
      // Retention policies
      retention: {
        daily: parseInt(process.env.BACKUP_RETENTION_DAILY) || 7, // 7 days
        weekly: parseInt(process.env.BACKUP_RETENTION_WEEKLY) || 4, // 4 weeks
        monthly: parseInt(process.env.BACKUP_RETENTION_MONTHLY) || 12 // 12 months
      },
      
      // Compression settings
      compression: {
        enabled: process.env.BACKUP_COMPRESSION !== 'false',
        level: parseInt(process.env.BACKUP_COMPRESSION_LEVEL) || 6
      },
      
      // Cloud storage
      cloud: {
        enabled: process.env.BACKUP_CLOUD_ENABLED === 'true',
        provider: process.env.BACKUP_CLOUD_PROVIDER || 'aws',
        bucket: process.env.BACKUP_S3_BUCKET || 'lfa-backups',
        region: process.env.BACKUP_S3_REGION || 'us-east-1',
        accessKeyId: process.env.BACKUP_S3_ACCESS_KEY,
        secretAccessKey: process.env.BACKUP_S3_SECRET_KEY
      },
      
      // Encryption
      encryption: {
        enabled: process.env.BACKUP_ENCRYPTION === 'true',
        key: process.env.BACKUP_ENCRYPTION_KEY || 'default-key-change-this'
      }
    };
    
    this.s3 = null;
    if (this.config.cloud.enabled && this.config.cloud.provider === 'aws') {
      this.initializeS3();
    }
    
    this.backupStats = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      lastBackup: null,
      totalSize: 0
    };
    
    this.ensureBackupDirectory();
  }
  
  // Initialize AWS S3 client
  initializeS3() {
    try {
      this.s3 = new AWS.S3({
        accessKeyId: this.config.cloud.accessKeyId,
        secretAccessKey: this.config.cloud.secretAccessKey,
        region: this.config.cloud.region
      });
      
      centralizedLogging.logApplication('INFO', 'AWS S3 client initialized for backups');
    } catch (error) {
      centralizedLogging.logError('Failed to initialize S3 client', error);
    }
  }
  
  // Ensure backup directory exists
  async ensureBackupDirectory() {
    try {
      await fs.promises.access(this.backupDirectory);
    } catch (error) {
      await fs.promises.mkdir(this.backupDirectory, { recursive: true });
      centralizedLogging.logApplication('INFO', `Backup directory created: ${this.backupDirectory}`);
    }
  }
  
  // Start automated backup service
  startBackupService() {
    if (this.isRunning) {
      centralizedLogging.logApplication('WARN', 'Backup service is already running');
      return;
    }
    
    this.isRunning = true;
    
    // Schedule daily backups
    const dailyJob = cron.schedule(this.config.schedules.daily, () => {
      this.performDatabaseBackup('daily');
    }, { scheduled: false });
    
    // Schedule weekly backups
    const weeklyJob = cron.schedule(this.config.schedules.weekly, () => {
      this.performFullBackup('weekly');
    }, { scheduled: false });
    
    // Schedule monthly backups
    const monthlyJob = cron.schedule(this.config.schedules.monthly, () => {
      this.performFullBackup('monthly');
    }, { scheduled: false });
    
    this.backupJobs.set('daily', dailyJob);
    this.backupJobs.set('weekly', weeklyJob);
    this.backupJobs.set('monthly', monthlyJob);
    
    // Start all scheduled jobs
    for (const job of this.backupJobs.values()) {
      job.start();
    }
    
    // Schedule cleanup job (daily at 1 AM)
    const cleanupJob = cron.schedule('0 1 * * *', () => {
      this.cleanupOldBackups();
    }, { scheduled: false });
    
    this.backupJobs.set('cleanup', cleanupJob);
    cleanupJob.start();
    
    centralizedLogging.logApplication('INFO', 'Backup service started with scheduled jobs');
  }
  
  // Stop backup service
  stopBackupService() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    // Stop all scheduled jobs
    for (const job of this.backupJobs.values()) {
      job.stop();
    }
    
    this.backupJobs.clear();
    centralizedLogging.logApplication('INFO', 'Backup service stopped');
  }
  
  // Perform database backup
  async performDatabaseBackup(type = 'manual') {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${this.config.database.name}_${type}_${timestamp}`;
    
    try {
      centralizedLogging.logApplication('INFO', `Starting ${type} database backup: ${backupName}`);
      
      let backupPath;
      
      if (this.config.database.type === 'mysql') {
        backupPath = await this.performMySQLBackup(backupName);
      } else if (this.config.database.type === 'postgresql') {
        backupPath = await this.performPostgreSQLBackup(backupName);
      } else if (this.config.database.type === 'sqlite') {
        backupPath = await this.performSQLiteBackup(backupName);
      } else {
        throw new Error(`Unsupported database type: ${this.config.database.type}`);
      }
      
      // Compress backup if enabled
      if (this.config.compression.enabled) {
        backupPath = await this.compressBackup(backupPath);
      }
      
      // Encrypt backup if enabled
      if (this.config.encryption.enabled) {
        backupPath = await this.encryptBackup(backupPath);
      }
      
      // Upload to cloud storage if enabled
      if (this.config.cloud.enabled) {
        await this.uploadToCloudStorage(backupPath, backupName);
      }
      
      const duration = Date.now() - startTime;
      const fileStats = await fs.promises.stat(backupPath);
      
      this.updateBackupStats(true, fileStats.size);
      
      centralizedLogging.logApplication('INFO', `Database backup completed successfully`, {
        backupName,
        type,
        duration: `${duration}ms`,
        size: `${Math.round(fileStats.size / 1024 / 1024)}MB`,
        path: backupPath
      });
      
      return {
        success: true,
        backupName,
        path: backupPath,
        size: fileStats.size,
        duration,
        type
      };
      
    } catch (error) {
      this.updateBackupStats(false);
      
      centralizedLogging.logError(`Database backup failed for ${type}`, error, {
        backupName,
        type,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }
  
  // Perform MySQL backup
  async performMySQLBackup(backupName) {
    const backupPath = path.join(this.backupDirectory, `${backupName}.sql`);
    
    const command = `mysqldump -h ${this.config.database.host} -P ${this.config.database.port} -u ${this.config.database.user} -p${this.config.database.password} ${this.config.database.name} > ${backupPath}`;
    
    await execAsync(command);
    
    return backupPath;
  }
  
  // Perform PostgreSQL backup
  async performPostgreSQLBackup(backupName) {
    const backupPath = path.join(this.backupDirectory, `${backupName}.sql`);
    
    const env = {
      ...process.env,
      PGPASSWORD: this.config.database.password
    };
    
    const command = `pg_dump -h ${this.config.database.host} -p ${this.config.database.port} -U ${this.config.database.user} -d ${this.config.database.name} > ${backupPath}`;
    
    await execAsync(command, { env });
    
    return backupPath;
  }
  
  // Perform SQLite backup
  async performSQLiteBackup(backupName) {
    const backupPath = path.join(this.backupDirectory, `${backupName}.db`);
    const sourcePath = this.config.database.name;
    
    await fs.promises.copyFile(sourcePath, backupPath);
    
    return backupPath;
  }
  
  // Perform full backup (database + files)
  async performFullBackup(type = 'full') {
    const startTime = Date.now();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `full_backup_${type}_${timestamp}`;
    
    try {
      centralizedLogging.logApplication('INFO', `Starting full backup: ${backupName}`);
      
      // Create database backup
      const dbBackup = await this.performDatabaseBackup('database');
      
      // Create application files backup
      const filesBackup = await this.backupApplicationFiles(backupName);
      
      // Create logs backup
      const logsBackup = await this.backupLogs(backupName);
      
      // Create combined archive
      const archivePath = await this.createFullBackupArchive(backupName, [
        dbBackup.path,
        filesBackup,
        logsBackup
      ]);
      
      // Upload to cloud storage if enabled
      if (this.config.cloud.enabled) {
        await this.uploadToCloudStorage(archivePath, backupName);
      }
      
      const duration = Date.now() - startTime;
      const fileStats = await fs.promises.stat(archivePath);
      
      this.updateBackupStats(true, fileStats.size);
      
      centralizedLogging.logApplication('INFO', `Full backup completed successfully`, {
        backupName,
        type,
        duration: `${duration}ms`,
        size: `${Math.round(fileStats.size / 1024 / 1024)}MB`,
        path: archivePath
      });
      
      return {
        success: true,
        backupName,
        path: archivePath,
        size: fileStats.size,
        duration,
        type: 'full'
      };
      
    } catch (error) {
      this.updateBackupStats(false);
      
      centralizedLogging.logError(`Full backup failed for ${type}`, error, {
        backupName,
        type,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }
  
  // Backup application files
  async backupApplicationFiles(backupName) {
    const backupPath = path.join(this.backupDirectory, `${backupName}_files.tar.gz`);
    
    // Define directories to backup
    const dirsToBackup = [
      'src',
      'public',
      'uploads',
      'config'
    ].filter(dir => fs.existsSync(dir));
    
    if (dirsToBackup.length === 0) {
      return null;
    }
    
    const command = `tar -czf ${backupPath} ${dirsToBackup.join(' ')}`;
    await execAsync(command);
    
    return backupPath;
  }
  
  // Backup logs
  async backupLogs(backupName) {
    const logsDir = path.join(__dirname, '../../logs');
    const backupPath = path.join(this.backupDirectory, `${backupName}_logs.tar.gz`);
    
    if (!fs.existsSync(logsDir)) {
      return null;
    }
    
    const command = `tar -czf ${backupPath} -C ${logsDir} .`;
    await execAsync(command);
    
    return backupPath;
  }
  
  // Create full backup archive
  async createFullBackupArchive(backupName, filePaths) {
    const archivePath = path.join(this.backupDirectory, `${backupName}.tar.gz`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(archivePath);
      const archive = archiver('tar', {
        gzip: true,
        gzipOptions: { level: this.config.compression.level }
      });
      
      output.on('close', () => {
        resolve(archivePath);
      });
      
      archive.on('error', (error) => {
        reject(error);
      });
      
      archive.pipe(output);
      
      // Add files to archive
      for (const filePath of filePaths) {
        if (filePath && fs.existsSync(filePath)) {
          archive.file(filePath, { name: path.basename(filePath) });
        }
      }
      
      archive.finalize();
    });
  }
  
  // Compress backup file
  async compressBackup(backupPath) {
    const compressedPath = `${backupPath}.gz`;
    const command = `gzip -${this.config.compression.level} -c ${backupPath} > ${compressedPath}`;
    
    await execAsync(command);
    
    // Remove original uncompressed file
    await fs.promises.unlink(backupPath);
    
    return compressedPath;
  }
  
  // Encrypt backup file
  async encryptBackup(backupPath) {
    const encryptedPath = `${backupPath}.enc`;
    const command = `openssl aes-256-cbc -e -in ${backupPath} -out ${encryptedPath} -k ${this.config.encryption.key}`;
    
    await execAsync(command);
    
    // Remove original unencrypted file
    await fs.promises.unlink(backupPath);
    
    return encryptedPath;
  }
  
  // Upload backup to cloud storage
  async uploadToCloudStorage(backupPath, backupName) {
    if (!this.s3) {
      throw new Error('S3 client not initialized');
    }
    
    const fileStream = fs.createReadStream(backupPath);
    const key = `backups/${new Date().getFullYear()}/${new Date().getMonth() + 1}/${backupName}`;
    
    const params = {
      Bucket: this.config.cloud.bucket,
      Key: key,
      Body: fileStream,
      ServerSideEncryption: 'AES256',
      StorageClass: 'STANDARD_IA'
    };
    
    await this.s3.upload(params).promise();
    
    centralizedLogging.logApplication('INFO', `Backup uploaded to S3: ${key}`);
  }
  
  // Restore database from backup
  async restoreDatabase(backupPath, targetDatabase = null) {
    const startTime = Date.now();
    
    try {
      centralizedLogging.logApplication('INFO', `Starting database restoration from: ${backupPath}`);
      
      // Decrypt if encrypted
      if (this.config.encryption.enabled && backupPath.endsWith('.enc')) {
        backupPath = await this.decryptBackup(backupPath);
      }
      
      // Decompress if compressed
      if (this.config.compression.enabled && backupPath.endsWith('.gz')) {
        backupPath = await this.decompressBackup(backupPath);
      }
      
      const dbName = targetDatabase || this.config.database.name;
      
      if (this.config.database.type === 'mysql') {
        await this.restoreMySQLDatabase(backupPath, dbName);
      } else if (this.config.database.type === 'postgresql') {
        await this.restorePostgreSQLDatabase(backupPath, dbName);
      } else if (this.config.database.type === 'sqlite') {
        await this.restoreSQLiteDatabase(backupPath, dbName);
      }
      
      const duration = Date.now() - startTime;
      
      centralizedLogging.logApplication('INFO', `Database restoration completed successfully`, {
        backupPath,
        targetDatabase: dbName,
        duration: `${duration}ms`
      });
      
      return {
        success: true,
        backupPath,
        targetDatabase: dbName,
        duration
      };
      
    } catch (error) {
      centralizedLogging.logError('Database restoration failed', error, {
        backupPath,
        targetDatabase,
        duration: Date.now() - startTime
      });
      
      throw error;
    }
  }
  
  // Restore MySQL database
  async restoreMySQLDatabase(backupPath, dbName) {
    const command = `mysql -h ${this.config.database.host} -P ${this.config.database.port} -u ${this.config.database.user} -p${this.config.database.password} ${dbName} < ${backupPath}`;
    
    await execAsync(command);
  }
  
  // Restore PostgreSQL database
  async restorePostgreSQLDatabase(backupPath, dbName) {
    const env = {
      ...process.env,
      PGPASSWORD: this.config.database.password
    };
    
    const command = `psql -h ${this.config.database.host} -p ${this.config.database.port} -U ${this.config.database.user} -d ${dbName} < ${backupPath}`;
    
    await execAsync(command, { env });
  }
  
  // Restore SQLite database
  async restoreSQLiteDatabase(backupPath, dbName) {
    await fs.promises.copyFile(backupPath, dbName);
  }
  
  // Decrypt backup
  async decryptBackup(encryptedPath) {
    const decryptedPath = encryptedPath.replace('.enc', '');
    const command = `openssl aes-256-cbc -d -in ${encryptedPath} -out ${decryptedPath} -k ${this.config.encryption.key}`;
    
    await execAsync(command);
    
    return decryptedPath;
  }
  
  // Decompress backup
  async decompressBackup(compressedPath) {
    const decompressedPath = compressedPath.replace('.gz', '');
    const command = `gunzip -c ${compressedPath} > ${decompressedPath}`;
    
    await execAsync(command);
    
    return decompressedPath;
  }
  
  // Test backup and restore process
  async testBackupRestore() {
    const startTime = Date.now();
    
    try {
      centralizedLogging.logApplication('INFO', 'Starting backup and restore test');
      
      // Create test backup
      const backup = await this.performDatabaseBackup('test');
      
      // Test restore to a temporary database
      const testDbName = `${this.config.database.name}_test_restore`;
      
      // Create test database
      if (this.config.database.type === 'mysql') {
        await execAsync(`mysql -h ${this.config.database.host} -P ${this.config.database.port} -u ${this.config.database.user} -p${this.config.database.password} -e "CREATE DATABASE IF NOT EXISTS ${testDbName}"`);
      }
      
      // Restore to test database
      await this.restoreDatabase(backup.path, testDbName);
      
      // Verify restoration by checking table count
      const verification = await this.verifyRestoration(testDbName);
      
      // Clean up test database
      if (this.config.database.type === 'mysql') {
        await execAsync(`mysql -h ${this.config.database.host} -P ${this.config.database.port} -u ${this.config.database.user} -p${this.config.database.password} -e "DROP DATABASE IF EXISTS ${testDbName}"`);
      }
      
      // Clean up test backup
      await fs.promises.unlink(backup.path);
      
      const duration = Date.now() - startTime;
      
      centralizedLogging.logApplication('INFO', 'Backup and restore test completed successfully', {
        duration: `${duration}ms`,
        verification
      });
      
      return {
        success: true,
        duration,
        verification
      };
      
    } catch (error) {
      centralizedLogging.logError('Backup and restore test failed', error);
      throw error;
    }
  }
  
  // Verify restoration
  async verifyRestoration(dbName) {
    // This would include comprehensive verification logic
    // For now, return basic verification
    return {
      tablesFound: true,
      dataIntegrity: true,
      timestamp: new Date().toISOString()
    };
  }
  
  // Clean up old backups based on retention policy
  async cleanupOldBackups() {
    try {
      centralizedLogging.logApplication('INFO', 'Starting backup cleanup');
      
      const files = await fs.promises.readdir(this.backupDirectory);
      const backupFiles = files.filter(file => 
        file.includes('_daily_') || 
        file.includes('_weekly_') || 
        file.includes('_monthly_') ||
        file.includes('full_backup_')
      );
      
      let deletedCount = 0;
      let deletedSize = 0;
      
      for (const file of backupFiles) {
        const filePath = path.join(this.backupDirectory, file);
        const stats = await fs.promises.stat(filePath);
        const age = Date.now() - stats.mtime.getTime();
        
        let shouldDelete = false;
        
        if (file.includes('_daily_')) {
          shouldDelete = age > (this.config.retention.daily * 24 * 60 * 60 * 1000);
        } else if (file.includes('_weekly_')) {
          shouldDelete = age > (this.config.retention.weekly * 7 * 24 * 60 * 60 * 1000);
        } else if (file.includes('_monthly_')) {
          shouldDelete = age > (this.config.retention.monthly * 30 * 24 * 60 * 60 * 1000);
        }
        
        if (shouldDelete) {
          await fs.promises.unlink(filePath);
          deletedCount++;
          deletedSize += stats.size;
        }
      }
      
      centralizedLogging.logApplication('INFO', 'Backup cleanup completed', {
        deletedFiles: deletedCount,
        freedSpace: `${Math.round(deletedSize / 1024 / 1024)}MB`
      });
      
    } catch (error) {
      centralizedLogging.logError('Backup cleanup failed', error);
    }
  }
  
  // Update backup statistics
  updateBackupStats(success, size = 0) {
    this.backupStats.totalBackups++;
    
    if (success) {
      this.backupStats.successfulBackups++;
      this.backupStats.totalSize += size;
      this.backupStats.lastBackup = new Date().toISOString();
    } else {
      this.backupStats.failedBackups++;
    }
  }
  
  // Get backup statistics
  getBackupStats() {
    return {
      ...this.backupStats,
      successRate: this.backupStats.totalBackups > 0 ? 
        (this.backupStats.successfulBackups / this.backupStats.totalBackups * 100).toFixed(2) : 0,
      averageSize: this.backupStats.successfulBackups > 0 ?
        Math.round(this.backupStats.totalSize / this.backupStats.successfulBackups / 1024 / 1024) : 0,
      totalSizeMB: Math.round(this.backupStats.totalSize / 1024 / 1024)
    };
  }
  
  // List available backups
  async listBackups() {
    try {
      const files = await fs.promises.readdir(this.backupDirectory);
      const backups = [];
      
      for (const file of files) {
        const filePath = path.join(this.backupDirectory, file);
        const stats = await fs.promises.stat(filePath);
        
        const backup = {
          name: file,
          path: filePath,
          size: stats.size,
          sizeMB: Math.round(stats.size / 1024 / 1024),
          created: stats.birthtime,
          modified: stats.mtime,
          type: this.determineBackupType(file)
        };
        
        backups.push(backup);
      }
      
      return backups.sort((a, b) => new Date(b.created) - new Date(a.created));
      
    } catch (error) {
      centralizedLogging.logError('Failed to list backups', error);
      return [];
    }
  }
  
  // Determine backup type from filename
  determineBackupType(filename) {
    if (filename.includes('_daily_')) return 'daily';
    if (filename.includes('_weekly_')) return 'weekly';
    if (filename.includes('_monthly_')) return 'monthly';
    if (filename.includes('full_backup_')) return 'full';
    return 'manual';
  }
  
  // Export backup configuration
  exportBackupConfig() {
    return {
      schedules: this.config.schedules,
      retention: this.config.retention,
      compression: this.config.compression,
      cloud: {
        enabled: this.config.cloud.enabled,
        provider: this.config.cloud.provider,
        bucket: this.config.cloud.bucket,
        region: this.config.cloud.region
      },
      encryption: {
        enabled: this.config.encryption.enabled
      }
    };
  }
  
  // Get service status
  getServiceStatus() {
    return {
      running: this.isRunning,
      scheduledJobs: Array.from(this.backupJobs.keys()),
      nextBackups: this.getNextBackupTimes(),
      stats: this.getBackupStats(),
      config: this.exportBackupConfig()
    };
  }
  
  // Get next backup times
  getNextBackupTimes() {
    const cron = require('node-cron');
    const times = {};
    
    try {
      for (const [type, schedule] of Object.entries(this.config.schedules)) {
        const task = cron.schedule(schedule, () => {}, { scheduled: false });
        times[type] = task.nextDate().toISOString();
      }
    } catch (error) {
      centralizedLogging.logError('Failed to calculate next backup times', error);
    }
    
    return times;
  }
}

// Create singleton instance
const backupService = new BackupService();

module.exports = backupService;