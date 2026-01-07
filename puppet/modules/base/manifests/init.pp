# ==============================================================================
# Base Module - Essential Configuration
# ==============================================================================

class base {
  # System updates
  exec { 'apt-update':
    command => '/usr/bin/apt-get update',
    onlyif  => '/bin/sh -c "[ ! -f /var/cache/apt/pkgcache.bin ] || /usr/bin/find /etc/apt/* -cnewer /var/cache/apt/pkgcache.bin | /bin/grep . > /dev/null"',
  }

  # Essential packages
  package { [
    'curl',
    'wget',
    'git',
    'vim',
    'htop',
    'net-tools',
    'build-essential',
    'python3',
    'python3-pip',
  ]:
    ensure  => present,
    require => Exec['apt-update'],
  }

  # Deploy user
  user { 'deploy':
    ensure     => present,
    home       => '/home/deploy',
    shell      => '/bin/bash',
    managehome => true,
    groups     => ['sudo', 'docker'],
  }

  # SSH authorized keys
  ssh_authorized_key { 'deploy@foodorderscrm':
    ensure => present,
    user   => 'deploy',
    type   => 'ssh-rsa',
    key    => hiera('deploy_ssh_key'),
  }

  # System timezone
  class { 'timezone':
    timezone => 'UTC',
  }

  # NTP configuration
  class { 'ntp':
    servers => [
      '0.pool.ntp.org',
      '1.pool.ntp.org',
      '2.pool.ntp.org',
    ],
  }
}
