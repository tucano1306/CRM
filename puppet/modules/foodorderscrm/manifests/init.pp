# ==============================================================================
# Food Orders CRM Application Module
# ==============================================================================

class foodorderscrm::app {
  # Application directory
  file { '/opt/food-orders-crm':
    ensure => directory,
    owner  => 'deploy',
    group  => 'deploy',
    mode   => '0755',
  }

  # Environment file
  file { '/opt/food-orders-crm/.env':
    ensure  => file,
    owner   => 'deploy',
    group   => 'deploy',
    mode    => '0600',
    content => template('foodorderscrm/env.erb'),
  }

  # Docker Compose file
  file { '/opt/food-orders-crm/docker-compose.yml':
    ensure  => file,
    owner   => 'deploy',
    group   => 'deploy',
    mode    => '0644',
    source  => 'puppet:///modules/foodorderscrm/docker-compose.yml',
  }

  # Uploads directory
  file { '/opt/food-orders-crm/uploads':
    ensure => directory,
    owner  => 'deploy',
    group  => 'deploy',
    mode   => '0755',
  }

  # Logs directory
  file { '/opt/food-orders-crm/logs':
    ensure => directory,
    owner  => 'deploy',
    group  => 'deploy',
    mode   => '0755',
  }

  # Application service
  docker_compose { 'food-orders-crm':
    ensure        => present,
    compose_files => ['/opt/food-orders-crm/docker-compose.yml'],
    require       => [
      Class['docker'],
      File['/opt/food-orders-crm/docker-compose.yml'],
      File['/opt/food-orders-crm/.env'],
    ],
  }

  # Health check cron
  cron { 'healthcheck':
    command => '/usr/bin/curl -f http://localhost:3000/api/health || /usr/bin/systemctl restart docker-compose@food-orders-crm',
    user    => 'deploy',
    minute  => '*/5',
  }

  # Log rotation
  file { '/etc/logrotate.d/food-orders-crm':
    ensure  => file,
    content => template('foodorderscrm/logrotate.erb'),
  }
}

class foodorderscrm::database {
  # Backup directory
  file { '/backups/postgres':
    ensure => directory,
    owner  => 'postgres',
    group  => 'postgres',
    mode   => '0700',
  }

  # Backup script
  file { '/usr/local/bin/backup-postgres.sh':
    ensure  => file,
    owner   => 'root',
    group   => 'root',
    mode    => '0755',
    content => template('foodorderscrm/backup-postgres.sh.erb'),
  }

  # Backup cron job
  cron { 'postgres-backup':
    command => '/usr/local/bin/backup-postgres.sh',
    user    => 'postgres',
    hour    => 2,
    minute  => 0,
  }

  # Cleanup old backups
  cron { 'cleanup-old-backups':
    command => '/usr/bin/find /backups/postgres -type f -name "*.sql.gz" -mtime +30 -delete',
    user    => 'postgres',
    hour    => 3,
    minute  => 0,
  }
}
