# Backup and Restore Guide

This guide explains how to backup and restore your Brewery Inventory Management System data and files.

## Overview

The system includes two main scripts:
- `scripts/backup-system.sh` - Creates comprehensive backups
- `scripts/restore-system.sh` - Restores from backups

## Creating Backups

### Automatic Backup

Run the backup script:

```bash
./scripts/backup-system.sh
```

This will create a timestamped backup in the `./backups/` directory containing:

- **Database dump** - Complete MySQL database export
- **Prisma schema** - Database schema and migrations
- **Configuration files** - Environment settings and configs
- **Upload files** - User-uploaded content (if any)
- **Scripts and documentation** - Important system files

### Backup Contents

Each backup includes:

```
brewery_backup_YYYYMMDD_HHMMSS/
├── database/
│   ├── brewery_inventory_backup.sql
│   ├── schema.prisma
│   └── migrations/
├── config/
│   ├── env.local.backup
│   ├── package.json
│   ├── next.config.ts
│   └── prisma/
├── uploads/
│   └── (user uploaded files)
├── scripts/
│   └── (backup and utility scripts)
├── docs/
│   └── (documentation files)
└── BACKUP_MANIFEST.txt
```

### Backup Features

- **Timestamped** - Each backup has a unique timestamp
- **Compressed** - Creates `.tar.gz` archive for easy storage
- **Checksums** - SHA256 verification for integrity
- **Auto-cleanup** - Keeps last 7 days of backups
- **Manifest** - Detailed backup information and restore instructions

## Restoring from Backups

### Interactive Restore

Run the restore script without parameters to see available backups:

```bash
./scripts/restore-system.sh
```

### Direct Restore

Restore from a specific backup file:

```bash
./scripts/restore-system.sh backups/brewery_backup_20240101_120000.tar.gz
```

### Restore Process

The restore script will:

1. **Verify backup integrity** using checksums
2. **Create safety backup** of current database
3. **Restore database** from backup
4. **Restore Prisma schema** and migrations
5. **Restore configuration files** (with confirmation)
6. **Restore upload files** if present
7. **Install dependencies** and run migrations
8. **Clean up** temporary files

### Safety Features

- **Integrity verification** - Checks backup checksums
- **Safety backups** - Creates backup of current data before restore
- **Confirmation prompts** - Asks before overwriting critical files
- **Rollback capability** - Keeps previous versions with timestamps

## Best Practices

### Regular Backups

1. **Daily backups** - Run backup script daily
2. **Before updates** - Always backup before system updates
3. **Before migrations** - Backup before database changes
4. **Off-site storage** - Store backups in multiple locations

### Backup Schedule

Consider setting up automated backups using cron:

```bash
# Add to crontab (crontab -e)
# Daily backup at 2 AM
0 2 * * * cd /path/to/brewery-inventory-next && ./scripts/backup-system.sh
```

### Testing Restores

1. **Regular testing** - Test restore procedures monthly
2. **Staging environment** - Test restores in non-production environment
3. **Verify data integrity** - Check restored data completeness
4. **Document procedures** - Keep restore procedures updated

## Troubleshooting

### Common Issues

**Database connection errors:**
- Check MySQL server is running
- Verify database credentials in `.env.local`
- Ensure database exists and is accessible

**Permission errors:**
- Ensure scripts are executable: `chmod +x scripts/*.sh`
- Check file/directory permissions
- Run with appropriate user privileges

**Backup corruption:**
- Check checksum verification
- Verify backup file integrity
- Use alternative backup if available

**Environment issues:**
- Review `.env.local` settings after restore
- Update environment-specific configurations
- Restart application services

### Recovery Steps

1. **Identify the issue** - Check error messages and logs
2. **Use safety backup** - Restore from automatically created safety backup
3. **Try alternative backup** - Use previous backup if current one fails
4. **Manual recovery** - Extract specific files from backup archive
5. **Contact support** - Document issue and seek assistance

## File Locations

- **Backup scripts:** `scripts/backup-system.sh`, `scripts/restore-system.sh`
- **Backup storage:** `./backups/`
- **Configuration:** `.env.local`
- **Database schema:** `prisma/schema.prisma`
- **Upload files:** `public/uploads/`

## Security Considerations

- **Secure storage** - Store backups in secure, encrypted locations
- **Access control** - Limit access to backup files
- **Credential protection** - Don't include sensitive credentials in backups
- **Regular rotation** - Rotate and archive old backups
- **Encryption** - Consider encrypting backup archives

## Support

For additional help:
1. Check the backup manifest file for specific backup details
2. Review system logs for error messages
3. Consult the main documentation in `docs/operations/`
4. Test procedures in a development environment first