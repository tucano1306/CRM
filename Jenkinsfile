// ==============================================================================
// Jenkins Pipeline - Food Orders CRM
// CI/CD Pipeline con build, test, análisis y deployment
// ==============================================================================

pipeline {
    agent any
    
    environment {
        // Docker
        DOCKER_REGISTRY = 'docker.io'
        DOCKER_IMAGE = 'food-orders-crm'
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        
        // SonarQube
        SONAR_HOST_URL = 'http://sonarqube:9000'
        SONAR_PROJECT_KEY = 'tucano1306_CRM'
        
        // Deployment
        DEPLOY_ENV = "${env.BRANCH_NAME == 'main' ? 'production' : 'staging'}"
        
        // Notifications
        SLACK_CHANNEL = '#devops-alerts'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        timeout(time: 1, unit: 'HOURS')
        disableConcurrentBuilds()
    }
    
    triggers {
        // Poll SCM every 5 minutes
        pollSCM('H/5 * * * *')
        // Cron schedule for nightly builds
        cron('H 2 * * *')
    }
    
    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "🔄 Checking out code..."
                    checkout scm
                    
                    // Get commit info
                    env.GIT_COMMIT_MSG = sh(
                        script: 'git log -1 --pretty=%B',
                        returnStdout: true
                    ).trim()
                    env.GIT_AUTHOR = sh(
                        script: 'git log -1 --pretty=%an',
                        returnStdout: true
                    ).trim()
                }
            }
        }
        
        stage('Install Dependencies') {
            steps {
                script {
                    echo "📦 Installing dependencies..."
                    sh '''
                        npm ci --prefer-offline --no-audit
                        npx prisma generate
                    '''
                }
            }
        }
        
        stage('Lint') {
            steps {
                script {
                    echo "🔍 Running linters..."
                    sh 'npm run lint'
                }
            }
        }
        
        stage('Unit Tests') {
            steps {
                script {
                    echo "🧪 Running unit tests..."
                    sh 'npm run test:unit -- --ci --coverage'
                }
            }
            post {
                always {
                    junit '**/test-results/junit.xml'
                    publishHTML([
                        allowMissing: false,
                        alwaysLinkToLastBuild: true,
                        keepAll: true,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }
        
        stage('SonarQube Analysis') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "📊 Running SonarQube analysis..."
                    withSonarQubeEnv('SonarQube') {
                        sh '''
                            npx sonar-scanner \
                                -Dsonar.projectKey=${SONAR_PROJECT_KEY} \
                                -Dsonar.sources=. \
                                -Dsonar.host.url=${SONAR_HOST_URL}
                        '''
                    }
                }
            }
        }
        
        stage('Quality Gate') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🚦 Waiting for Quality Gate..."
                    timeout(time: 5, unit: 'MINUTES') {
                        def qg = waitForQualityGate()
                        if (qg.status != 'OK') {
                            error "Pipeline aborted due to quality gate failure: ${qg.status}"
                        }
                    }
                }
            }
        }
        
        stage('Build Docker Image') {
            steps {
                script {
                    echo "🐳 Building Docker image..."
                    sh """
                        docker build \
                            --build-arg NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=\${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY} \
                            --build-arg DATABASE_URL=\${DATABASE_URL} \
                            --build-arg DIRECT_URL=\${DIRECT_URL} \
                            -t ${DOCKER_IMAGE}:${DOCKER_TAG} \
                            -t ${DOCKER_IMAGE}:latest \
                            .
                    """
                }
            }
        }
        
        stage('Security Scan') {
            steps {
                script {
                    echo "🔒 Running security scan..."
                    sh """
                        # Trivy vulnerability scanner
                        docker run --rm \
                            -v /var/run/docker.sock:/var/run/docker.sock \
                            aquasec/trivy:latest image \
                            --severity HIGH,CRITICAL \
                            --exit-code 0 \
                            ${DOCKER_IMAGE}:${DOCKER_TAG}
                    """
                }
            }
        }
        
        stage('Push Docker Image') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    echo "📤 Pushing Docker image..."
                    withCredentials([usernamePassword(
                        credentialsId: 'docker-registry-credentials',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )]) {
                        sh """
                            echo \${DOCKER_PASS} | docker login -u \${DOCKER_USER} --password-stdin ${DOCKER_REGISTRY}
                            docker push ${DOCKER_IMAGE}:${DOCKER_TAG}
                            docker push ${DOCKER_IMAGE}:latest
                        """
                    }
                }
            }
        }
        
        stage('Deploy to Staging') {
            when {
                branch 'develop'
            }
            steps {
                script {
                    echo "🚀 Deploying to staging..."
                    sh """
                        ansible-playbook \
                            -i ansible/inventories/staging \
                            ansible/playbooks/deploy.yml \
                            --extra-vars "docker_tag=${DOCKER_TAG}"
                    """
                }
            }
        }
        
        stage('Deploy to Production') {
            when {
                branch 'main'
            }
            steps {
                script {
                    echo "🚀 Deploying to production..."
                    
                    // Manual approval for production
                    input message: 'Deploy to production?', ok: 'Deploy'
                    
                    sh """
                        ansible-playbook \
                            -i ansible/inventories/production \
                            ansible/playbooks/deploy.yml \
                            --extra-vars "docker_tag=${DOCKER_TAG}"
                    """
                }
            }
        }
        
        stage('Smoke Tests') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                }
            }
            steps {
                script {
                    echo "💨 Running smoke tests..."
                    sh """
                        # Wait for deployment
                        sleep 30
                        
                        # Health check
                        curl -f http://app:3000/api/health || exit 1
                    """
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo "✅ Pipeline completed successfully!"
                // Send notification
                // slackSend(
                //     channel: env.SLACK_CHANNEL,
                //     color: 'good',
                //     message: "✅ Build #${env.BUILD_NUMBER} succeeded\nBranch: ${env.BRANCH_NAME}\nAuthor: ${env.GIT_AUTHOR}"
                // )
            }
        }
        
        failure {
            script {
                echo "❌ Pipeline failed!"
                // Send notification
                // slackSend(
                //     channel: env.SLACK_CHANNEL,
                //     color: 'danger',
                //     message: "❌ Build #${env.BUILD_NUMBER} failed\nBranch: ${env.BRANCH_NAME}\nAuthor: ${env.GIT_AUTHOR}"
                // )
            }
        }
        
        always {
            script {
                echo "🧹 Cleaning up..."
                // Clean workspace
                cleanWs()
                
                // Remove unused Docker images
                sh 'docker image prune -f'
            }
        }
    }
}
