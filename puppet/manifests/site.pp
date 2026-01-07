# ==============================================================================
# Puppet Main Manifest - Food Orders CRM
# Site-wide configuration and node definitions
# ==============================================================================

# Default node configuration
node default {
  # Base configuration for all nodes
  include base
  include security
  include monitoring
}

# Web servers
node /^web-\d+/ {
  include base
  include security
  include monitoring
  include docker
  include nginx
  include foodorderscrm::app
}

# Database servers
node /^db-\d+/ {
  include base
  include security
  include monitoring
  include postgresql
  include foodorderscrm::database
}

# Cache servers
node /^redis-\d+/ {
  include base
  include security
  include monitoring
  include redis
}

# CI/CD servers
node /^jenkins-\d+/ {
  include base
  include security
  include monitoring
  include docker
  include jenkins
}

# Monitoring servers
node /^prometheus-\d+/ {
  include base
  include security
  include prometheus
}

node /^grafana-\d+/ {
  include base
  include security
  include grafana
}
