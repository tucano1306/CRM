# ==============================================================================
# Security Module - Firewall and Hardening
# ==============================================================================

class security {
  # Firewall configuration
  class { 'firewall': }

  # Allow SSH
  firewall { '000 allow ssh':
    dport  => 22,
    proto  => tcp,
    action => accept,
  }

  # Allow HTTP
  firewall { '001 allow http':
    dport  => 80,
    proto  => tcp,
    action => accept,
  }

  # Allow HTTPS
  firewall { '002 allow https':
    dport  => 443,
    proto  => tcp,
    action => accept,
  }

  # Fail2ban installation
  package { 'fail2ban':
    ensure => present,
  }

  # Fail2ban configuration
  file { '/etc/fail2ban/jail.local':
    ensure  => file,
    content => template('security/jail.local.erb'),
    require => Package['fail2ban'],
    notify  => Service['fail2ban'],
  }

  # Fail2ban service
  service { 'fail2ban':
    ensure  => running,
    enable  => true,
    require => Package['fail2ban'],
  }

  # Disable root login via SSH
  file_line { 'disable_root_login':
    path  => '/etc/ssh/sshd_config',
    line  => 'PermitRootLogin no',
    match => '^#?PermitRootLogin',
    notify => Service['ssh'],
  }

  # Disable password authentication
  file_line { 'disable_password_auth':
    path  => '/etc/ssh/sshd_config',
    line  => 'PasswordAuthentication no',
    match => '^#?PasswordAuthentication',
    notify => Service['ssh'],
  }

  # SSH service
  service { 'ssh':
    ensure => running,
    enable => true,
  }

  # Automatic security updates
  class { 'unattended_upgrades':
    age => {
      'min' => 2,
    },
    size => {
      'max' => 1000,
    },
    update => {
      'frequency' => 'always',
    },
  }
}
