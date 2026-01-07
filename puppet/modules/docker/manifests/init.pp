# ==============================================================================
# Docker Module - Docker Installation and Configuration
# ==============================================================================

class docker {
  # Docker repository
  apt::source { 'docker':
    location => 'https://download.docker.com/linux/ubuntu',
    release  => $::lsbdistcodename,
    repos    => 'stable',
    key      => {
      'id'     => '9DC858229FC7DD38854AE2D88D81803C0EBFCD88',
      'server' => 'https://download.docker.com/linux/ubuntu/gpg',
    },
  }

  # Docker packages
  package { [
    'docker-ce',
    'docker-ce-cli',
    'containerd.io',
    'docker-buildx-plugin',
  ]:
    ensure  => present,
    require => Apt::Source['docker'],
  }

  # Docker service
  service { 'docker':
    ensure  => running,
    enable  => true,
    require => Package['docker-ce'],
  }

  # Docker Compose
  exec { 'install-docker-compose':
    command => '/usr/bin/curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && /bin/chmod +x /usr/local/bin/docker-compose',
    creates => '/usr/local/bin/docker-compose',
    require => Package['curl'],
  }

  # Docker network
  docker_network { 'crm-network':
    ensure  => present,
    driver  => 'bridge',
    require => Service['docker'],
  }

  # Docker log rotation
  file { '/etc/docker/daemon.json':
    ensure  => file,
    content => template('docker/daemon.json.erb'),
    notify  => Service['docker'],
  }
}
