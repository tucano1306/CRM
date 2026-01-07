# ==============================================================================
# Monitoring Module - Node Exporter and Monitoring Agents
# ==============================================================================

class monitoring {
  # Node Exporter user
  user { 'node_exporter':
    ensure     => present,
    system     => true,
    shell      => '/bin/false',
    home       => '/nonexistent',
    managehome => false,
  }

  # Download Node Exporter
  archive { '/tmp/node_exporter.tar.gz':
    ensure       => present,
    source       => 'https://github.com/prometheus/node_exporter/releases/download/v1.7.0/node_exporter-1.7.0.linux-amd64.tar.gz',
    extract      => true,
    extract_path => '/tmp',
    creates      => '/tmp/node_exporter-1.7.0.linux-amd64',
  }

  # Install Node Exporter binary
  file { '/usr/local/bin/node_exporter':
    ensure  => file,
    source  => '/tmp/node_exporter-1.7.0.linux-amd64/node_exporter',
    mode    => '0755',
    owner   => 'root',
    group   => 'root',
    require => Archive['/tmp/node_exporter.tar.gz'],
  }

  # Node Exporter systemd service
  file { '/etc/systemd/system/node_exporter.service':
    ensure  => file,
    content => template('monitoring/node_exporter.service.erb'),
    notify  => Exec['systemd-reload'],
  }

  # Reload systemd
  exec { 'systemd-reload':
    command     => '/bin/systemctl daemon-reload',
    refreshonly => true,
  }

  # Node Exporter service
  service { 'node_exporter':
    ensure  => running,
    enable  => true,
    require => [
      File['/usr/local/bin/node_exporter'],
      File['/etc/systemd/system/node_exporter.service'],
      Exec['systemd-reload'],
    ],
  }

  # Firewall rule for Node Exporter
  firewall { '100 allow node_exporter':
    dport  => 9100,
    proto  => tcp,
    action => accept,
    source => hiera('prometheus_server'),
  }
}
