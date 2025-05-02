pipeline {
    agent any

    environment {
        REPO_NAME = "CPE-800-Dashboard"
        BACKUP_DIR = "${WORKSPACE}/prev"
        SERVICE_NAME = "npmapp.service"
        REPO_URL = "https://github.com/bieben/CPE-800-Dashboard.git"
    }

    stages {
        stage('Backup Existing Repo') {
            steps {
                script {
                    if (fileExists("${WORKSPACE}/${REPO_NAME}")) {
                        sh '''
                            mkdir -p "$BACKUP_DIR"
                            TIMESTAMP=$(date +%Y%m%d%H%M%S)
                            mv "$REPO_NAME" "$BACKUP_DIR/${REPO_NAME}-$TIMESTAMP"
                        '''
                    }
                }
            }
        }

        stage('Clone Repository') {
            steps {
                sh '''
                    echo "Cleaning up previous repo if exists..."
                    rm -rf "${REPO_NAME}"
                    git clone "${REPO_URL}"
                '''
            }
        }

        stage('Install Node Modules') {
            steps {
                dir("${REPO_NAME}") {
                    sh "npm install"
                }
            }
        }

        stage('Restart Node App') {
            steps {
                sh '''
                    echo "Restarting Node service..."
                    sudo systemctl daemon-reexec
                    sudo systemctl restart "$SERVICE_NAME"
                '''
            }
        }
    }
}
